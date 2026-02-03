import { Injectable, inject } from '@angular/core';
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
import { MigrationService } from '../migration.service';

const now = new Date().toISOString();

function uuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

@Injectable({ providedIn: 'root' })
export class IndexedDBEventRepository implements IEventRepository {
    private migrationService = inject(MigrationService);
    private eventSubject = new Subject<AppEvent>();
    private db: IDBDatabase | null = null;
    private initialized = false;
    private readonly DB_NAME = 'casbook-events';
    private readonly DB_VERSION = 1;

    async initialize(): Promise<void> {
        if (this.initialized) return;

        try {
            this.db = await this.openDatabase();
            await this.migrationService.runMigrations(this.db);

            const eventCount = await this.getEventCount();
            if (eventCount === 0) {
                await this.loadDemoData();
            }

            this.initialized = true;
            console.log('IndexedDBEventRepository initialized with', await this.getEventCount(), 'events');
        } catch (error) {
            console.error('Failed to initialize IndexedDB:', error);
            throw error;
        }
    }

    isInitialized(): boolean {
        return this.initialized;
    }

    async saveEvent(event: AppEvent): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(['events'], 'readwrite');
            const store = transaction.objectStore('events');
            const request = store.add(event);

            request.onsuccess = () => {
                this.eventSubject.next(event);
                resolve();
            };
            request.onerror = () => reject(new Error(`Failed to save event: ${request.error}`));
        });
    }

    async getEvent(eventId: string): Promise<AppEvent | null> {
        if (!this.db) throw new Error('Database not initialized');

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(['events'], 'readonly');
            const store = transaction.objectStore('events');
            const request = store.get(eventId);

            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(new Error(`Failed to get event: ${request.error}`));
        });
    }

    async getEvents(caseId?: string): Promise<AppEvent[]> {
        if (!this.db) throw new Error('Database not initialized');

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(['events'], 'readonly');
            const store = transaction.objectStore('events');
            const request = store.getAll();

            request.onsuccess = () => {
                let events: AppEvent[] = request.result;
                if (caseId) {
                    events = events.filter(event =>
                        'caseId' in event.payload && (event.payload as { caseId: string }).caseId === caseId
                    );
                }
                events.sort((a, b) =>
                    new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime()
                );
                resolve(events);
            };
            request.onerror = () => reject(new Error(`Failed to get events: ${request.error}`));
        });
    }

    async getEventsByCase(caseId: string): Promise<AppEvent[]> {
        return this.getEvents(caseId);
    }

    async getEventsByType(eventType: string): Promise<AppEvent[]> {
        const events = await this.getEvents();
        return events.filter(event => event.type === eventType);
    }

    streamEvents(caseId?: string): Observable<AppEvent> {
        return new Observable(subscriber => {
            this.getEvents(caseId).then(events => {
                events.forEach(event => subscriber.next(event));
            }).catch(error => subscriber.error(error));

            const subscription = this.eventSubject.subscribe(event => {
                if (!caseId || ('caseId' in event.payload && (event.payload as { caseId: string }).caseId === caseId)) {
                    subscriber.next(event);
                }
            });

            return () => subscription.unsubscribe();
        });
    }

    async getCaseIds(): Promise<string[]> {
        const events = await this.getEvents();
        const caseIds = new Set<string>();
        events.forEach(event => {
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
        const events = await this.getEvents(caseId);
        return events.length;
    }

    async getCaseCount(): Promise<number> {
        return (await this.getCaseIds()).length;
    }

    async getDatabaseSize(): Promise<number> {
        if (!this.db) throw new Error('Database not initialized');
        const count = await this.getEventCount();
        return count * 500;
    }

    async clear(): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(['events'], 'readwrite');
            const store = transaction.objectStore('events');
            const request = store.clear();

            request.onsuccess = () => {
                console.log('IndexedDB cleared');
                resolve();
            };
            request.onerror = () => reject(new Error(`Failed to clear database: ${request.error}`));
        });
    }

    async exportData(): Promise<string> {
        const events = await this.getEvents();
        return JSON.stringify({
            events,
            exportedAt: new Date().toISOString(),
            version: '1.0.0',
            storage: 'indexeddb'
        }, null, 2);
    }

    async importData(data: string): Promise<void> {
        const parsed = JSON.parse(data);
        if (!parsed.events || !Array.isArray(parsed.events)) {
            throw new Error('Invalid data format');
        }

        await this.clear();
        for (const event of parsed.events) {
            await this.saveEvent(event);
        }
        console.log(`Imported ${parsed.events.length} events from backup`);
    }

    async createBackup(): Promise<string> {
        return this.exportData();
    }

    async restoreBackup(backup: string): Promise<void> {
        return this.importData(backup);
    }

    private openDatabase(): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

            request.onerror = () => reject(new Error(`Failed to open database: ${request.error}`));
            request.onsuccess = () => resolve(request.result);

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;

                if (!db.objectStoreNames.contains('events')) {
                    const eventsStore = db.createObjectStore('events', { keyPath: 'id' });
                    eventsStore.createIndex('type', 'type', { unique: false });
                    eventsStore.createIndex('occurredAt', 'occurredAt', { unique: false });
                }

                if (!db.objectStoreNames.contains('snapshots')) {
                    db.createObjectStore('snapshots', { keyPath: 'caseId' });
                }

                if (!db.objectStoreNames.contains('metadata')) {
                    db.createObjectStore('metadata', { keyPath: 'key' });
                }
            };
        });
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

        const demoEvents = [caseCreated, ev1Added, ev2Added, noteAdded, connected, hypCreated];
        for (const event of demoEvents) {
            await this.saveEvent(event);
        }
        console.log('Loaded demo data into IndexedDB');
    }
}
