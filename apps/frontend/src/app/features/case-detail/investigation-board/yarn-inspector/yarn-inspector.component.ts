import { Component, EventEmitter, Output, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BoardConnection } from '@casbook/shared-models';

@Component({
    selector: 'cb-yarn-inspector',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div class="inspector-popover" [style.left.px]="posX" [style.top.px]="posY">
            <div class="inspector-header">
                <span class="type-badge">{{ getTypeIcon() }} {{ connection?.type }}</span>
                <button class="close-btn" (click)="closed.emit()">✕</button>
            </div>

            <div class="inspector-body">
                <!-- Reason -->
                <div class="inspector-field" *ngIf="connection?.metadata?.label">
                    <div class="field-label">WHY</div>
                    <div class="field-value reason">{{ connection!.metadata.label }}</div>
                </div>

                <!-- Strength -->
                <div class="inspector-field">
                    <div class="field-label">STRENGTH</div>
                    <div class="field-value">
                        <span *ngFor="let _ of strengthDots; let i = index"
                            class="strength-dot"
                            [class.filled]="i < (connection?.strength || 0)">●</span>
                        <span class="strength-text">{{ getStrengthLabel() }}</span>
                    </div>
                </div>

                <!-- Shared Tokens -->
                <div class="inspector-field" *ngIf="sharedTokens.length > 0">
                    <div class="field-label">SHARED KEYWORDS</div>
                    <div class="token-list">
                        <span *ngFor="let token of sharedTokens" class="token-pill">{{ token }}</span>
                    </div>
                </div>
            </div>

            <div class="inspector-footer">
                <button class="brutal-btn mini-btn dispute-btn" (click)="disputed.emit()">
                    🔴 Dispute
                </button>
                <button class="brutal-btn mini-btn delete-btn" (click)="deleted.emit()">
                    🗑 Remove
                </button>
            </div>
        </div>
    `,
    styleUrls: ['./yarn-inspector.component.scss'],
})
export class YarnInspectorComponent {
    @Input() connection: BoardConnection | null = null;
    @Input() posX = 0;
    @Input() posY = 0;
    @Input() sharedTokens: string[] = [];

    @Output() closed = new EventEmitter<void>();
    @Output() disputed = new EventEmitter<void>();
    @Output() deleted = new EventEmitter<void>();

    readonly strengthDots = [0, 1, 2];

    getTypeIcon(): string {
        const icons: Record<string, string> = {
            supports: '✅',
            contradicts: '❌',
            related_to: '🔗',
            timeline: '🕐',
            causality: '⚡',
            metadata: '📋',
        };
        return icons[this.connection?.type || ''] || '🔗';
    }

    getStrengthLabel(): string {
        switch (this.connection?.strength) {
            case 1: return 'Weak';
            case 2: return 'Medium';
            case 3: return 'Strong';
            default: return 'Unknown';
        }
    }
}
