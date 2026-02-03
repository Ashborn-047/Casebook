import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CaseStore } from '../../core/state/case-store.service';
import {
  GlassCardComponent,
  BrutalButtonComponent,
  RoleBadgeComponent,
  TimelineItemComponent
} from '@casbook/shared-ui';
import { UserRole } from '@casbook/shared-models';

@Component({
  selector: 'app-case-detail-container',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    GlassCardComponent,
    BrutalButtonComponent,
    RoleBadgeComponent,
    TimelineItemComponent
  ],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <!-- Header -->
      <header class="max-w-6xl mx-auto mb-8">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <cb-brutal-button variant="ghost" size="sm" icon="←" (clicked)="goBack()">
              Back to Cases
            </cb-brutal-button>
            <div *ngIf="currentCase()">
              <h1 class="text-2xl font-bold text-brutal-dark">{{ caseTitle }}</h1>
              <p class="text-gray-500">{{ caseDescription }}</p>
            </div>
          </div>
          
          <div class="flex items-center gap-3">
            <cb-role-badge [role]="effectiveRole()"></cb-role-badge>
            
            <!-- Role Switcher -->
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

      <!-- View Mode Switcher -->
      <div class="max-w-6xl mx-auto mb-6">
        <div class="flex gap-2">
          <cb-brutal-button 
            (clicked)="setViewMode('timeline')"
            [variant]="viewMode() === 'timeline' ? 'primary' : 'ghost'"
            size="sm"
            icon="📋"
          >
            Timeline View
          </cb-brutal-button>
          
          <cb-brutal-button 
            (clicked)="setViewMode('board')"
            [variant]="viewMode() === 'board' ? 'primary' : 'ghost'"
            size="sm"
            icon="🧠"
            [disabled]="!canViewBoard"
          >
            Investigation Board
          </cb-brutal-button>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="store.uiState().isLoading" class="max-w-6xl mx-auto">
        <cb-glass-card additionalClasses="p-8 text-center">
          <div class="animate-pulse">Loading case details...</div>
        </cb-glass-card>
      </div>

      <!-- Case Not Found -->
      <div *ngIf="!store.uiState().isLoading && !currentCase()" class="max-w-6xl mx-auto">
        <cb-glass-card additionalClasses="p-8 text-center">
          <div class="text-4xl mb-4">🔍</div>
          <h2 class="text-xl font-bold mb-2">Case Not Found</h2>
          <p class="text-gray-500">The requested case could not be found.</p>
        </cb-glass-card>
      </div>

      <!-- Main Content -->
      <div *ngIf="!store.uiState().isLoading && currentCase()" class="max-w-6xl mx-auto">
        
        <!-- Timeline View -->
        <div *ngIf="viewMode() === 'timeline'" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Timeline Column -->
          <div class="lg:col-span-2 space-y-1">
            <h2 class="text-lg font-semibold mb-4">📅 Activity Timeline</h2>
            <div *ngFor="let entry of timeline(); let last = last">
              <cb-timeline-item [entry]="entry" [isLast]="last"></cb-timeline-item>
            </div>
            <cb-glass-card *ngIf="timeline().length === 0" additionalClasses="p-6 text-center">
              <p class="text-gray-500">No timeline events yet.</p>
            </cb-glass-card>
          </div>
          
          <!-- Sidebar -->
          <div class="space-y-6">
            <!-- Case Stats -->
            <cb-glass-card additionalClasses="p-5">
              <h3 class="font-semibold mb-4">📊 Case Statistics</h3>
              <div class="space-y-3">
                <div class="flex justify-between">
                  <span class="text-gray-600">Evidence</span>
                  <span class="font-bold">{{ evidenceCount }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Connections</span>
                  <span class="font-bold text-indigo-600">{{ connectionCount }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Active Hypotheses</span>
                  <span class="font-bold text-green-600">{{ activeHypothesisCount }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Notes</span>
                  <span class="font-bold">{{ noteCount }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Days Open</span>
                  <span class="font-bold">{{ daysOpen }}</span>
                </div>
              </div>
            </cb-glass-card>
            
            <!-- Permissions -->
            <cb-glass-card additionalClasses="p-5">
              <h3 class="font-semibold mb-4">🔐 Your Permissions</h3>
              <div class="flex flex-wrap gap-2">
                <span *ngIf="canAddEvidence" class="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">Add Evidence</span>
                <span *ngIf="canCreateConnections" class="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded">Create Connections</span>
                <span *ngIf="canCreateHypotheses" class="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded">Create Hypotheses</span>
                <span *ngIf="canCloseCase" class="text-xs px-2 py-1 bg-red-100 text-red-700 rounded">Close Case</span>
              </div>
            </cb-glass-card>
          </div>
        </div>
        
        <!-- Investigation Board View (Placeholder) -->
        <div *ngIf="viewMode() === 'board'">
          <cb-glass-card additionalClasses="p-8 text-center min-h-[500px] flex flex-col items-center justify-center">
            <div class="text-6xl mb-6">🧠</div>
            <h2 class="text-2xl font-bold text-brutal-dark mb-3">Investigation Board</h2>
            <p class="text-gray-600 max-w-md mb-6">
              Visual investigation board for connecting evidence, creating hypotheses, 
              and building investigation paths. Coming in Phase 3!
            </p>
            
            <!-- Mind Palace Stats -->
            <div class="flex gap-4 mb-6">
              <div class="text-center px-4 py-2 bg-indigo-50 rounded-lg">
                <div class="text-2xl font-bold text-indigo-600">{{ connectionCount }}</div>
                <div class="text-xs text-gray-500">Connections</div>
              </div>
              <div class="text-center px-4 py-2 bg-green-50 rounded-lg">
                <div class="text-2xl font-bold text-green-600">{{ activeHypothesisCount }}</div>
                <div class="text-xs text-gray-500">Hypotheses</div>
              </div>
              <div class="text-center px-4 py-2 bg-purple-50 rounded-lg">
                <div class="text-2xl font-bold text-purple-600">{{ pathsCount }}</div>
                <div class="text-xs text-gray-500">Paths</div>
              </div>
            </div>
            
            <cb-brutal-button variant="secondary" (clicked)="setViewMode('timeline')">
              ← Return to Timeline
            </cb-brutal-button>
          </cb-glass-card>
        </div>
      </div>
    </div>
  `
})
export class CaseDetailContainerComponent {
  store = inject(CaseStore);

  viewMode = signal<'timeline' | 'board'>('timeline');

  currentCase = this.store.currentCase;
  timeline = this.store.timeline;

  effectiveRole = () => this.store.uiState().roleOverride || this.store.currentUser().role;

  // Helper getters to avoid strict null check issues in template
  get caseTitle(): string { return this.currentCase()?.title || ''; }
  get caseDescription(): string { return this.currentCase()?.description || ''; }
  get evidenceCount(): number { return this.currentCase()?.evidenceCount || 0; }
  get connectionCount(): number { return this.currentCase()?.connectionCount || 0; }
  get activeHypothesisCount(): number { return this.currentCase()?.activeHypothesisCount || 0; }
  get noteCount(): number { return this.currentCase()?.noteCount || 0; }
  get daysOpen(): number { return this.currentCase()?.daysOpen || 0; }
  get pathsCount(): number { return this.currentCase()?.investigationPaths?.length || 0; }

  get canViewBoard(): boolean { return this.currentCase()?.permissions?.canViewBoard || false; }
  get canAddEvidence(): boolean { return this.currentCase()?.permissions?.canAddEvidence || false; }
  get canCreateConnections(): boolean { return this.currentCase()?.permissions?.canCreateConnections || false; }
  get canCreateHypotheses(): boolean { return this.currentCase()?.permissions?.canCreateHypotheses || false; }
  get canCloseCase(): boolean { return this.currentCase()?.permissions?.canCloseCase || false; }

  setViewMode(mode: 'timeline' | 'board'): void {
    if (mode === 'board' && !this.canViewBoard) {
      return;
    }
    this.viewMode.set(mode);
  }

  switchRole(event: Event): void {
    const role = (event.target as HTMLSelectElement).value as UserRole;
    this.store.switchRole(role);
  }

  goBack(): void {
    this.store.selectCase(null);
  }
}

