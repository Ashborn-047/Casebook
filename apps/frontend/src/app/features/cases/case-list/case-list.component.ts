import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CaseStore } from '../../../core/state/case-store.service';
import { UserRole } from '@casbook/shared-models';
import { getSeverityColor } from '../../../shared/utils/contrast.util';

@Component({
  selector: 'app-case-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
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

  switchRole(event: Event): void {
    const role = (event.target as HTMLSelectElement).value as UserRole;
    this.store.switchRole(role);
  }

  selectCase(caseId: string): void {
    this.store.selectCase(caseId);
  }

  formatDate(isoString: string): string {
    return new Date(isoString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }
}
