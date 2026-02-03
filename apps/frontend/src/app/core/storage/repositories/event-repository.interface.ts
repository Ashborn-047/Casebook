import { Observable } from 'rxjs';
import { AppEvent } from '@casbook/shared-models';
import { CaseState } from '@casbook/shared-models';

/**
 * Abstract event repository interface
 * Allows swapping implementations (memory, IndexedDB, Convex, etc.)
 */
export interface IEventRepository {
    // === INITIALIZATION ===
    initialize(): Promise<void>;
    isInitialized(): boolean;

    // === EVENT OPERATIONS ===
    saveEvent(event: AppEvent): Promise<void>;
    getEvent(eventId: string): Promise<AppEvent | null>;
    getEvents(caseId?: string): Promise<AppEvent[]>;
    getEventsByCase(caseId: string): Promise<AppEvent[]>;
    getEventsByType(eventType: string): Promise<AppEvent[]>;
    streamEvents(caseId?: string): Observable<AppEvent>;

    // === CASE OPERATIONS ===
    getCaseIds(): Promise<string[]>;
    getCaseState(caseId: string): Promise<CaseState | null>;
    getCaseStates(): Promise<Record<string, CaseState>>;

    // === STATISTICS ===
    getEventCount(caseId?: string): Promise<number>;
    getCaseCount(): Promise<number>;
    getDatabaseSize(): Promise<number>;

    // === MAINTENANCE ===
    clear(): Promise<void>;
    exportData(): Promise<string>;
    importData(data: string): Promise<void>;
    createBackup(): Promise<string>;
    restoreBackup(backup: string): Promise<void>;
}
