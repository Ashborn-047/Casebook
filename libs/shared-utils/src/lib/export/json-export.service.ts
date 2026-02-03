import { Injectable } from '@angular/core';
import { AppEvent, CaseState } from '@casbook/shared-models';
import { reduceEvents } from '@casbook/shared-logic';
import { ExportOptions, ExportResult } from './export.types';

/**
 * JsonExportService
 * 
 * Generates a JSON audit package for a case.
 * The core principle is that the event list is the source of truth.
 * The derived state is included for convenience but is explicitly marked as derived.
 */
@Injectable({ providedIn: 'root' })
export class JsonExportService {

    /**
     * Export a case to JSON
     * @param caseId The ID of the case to export
     * @param events The full event stream for this case
     * @param options Export configuration
     */
    export(caseId: string, events: AppEvent[], options: Partial<ExportOptions> = {}): ExportResult {
        // 1. Sort events deterministically (by occurredAt)
        const sortedEvents = [...events].sort(
            (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime()
        );

        // 2. Compute derived state at export time
        const derivedState = reduceEvents(sortedEvents);

        // 3. Build the export payload
        const exportPayload = {
            caseId,
            exportedAt: new Date().toISOString(),
            exportVersion: '1.0',

            // The canonical source of truth
            events: sortedEvents,

            // Derived state - explicitly marked as computed
            derivedState: {
                ...derivedState,
                stateIsDerived: true,
                computedAt: new Date().toISOString()
            },

            // Metadata about the export
            metadata: {
                eventCount: sortedEvents.length,
                includeTimeline: options.includeTimeline ?? true,
                includeEvidence: options.includeEvidence ?? true
            }
        };

        // 4. Create Blob
        const jsonString = JSON.stringify(exportPayload, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });

        return {
            blob,
            filename: `case-audit-${caseId}-${new Date().getTime()}.json`,
            mimeType: 'application/json'
        };
    }
}
