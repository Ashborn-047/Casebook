import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PdfExportService } from './pdf-export.service';
import { AppEvent, CaseCreatedEvent } from '@casbook/shared-models';

describe('PdfExportService', () => {
    let service: PdfExportService;

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
        } as CaseCreatedEvent
    ];

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [PdfExportService]
        });
        service = TestBed.inject(PdfExportService);
    });

    it('should generate a non-empty PDF Blob', () => {
        const result = service.export('test-1', mockEvents);
        expect(result.blob).toBeDefined();
        expect(result.blob.size).toBeGreaterThan(0);
        expect(result.mimeType).toBe('application/pdf');
    });

    it('should not throw when exporting valid event stream', () => {
        expect(() => service.export('test-1', mockEvents)).not.toThrow();
    });

    it('should handle large event streams without crashing', () => {
        const largeEvents = Array.from({ length: 50 }, (_, i) => ({
            ...mockEvents[0],
            id: `e${i}`,
            occurredAt: new Date(2024, 0, 1, 10, i).toISOString()
        }));

        expect(() => service.export('test-1', largeEvents)).not.toThrow();
    });
});
