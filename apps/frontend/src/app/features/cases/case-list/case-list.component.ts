import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CaseStore } from '../../../core/state/case-store.service';
import { UserRole } from '@casbook/shared-models';
import { getSeverityColor } from '../../../shared/utils/contrast.util';

@Component({
  selector: 'app-case-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="container">
      <!-- Stats Grid -->
      <div class="stats-grid">
        <div class="brutal-card stat-card">
          <div style="font-size: 0.8rem; font-weight: bold;">TOTAL CASES</div>
          <div style="font-size: 2.5rem; font-weight: 900;">{{ caseSummaries().length }}</div>
        </div>
        <div class="brutal-card stat-card">
          <div style="font-size: 0.8rem; font-weight: bold;">EVIDENCE ITEMS</div>
          <div style="font-size: 2.5rem; font-weight: 900;">{{ totalEvidence() }}</div>
        </div>
        <div class="brutal-card stat-card">
          <div style="font-size: 0.8rem; font-weight: bold;">CONNECTIONS</div>
          <div style="font-size: 2.5rem; font-weight: 900;">{{ totalConnections() }}</div>
        </div>
        <div class="brutal-card stat-card">
          <div style="font-size: 0.8rem; font-weight: bold;">HYPOTHESES</div>
          <div style="font-size: 2.5rem; font-weight: 900;">{{ totalHypotheses() }}</div>
        </div>
      </div>

      <!-- Dashboard Header -->
      <div class="dash-header">
        <h2>Active Investigations</h2>
        <div class="storage-status">
          <div class="status-dot"
               [class.disconnected]="!store.uiState().storageInfo.isInitialized">
          </div>
          <span>{{ store.uiState().storageInfo.type | uppercase }} &bull; {{ store.uiState().storageInfo.eventCount }} events &bull; {{ store.uiState().storageInfo.caseCount }} cases</span>
        </div>
      </div>

      <!-- Loading -->
      <div *ngIf="store.uiState().isLoading" class="brutal-card" style="text-align: center; padding: 40px;">
        Loading cases...
      </div>

      <!-- Case Grid -->
      <div *ngIf="!store.uiState().isLoading" class="case-grid">
        <div
          *ngFor="let caseItem of caseSummaries()"
          class="brutal-card case-card"
        >
          <div class="case-meta">
            <span class="badge" style="background: var(--lime)">{{ caseItem.status | uppercase }}</span>
            <span class="badge" [style.background]="getSeverityColor(caseItem.severity)">
              {{ caseItem.severity | uppercase }}
            </span>
          </div>
          <h3>{{ caseItem.title }}</h3>
          <p style="margin-bottom: 20px;">{{ caseItem.description }}</p>
          <div style="margin-top: auto; display: flex; justify-content: space-between; font-size: 0.8rem; font-weight: bold;">
            <span>📎 {{ caseItem.evidenceCount }} Items</span>
            <span>📅 {{ formatDate(caseItem.createdAt) }}</span>
          </div>
          <div style="display: flex; gap: 8px; margin-top: 15px; font-size: 0.75rem; font-weight: bold;">
            <span>🔗 {{ caseItem.connectionCount }} links</span>
            <span>💡 {{ caseItem.hypothesisCount }} hypotheses</span>
          </div>
          <button
            class="brutal-btn"
            style="margin-top: 20px; background: var(--blue); color: white;"
            (click)="selectCase(caseItem.id)"
          >View Case ⚡</button>
        </div>

        <!-- Create New Case -->
        <div
          class="brutal-card"
          style="border-style: dashed; display: flex; align-items: center; justify-content: center; background: #f0f0f0; cursor: pointer; min-height: 200px;"
          (click)="showCreateModal.set(true)"
        >
          <div style="text-align: center;">
            <div style="font-size: 3rem;">➕</div>
            <div style="font-weight: 900; margin-top: 10px;">CREATE NEW CASE</div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div *ngIf="!store.uiState().isLoading && caseSummaries().length === 0" class="brutal-card" style="text-align: center; padding: 40px;">
        <div style="font-size: 4rem; margin-bottom: 10px;">📂</div>
        <h2>No Cases Yet</h2>
        <p style="margin-top: 10px;">Create your first investigation case to get started.</p>
      </div>
    </div>

    <!-- Create Case Modal -->
    <div *ngIf="showCreateModal()" class="modal-overlay" (click)="closeModal($event)">
      <div class="brutal-card" style="width: 500px; max-width: 90vw; padding: 30px;" (click)="$event.stopPropagation()">
        <h2 style="margin: 0 0 20px 0; border-bottom: 3px solid black; padding-bottom: 10px;">🆕 New Case</h2>

        <div class="form-group">
          <label>Case Title *</label>
          <input type="text" [ngModel]="newTitle()" (ngModelChange)="newTitle.set($event)"
                 placeholder="e.g., Unauthorized Network Access">
        </div>

        <div class="form-group">
          <label>Description *</label>
          <textarea [ngModel]="newDesc()" (ngModelChange)="newDesc.set($event)"
                    placeholder="Describe the investigation..." rows="3"></textarea>
        </div>

        <div class="form-group">
          <label>Severity</label>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button *ngFor="let s of severities" class="brutal-btn"
                    [style.background]="newSeverity() === s ? getSeverityColor(s) : '#eee'"
                    [style.fontWeight]="newSeverity() === s ? '900' : '400'"
                    (click)="newSeverity.set(s)">
              {{ s | uppercase }}
            </button>
          </div>
        </div>

        <div *ngIf="createError()" style="color: red; font-weight: bold; margin: 10px 0;">
          {{ createError() }}
        </div>

        <div style="display: flex; gap: 10px; margin-top: 20px;">
          <button class="brutal-btn" style="flex: 1;" (click)="showCreateModal.set(false)">Cancel</button>
          <button class="brutal-btn" style="flex: 2; background: var(--lime);"
                  [disabled]="!canCreate() || isCreating()"
                  (click)="createNewCase()">
            {{ isCreating() ? 'Creating...' : 'Create Case ⚡' }}
          </button>
        </div>
      </div>
    </div>
  `
})
export class CaseListComponent {
  store = inject(CaseStore);

  caseSummaries = this.store.caseSummaries;

  effectiveRole = () => this.store.uiState().roleOverride || this.store.currentUser().role;

  totalEvidence = () => this.caseSummaries().reduce((sum: number, c) => sum + c.evidenceCount, 0);
  totalConnections = () => this.caseSummaries().reduce((sum: number, c) => sum + c.connectionCount, 0);
  totalHypotheses = () => this.caseSummaries().reduce((sum: number, c) => sum + c.hypothesisCount, 0);

  getSeverityColor = getSeverityColor;

  // Create case form state
  showCreateModal = signal(false);
  newTitle = signal('');
  newDesc = signal('');
  newSeverity = signal<'low' | 'medium' | 'high' | 'critical'>('medium');
  isCreating = signal(false);
  createError = signal('');
  severities: Array<'low' | 'medium' | 'high' | 'critical'> = ['low', 'medium', 'high', 'critical'];

  canCreate = () => this.newTitle().trim().length > 0 && this.newDesc().trim().length > 0;

  switchRole(event: Event): void {
    const role = (event.target as HTMLSelectElement).value as UserRole;
    this.store.switchRole(role);
  }

  selectCase(caseId: string): void {
    this.store.selectCase(caseId);
  }

  closeModal(event: Event): void {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.showCreateModal.set(false);
    }
  }

  async createNewCase(): Promise<void> {
    if (!this.canCreate()) return;
    this.isCreating.set(true);
    this.createError.set('');

    const result = await this.store.createCase(
      this.newTitle().trim(),
      this.newDesc().trim(),
      this.newSeverity()
    );

    this.isCreating.set(false);

    if (result.success) {
      this.showCreateModal.set(false);
      this.newTitle.set('');
      this.newDesc.set('');
      this.newSeverity.set('medium');
    } else {
      this.createError.set(result.error || 'Failed to create case');
    }
  }

  formatDate(isoString: string): string {
    return new Date(isoString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }
}

