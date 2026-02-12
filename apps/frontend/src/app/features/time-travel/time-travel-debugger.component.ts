import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TimeTravelStore } from './time-travel.store';
import { CaseStore } from '../../core/state/case-store.service';

/**
 * TimeTravelDebuggerComponent
 * 
 * Provides an interactive UI for replaying case events.
 * It strictly interacts with TimeTravelStore to scrub through history.
 * 
 * Deterministic replay is possible because each state is derived by reducing
 * the sequence of immutable events up to the selected point.
 */
@Component({
    selector: 'app-time-travel-debugger',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './time-travel-debugger.component.html',
    styleUrls: ['./time-travel-debugger.component.css']
})
export class TimeTravelDebuggerComponent {
    private timeTravelStore = inject(TimeTravelStore);
    private caseStore = inject(CaseStore);

    // Expose store signals to template
    currentEventIndex = this.timeTravelStore.currentEventIndex;
    totalEvents = this.timeTravelStore.totalEvents;
    currentEvent = this.timeTravelStore.currentEvent;
    isPlaying = this.timeTravelStore.isPlaying;
    isAtStart = this.timeTravelStore.isAtStart;
    isAtEnd = this.timeTravelStore.isAtEnd;

    viewingInfo = computed(() => {
        const index = this.currentEventIndex();
        const total = this.totalEvents();
        if (index === -1) return 'Viewing initial state';
        return `Viewing state at event ${index + 1} of ${total}`;
    });

    onSliderChange(event: Event): void {
        const input = event.target as HTMLInputElement;
        this.timeTravelStore.goTo(Number(input.value));
    }

    stepForward(): void {
        this.timeTravelStore.stepForward();
    }

    stepBackward(): void {
        this.timeTravelStore.stepBackward();
    }

    togglePlay(): void {
        if (this.isPlaying()) {
            this.timeTravelStore.pause();
        } else {
            this.timeTravelStore.play();
        }
    }

    reset(): void {
        this.timeTravelStore.reset();
    }

    getEventTypeClass(type: string): string {
        if (type?.includes('EVIDENCE')) return 'event-type-evidence';
        if (type?.includes('CASE')) return 'event-type-case';
        if (type?.includes('HYPOTHESIS')) return 'event-type-hypothesis';
        if (type?.includes('NOTE')) return 'event-type-note';
        return 'event-type-other';
    }
}
