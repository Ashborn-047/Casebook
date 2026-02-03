import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CaseStore } from '../../core/state/case-store.service';
import { BoardStore } from '../../core/state/board-store.service';
import {
  GlassCardComponent,
  BrutalButtonComponent,
  RoleBadgeComponent,
  TimelineItemComponent
} from '@casbook/shared-ui';
import { UserRole } from '@casbook/shared-models';
import { InvestigationBoardComponent } from './investigation-board/investigation-board.component';
import { BoardToolbarComponent } from './board-tools/board-toolbar.component';
import { EvidenceUploadComponent } from './evidence-upload/evidence-upload.component';
import { TimeTravelDebuggerComponent } from '../time-travel/time-travel-debugger.component';
import { TimeTravelStore } from '../time-travel/time-travel.store';
import { JsonExportService } from '@casbook/shared-utils';
import { PdfExportService } from '@casbook/shared-utils';

@Component({
  selector: 'app-case-detail-container',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    GlassCardComponent,
    BrutalButtonComponent,
    RoleBadgeComponent,
    TimelineItemComponent,
    InvestigationBoardComponent,
    BoardToolbarComponent,
    EvidenceUploadComponent,
    TimeTravelDebuggerComponent
  ],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <!-- Header -->
      <header class="max-w-6xl mx-auto mb-8" [class.max-w-none]="viewMode() === 'board'">
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
            <!-- Save Board Layout Button (only in board view) -->
            <cb-brutal-button 
              *ngIf="viewMode() === 'board'" 
              variant="secondary" 
              size="sm" 
              icon="💾"
              (clicked)="saveBoardLayout()"
              [disabled]="!canUpdateLayout"
            >
              Save Layout
            </cb-brutal-button>
            
            <cb-role-badge [role]="effectiveRole()"></cb-role-badge>
            
            <!-- Audit Export Buttons -->
            <div class="flex items-center gap-2 border-l-2 border-brutal-dark pl-3 ml-2">
              <cb-brutal-button 
                variant="ghost" 
                size="sm" 
                icon="📄" 
                (clicked)="exportJson()" 
                title="Export JSON Audit"
              ></cb-brutal-button>
              <cb-brutal-button 
                variant="ghost" 
                size="sm" 
                icon="📕" 
                (clicked)="exportPdf()" 
                title="Export PDF Report"
              ></cb-brutal-button>
            </div>
            
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
      <div class="max-w-6xl mx-auto mb-6" [class.max-w-none]="viewMode() === 'board'">
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

          <cb-brutal-button 
            (clicked)="showTimeTravel.set(!showTimeTravel())"
            [variant]="showTimeTravel() ? 'primary' : 'ghost'"
            size="sm"
            icon="⏳"
            [disabled]="!canTimeTravel"
          >
            Time Travel Replay
          </cb-brutal-button>
        </div>
        
        <div class="flex items-center" *ngIf="canAddEvidence">
          <cb-brutal-button 
            variant="primary" 
            size="sm" 
            icon="+" 
            (clicked)="showUpload.set(true)"
          >
            Add Evidence
          </cb-brutal-button>
        </div>
      </div>

      <!-- Time Travel Debugger UI overlay or inline -->
      <div *ngIf="showTimeTravel()" class="max-w-6xl mx-auto mb-6">
        <cb-time-travel-debugger></cb-time-travel-debugger>
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
      <div *ngIf="!store.uiState().isLoading && currentCase()" 
           class="mx-auto"
           [class.max-w-6xl]="viewMode() === 'timeline'"
           [class.max-w-none]="viewMode() === 'board'">
        
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
        
        <!-- Investigation Board View -->
        <div *ngIf="viewMode() === 'board'" class="board-view-container">
          <!-- Board Header with Instructions Button -->
          <div class="board-header">
            <div class="flex items-center gap-4">
              <h2 class="text-lg font-semibold">🧠 Mind Palace - Investigation Board</h2>
              <cb-brutal-button 
                variant="ghost" 
                size="sm" 
                icon="❓" 
                (clicked)="showBoardInstructions()"
              >
                Help
              </cb-brutal-button>
            </div>
            
            <div class="flex items-center gap-3">
              <div class="board-stats">
                <span>{{ nodesCount() }} nodes</span>
                <span class="text-gray-400">|</span>
                <span>{{ connectionsCount() }} connections</span>
                <span class="text-gray-400">|</span>
                <span>{{ boardMode() | titlecase }} mode</span>
              </div>
            </div>
          </div>
          
          <!-- Board Layout -->
          <div class="board-layout">
            <!-- Toolbar (Left Sidebar) -->
            <cb-glass-card additionalClasses="toolbar-sidebar">
              <cb-board-toolbar></cb-board-toolbar>
            </cb-glass-card>
            
            <!-- Canvas Container -->
            <div class="canvas-container">
              <cb-investigation-board></cb-investigation-board>
            </div>
          </div>
          
          <!-- Status Bar -->
          <div class="board-status-bar">
            <div class="flex items-center gap-4 text-sm text-gray-600">
              <span>Grid: {{ isGridVisible() ? 'On' : 'Off' }}</span>
              <span class="text-gray-400">|</span>
              <span>Zoom: {{ boardZoom() }}%</span>
              <span class="text-gray-400">|</span>
              <span>Grid Size: {{ gridSize() }}px</span>
            </div>
            <div class="text-sm text-gray-500">
              Press <kbd class="kbd">Space</kbd> for pan mode, 
              <kbd class="kbd">Esc</kbd> to deselect
            </div>
          </div>
          
          <!-- Instructions Overlay -->
          <div *ngIf="showInstructions()" class="instructions-overlay" (click)="dismissBoardInstructions()">
            <cb-glass-card additionalClasses="instructions-card" (click)="$event.stopPropagation()">
              <h3 class="text-xl font-bold mb-4">🧠 Investigation Board - Quick Guide</h3>
              <div class="instructions-content">
                <div class="instruction-item">
                  <span class="instruction-icon">🖱️</span>
                  <div>
                    <strong>Select Mode</strong>
                    <p>Click to select nodes, drag to move them</p>
                  </div>
                </div>
                <div class="instruction-item">
                  <span class="instruction-icon">🔗</span>
                  <div>
                    <strong>Connect Mode</strong>
                    <p>Click a source node, then click a target to connect</p>
                  </div>
                </div>
                <div class="instruction-item">
                  <span class="instruction-icon">👆</span>
                  <div>
                    <strong>Pan Mode</strong>
                    <p>Drag to pan the canvas. Or hold Space in select mode</p>
                  </div>
                </div>
                <div class="instruction-item">
                  <span class="instruction-icon">🖱️</span>
                  <div>
                    <strong>Zoom</strong>
                    <p>Use mouse wheel to zoom in/out</p>
                  </div>
                </div>
                <div class="instruction-item">
                  <span class="instruction-icon">⌨️</span>
                  <div>
                    <strong>Keyboard Shortcuts</strong>
                    <p>Ctrl+Z: Undo | Ctrl+Y: Redo | Esc: Deselect</p>
                  </div>
                </div>
              </div>
              <cb-brutal-button variant="primary" (clicked)="dismissBoardInstructions()">
                Got it!
              </cb-brutal-button>
            </cb-glass-card>
          </div>
        </div>
      </div>

      <!-- Evidence Upload Overlay -->
      <cb-evidence-upload 
        *ngIf="showUpload()" 
        [caseId]="currentCase()?.id || ''"
        (completed)="showUpload.set(false)"
        (cancelled)="showUpload.set(false)"
      ></cb-evidence-upload>
    </div>
  `,
  styles: [`
    .board-view-container {
      display: flex;
      flex-direction: column;
      height: calc(100vh - 180px);
      min-height: 600px;
    }
    
    .board-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
      padding: 12px 16px;
      background: rgba(255, 255, 255, 0.8);
      border-radius: 12px;
      border: 2px solid #1f2937;
    }
    
    .board-stats {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 14px;
    }
    
    .board-layout {
      display: flex;
      flex: 1;
      gap: 16px;
      min-height: 0;
    }
    
    .toolbar-sidebar {
      width: 280px;
      flex-shrink: 0;
      overflow-y: auto;
    }
    
    .canvas-container {
      flex: 1;
      border: 2px solid #1f2937;
      border-radius: 12px;
      overflow: hidden;
      background: white;
    }
    
    .board-status-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      margin-top: 16px;
      background: rgba(255, 255, 255, 0.8);
      border-radius: 12px;
      border: 2px solid #1f2937;
    }
    
    .kbd {
      display: inline-block;
      padding: 2px 6px;
      background: #f3f4f6;
      border: 1px solid #d1d5db;
      border-radius: 4px;
      font-family: monospace;
      font-size: 12px;
    }
    
    .instructions-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }
    
    .instructions-card {
      max-width: 500px;
      padding: 24px;
    }
    
    .instructions-content {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-bottom: 24px;
    }
    
    .instruction-item {
      display: flex;
      gap: 12px;
      align-items: flex-start;
    }
    
    .instruction-icon {
      font-size: 24px;
      flex-shrink: 0;
    }
    
    .instruction-item p {
      margin: 0;
      color: #6b7280;
      font-size: 14px;
    }
  `]
})
export class CaseDetailContainerComponent {
  store = inject(CaseStore);
  boardStore = inject(BoardStore);

  viewMode = signal<'timeline' | 'board'>('timeline');
  showInstructions = signal(false);
  showUpload = signal(false);
  showTimeTravel = signal(false);

  private jsonExportService = inject(JsonExportService);
  private pdfExportService = inject(PdfExportService);
  private timeTravelStore = inject(TimeTravelStore);

  currentCase = this.store.currentCase;
  timeline = this.store.timeline;

  // Board state computed
  nodesCount = computed(() => this.boardStore.nodes().length);
  connectionsCount = computed(() => this.boardStore.connections().length);
  boardMode = computed(() => this.boardStore.mode());
  boardZoom = computed(() => Math.round(this.boardStore.viewport().zoom * 100));
  gridSize = computed(() => this.boardStore.tools().gridSize);
  isGridVisible = computed(() => this.boardStore.tools().isGridVisible);

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
  get canUpdateLayout(): boolean { return this.currentCase()?.permissions?.canUpdateLayout || false; }
  get canTimeTravel(): boolean { return this.currentCase()?.permissions?.canTimeTravel || false; }

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

  saveBoardLayout(): void {
    this.boardStore.saveLayout();
  }

  showBoardInstructions(): void {
    this.showInstructions.set(true);
  }

  dismissBoardInstructions(): void {
    this.showInstructions.set(false);
  }

  exportJson(): void {
    const caseId = this.currentCase()?.id;
    if (!caseId) return;

    const result = this.jsonExportService.export(caseId, this.store.currentCaseEvents());
    this.downloadResult(result as { blob: Blob; filename: string });
  }

  exportPdf(): void {
    const caseId = this.currentCase()?.id;
    if (!caseId) return;

    const result = this.pdfExportService.export(caseId, this.store.currentCaseEvents());
    this.downloadResult(result as { blob: Blob; filename: string });
  }

  private downloadResult(result: { blob: Blob; filename: string }): void {
    const url = window.URL.createObjectURL(result.blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = result.filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }
}
