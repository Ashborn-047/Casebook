import { Injectable, inject, OnDestroy } from '@angular/core';
import { IndexedDBEventRepository } from '../storage/repositories/indexed-db-event-repository.service';
import { ConvexEventRepository } from '../storage/repositories/convex-event-repository.service';
import { environment } from '../../../environments/environment';
import { AppEvent } from '@casbook/shared-models';
import { Subscription } from 'rxjs';

/**
 * EventSyncService
 * 
 * Orchestrates bi-directional synchronization between the local primary
 * store (IndexedDB) and the remote mirror (Convex).
 * 
 * Design Principles:
 * 1. Local event persistence MUST succeed even if mirroring fails.
 * 2. Pull sync (Remote -> Local) is non-destructive: only new events are merged.
 * 3. Event IDs are UUIDs, making deduplication straightforward.
 */
@Injectable({ providedIn: 'root' })
export class EventSyncService implements OnDestroy {
    private localRepo = inject(IndexedDBEventRepository);
    private remoteRepo = inject(ConvexEventRepository);

    private pollingIntervalId: ReturnType<typeof setInterval> | null = null;
    private streamSub: Subscription | null = null;
    private syncInProgress = false;

    /** Polling interval for pull sync (30 seconds) */
    private readonly POLL_INTERVAL_MS = 30_000;

    /** Case IDs to poll for */
    private activeCaseIds = new Set<string>();

    /**
     * Start the synchronization background process
     */
    initialize(): void {
        if (!environment.enableMirroring) return;

        console.log('🔄 EventSyncService: Starting bi-directional sync...');

        // 1. Push existing local events to remote (initial catch-up)
        this.pushLocalToRemote();

        // 2. Subscribe to new local events for real-time push
        this.streamSub = this.localRepo.streamEvents().subscribe({
            next: (event) => {
                this.remoteRepo.saveEvent(event);

                // Track case IDs for pull polling
                const caseId = event.payload && typeof event.payload === 'object'
                    ? (event.payload as { caseId?: string }).caseId
                    : undefined;
                if (caseId) this.activeCaseIds.add(caseId);
            },
            error: (err) => console.error('Sync Stream Error:', err)
        });

        // 3. Start polling for remote events
        this.startRemotePolling();
    }

    /**
     * Register a case ID for pull-sync polling.
     * Call this when a user opens a case.
     */
    watchCase(caseId: string): void {
        this.activeCaseIds.add(caseId);
    }

    /**
     * Stop watching a case for pull-sync.
     */
    unwatchCase(caseId: string): void {
        this.activeCaseIds.delete(caseId);
    }

    ngOnDestroy(): void {
        if (this.pollingIntervalId) {
            clearInterval(this.pollingIntervalId);
        }
        this.streamSub?.unsubscribe();
    }

    // === PUSH: Local -> Remote ===

    /**
     * Pushes all local events to Convex that may be missing remotely.
     */
    private async pushLocalToRemote(): Promise<void> {
        try {
            const localEvents = await this.localRepo.getEvents();

            for (const event of localEvents) {
                await this.remoteRepo.saveEvent(event);
            }

            // Seed activeCaseIds from local events
            for (const event of localEvents) {
                const caseId = event.payload && typeof event.payload === 'object'
                    ? (event.payload as { caseId?: string }).caseId
                    : undefined;
                if (caseId) this.activeCaseIds.add(caseId);
            }

            console.log(`✅ Push sync completed: ${localEvents.length} events pushed.`);
        } catch (error) {
            console.error('❌ Push sync failed:', error);
        }
    }

    // === PULL: Remote -> Local ===

    /**
     * Starts periodic polling for remote events.
     */
    private startRemotePolling(): void {
        // Run once immediately
        this.pullRemoteEvents();

        // Then poll on interval
        this.pollingIntervalId = setInterval(() => {
            this.pullRemoteEvents();
        }, this.POLL_INTERVAL_MS);
    }

    /**
     * Fetch remote events for active cases and merge any missing ones locally.
     */
    private async pullRemoteEvents(): Promise<void> {
        if (this.syncInProgress || this.activeCaseIds.size === 0) return;
        this.syncInProgress = true;

        try {
            const localEvents = await this.localRepo.getEvents();
            const localEventIds = new Set(localEvents.map(e => e.id));

            let pulled = 0;

            for (const caseId of this.activeCaseIds) {
                try {
                    const remoteEvents = await this.remoteRepo.getEventsByCase(caseId);

                    for (const event of remoteEvents) {
                        if (!localEventIds.has(event.id)) {
                            try {
                                await this.localRepo.saveEvent(event);
                                localEventIds.add(event.id);
                                pulled++;
                            } catch {
                                // Silently skip duplicates (race condition safety)
                            }
                        }
                    }
                } catch (error) {
                    console.warn(`Pull sync failed for case ${caseId}:`, error);
                }
            }

            if (pulled > 0) {
                console.log(`🔽 Pull sync: ${pulled} new events merged from remote.`);
            }
        } catch (error) {
            console.error('❌ Pull sync failed:', error);
        } finally {
            this.syncInProgress = false;
        }
    }
}

