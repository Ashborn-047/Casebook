/**
 * PURE EVENT REDUCER
 * Deterministic function that computes state from events
 * NO side effects, NO dependencies, NO mutations
 */

import {
    AppEvent,
    CaseCreatedEvent,
    EvidenceAddedEvent,
    NoteAddedEvent,
    CaseStatus,
    EvidenceVisibility
} from '@casbook/shared-models';
import {
    CaseState,
    Evidence,
    Note,
    INITIAL_CASE_STATE
} from '@casbook/shared-models';

// ===== REDUCER CORE =====

/**
 * Reduce array of events to CaseState
 */
export function reduceEvents(events: AppEvent[]): CaseState {
    // Start with empty state (no ID yet)
    let state: CaseState = {
        ...INITIAL_CASE_STATE,
        id: '',
        createdAt: '',
    } as CaseState;

    // Sort events chronologically
    const sortedEvents = [...events].sort(
        (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime()
    );

    // Apply each event
    for (const event of sortedEvents) {
        state = applyEvent(state, event);
    }

    return state;
}

/**
 * Apply single event to state (immutable)
 */
function applyEvent(state: CaseState, event: AppEvent): CaseState {
    switch (event.type) {
        case 'CASE_CREATED':
            return applyCaseCreated(state, event);

        case 'CASE_ASSIGNED':
            return applyCaseAssigned(state, event);

        case 'CASE_CLOSED':
            return applyCaseClosed(state, event);

        case 'CASE_REOPENED':
            return applyCaseReopened(state, event);

        case 'EVIDENCE_ADDED':
            return applyEvidenceAdded(state, event);

        case 'EVIDENCE_CORRECTED':
            return applyEvidenceCorrected(state, event);

        case 'EVIDENCE_VISIBILITY_CHANGED':
            return applyEvidenceVisibilityChanged(state, event);

        case 'NOTE_ADDED':
            return applyNoteAdded(state, event);

        default:
            // Exhaustiveness check for TypeScript
            const _exhaustiveCheck: never = event;
            return state;
    }
}

// ===== EVENT APPLIERS =====

function applyCaseCreated(state: CaseState, event: CaseCreatedEvent): CaseState {
    return {
        ...state,
        id: event.payload.caseId,
        title: event.payload.title,
        description: event.payload.description,
        severity: event.payload.severity,
        tags: [...event.payload.tags],
        createdAt: event.occurredAt,
        updatedAt: event.occurredAt,
        lastActivityAt: event.occurredAt,
        eventIds: [...state.eventIds, event.id],
    };
}

function applyCaseAssigned(state: CaseState, event: AppEvent): CaseState {
    if (event.type !== 'CASE_ASSIGNED') return state;

    return {
        ...state,
        assignedInvestigatorId: event.payload.assignedTo,
        assignedBy: event.payload.assignedBy,
        assignedAt: event.occurredAt,
        updatedAt: event.occurredAt,
        lastActivityAt: event.occurredAt,
        eventIds: [...state.eventIds, event.id],
    };
}

function applyCaseClosed(state: CaseState, event: AppEvent): CaseState {
    if (event.type !== 'CASE_CLOSED') return state;

    return {
        ...state,
        status: 'closed' as CaseStatus,
        closedAt: event.occurredAt,
        updatedAt: event.occurredAt,
        lastActivityAt: event.occurredAt,
        eventIds: [...state.eventIds, event.id],
    };
}

function applyCaseReopened(state: CaseState, event: AppEvent): CaseState {
    if (event.type !== 'CASE_REOPENED') return state;

    return {
        ...state,
        status: 'open' as CaseStatus,
        reopenedAt: event.occurredAt,
        updatedAt: event.occurredAt,
        lastActivityAt: event.occurredAt,
        eventIds: [...state.eventIds, event.id],
    };
}

function applyEvidenceAdded(state: CaseState, event: EvidenceAddedEvent): CaseState {
    const newEvidence: Evidence = {
        id: event.payload.evidenceId,
        caseId: event.payload.caseId,
        type: event.payload.type,
        content: event.payload.content,
        hash: event.payload.hash,
        description: event.payload.description,
        submittedBy: event.payload.submittedBy,
        submittedAt: event.occurredAt,
        visibility: event.payload.visibility,
        version: 1,
        tags: [...event.payload.tags],
    };

    const restrictedCount = event.payload.visibility === 'restricted'
        ? state.restrictedEvidenceCount + 1
        : state.restrictedEvidenceCount;

    return {
        ...state,
        evidence: [...state.evidence, newEvidence],
        evidenceCount: state.evidence.length + 1,
        restrictedEvidenceCount: restrictedCount,
        updatedAt: event.occurredAt,
        lastActivityAt: event.occurredAt,
        eventIds: [...state.eventIds, event.id],
    };
}

function applyEvidenceCorrected(state: CaseState, event: AppEvent): CaseState {
    if (event.type !== 'EVIDENCE_CORRECTED') return state;

    // Find the evidence being corrected
    const evidenceIndex = state.evidence.findIndex(
        e => e.id === event.payload.originalEvidenceId
    );

    if (evidenceIndex === -1) return state;

    const originalEvidence = state.evidence[evidenceIndex];
    const correctedEvidence: Evidence = {
        ...originalEvidence,
        id: event.payload.newEvidenceId,
        version: originalEvidence.version + 1,
        corrections: [
            ...(originalEvidence.corrections || []),
            {
                originalId: event.payload.originalEvidenceId,
                reason: event.payload.correctionReason,
                correctedAt: event.occurredAt,
                correctedBy: event.payload.correctedBy,
            }
        ],
    };

    // Replace old evidence with corrected version
    const newEvidence = [...state.evidence];
    newEvidence[evidenceIndex] = correctedEvidence;

    return {
        ...state,
        evidence: newEvidence,
        updatedAt: event.occurredAt,
        lastActivityAt: event.occurredAt,
        eventIds: [...state.eventIds, event.id],
    };
}

function applyEvidenceVisibilityChanged(state: CaseState, event: AppEvent): CaseState {
    if (event.type !== 'EVIDENCE_VISIBILITY_CHANGED') return state;

    const evidenceIndex = state.evidence.findIndex(
        e => e.id === event.payload.evidenceId
    );

    if (evidenceIndex === -1) return state;

    const evidence = state.evidence[evidenceIndex];
    const updatedEvidence: Evidence = {
        ...evidence,
        visibility: event.payload.newVisibility,
    };

    const newEvidence = [...state.evidence];
    newEvidence[evidenceIndex] = updatedEvidence;

    // Update restricted count
    let restrictedCount = state.restrictedEvidenceCount;
    if (event.payload.oldVisibility === 'restricted' && event.payload.newVisibility === 'normal') {
        restrictedCount--;
    } else if (event.payload.oldVisibility === 'normal' && event.payload.newVisibility === 'restricted') {
        restrictedCount++;
    }

    return {
        ...state,
        evidence: newEvidence,
        restrictedEvidenceCount: restrictedCount,
        updatedAt: event.occurredAt,
        lastActivityAt: event.occurredAt,
        eventIds: [...state.eventIds, event.id],
    };
}

function applyNoteAdded(state: CaseState, event: NoteAddedEvent): CaseState {
    const newNote: Note = {
        id: event.payload.noteId,
        caseId: event.payload.caseId,
        content: event.payload.content,
        addedBy: event.payload.addedBy,
        addedAt: event.occurredAt,
        isInternal: event.payload.isInternal,
        tags: [],
    };

    const internalNoteCount = event.payload.isInternal
        ? state.internalNoteCount + 1
        : state.internalNoteCount;

    return {
        ...state,
        notes: [...state.notes, newNote],
        noteCount: state.notes.length + 1,
        internalNoteCount,
        updatedAt: event.occurredAt,
        lastActivityAt: event.occurredAt,
        eventIds: [...state.eventIds, event.id],
    };
}

// ===== UTILITY FUNCTIONS =====

/**
 * Get case state at specific point in time
 */
export function getStateAtTime(events: AppEvent[], timestamp: string): CaseState {
    const eventsUpToTime = events.filter(event =>
        new Date(event.occurredAt) <= new Date(timestamp)
    );
    return reduceEvents(eventsUpToTime);
}

/**
 * Replay events step by step (for debugging/time travel)
 */
export function replayEvents(events: AppEvent[]): CaseState[] {
    const states: CaseState[] = [];
    const sortedEvents = [...events].sort(
        (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime()
    );

    let currentState: CaseState = {
        ...INITIAL_CASE_STATE,
        id: '',
        createdAt: '',
    } as CaseState;

    for (const event of sortedEvents) {
        currentState = applyEvent(currentState, event);
        states.push({ ...currentState }); // Clone state
    }

    return states;
}

/**
 * Validate event sequence (no future events, proper ordering)
 */
export function validateEventSequence(events: AppEvent[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const sortedEvents = [...events].sort(
        (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime()
    );

    // Check for CASE_CREATED as first event
    const firstEvent = sortedEvents[0];
    if (firstEvent && firstEvent.type !== 'CASE_CREATED') {
        errors.push('First event must be CASE_CREATED');
    }

    // Check chronological order (should match sorted order)
    for (let i = 1; i < sortedEvents.length; i++) {
        const prevTime = new Date(sortedEvents[i - 1].occurredAt).getTime();
        const currTime = new Date(sortedEvents[i].occurredAt).getTime();

        if (currTime < prevTime) {
            errors.push(`Event ${sortedEvents[i].id} occurs before previous event`);
        }
    }

    // Check for duplicate event IDs
    const eventIds = new Set<string>();
    for (const event of sortedEvents) {
        if (eventIds.has(event.id)) {
            errors.push(`Duplicate event ID: ${event.id}`);
        }
        eventIds.add(event.id);
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}
