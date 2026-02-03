import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CaseStore } from '../../../core/state/case-store.service';
import {
  GlassCardComponent,
  BrutalButtonComponent,
  RoleBadgeComponent
} from '@casbook/shared-ui';
import { UserRole } from '@casbook/shared-models';

@Component({
  selector: 'app-case-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    GlassCardComponent,
    BrutalButtonComponent,
    RoleBadgeComponent
  ],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <!-- Header -->
      <header class="max-w-6xl mx-auto mb-8">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-bold text-brutal-dark">📁 Cases</h1>
            <p class="text-gray-500">Manage your investigation cases</p>
          </div>
          
          <div class="flex items-center gap-3">
            <cb-role-badge [role]="effectiveRole()"></cb-role-badge>
            
            <select 
              class="px-3 py-2 rounded-lg border-2 border-brutal-dark bg-white text-sm"
              [value]="effectiveRole()"
              (change)="switchRole($event)"
            >
              <option value="viewer">👁️ Viewer</option>
              <option value="investigator">🔍 Investigator</option>
              <option value="supervisor">⭐ Supervisor</option>
            </select>
          </div>
        </div>
      </header>

      <!-- Stats Overview -->
      <div class="max-w-6xl mx-auto mb-8 grid grid-cols-2 md:grid-cols-4 gap-4">
        <cb-glass-card additionalClasses="p-4 text-center">
          <div class="text-3xl font-bold text-brutal-dark">{{ caseSummaries().length }}</div>
          <div class="text-sm text-gray-500">Total Cases</div>
        </cb-glass-card>
        
        <cb-glass-card additionalClasses="p-4 text-center">
          <div class="text-3xl font-bold text-blue-600">{{ totalEvidence() }}</div>
          <div class="text-sm text-gray-500">Evidence Items</div>
        </cb-glass-card>
        
        <cb-glass-card additionalClasses="p-4 text-center">
          <div class="text-3xl font-bold text-indigo-600">{{ totalConnections() }}</div>
          <div class="text-sm text-gray-500">🧠 Connections</div>
        </cb-glass-card>
        
        <cb-glass-card additionalClasses="p-4 text-center">
          <div class="text-3xl font-bold text-green-600">{{ totalHypotheses() }}</div>
          <div class="text-sm text-gray-500">🧠 Hypotheses</div>
        </cb-glass-card>
      </div>

      <!-- Storage Info -->
      <div class="max-w-6xl mx-auto mb-6">
        <div class="flex items-center gap-2 text-sm text-gray-500">
          <span class="w-2 h-2 rounded-full" 
                [class.bg-green-500]="store.uiState().storageInfo.isInitialized"
                [class.bg-yellow-500]="!store.uiState().storageInfo.isInitialized">
          </span>
          <span>{{ store.uiState().storageInfo.type | uppercase }}</span>
          <span>•</span>
          <span>{{ store.uiState().storageInfo.eventCount }} events</span>
          <span>•</span>
          <span>{{ store.uiState().storageInfo.caseCount }} cases</span>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="store.uiState().isLoading" class="max-w-6xl mx-auto">
        <cb-glass-card additionalClasses="p-8 text-center">
          <div class="animate-pulse">Loading cases...</div>
        </cb-glass-card>
      </div>

      <!-- Case List -->
      <div *ngIf="!store.uiState().isLoading" class="max-w-6xl mx-auto space-y-4">
        <cb-glass-card 
          *ngFor="let caseItem of caseSummaries()" 
          [clickable]="true"
          additionalClasses="p-5 cursor-pointer"
          (click)="selectCase(caseItem.id)"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-2">
                <h3 class="font-semibold text-lg text-brutal-dark">{{ caseItem.title }}</h3>
                <span 
                  class="text-xs px-2 py-0.5 rounded-full font-medium"
                  [class.bg-green-100]="caseItem.status === 'open'"
                  [class.text-green-700]="caseItem.status === 'open'"
                  [class.bg-gray-100]="caseItem.status === 'closed'"
                  [class.text-gray-700]="caseItem.status === 'closed'"
                >
                  {{ caseItem.status }}
                </span>
                <span 
                  class="text-xs px-2 py-0.5 rounded-full font-medium"
                  [class.bg-red-100]="caseItem.severity === 'critical'"
                  [class.text-red-700]="caseItem.severity === 'critical'"
                  [class.bg-orange-100]="caseItem.severity === 'high'"
                  [class.text-orange-700]="caseItem.severity === 'high'"
                  [class.bg-yellow-100]="caseItem.severity === 'medium'"
                  [class.text-yellow-700]="caseItem.severity === 'medium'"
                  [class.bg-gray-100]="caseItem.severity === 'low'"
                  [class.text-gray-600]="caseItem.severity === 'low'"
                >
                  {{ caseItem.severity }}
                </span>
              </div>
              <p class="text-gray-600 text-sm mb-3">{{ caseItem.description }}</p>
              
              <div class="flex items-center gap-4 text-sm text-gray-500">
                <span>📎 {{ caseItem.evidenceCount }} evidence</span>
                <span>🔗 {{ caseItem.connectionCount }} connections</span>
                <span>💡 {{ caseItem.hypothesisCount }} hypotheses</span>
              </div>
            </div>
            
            <div class="text-right text-sm text-gray-400">
              <div>Created {{ formatDate(caseItem.createdAt) }}</div>
            </div>
          </div>
        </cb-glass-card>

        <!-- Empty State -->
        <cb-glass-card *ngIf="caseSummaries().length === 0" additionalClasses="p-8 text-center">
          <div class="text-4xl mb-4">📂</div>
          <h2 class="text-xl font-bold mb-2">No Cases Yet</h2>
          <p class="text-gray-500 mb-4">Create your first investigation case.</p>
          <cb-brutal-button variant="primary" icon="➕">
            Create Case
          </cb-brutal-button>
        </cb-glass-card>
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
