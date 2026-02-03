import { Injectable, inject } from '@angular/core';
import { IndexedDBEventRepository } from '../storage/repositories/indexed-db-event-repository.service';
import { ConvexEventRepository } from '../storage/repositories/convex-event-repository.service';
import { environment } from '../../../environments/environment';
import { filter, skip } from 'rxjs';

/**
 * EventSyncService
 * 
 * Orchestrates the synchronization between the local primary store (IndexedDB)
 * and the remote mirror (Convex).
 * 
 * Core Design Principle: 
 * Synchronization is unidirectional (Local -> Remote) and strictly non-blocking.
 * Local event persistence MUST succeed even if mirroring fails.
 */
@Injectable({ providedIn: 'root' })
export class EventSyncService {
    private localRepo = inject(IndexedDBEventRepository);
    private remoteRepo = inject(ConvexEventRepository);

    /**
     * Start the synchronization background process
     */
    initialize(): void {
        if (!environment.enableMirroring) return;

        console.log('EventSyncService: Starting synchronization process...');

        // 1. Initial full sync (catch up on missing events)
        this.runFullSync();

        // 2. Continuous real-time sync (subscribe to local events)
        // We skip already emitted events by subscribing to the stream
        this.localRepo.streamEvents().subscribe({
            next: (event) => {
                this.remoteRepo.saveEvent(event);
            },
            error: (err) => console.error('Sync Stream Error:', err)
        });
    }

    /**
     * Compares local and remote events and pushes missing ones to Convex.
     */
    private async runFullSync(): Promise<void> {
        try {
            const localEvents = await this.localRepo.getEvents();

            // For now, we sync cases one by one or globally if needed.
            // Simplified: Sync all events found locally.
            for (const event of localEvents) {
                // saveEvent in Convex adapter already handles deduplication server-side
                await this.remoteRepo.saveEvent(event);
            }

            console.log('EventSyncService: Full sync completed.');
        } catch (error) {
            console.error('EventSyncService: Full sync failed.', error);
        }
    }
}
