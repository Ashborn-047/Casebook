import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EvidenceUploadComponent } from './evidence-upload.component';
import { CaseStore } from '../../../core/state/case-store.service';
import { HashService } from '@casbook/shared-utils';
import { signal } from '@angular/core';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('EvidenceUploadComponent', () => {
    let component: EvidenceUploadComponent;
    let fixture: ComponentFixture<EvidenceUploadComponent>;
    let mockHashService: any;
    let mockCaseStore: any;

    beforeEach(async () => {
        mockHashService = {
            computeSHA256: vi.fn().mockResolvedValue('mock-hash-123')
        };
        mockCaseStore = {
            currentUser: signal({ id: 'u1', role: 'investigator' }),
            uiState: signal({ currentCaseId: 'c1' }),
            addEvidence: vi.fn().mockResolvedValue({ success: true })
        };

        await TestBed.configureTestingModule({
            imports: [EvidenceUploadComponent],
            providers: [
                { provide: HashService, useValue: mockHashService },
                { provide: CaseStore, useValue: mockCaseStore }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(EvidenceUploadComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should handle file selection and compute hash', async () => {
        const file = new File(['content'], 'test.txt', { type: 'text/plain' });
        const event = { target: { files: [file] } } as any;

        await component.onFileSelected(event);

        expect(component.selectedFile()).toBe(file);
        expect(component.isHashing()).toBe(false);
        expect(mockHashService.computeSHA256).toHaveBeenCalledWith(file);
    });

    it('should call CaseStore.addEvidence on submit', async () => {
        // Setup state
        component.caseId = 'c1';
        component.selectedFile.set(new File(['abc'], 'abc.txt'));
        component.description.set('Test evidence');
        component.type.set('file');
        component.content.set('abc.txt');
        component.computedHash.set('mock-hash-123');

        // Trigger submission
        await component.submit();

        expect(mockCaseStore.addEvidence).toHaveBeenCalled();
        const args = mockCaseStore.addEvidence.mock.calls[0];
        expect(args[1]).toBe('file');
        expect(args[4]).toBe('Test evidence');
    });
});
