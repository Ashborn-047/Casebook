import { Component, EventEmitter, Output, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConnectionType, ConnectionStrength } from '@casbook/shared-models';

export interface ConnectionFormData {
    connectionType: ConnectionType;
    strength: ConnectionStrength;
    reason: string;
}

@Component({
    selector: 'cb-connection-modal',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './connection-modal.component.html',
    styleUrls: ['./connection-modal.component.scss'],
})
export class ConnectionModalComponent {
    @Input() sourceLabel = 'Evidence A';
    @Input() targetLabel = 'Evidence B';
    @Input() suggestedTokens: string[] = [];

    @Output() confirmed = new EventEmitter<ConnectionFormData>();
    @Output() cancelled = new EventEmitter<void>();

    connectionType = signal<ConnectionType>('related_to');
    strength = signal<ConnectionStrength>(2);
    reason = signal('');

    readonly connectionTypes: { value: ConnectionType; label: string; icon: string }[] = [
        { value: 'supports', label: 'Supports', icon: '✅' },
        { value: 'contradicts', label: 'Contradicts', icon: '❌' },
        { value: 'related_to', label: 'Related To', icon: '🔗' },
        { value: 'timeline', label: 'Timeline', icon: '🕐' },
        { value: 'causality', label: 'Causality', icon: '⚡' },
        { value: 'metadata', label: 'Metadata', icon: '📋' },
    ];

    readonly strengthLevels: { value: ConnectionStrength; label: string }[] = [
        { value: 1, label: 'Weak' },
        { value: 2, label: 'Medium' },
        { value: 3, label: 'Strong' },
    ];

    get isValid(): boolean {
        return this.reason().trim().length >= 5;
    }

    onConfirm(): void {
        if (!this.isValid) return;
        this.confirmed.emit({
            connectionType: this.connectionType(),
            strength: this.strength(),
            reason: this.reason().trim(),
        });
    }

    onCancel(): void {
        this.cancelled.emit();
    }

    useSuggestedToken(token: string): void {
        const current = this.reason();
        if (current.length > 0 && !current.endsWith(' ')) {
            this.reason.set(current + ' ' + token);
        } else {
            this.reason.set(current + token);
        }
    }
}
