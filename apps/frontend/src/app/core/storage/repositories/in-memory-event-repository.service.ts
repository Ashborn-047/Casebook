import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { IEventRepository } from './event-repository.interface';
import {
    AppEvent,
    CaseCreatedEvent,
    EvidenceAddedEvent,
    NoteAddedEvent,
    EvidenceConnectedEvent,
    HypothesisCreatedEvent
} from '@casbook/shared-models';
import { CaseState } from '@casbook/shared-models';
import { reduceEvents } from '@casbook/shared-logic';

const now = new Date().toISOString();

function uuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

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
        const caseCreated: CaseCreatedEvent = {
            id: uuid(),
            type: 'CASE_CREATED',
            actorId: 'user-supervisor-1',
            actorRole: 'supervisor',
            occurredAt: now,
            payload: {
                caseId: 'case-1',
                title: 'Unauthorized HR System Access',
                description: 'Multiple unauthorized login attempts detected in HR system logs',
                createdBy: 'user-supervisor-1',
                severity: 'high',
                tags: ['security', 'hr', 'login'],
            },
        };

        const ev1Added: EvidenceAddedEvent = {
            id: uuid(),
            type: 'EVIDENCE_ADDED',
            actorId: 'user-investigator-1',
            actorRole: 'investigator',
            occurredAt: now,
            payload: {
                evidenceId: 'ev-1',
                caseId: 'case-1',
                type: 'text',
                content: 'Log entries showing 15 failed login attempts from IP 192.168.1.100',
                hash: 'a1b2c3d4e5f6789012345678901234567890',
                description: 'Server authentication logs',
                submittedBy: 'user-investigator-1',
                visibility: 'normal',
                tags: ['logs', 'authentication'],
            },
        };

        const ev2Added: EvidenceAddedEvent = {
            id: uuid(),
            type: 'EVIDENCE_ADDED',
            actorId: 'user-investigator-1',
            actorRole: 'investigator',
            occurredAt: now,
            payload: {
                evidenceId: 'ev-2',
                caseId: 'case-1',
                type: 'text',
                content: 'IP geolocation shows origin from external network',
                hash: 'b2c3d4e5f67890123456789012345678901',
                description: 'IP analysis report',
                submittedBy: 'user-investigator-1',
                visibility: 'normal',
                tags: ['ip', 'network'],
            },
        };

        const noteAdded: NoteAddedEvent = {
            id: uuid(),
            type: 'NOTE_ADDED',
            actorId: 'user-investigator-1',
            actorRole: 'investigator',
            occurredAt: now,
            payload: {
                noteId: 'note-1',
                caseId: 'case-1',
                content: 'Initial analysis suggests brute force attack',
                addedBy: 'user-investigator-1',
                isInternal: true,
            },
        };

        const connected: EvidenceConnectedEvent = {
            id: uuid(),
            type: 'EVIDENCE_CONNECTED',
            actorId: 'user-investigator-1',
            actorRole: 'investigator',
            occurredAt: now,
            payload: {
                connectionId: 'conn-1',
                caseId: 'case-1',
                sourceEvidenceId: 'ev-1',
                targetEvidenceId: 'ev-2',
                connectionType: 'timeline',
                reason: 'Log entries show sequence of events',
                strength: 2,
                notes: 'Timeline connection between login attempts',
            },
        };

        const hypCreated: HypothesisCreatedEvent = {
            id: uuid(),
            type: 'HYPOTHESIS_CREATED',
            actorId: 'user-investigator-1',
            actorRole: 'investigator',
            occurredAt: now,
            payload: {
                hypothesisId: 'hyp-1',
                caseId: 'case-1',
                title: 'Brute Force Attack Hypothesis',
                description: 'Multiple failed logins suggest automated brute force attempt',
                supportingEvidenceIds: ['ev-1', 'ev-2'],
                confidence: 'high',
                status: 'active',
                color: '#DC2626',
            },
        };

        this.events = [caseCreated, ev1Added, ev2Added, noteAdded, connected, hypCreated];
    }
}
