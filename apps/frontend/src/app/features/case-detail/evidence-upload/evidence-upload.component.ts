import { Component, inject, signal, Input, Output, EventEmitter } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { CaseStore } from '../../../core/state/case-store.service';
import { HashService } from '@casbook/shared-utils';

/**
 * EvidenceUploadComponent
 * 
 * Handles adding new evidence to a case.
 * Forensic Integrity Rule: All evidence must be hashed BEFORE the event is created.
 * This ensures the SHA-256 fingerprint is part of the immutable event payload.
 */
@Component({
    selector: 'cb-evidence-upload',
    standalone: true,
    imports: [FormsModule],
    templateUrl: './evidence-upload.component.html',
    styleUrls: ['./evidence-upload.component.scss']
})
export class EvidenceUploadComponent {
    private caseStore = inject(CaseStore);
    private hashService = inject(HashService);

    @Input() caseId!: string;
    @Output() completed = new EventEmitter<void>();
    @Output() cancelled = new EventEmitter<void>();

    // Form State
    type = signal<'file' | 'text' | 'url'>('text');
    content = signal<string>('');
    description = signal<string>('');
    tagsString = signal<string>('');
    visibility = signal<'normal' | 'restricted'>('normal');

    // Hashing State
    selectedFile = signal<File | null>(null);
    computedHash = signal<string | null>(null);
    isHashing = signal(false);
    isSubmitting = signal(false);

    async onFileSelected(event: Event): Promise<void> {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files.length > 0) {
            const file = input.files[0];
            this.selectedFile.set(file);
            this.content.set(file.name); // Store filename as content for 'file' type

            this.isHashing.set(true);
            try {
                const hash = await this.hashService.computeSHA256(file);
                this.computedHash.set(hash);
            } catch (error) {
                console.error('Hashing failed', error);
            } finally {
                this.isHashing.set(false);
            }
        }
    }

    async submit(): Promise<void> {
        if (!this.caseId) return;

        this.isSubmitting.set(true);
        try {
            // For text/url, compute hash of the string content
            if (this.type() !== 'file') {
                const blob = new Blob([this.content()], { type: 'text/plain' });
                const file = new File([blob], 'content.txt');
                const hash = await this.hashService.computeSHA256(file);
                this.computedHash.set(hash);
            }

            if (!this.computedHash()) {
                throw new Error('Evidence hash missing. Integrity check failed.');
            }

            const tags = this.tagsString()
                ? this.tagsString().split(',').map(t => t.trim()).filter(t => !!t)
                : [];

            await this.caseStore.addEvidence(
                this.caseId,
                this.type(),
                this.content(),
                this.computedHash()!,
                this.description(),
                this.visibility(),
                tags
            );

            this.completed.emit();
            this.reset();
        } catch (error) {
            console.error('Submission failed', error);
        } finally {
            this.isSubmitting.set(false);
        }
    }

    cancel(): void {
        this.cancelled.emit();
        this.reset();
    }

    private reset(): void {
        this.content.set('');
        this.description.set('');
        this.tagsString.set('');
        this.selectedFile.set(null);
        this.computedHash.set(null);
    }
}
