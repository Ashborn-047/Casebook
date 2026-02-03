import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TimeTravelStore } from './time-travel.store';
import { CaseStore } from '../../core/state/case-store.service';
import { AppEvent, CaseCreatedEvent, EvidenceAddedEvent, INITIAL_CASE_STATE } from '@casbook/shared-models';
import { signal, computed } from '@angular/core';

describe('TimeTravelStore', () => {
    let store: TimeTravelStore;
    let mockCaseStore: any;

    // Mock events
    const mockEvents: AppEvent[] = [
        {
            id: 'e1',
            type: 'CASE_CREATED',
            actorId: 'user-1',
            actorRole: 'investigator',
            occurredAt: '2024-01-01T10:00:00Z',
            payload: {
                caseId: 'test-1',
                title: 'Test Case',
                description: 'Initial State',
                createdBy: 'user-1',
                severity: 'medium',
                tags: []
            }
        } as CaseCreatedEvent,
        {
            id: 'e2',
            type: 'EVIDENCE_ADDED',
            actorId: 'user-1',
            actorRole: 'investigator',
            occurredAt: '2024-01-01T11:00:00Z',
            payload: {
                evidenceId: 'ev-1',
                caseId: 'test-1',
                type: 'text',
                content: 'Evidence content',
                hash: 'h1',
                description: 'First evidence',
                submittedBy: 'user-1',
                visibility: 'normal',
                tags: []
            }
        } as EvidenceAddedEvent,
        {
            id: 'e3',
            type: 'CASE_CLOSED',
            actorId: 'user-1',
            actorRole: 'investigator',
            occurredAt: '2024-01-01T12:00:00Z',
            payload: {
                caseId: 'test-1',
                reason: 'Finished',
                closedBy: 'user-1'
            }
        } as any
    ];

    beforeEach(() => {
        // Create a mock CaseStore
        mockCaseStore = {
            currentCaseEvents: signal(mockEvents),
            uiState: signal({ currentCaseId: 'test-1' })
        };

        TestBed.configureTestingModule({
            providers: [
                TimeTravelStore,
                { provide: CaseStore, useValue: mockCaseStore }
            ]
        });

        store = TestBed.inject(TimeTravelStore);
    });

    it('should initialize with the last event index', () => {
        expect(store.currentEventIndex()).toBe(2);
        expect(store.totalEvents()).toBe(3);
    });

    it('should replay correct derived state at arbitrary index', () => {
        // Index 0: Case Created
        store.goTo(0);
        expect(store.replayedCaseState().title).toBe('Test Case');
        expect(store.replayedCaseState().evidence.length).toBe(0);

        // Index 1: Evidence Added
        store.goTo(1);
        expect(store.replayedCaseState().evidence.length).toBe(1);
        expect(store.replayedCaseState().evidence[0].id).toBe('ev-1');

        // Index 2: Case Closed
        store.goTo(2);
        expect(store.replayedCaseState().status).toBe('closed');
    });

    it('should does not mutate original event array', () => {
        const originalLength = mockEvents.length;
        store.goTo(0);
        expect(mockCaseStore.currentCaseEvents().length).toBe(originalLength);
        expect(mockCaseStore.currentCaseEvents()[0].id).toBe('e1');
    });

    it('should stepForward and stepBackward move deterministically', () => {
        store.reset(); // index -1
        expect(store.currentEventIndex()).toBe(-1);

        store.stepForward();
        expect(store.currentEventIndex()).toBe(0);
        expect(store.currentEvent()?.id).toBe('e1');

        store.stepForward();
        expect(store.currentEventIndex()).toBe(1);

        store.stepBackward();
        expect(store.currentEventIndex()).toBe(0);
    });

    it('should not step out of bounds', () => {
        store.goTo(2);
        store.stepForward();
        expect(store.currentEventIndex()).toBe(2);

        store.reset();
        store.stepBackward();
        expect(store.currentEventIndex()).toBe(-1);
    });

    it('should reset returns to initial state (zero events)', () => {
        store.reset();
        expect(store.currentEventIndex()).toBe(-1);
        expect(store.replayedEvents().length).toBe(0);
        expect(store.replayedCaseState().id).toBe('');
        expect(store.replayedCaseState().evidence.length).toBe(0);
    });

    it('should auto-advance when play is called', async () => {
        store.reset();
        store.play(10); // 10ms for fast test

        await new Promise(resolve => setTimeout(resolve, 50));

        expect(store.currentEventIndex()).toBeGreaterThan(-1);
        store.pause();
    });
});
