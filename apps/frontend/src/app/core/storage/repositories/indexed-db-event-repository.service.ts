import { Injectable, inject } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { IEventRepository } from './event-repository.interface';
import { AppEvent } from '@casbook/shared-models';
import { CaseState } from '@casbook/shared-models';
import { reduceEvents } from '@casbook/shared-logic';
import { MigrationService } from '../migration.service';



@Injectable({ providedIn: 'root' })
export class IndexedDBEventRepository implements IEventRepository {
    private migrationService = inject(MigrationService);
    private eventSubject = new Subject<AppEvent>();
    private db: IDBDatabase | null = null;
    private initialized = false;
    private readonly DB_NAME = 'casbook-events';
    private readonly DB_VERSION = 3;

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

            if (caseId) {
                // Use the caseId index for efficient filtering at the database level
                const index = store.index('caseId');
                const request = index.getAll(caseId);

                request.onsuccess = () => {
                    const events: AppEvent[] = request.result;
                    // When using caseId index, we must sort manually as we lost the occurredAt order
                    // but we are only sorting events for a single case, which is much faster.
                    events.sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
                    resolve(events);
                };
                request.onerror = () => reject(new Error(`Failed to get events for case ${caseId}: ${request.error}`));
            } else {
                // Use occurredAt index for global chronological retrieval
                const index = store.index('occurredAt');
                const request = index.getAll();

                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(new Error(`Failed to get all events: ${request.error}`));
            }
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
        if (!this.db) throw new Error('Database not initialized');

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(['events'], 'readonly');
            const store = transaction.objectStore('events');
            const index = store.index('caseId');
            const caseIds = new Set<string>();

            // Use 'nextunique' to skip duplicate caseId entries at the IndexedDB level
            const request = index.openKeyCursor(null, 'nextunique');
            request.onsuccess = (event) => {
                const cursor = (event.target as IDBRequest<IDBCursor>).result;
                if (cursor) {
                    caseIds.add(cursor.key as string);
                    cursor.continue();
                } else {
                    resolve(Array.from(caseIds));
                }
            };
            request.onerror = () => reject(new Error(`Failed to get case IDs: ${request.error}`));
        });
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
        if (!this.db) throw new Error('Database not initialized');

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(['events'], 'readonly');
            const store = transaction.objectStore('events');
            let request: IDBRequest<number>;

            if (caseId) {
                const index = store.index('caseId');
                request = index.count(caseId);
            } else {
                request = store.count();
            }

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(new Error(`Failed to count events: ${request.error}`));
        });
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
                const oldVersion = event.oldVersion;

                // v0→v1: create stores
                if (oldVersion < 1) {
                    const eventsStore = db.createObjectStore('events', { keyPath: 'id' });
                    eventsStore.createIndex('type', 'type', { unique: false });
                    eventsStore.createIndex('occurredAt', 'occurredAt', { unique: false });

                    if (!db.objectStoreNames.contains('snapshots')) {
                        db.createObjectStore('snapshots', { keyPath: 'caseId' });
                    }
                    if (!db.objectStoreNames.contains('metadata')) {
                        db.createObjectStore('metadata', { keyPath: 'key' });
                    }
                }

                // v1→v2: purge hardcoded demo data
                if (oldVersion >= 1 && oldVersion < 2) {
                    const tx = (event.target as IDBOpenDBRequest).transaction!;
                    const eventsStore = tx.objectStore('events');
                    eventsStore.clear();
                    console.log('Cleared old demo data during v1→v2 upgrade');
                }

                // v2→v3: Add caseId index for optimized case-specific queries
                if (oldVersion < 3) {
                    const tx = (event.target as IDBOpenDBRequest).transaction!;
                    const eventsStore = tx.objectStore('events');
                    if (!eventsStore.indexNames.contains('caseId')) {
                        eventsStore.createIndex('caseId', 'payload.caseId', { unique: false });
                        console.log('Migration v3: Added caseId index to events store');
                    }
                }
            };
        });
    }

    private async loadDemoData(): Promise<void> {
        // No demo data — app starts clean
        console.log('IndexedDB initialized with empty database');
    }
}
