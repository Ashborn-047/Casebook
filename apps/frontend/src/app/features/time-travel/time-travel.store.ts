import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { CaseStore } from '../../core/state/case-store.service';
import { reduceEvents } from '@casbook/shared-logic';
import { AppEvent, CaseState, INITIAL_CASE_STATE } from '@casbook/shared-models';

/**
 * TimeTravelStore
 * 
 * A signal-based store that allows replaying a case at any point in its event history.
 * This works because Casebook uses Event Sourcing: state is always a pure function
 * of the event stream (reduce(events) => state).
 * 
 * By maintaining an index into the event stream, we can deterministically
 * reconstruct the state as it existed at any point in time.
 */
@Injectable({ providedIn: 'root' })
export class TimeTravelStore {
    private caseStore = inject(CaseStore);

    // The current position in the event timeline (0-based index)
    // currentEventIndex is ephemeral UI state and must never be persisted as an event.
    readonly currentEventIndex = signal<number>(-1);

    // Playback state
    private playInterval: any = null;
    readonly isPlaying = signal<boolean>(false);

    // The full list of events for the current case from CaseStore
    readonly events = computed(() => this.caseStore.currentCaseEvents());

    readonly totalEvents = computed(() => this.events().length);

    readonly isAtStart = computed(() => this.currentEventIndex() <= -1);
    readonly isAtEnd = computed(() => this.currentEventIndex() >= this.totalEvents() - 1);

    /**
     * Replayed events up to the current index.
     * Event sourcing guarantee: replaying events 0..N always yields the same state.
     */
    readonly replayedEvents = computed(() => {
        const allEvents = this.events();
        const index = this.currentEventIndex();
        if (index < 0) return [];
        return allEvents.slice(0, index + 1);
    });

    /**
     * Replayed case state derived from replayedEvents.
     * This is computed on-demand and NOT stored, ensuring it's always in sync with the index.
     */
    readonly replayedCaseState = computed(() => {
        const events = this.replayedEvents();
        if (events.length === 0) {
            return { ...INITIAL_CASE_STATE, id: '', createdAt: '' } as CaseState;
        }
        return reduceEvents(events);
    });

    /**
     * Current event being viewed
     */
    readonly currentEvent = computed(() => {
        const allEvents = this.events();
        const index = this.currentEventIndex();
        if (index < 0 || index >= allEvents.length) return null;
        return allEvents[index];
    });

    constructor() {
        // Initial setup for immediate availability if events already exist
        const initialEvents = this.caseStore.currentCaseEvents();
        const initialCaseId = this.caseStore.uiState().currentCaseId;
        if (initialCaseId && initialEvents.length > 0) {
            this.currentEventIndex.set(initialEvents.length - 1);
        }

        // Reset index when case changes
        effect(() => {
            const caseId = this.caseStore.uiState().currentCaseId;
            if (caseId) {
                // Default to the end of the timeline (latest state)
                this.resetToIndex(this.totalEvents() - 1);
            } else {
                this.currentEventIndex.set(-1);
            }
        }, { allowSignalWrites: true });
    }

    goTo(index: number): void {
        if (index >= -1 && index < this.totalEvents()) {
            this.currentEventIndex.set(index);
        }
    }

    stepForward(): void {
        if (!this.isAtEnd()) {
            this.currentEventIndex.update(i => i + 1);
        } else {
            this.pause();
        }
    }

    stepBackward(): void {
        if (!this.isAtStart()) {
            this.currentEventIndex.update(i => i - 1);
        }
    }

    reset(): void {
        this.currentEventIndex.set(-1);
        this.pause();
    }

    play(intervalMs: number = 1000): void {
        if (this.isPlaying()) return;

        if (this.isAtEnd()) {
            this.reset();
        }

        this.isPlaying.set(true);
        this.playInterval = setInterval(() => {
            this.stepForward();
        }, intervalMs);
    }

    pause(): void {
        if (this.playInterval) {
            clearInterval(this.playInterval);
            this.playInterval = null;
        }
        this.isPlaying.set(false);
    }

    private resetToIndex(index: number): void {
        this.currentEventIndex.set(index);
    }
}
