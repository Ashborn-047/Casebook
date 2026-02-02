/**
 * CASBOOK - Event Sourcing Core
 * Every meaningful action is an immutable event
 */

// ===== ENUMS =====
export type UserRole = 'viewer' | 'investigator' | 'supervisor';
export type CaseStatus = 'open' | 'closed';
export type EvidenceType = 'file' | 'text' | 'url';
export type EvidenceVisibility = 'normal' | 'restricted';

// ===== EVENT TYPES =====
export type EventType =
    | 'CASE_CREATED'
    | 'CASE_ASSIGNED'
    | 'CASE_CLOSED'
    | 'CASE_REOPENED'
    | 'EVIDENCE_ADDED'
    | 'EVIDENCE_CORRECTED'
    | 'EVIDENCE_VISIBILITY_CHANGED'
    | 'NOTE_ADDED';

// ===== BASE EVENT =====
export interface BaseEvent {
    readonly id: string;               // UUID v4
    readonly type: EventType;          // Event type
    readonly actorId: string;          // Who performed action
    readonly actorRole: UserRole;      // Role at time of action
    readonly occurredAt: string;       // ISO 8601 timestamp
    readonly metadata?: {              // Additional context
        userAgent?: string;
        ipAddress?: string;
        deviceId?: string;
    };
}

// ===== EVENT PAYLOADS =====

export interface CaseCreatedPayload {
    caseId: string;
    title: string;
    description: string;
    createdBy: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    tags: string[];
}

export interface CaseAssignedPayload {
    caseId: string;
    assignedTo: string;      // Investigator ID
    assignedBy: string;      // Supervisor ID
    reason?: string;
}

export interface CaseClosedPayload {
    caseId: string;
    reason: string;
    closedBy: string;
    conclusion?: string;
}

export interface CaseReopenedPayload {
    caseId: string;
    reason: string;
    reopenedBy: string;
}

export interface EvidenceAddedPayload {
    evidenceId: string;
    caseId: string;
    type: EvidenceType;
    content: string;         // File path, text content, or URL
    hash: string;            // SHA-256 hash
    description: string;
    submittedBy: string;
    visibility: EvidenceVisibility;
    tags: string[];
}

export interface EvidenceCorrectedPayload {
    originalEvidenceId: string;
    newEvidenceId: string;
    caseId: string;
    correctionReason: string;
    correctedBy: string;
}

export interface EvidenceVisibilityChangedPayload {
    evidenceId: string;
    caseId: string;
    oldVisibility: EvidenceVisibility;
    newVisibility: EvidenceVisibility;
    changedBy: string;
    reason: string;
}

export interface NoteAddedPayload {
    noteId: string;
    caseId: string;
    content: string;
    addedBy: string;
    isInternal: boolean;     // Internal notes only visible to investigators+
}

// ===== SPECIFIC EVENTS =====

export interface CaseCreatedEvent extends BaseEvent {
    type: 'CASE_CREATED';
    payload: CaseCreatedPayload;
}

export interface CaseAssignedEvent extends BaseEvent {
    type: 'CASE_ASSIGNED';
    payload: CaseAssignedPayload;
}

export interface CaseClosedEvent extends BaseEvent {
    type: 'CASE_CLOSED';
    payload: CaseClosedPayload;
}

export interface CaseReopenedEvent extends BaseEvent {
    type: 'CASE_REOPENED';
    payload: CaseReopenedPayload;
}

export interface EvidenceAddedEvent extends BaseEvent {
    type: 'EVIDENCE_ADDED';
    payload: EvidenceAddedPayload;
}

export interface EvidenceCorrectedEvent extends BaseEvent {
    type: 'EVIDENCE_CORRECTED';
    payload: EvidenceCorrectedPayload;
}

export interface EvidenceVisibilityChangedEvent extends BaseEvent {
    type: 'EVIDENCE_VISIBILITY_CHANGED';
    payload: EvidenceVisibilityChangedPayload;
}

export interface NoteAddedEvent extends BaseEvent {
    type: 'NOTE_ADDED';
    payload: NoteAddedPayload;
}

// ===== UNION TYPE =====
export type AppEvent =
    | CaseCreatedEvent
    | CaseAssignedEvent
    | CaseClosedEvent
    | CaseReopenedEvent
    | EvidenceAddedEvent
    | EvidenceCorrectedEvent
    | EvidenceVisibilityChangedEvent
    | NoteAddedEvent;

// ===== TYPE GUARDS =====
export function isCaseCreatedEvent(event: AppEvent): event is CaseCreatedEvent {
    return event.type === 'CASE_CREATED';
}

export function isEvidenceAddedEvent(event: AppEvent): event is EvidenceAddedEvent {
    return event.type === 'EVIDENCE_ADDED';
}

export function isNoteAddedEvent(event: AppEvent): event is NoteAddedEvent {
    return event.type === 'NOTE_ADDED';
}

// Add similar guards for other event types...

// ===== EVENT CREATOR =====
export function createEvent<T extends AppEvent>(
    type: T['type'],
    payload: Omit<T['payload'], 'occurredAt'>,
    actorId: string,
    actorRole: UserRole,
    metadata?: BaseEvent['metadata']
): T {
    return {
        id: crypto.randomUUID(),
        type,
        actorId,
        actorRole,
        occurredAt: new Date().toISOString(),
        metadata,
        payload: payload as T['payload'],
    } as T;
}

// ===== EVENT VALIDATION =====
export function validateEvent(event: Partial<AppEvent>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!event.id) errors.push('Event missing id');
    if (!event.type) errors.push('Event missing type');
    if (!event.actorId) errors.push('Event missing actorId');
    if (!event.actorRole) errors.push('Event missing actorRole');
    if (!event.occurredAt) errors.push('Event missing occurredAt');

    // Validate timestamp format
    if (event.occurredAt && isNaN(Date.parse(event.occurredAt))) {
        errors.push('Invalid occurredAt timestamp');
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}
