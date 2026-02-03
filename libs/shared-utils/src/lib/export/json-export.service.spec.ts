import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JsonExportService } from './json-export.service';
import { AppEvent, CaseCreatedEvent } from '@casbook/shared-models';
import { reduceEvents } from '@casbook/shared-logic';

async function blobToText(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsText(blob);
    });
}

describe('JsonExportService', () => {
    let service: JsonExportService;

    const mockEvents: AppEvent[] = [
        {
            id: 'e1',
            type: 'CASE_CREATED',
            actorId: 'user-1',
            actorRole: 'investigator',
            occurredAt: '2024-01-01T10:00:00Z',
            payload: {
                caseId: 'test-1',
                title: 'Test Case',
                description: 'Initial',
                createdBy: 'user-1',
                severity: 'medium',
                tags: []
            }
        } as CaseCreatedEvent,
        {
            id: 'e2',
            type: 'NOTE_ADDED',
            actorId: 'user-1',
            actorRole: 'investigator',
            occurredAt: '2024-01-01T11:00:00Z',
            payload: {
                noteId: 'n1',
                caseId: 'test-1',
                content: 'Some note',
                addedBy: 'user-1',
                isInternal: false
            }
        } as any
    ];

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [JsonExportService]
        });
        service = TestBed.inject(JsonExportService);
    });

    it('should export all events in deterministic order', async () => {
        // Pass events in reverse order
        const result = service.export('test-1', [mockEvents[1], mockEvents[0]]);
        const json = JSON.parse(await blobToText(result.blob));

        expect(json.events.length).toBe(2);
        expect(json.events[0].id).toBe('e1');
        expect(json.events[1].id).toBe('e2');
    });

    it('should match derivedState with reducer output', async () => {
        const result = service.export('test-1', mockEvents);
        const json = JSON.parse(await blobToText(result.blob));

        const expectedState = reduceEvents(mockEvents);
        expect(json.derivedState.id).toBe(expectedState.id);
        expect(json.derivedState.title).toBe(expectedState.title);
    });

    it('should explicitly mark derived state as computed', async () => {
        const result = service.export('test-1', mockEvents);
        const json = JSON.parse(await blobToText(result.blob));

        expect(json.derivedState.stateIsDerived).toBe(true);
        expect(json.derivedState.computedAt).toBeDefined();
    });

    it('should be able to reconstruct state from exported events', async () => {
        const result = service.export('test-1', mockEvents);
        const json = JSON.parse(await blobToText(result.blob));

        const reconstructedState = reduceEvents(json.events);
        expect(reconstructedState.id).toBe(json.derivedState.id);
        expect(reconstructedState.title).toBe(json.derivedState.title);
    });
});
