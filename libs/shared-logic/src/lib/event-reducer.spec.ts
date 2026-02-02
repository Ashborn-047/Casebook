import { reduceEvents, getStateAtTime, replayEvents, validateEventSequence } from './event-reducer';
import {
    AppEvent,
    CaseCreatedEvent,
    CaseAssignedEvent,
    CaseClosedEvent,
    CaseReopenedEvent,
    EvidenceAddedEvent,
    EvidenceCorrectedEvent,
    EvidenceVisibilityChangedEvent,
    NoteAddedEvent,
} from '@casbook/shared-models';

// ===== TEST HELPERS =====
// Using explicit event objects for proper TypeScript typing

let eventCounter = 0;
function nextId(): string {
    return `event-${++eventCounter}`;
}

function createCaseCreatedEvent(overrides: Partial<CaseCreatedEvent['payload']> = {}): CaseCreatedEvent {
    return {
        id: nextId(),
        type: 'CASE_CREATED',
        actorId: 'user-1',
        actorRole: 'investigator',
        occurredAt: new Date().toISOString(),
        payload: {
            caseId: 'test-1',
            title: 'Test Case',
            description: 'Test Description',
            createdBy: 'user-1',
            severity: 'medium',
            tags: ['test'],
            ...overrides,
        },
    };
}

function createEvidenceAddedEvent(overrides: Partial<EvidenceAddedEvent['payload']> = {}): EvidenceAddedEvent {
    return {
        id: nextId(),
        type: 'EVIDENCE_ADDED',
        actorId: 'user-1',
        actorRole: 'investigator',
        occurredAt: new Date().toISOString(),
        payload: {
            evidenceId: 'ev-1',
            caseId: 'test-1',
            type: 'text',
            content: 'Evidence content',
            hash: 'hash-123',
            description: 'Test evidence',
            submittedBy: 'user-1',
            visibility: 'normal',
            tags: [],
            ...overrides,
        },
    };
}

function createNoteAddedEvent(overrides: Partial<NoteAddedEvent['payload']> = {}): NoteAddedEvent {
    return {
        id: nextId(),
        type: 'NOTE_ADDED',
        actorId: 'user-1',
        actorRole: 'investigator',
        occurredAt: new Date().toISOString(),
        payload: {
            noteId: 'note-1',
            caseId: 'test-1',
            content: 'Note content',
            addedBy: 'user-1',
            isInternal: false,
            ...overrides,
        },
    };
}

function createCaseAssignedEvent(): CaseAssignedEvent {
    return {
        id: nextId(),
        type: 'CASE_ASSIGNED',
        actorId: 'supervisor-1',
        actorRole: 'supervisor',
        occurredAt: new Date().toISOString(),
        payload: {
            caseId: 'test-1',
            assignedTo: 'investigator-1',
            assignedBy: 'supervisor-1',
            reason: 'Expertise in area',
        },
    };
}

function createCaseClosedEvent(): CaseClosedEvent {
    return {
        id: nextId(),
        type: 'CASE_CLOSED',
        actorId: 'supervisor-1',
        actorRole: 'supervisor',
        occurredAt: new Date().toISOString(),
        payload: {
            caseId: 'test-1',
            reason: 'Investigation complete',
            closedBy: 'supervisor-1',
            conclusion: 'No further action required',
        },
    };
}

function createCaseReopenedEvent(): CaseReopenedEvent {
    return {
        id: nextId(),
        type: 'CASE_REOPENED',
        actorId: 'supervisor-1',
        actorRole: 'supervisor',
        occurredAt: new Date().toISOString(),
        payload: {
            caseId: 'test-1',
            reason: 'New evidence found',
            reopenedBy: 'supervisor-1',
        },
    };
}

function createEvidenceCorrectedEvent(): EvidenceCorrectedEvent {
    return {
        id: nextId(),
        type: 'EVIDENCE_CORRECTED',
        actorId: 'user-1',
        actorRole: 'investigator',
        occurredAt: new Date().toISOString(),
        payload: {
            originalEvidenceId: 'ev-1',
            newEvidenceId: 'ev-1-v2',
            caseId: 'test-1',
            correctionReason: 'Typo correction',
            correctedBy: 'user-1',
        },
    };
}

function createEvidenceVisibilityChangedEvent(): EvidenceVisibilityChangedEvent {
    return {
        id: nextId(),
        type: 'EVIDENCE_VISIBILITY_CHANGED',
        actorId: 'supervisor-1',
        actorRole: 'supervisor',
        occurredAt: new Date().toISOString(),
        payload: {
            evidenceId: 'ev-1',
            caseId: 'test-1',
            oldVisibility: 'normal',
            newVisibility: 'restricted',
            changedBy: 'supervisor-1',
            reason: 'Contains sensitive information',
        },
    };
}

// ===== TESTS =====

describe('Event Reducer', () => {
    beforeEach(() => {
        eventCounter = 0;
    });

    describe('reduceEvents', () => {
        it('should reduce empty events to initial state', () => {
            const state = reduceEvents([]);
            expect(state.id).toBe('');
            expect(state.evidenceCount).toBe(0);
            expect(state.status).toBe('open');
        });

        it('should create case from CASE_CREATED event', () => {
            const event = createCaseCreatedEvent();
            const state = reduceEvents([event]);
            expect(state.id).toBe('test-1');
            expect(state.title).toBe('Test Case');
            expect(state.createdAt).toBe(event.occurredAt);
        });

        it('should sort events chronologically before applying', () => {
            const event1 = createCaseCreatedEvent();
            const event2 = createEvidenceAddedEvent();

            // Pass events in reverse order
            const state = reduceEvents([event2, event1]);
            expect(state.id).toBe('test-1');
            expect(state.evidenceCount).toBe(1);
        });
    });

    describe('CASE_ASSIGNED event', () => {
        it('should assign investigator to case', () => {
            const caseEvent = createCaseCreatedEvent();
            const assignEvent = createCaseAssignedEvent();

            const state = reduceEvents([caseEvent, assignEvent]);
            expect(state.assignedInvestigatorId).toBe('investigator-1');
            expect(state.assignedBy).toBe('supervisor-1');
            expect(state.assignedAt).toBe(assignEvent.occurredAt);
        });
    });

    describe('CASE_CLOSED event', () => {
        it('should close case and update status', () => {
            const caseEvent = createCaseCreatedEvent();
            const closeEvent = createCaseClosedEvent();

            const state = reduceEvents([caseEvent, closeEvent]);
            expect(state.status).toBe('closed');
            expect(state.closedAt).toBe(closeEvent.occurredAt);
        });
    });

    describe('CASE_REOPENED event', () => {
        it('should reopen closed case', () => {
            const caseEvent = createCaseCreatedEvent();
            const closeEvent = createCaseClosedEvent();
            const reopenEvent = createCaseReopenedEvent();

            const state = reduceEvents([caseEvent, closeEvent, reopenEvent]);
            expect(state.status).toBe('open');
            expect(state.reopenedAt).toBe(reopenEvent.occurredAt);
        });
    });

    describe('EVIDENCE_ADDED event', () => {
        it('should add evidence and increment count', () => {
            const caseEvent = createCaseCreatedEvent();
            const evidenceEvent = createEvidenceAddedEvent({ tags: ['important'] });

            const state = reduceEvents([caseEvent, evidenceEvent]);
            expect(state.evidenceCount).toBe(1);
            expect(state.evidence).toHaveLength(1);
            expect(state.evidence[0].id).toBe('ev-1');
            expect(state.evidence[0].tags).toEqual(['important']);
        });

        it('should track restricted evidence count', () => {
            const caseEvent = createCaseCreatedEvent();
            const normalEvidence = createEvidenceAddedEvent({ evidenceId: 'ev-1', visibility: 'normal' });
            const restrictedEvidence = createEvidenceAddedEvent({ evidenceId: 'ev-2', visibility: 'restricted' });

            const state = reduceEvents([caseEvent, normalEvidence, restrictedEvidence]);
            expect(state.evidenceCount).toBe(2);
            expect(state.restrictedEvidenceCount).toBe(1);
        });
    });

    describe('EVIDENCE_CORRECTED event', () => {
        it('should create corrected version of evidence', () => {
            const caseEvent = createCaseCreatedEvent();
            const evidenceEvent = createEvidenceAddedEvent();
            const correctionEvent = createEvidenceCorrectedEvent();

            const state = reduceEvents([caseEvent, evidenceEvent, correctionEvent]);
            expect(state.evidence).toHaveLength(1);
            expect(state.evidence[0].id).toBe('ev-1-v2');
            expect(state.evidence[0].version).toBe(2);
            expect(state.evidence[0].corrections).toHaveLength(1);
            expect(state.evidence[0].corrections![0].reason).toBe('Typo correction');
        });
    });

    describe('EVIDENCE_VISIBILITY_CHANGED event', () => {
        it('should change evidence visibility and update count', () => {
            const caseEvent = createCaseCreatedEvent();
            const evidenceEvent = createEvidenceAddedEvent();
            const visibilityEvent = createEvidenceVisibilityChangedEvent();

            const state = reduceEvents([caseEvent, evidenceEvent, visibilityEvent]);
            expect(state.evidence[0].visibility).toBe('restricted');
            expect(state.restrictedEvidenceCount).toBe(1);
        });
    });

    describe('NOTE_ADDED event', () => {
        it('should add note and increment count', () => {
            const caseEvent = createCaseCreatedEvent();
            const noteEvent = createNoteAddedEvent({ content: 'Investigation notes' });

            const state = reduceEvents([caseEvent, noteEvent]);
            expect(state.noteCount).toBe(1);
            expect(state.notes).toHaveLength(1);
            expect(state.notes[0].content).toBe('Investigation notes');
        });

        it('should track internal notes separately', () => {
            const caseEvent = createCaseCreatedEvent();
            const publicNote = createNoteAddedEvent({ noteId: 'note-1', isInternal: false });
            const internalNote = createNoteAddedEvent({ noteId: 'note-2', isInternal: true });

            const state = reduceEvents([caseEvent, publicNote, internalNote]);
            expect(state.noteCount).toBe(2);
            expect(state.internalNoteCount).toBe(1);
        });
    });

    describe('Event tracking', () => {
        it('should track all event IDs', () => {
            const caseEvent = createCaseCreatedEvent();
            const noteEvent = createNoteAddedEvent();

            const state = reduceEvents([caseEvent, noteEvent]);
            expect(state.eventIds).toHaveLength(2);
            expect(state.eventIds).toContain(caseEvent.id);
            expect(state.eventIds).toContain(noteEvent.id);
        });

        it('should track last activity timestamp', () => {
            const caseEvent = createCaseCreatedEvent();
            const noteEvent = createNoteAddedEvent();

            const state = reduceEvents([caseEvent, noteEvent]);
            expect(state.lastActivityAt).toBe(noteEvent.occurredAt);
            expect(state.updatedAt).toBe(noteEvent.occurredAt);
        });
    });
});

describe('Utility Functions', () => {
    beforeEach(() => {
        eventCounter = 0;
    });

    describe('getStateAtTime', () => {
        it('should return state at specific point in time', () => {
            const baseTime = new Date('2024-01-01T10:00:00Z');
            const caseEvent: CaseCreatedEvent = {
                ...createCaseCreatedEvent(),
                occurredAt: baseTime.toISOString(),
            };

            const noteEvent: NoteAddedEvent = {
                ...createNoteAddedEvent(),
                occurredAt: new Date('2024-01-01T12:00:00Z').toISOString(),
            };

            const events = [caseEvent, noteEvent];

            // Get state before note was added
            const earlyState = getStateAtTime(events, '2024-01-01T11:00:00Z');
            expect(earlyState.noteCount).toBe(0);

            // Get state after note was added
            const laterState = getStateAtTime(events, '2024-01-01T13:00:00Z');
            expect(laterState.noteCount).toBe(1);
        });
    });

    describe('replayEvents', () => {
        it('should return array of states for each event', () => {
            const caseEvent = createCaseCreatedEvent();
            const noteEvent = createNoteAddedEvent();

            const states = replayEvents([caseEvent, noteEvent]);
            expect(states).toHaveLength(2);
            expect(states[0].noteCount).toBe(0);
            expect(states[1].noteCount).toBe(1);
        });
    });

    describe('validateEventSequence', () => {
        it('should validate correct sequence', () => {
            const caseEvent = createCaseCreatedEvent();
            const noteEvent = createNoteAddedEvent();

            const result = validateEventSequence([caseEvent, noteEvent]);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should detect missing CASE_CREATED as first event', () => {
            const noteEvent = createNoteAddedEvent();

            const result = validateEventSequence([noteEvent]);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('First event must be CASE_CREATED');
        });

        it('should detect duplicate event IDs', () => {
            const caseEvent = createCaseCreatedEvent();
            const duplicateEvent = { ...caseEvent }; // Same ID

            const result = validateEventSequence([caseEvent, duplicateEvent]);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('Duplicate event ID'))).toBe(true);
        });
    });
});
