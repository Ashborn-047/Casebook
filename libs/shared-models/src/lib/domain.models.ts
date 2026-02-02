/**
 * DOMAIN MODELS - Derived State
 * These are computed from events, never stored directly
 */

import { UserRole, EvidenceType, EvidenceVisibility, CaseStatus } from './event.models';

// ===== CORE ENTITIES =====

export interface User {
    readonly id: string;
    readonly name: string;
    readonly email: string;
    readonly role: UserRole;
    readonly avatar?: string;
    readonly department?: string;
    readonly joinedAt: string;
}

export interface Evidence {
    readonly id: string;
    readonly caseId: string;
    readonly type: EvidenceType;
    readonly content: string;
    readonly hash: string;           // SHA-256
    readonly description: string;
    readonly submittedBy: string;
    readonly submittedAt: string;
    readonly visibility: EvidenceVisibility;
    readonly version: number;
    readonly tags: string[];

    // For corrections
    readonly corrections?: Array<{
        originalId: string;
        reason: string;
        correctedAt: string;
        correctedBy: string;
    }>;
}

export interface Note {
    readonly id: string;
    readonly caseId: string;
    readonly content: string;
    readonly addedBy: string;
    readonly addedAt: string;
    readonly isInternal: boolean;
    readonly tags: string[];
}

// ===== CASE STATE (Derived from events) =====

export interface CaseState {
    // Core properties
    readonly id: string;
    readonly title: string;
    readonly description: string;
    readonly status: CaseStatus;
    readonly severity: 'low' | 'medium' | 'high' | 'critical';

    // Assignment
    readonly assignedInvestigatorId: string | null;
    readonly assignedAt: string | null;
    readonly assignedBy: string | null;

    // Timestamps
    readonly createdAt: string;
    readonly updatedAt: string;
    readonly closedAt: string | null;
    readonly reopenedAt: string | null;

    // Collections
    readonly evidence: Evidence[];
    readonly notes: Note[];
    readonly tags: string[];
    readonly eventIds: string[];  // Event IDs in chronological order

    // Computed metrics
    readonly evidenceCount: number;
    readonly restrictedEvidenceCount: number;
    readonly noteCount: number;
    readonly internalNoteCount: number;
    readonly lastActivityAt: string;
    readonly daysOpen: number;

    // Permission flags (computed for current user)
    readonly permissions: {
        readonly canAddEvidence: boolean;
        readonly canAddNote: boolean;
        readonly canCloseCase: boolean;
        readonly canReopenCase: boolean;
        readonly canViewRestrictedEvidence: boolean;
        readonly canChangeEvidenceVisibility: boolean;
        readonly canAssignInvestigator: boolean;
        readonly canCorrectEvidence: boolean;
        readonly canExportCase: boolean;
        readonly canTimeTravel: boolean;
    };
}

// ===== UI MODELS =====

export interface TimelineEntry {
    readonly id: string;
    readonly eventId: string;
    readonly type: string;
    readonly title: string;
    readonly description: string;
    readonly actorId: string;
    readonly actorRole: UserRole;
    readonly actorName?: string;
    readonly occurredAt: string;
    readonly icon: string;          // Material icon name
    readonly colorClass: string;    // Tailwind color class
    readonly payload: any;          // Original event payload
    readonly isVisibleTo: UserRole[]; // Which roles can see this
    readonly metadata?: {
        isCorrection?: boolean;
        isRestricted?: boolean;
        isInternal?: boolean;
    };
}

export interface CaseSummary {
    readonly id: string;
    readonly title: string;
    readonly description: string;
    readonly status: CaseStatus;
    readonly severity: string;
    readonly assignedInvestigator: string | null;
    readonly evidenceCount: number;
    readonly lastActivityAt: string;
    readonly createdAt: string;
    readonly tags: string[];
}

// ===== APPLICATION STATE =====

export interface AppState {
    readonly cases: Record<string, CaseState>;
    readonly users: Record<string, User>;
    readonly currentCaseId: string | null;
    readonly currentUserId: string;
    readonly currentUserRole: UserRole;
    readonly viewMode: 'timeline' | 'evidence' | 'notes' | 'audit';
    readonly selectedTimelineDate: string | null;
    readonly isLoading: boolean;
    readonly error: string | null;
}

// ===== INITIAL STATES =====

export const INITIAL_CASE_STATE: Omit<CaseState, 'id' | 'createdAt'> = {
    title: '',
    description: '',
    status: 'open',
    severity: 'medium',
    assignedInvestigatorId: null,
    assignedAt: null,
    assignedBy: null,
    updatedAt: '',
    closedAt: null,
    reopenedAt: null,
    evidence: [],
    notes: [],
    tags: [],
    eventIds: [],
    evidenceCount: 0,
    restrictedEvidenceCount: 0,
    noteCount: 0,
    internalNoteCount: 0,
    lastActivityAt: '',
    daysOpen: 0,
    permissions: {
        canAddEvidence: false,
        canAddNote: false,
        canCloseCase: false,
        canReopenCase: false,
        canViewRestrictedEvidence: false,
        canChangeEvidenceVisibility: false,
        canAssignInvestigator: false,
        canCorrectEvidence: false,
        canExportCase: false,
        canTimeTravel: false,
    },
};

export const INITIAL_APP_STATE: AppState = {
    cases: {},
    users: {},
    currentCaseId: null,
    currentUserId: '',
    currentUserRole: 'viewer',
    viewMode: 'timeline',
    selectedTimelineDate: null,
    isLoading: false,
    error: null,
};

// ===== HELPER TYPES =====

export type PermissionCheck = {
    allowed: boolean;
    reason?: string;
};

export type ValidationResult = {
    valid: boolean;
    errors: string[];
};
