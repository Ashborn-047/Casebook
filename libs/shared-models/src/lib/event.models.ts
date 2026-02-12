/**
 * CASBOOK - Event Sourcing Core with Mind Palace
 * Every meaningful action is an immutable event
 */

// ===== ENUMS =====
export type UserRole = 'viewer' | 'investigator' | 'supervisor';
export type CaseStatus = 'open' | 'closed';
export type EvidenceType = 'file' | 'text' | 'url';
export type EvidenceVisibility = 'normal' | 'restricted';
export type EvidenceTrustLevel = 'unverified' | 'verified' | 'disputed' | 'disproven';
export type ConnectionType = 'supports' | 'contradicts' | 'related_to' | 'timeline' | 'causality' | 'metadata';
export type HypothesisStatus = 'active' | 'disproven' | 'proven' | 'archived';
export type ConnectionStrength = 1 | 2 | 3; // Weak, Medium, Strong

// ===== EVENT TYPES =====
export type EventType =
    | 'CASE_CREATED'
    | 'CASE_ASSIGNED'
    | 'CASE_CLOSED'
    | 'CASE_REOPENED'
    | 'EVIDENCE_ADDED'
    | 'EVIDENCE_CORRECTED'
    | 'EVIDENCE_VISIBILITY_CHANGED'
    | 'NOTE_ADDED'
    // ===== MIND PALACE EVENTS =====
    | 'EVIDENCE_CONNECTED'
    | 'EVIDENCE_DISCONNECTED'
    | 'HYPOTHESIS_CREATED'
    | 'HYPOTHESIS_UPDATED'
    | 'HYPOTHESIS_RESOLVED'
    | 'VISUAL_LAYOUT_UPDATED'
    | 'INVESTIGATION_PATH_CREATED'
    | 'EVIDENCE_TRUST_CHANGED';

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
        boardX?: number;               // For visual events (x coordinate)
        boardY?: number;               // For visual events (y coordinate)
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

// ===== MIND PALACE PAYLOADS =====

export interface EvidenceConnectedPayload {
    connectionId: string;
    caseId: string;
    sourceEvidenceId: string;
    targetEvidenceId: string;
    connectionType: ConnectionType;
    reason: string;
    strength: ConnectionStrength;
    notes?: string;
}

export interface EvidenceDisconnectedPayload {
    connectionId: string;
    caseId: string;
    disconnectedBy: string;
    reason: string;
}

export interface HypothesisCreatedPayload {
    hypothesisId: string;
    caseId: string;
    title: string;
    description: string;
    supportingEvidenceIds: string[];
    confidence: 'low' | 'medium' | 'high';
    status: HypothesisStatus;
    color?: string;
}

export interface HypothesisUpdatedPayload {
    hypothesisId: string;
    caseId: string;
    updates: {
        title?: string;
        description?: string;
        confidence?: 'low' | 'medium' | 'high';
        status?: HypothesisStatus;
        supportingEvidenceIds?: string[];
    };
}

export interface HypothesisResolvedPayload {
    hypothesisId: string;
    caseId: string;
    resolution: 'proven' | 'disproven';
    conclusion: string;
    resolvedBy: string;
}

export interface VisualLayoutUpdatedPayload {
    caseId: string;
    nodePositions: Record<string, { x: number; y: number }>;
    canvasView: {
        zoom: number;
        panX: number;
        panY: number;
    };
}

export interface InvestigationPathCreatedPayload {
    pathId: string;
    caseId: string;
    title: string;
    description: string;
    sequence: string[];
    summary: string;
}

export interface EvidenceTrustChangedPayload {
    evidenceId: string;
    caseId: string;
    oldTrustLevel: EvidenceTrustLevel;
    newTrustLevel: EvidenceTrustLevel;
    changedBy: string;
    reason: string;
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

// ===== MIND PALACE EVENTS =====

export interface EvidenceConnectedEvent extends BaseEvent {
    type: 'EVIDENCE_CONNECTED';
    payload: EvidenceConnectedPayload;
}

export interface EvidenceDisconnectedEvent extends BaseEvent {
    type: 'EVIDENCE_DISCONNECTED';
    payload: EvidenceDisconnectedPayload;
}

export interface HypothesisCreatedEvent extends BaseEvent {
    type: 'HYPOTHESIS_CREATED';
    payload: HypothesisCreatedPayload;
}

export interface HypothesisUpdatedEvent extends BaseEvent {
    type: 'HYPOTHESIS_UPDATED';
    payload: HypothesisUpdatedPayload;
}

export interface HypothesisResolvedEvent extends BaseEvent {
    type: 'HYPOTHESIS_RESOLVED';
    payload: HypothesisResolvedPayload;
}

export interface VisualLayoutUpdatedEvent extends BaseEvent {
    type: 'VISUAL_LAYOUT_UPDATED';
    payload: VisualLayoutUpdatedPayload;
}

export interface InvestigationPathCreatedEvent extends BaseEvent {
    type: 'INVESTIGATION_PATH_CREATED';
    payload: InvestigationPathCreatedPayload;
}

export interface EvidenceTrustChangedEvent extends BaseEvent {
    type: 'EVIDENCE_TRUST_CHANGED';
    payload: EvidenceTrustChangedPayload;
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
    | NoteAddedEvent
    // ===== MIND PALACE EVENTS =====
    | EvidenceConnectedEvent
    | EvidenceDisconnectedEvent
    | HypothesisCreatedEvent
    | HypothesisUpdatedEvent
    | HypothesisResolvedEvent
    | VisualLayoutUpdatedEvent
    | InvestigationPathCreatedEvent
    | EvidenceTrustChangedEvent;

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

export function isEvidenceConnectedEvent(event: AppEvent): event is EvidenceConnectedEvent {
    return event.type === 'EVIDENCE_CONNECTED';
}

export function isHypothesisCreatedEvent(event: AppEvent): event is HypothesisCreatedEvent {
    return event.type === 'HYPOTHESIS_CREATED';
}

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

// ===== MIND PALACE SPECIFIC CREATORS =====
export function createEvidenceConnection(
    caseId: string,
    sourceEvidenceId: string,
    targetEvidenceId: string,
    connectionType: ConnectionType,
    reason: string,
    strength: ConnectionStrength,
    actorId: string,
    actorRole: UserRole,
    notes?: string
): EvidenceConnectedEvent {
    return createEvent('EVIDENCE_CONNECTED', {
        connectionId: `conn-${crypto.randomUUID().split('-')[0]}`,
        caseId,
        sourceEvidenceId,
        targetEvidenceId,
        connectionType,
        reason,
        strength,
        notes,
    }, actorId, actorRole);
}

export function createHypothesis(
    caseId: string,
    title: string,
    description: string,
    supportingEvidenceIds: string[],
    confidence: 'low' | 'medium' | 'high',
    actorId: string,
    actorRole: UserRole,
    color?: string
): HypothesisCreatedEvent {
    return createEvent('HYPOTHESIS_CREATED', {
        hypothesisId: `hyp-${crypto.randomUUID().split('-')[0]}`,
        caseId,
        title,
        description,
        supportingEvidenceIds,
        confidence,
        status: 'active',
        color,
    }, actorId, actorRole);
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
