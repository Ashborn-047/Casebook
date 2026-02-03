import { Injectable } from '@angular/core';
import { Observable, from, of } from 'rxjs';
import { ConvexHttpClient } from 'convex/browser';
import { IEventRepository } from './event-repository.interface';
import { AppEvent, CaseState } from '@casbook/shared-models';
import { environment } from '../../../../environments/environment';
import { anyApi } from 'convex/server';

/**
 * ConvexEventRepositoryAdapter
 * 
 * Implements IEventRepository for Convex.
 * Note: In Casebook, Convex is a mirrored safe layer.
 * This adapter is used by EventSyncService to push/pull events from the cloud.
 */
@Injectable({ providedIn: 'root' })
export class ConvexEventRepository implements IEventRepository {
    private client: ConvexHttpClient;
    private initialized = false;

    constructor() {
        this.client = new ConvexHttpClient(environment.convexUrl);
    }

    async initialize(): Promise<void> {
        this.initialized = true;
        return Promise.resolve();
    }

    isInitialized(): boolean {
        return this.initialized;
    }

    async saveEvent(event: AppEvent): Promise<void> {
        if (!environment.enableMirroring) return;

        try {
            // Using string-based API to avoid dependency on generated local files in this environment
            await this.client.mutation('events:appendEvent' as any, {
                localId: event.id,
                type: event.type,
                caseId: (event.payload as any).caseId || 'global',
                occurredAt: event.occurredAt,
                payload: event.payload
            });
        } catch (error) {
            console.error('Convex Mirror Error:', error);
            // Non-blocking: We don't throw here to ensure local operations continue
        }
    }

    async getEvent(eventId: string): Promise<AppEvent | null> {
        // Querying single event from Convex by localId
        // This is a simplified implementation for the mirror layer
        return null;
    }

    async getEvents(caseId?: string): Promise<AppEvent[]> {
        if (!caseId) return [];

        try {
            const results = await this.client.query('events:getEventsByCase' as any, { caseId });
            return (results as any[]).map(r => ({
                id: r.localId,
                type: r.type,
                occurredAt: r.occurredAt,
                payload: r.payload,
                actorId: r.payload.actorId || 'unknown',
                actorRole: r.payload.actorRole || 'viewer'
            })) as AppEvent[];
        } catch (error) {
            console.error('Convex Fetch Error:', error);
            return [];
        }
    }

    async getEventsByCase(caseId: string): Promise<AppEvent[]> {
        return this.getEvents(caseId);
    }

    async getEventsByType(eventType: string): Promise<AppEvent[]> {
        return []; // TBD if needed for mirror
    }

    streamEvents(caseId?: string): Observable<AppEvent> {
        // Mirrored events are typically polled or pushed.
        // For the safe layer, we don't rely on live streams from Convex as primary.
        return of();
    }

    async getCaseIds(): Promise<string[]> {
        return []; // Primary source is local
    }

    async getCaseState(caseId: string): Promise<CaseState | null> {
        return null; // Replay locally
    }

    async getCaseStates(): Promise<Record<string, CaseState>> {
        return {};
    }

    async getEventCount(caseId?: string): Promise<number> {
        const events = await this.getEvents(caseId);
        return events.length;
    }

    async getCaseCount(): Promise<number> {
        return 0;
    }

    async getDatabaseSize(): Promise<number> {
        return 0;
    }

    async clear(): Promise<void> {
        // Mirror clearing is restricted
    }

    async exportData(): Promise<string> {
        return "";
    }

    async importData(data: string): Promise<void> {
        // Import into mirror not supported via this adapter
    }

    async createBackup(): Promise<string> {
        return "";
    }

    async restoreBackup(backup: string): Promise<void> {
    }
}
