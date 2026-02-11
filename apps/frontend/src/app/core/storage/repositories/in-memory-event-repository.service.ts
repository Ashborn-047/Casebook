import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { IEventRepository } from './event-repository.interface';
import { AppEvent } from '@casbook/shared-models';
import { CaseState } from '@casbook/shared-models';
import { reduceEvents } from '@casbook/shared-logic';



@Injectable({ providedIn: 'root' })
export class InMemoryEventRepository implements IEventRepository {
    private events: AppEvent[] = [];
    private eventSubject = new Subject<AppEvent>();
    private initialized = false;

    async initialize(): Promise<void> {
        if (this.initialized) return;
        await this.loadDemoData();
        this.initialized = true;
        console.log('InMemoryEventRepository initialized');
    }

    isInitialized(): boolean {
        return this.initialized;
    }

    async saveEvent(event: AppEvent): Promise<void> {
        if (!event.id || !event.type) {
            throw new Error('Invalid event: missing required fields');
        }
        if (this.events.some(e => e.id === event.id)) {
            throw new Error(`Event with ID ${event.id} already exists`);
        }
        this.events.push(event);
        this.eventSubject.next(event);
        await new Promise(resolve => setTimeout(resolve, 50));
    }

    async getEvent(eventId: string): Promise<AppEvent | null> {
        return this.events.find(event => event.id === eventId) || null;
    }

    async getEvents(caseId?: string): Promise<AppEvent[]> {
        if (caseId) {
            return this.events.filter(event =>
                'caseId' in event.payload && (event.payload as { caseId: string }).caseId === caseId
            );
        }
        return [...this.events];
    }

    async getEventsByCase(caseId: string): Promise<AppEvent[]> {
        return this.events.filter(event =>
            'caseId' in event.payload && (event.payload as { caseId: string }).caseId === caseId
        );
    }

    async getEventsByType(eventType: string): Promise<AppEvent[]> {
        return this.events.filter(event => event.type === eventType);
    }

    streamEvents(caseId?: string): Observable<AppEvent> {
        return new Observable(subscriber => {
            const existingEvents = caseId
                ? this.events.filter(e => 'caseId' in e.payload && (e.payload as { caseId: string }).caseId === caseId)
                : this.events;

            existingEvents.forEach(event => subscriber.next(event));

            const subscription = this.eventSubject.subscribe(event => {
                if (!caseId || ('caseId' in event.payload && (event.payload as { caseId: string }).caseId === caseId)) {
                    subscriber.next(event);
                }
            });

            return () => subscription.unsubscribe();
        });
    }

    async getCaseIds(): Promise<string[]> {
        const caseIds = new Set<string>();
        this.events.forEach(event => {
            if ('caseId' in event.payload) {
                caseIds.add((event.payload as { caseId: string }).caseId);
            }
        });
        return Array.from(caseIds);
    }

    async getCaseState(caseId: string): Promise<CaseState | null> {
        const caseEvents = await this.getEventsByCase(caseId);
        if (caseEvents.length === 0) return null;
        return reduceEvents(caseEvents);
    }

    async getCaseStates(): Promise<Record<string, CaseState>> {
        const caseIds = await this.getCaseIds();
        const states: Record<string, CaseState> = {};

        for (const caseId of caseIds) {
            const state = await this.getCaseState(caseId);
            if (state) states[caseId] = state;
        }
        return states;
    }

    async getEventCount(caseId?: string): Promise<number> {
        if (caseId) {
            return (await this.getEventsByCase(caseId)).length;
        }
        return this.events.length;
    }

    async getCaseCount(): Promise<number> {
        return (await this.getCaseIds()).length;
    }

    async getDatabaseSize(): Promise<number> {
        return new Blob([JSON.stringify(this.events)]).size;
    }

    async clear(): Promise<void> {
        this.events = [];
        console.log('InMemoryEventRepository cleared');
    }

    async exportData(): Promise<string> {
        return JSON.stringify({
            events: this.events,
            exportedAt: new Date().toISOString(),
            version: '1.0.0'
        }, null, 2);
    }

    async importData(data: string): Promise<void> {
        const parsed = JSON.parse(data);
        if (!parsed.events || !Array.isArray(parsed.events)) {
            throw new Error('Invalid data format');
        }
        this.events = parsed.events;
        console.log(`Imported ${this.events.length} events`);
    }

    async createBackup(): Promise<string> {
        return this.exportData();
    }

    async restoreBackup(backup: string): Promise<void> {
        return this.importData(backup);
    }

    private async loadDemoData(): Promise<void> {
        // No demo data — app starts clean
        this.events = [];
    }
}
