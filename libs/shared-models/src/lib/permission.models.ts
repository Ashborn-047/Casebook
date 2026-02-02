/**
 * PERMISSION SYSTEM - Role-based access control
 * Compile-time checked permission matrix
 */

import { UserRole } from './event.models';
import { CaseState } from './domain.models';


// ===== ALL ACTIONS IN THE SYSTEM =====
export type Action =
    // Case actions
    | 'view_case'
    | 'create_case'
    | 'assign_case'
    | 'close_case'
    | 'reopen_case'
    | 'export_case'

    // Evidence actions
    | 'add_evidence'
    | 'view_evidence'
    | 'view_restricted_evidence'
    | 'correct_evidence'
    | 'change_evidence_visibility'

    // Note actions
    | 'add_note'
    | 'view_note'
    | 'view_internal_note'

    // Special actions
    | 'time_travel'
    | 'simulate_role'
    | 'audit_log'
    | 'generate_report';

// ===== PERMISSION MATRIX (Compile-time checked) =====
export const PERMISSION_MATRIX: Record<UserRole, Record<Action, boolean>> = {
    viewer: {
        // Case
        view_case: true,
        create_case: false,
        assign_case: false,
        close_case: false,
        reopen_case: false,
        export_case: false,

        // Evidence
        add_evidence: false,
        view_evidence: true,
        view_restricted_evidence: false,
        correct_evidence: false,
        change_evidence_visibility: false,

        // Notes
        add_note: false,
        view_note: true,
        view_internal_note: false,

        // Special
        time_travel: false,
        simulate_role: false,
        audit_log: false,
        generate_report: false,
    },

    investigator: {
        // Case
        view_case: true,
        create_case: true,
        assign_case: false,
        close_case: false,
        reopen_case: false,
        export_case: true,

        // Evidence
        add_evidence: true,
        view_evidence: true,
        view_restricted_evidence: false,
        correct_evidence: false,
        change_evidence_visibility: false,

        // Notes
        add_note: true,
        view_note: true,
        view_internal_note: true,

        // Special
        time_travel: false,
        simulate_role: true,
        audit_log: true,
        generate_report: true,
    },

    supervisor: {
        // Case
        view_case: true,
        create_case: true,
        assign_case: true,
        close_case: true,
        reopen_case: true,
        export_case: true,

        // Evidence
        add_evidence: false, // Supervisors approve, not add
        view_evidence: true,
        view_restricted_evidence: true,
        correct_evidence: true,
        change_evidence_visibility: true,

        // Notes
        add_note: true,
        view_note: true,
        view_internal_note: true,

        // Special
        time_travel: true,
        simulate_role: true,
        audit_log: true,
        generate_report: true,
    },
} as const;

// ===== BUSINESS RULES =====
export interface BusinessRule {
    readonly id: string;
    readonly description: string;
    readonly condition: (caseState: CaseState, userRole: UserRole, action: Action) => boolean;
    readonly errorMessage: string;
}

export const BUSINESS_RULES: BusinessRule[] = [
    {
        id: 'BR-001',
        description: 'Cannot add evidence to closed case',
        condition: (caseState, userRole, action) => {
            if (action !== 'add_evidence') return true;
            return caseState.status === 'open';
        },
        errorMessage: 'Cannot add evidence to a closed case',
    },
    {
        id: 'BR-002',
        description: 'Cannot close case without evidence',
        condition: (caseState, userRole, action) => {
            if (action !== 'close_case') return true;
            return caseState.evidenceCount > 0;
        },
        errorMessage: 'Cannot close case without at least one piece of evidence',
    },
    {
        id: 'BR-003',
        description: 'Cannot assign case to yourself',
        condition: (caseState, userRole, action) => {
            if (action !== 'assign_case') return true;
            return true; // Additional check in runtime with userId
        },
        errorMessage: 'Cannot assign case to yourself',
    },
    {
        id: 'BR-004',
        description: 'Cannot reopen recently closed case (24h cooling period)',
        condition: (caseState, userRole, action) => {
            if (action !== 'reopen_case' || !caseState.closedAt) return true;
            const closedTime = new Date(caseState.closedAt).getTime();
            const currentTime = Date.now();
            const hoursSinceClosed = (currentTime - closedTime) / (1000 * 60 * 60);
            return hoursSinceClosed >= 24; // 24-hour cooling period
        },
        errorMessage: 'Case cannot be reopened within 24 hours of closure',
    },
    {
        id: 'BR-005',
        description: 'Cannot correct evidence without supervisor approval',
        condition: (caseState, userRole, action) => {
            if (action !== 'correct_evidence') return true;
            return userRole === 'supervisor';
        },
        errorMessage: 'Evidence corrections require supervisor approval',
    },
    {
        id: 'BR-006',
        description: 'Cannot view restricted evidence without supervisor role',
        condition: (caseState, userRole, action) => {
            if (action !== 'view_restricted_evidence') return true;
            return userRole === 'supervisor';
        },
        errorMessage: 'Restricted evidence requires supervisor access',
    },
    {
        id: 'BR-007',
        description: 'Cannot add internal notes without investigator+ role',
        condition: (caseState, userRole, action) => {
            if (action !== 'add_note') return true;
            // This is handled by permission matrix, but included for clarity
            return true;
        },
        errorMessage: 'Internal notes require investigator or supervisor role',
    },
];

// ===== PERMISSION CHECKER =====
export function can(
    userRole: UserRole,
    action: Action,
    caseState: CaseState,
    userId?: string,
    targetUserId?: string
): { allowed: boolean; reason?: string } {

    // 1. Check permission matrix
    if (!PERMISSION_MATRIX[userRole][action]) {
        return { allowed: false, reason: 'Permission denied by role' };
    }

    // 2. Check business rules
    for (const rule of BUSINESS_RULES) {
        if (!rule.condition(caseState, userRole, action)) {
            return { allowed: false, reason: rule.errorMessage };
        }
    }

    // 3. Special runtime checks
    if (action === 'assign_case' && userId && targetUserId && userId === targetUserId) {
        return { allowed: false, reason: 'Cannot assign case to yourself' };
    }

    if (action === 'close_case' && caseState.assignedInvestigatorId !== userId && userRole !== 'supervisor') {
        return { allowed: false, reason: 'Only assigned investigator or supervisor can close case' };
    }

    return { allowed: true };
}

// ===== PERMISSION CHECKER FACTORY =====
export function createPermissionChecker(
    userRole: UserRole,
    caseState: CaseState,
    userId?: string
) {
    return (action: Action, targetUserId?: string) =>
        can(userRole, action, caseState, userId, targetUserId);
}

// ===== ACTION MAPPING =====
export function eventTypeToAction(eventType: string): Action {
    const map: Record<string, Action> = {
        'CASE_CREATED': 'create_case',
        'CASE_ASSIGNED': 'assign_case',
        'CASE_CLOSED': 'close_case',
        'CASE_REOPENED': 'reopen_case',
        'EVIDENCE_ADDED': 'add_evidence',
        'EVIDENCE_CORRECTED': 'correct_evidence',
        'EVIDENCE_VISIBILITY_CHANGED': 'change_evidence_visibility',
        'NOTE_ADDED': 'add_note',
    };

    return map[eventType] || 'view_case';
}

// ===== ROLE UTILITIES =====
export function isRoleHigherOrEqual(role1: UserRole, role2: UserRole): boolean {
    const roleHierarchy: Record<UserRole, number> = {
        'viewer': 1,
        'investigator': 2,
        'supervisor': 3,
    };

    return roleHierarchy[role1] >= roleHierarchy[role2];
}

export function getHigherRole(role1: UserRole, role2: UserRole): UserRole {
    const roleHierarchy: Record<UserRole, number> = {
        'viewer': 1,
        'investigator': 2,
        'supervisor': 3,
    };

    return roleHierarchy[role1] >= roleHierarchy[role2] ? role1 : role2;
}
