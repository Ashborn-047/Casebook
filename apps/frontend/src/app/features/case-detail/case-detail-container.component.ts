import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CaseStore } from '../../core/state/case-store.service';
import { BoardStore } from '../../core/state/board-store.service';
import { UserRole } from '@casbook/shared-models';
import { InvestigationBoardComponent } from './investigation-board/investigation-board.component';
import { BoardToolbarComponent } from './board-tools/board-toolbar.component';
import { EvidenceUploadComponent } from './evidence-upload/evidence-upload.component';
import { TimeTravelDebuggerComponent } from '../time-travel/time-travel-debugger.component';
import { TimeTravelStore } from '../time-travel/time-travel.store';
import { JsonExportService } from '@casbook/shared-utils';
import { PdfExportService } from '@casbook/shared-utils';
import { getSeverityColor } from '../../shared/utils/contrast.util';

@Component({
  selector: 'app-case-detail-container',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    InvestigationBoardComponent,
    BoardToolbarComponent,
    EvidenceUploadComponent,
    TimeTravelDebuggerComponent
  ],
  template: `
    <div class="container">
      <!-- View Mode Tabs -->
      <div class="tabs">
        <button class="brutal-btn"
          [style.background]="viewMode() === 'timeline' ? 'var(--lime)' : 'white'"
          (click)="setViewMode('timeline')">📋 Timeline</button>
        <button class="brutal-btn"
          [style.background]="viewMode() === 'board' ? 'var(--yellow)' : 'white'"
          [disabled]="!canViewBoard"
          (click)="setViewMode('board')">🧠 Board</button>
        <button class="brutal-btn"
          [style.background]="showTimeTravel() ? 'var(--orange)' : 'white'"
          [disabled]="!canTimeTravel"
          (click)="showTimeTravel.set(!showTimeTravel())">⏳ Time Travel</button>
        <button class="brutal-btn"
          style="background: var(--pink);"
          *ngIf="canAddEvidence"
          (click)="showUpload.set(true)">📎 Upload</button>
        <button class="brutal-btn" (click)="goBack()">← Back</button>

        <!-- Export Buttons -->
        <button class="brutal-btn" title="Export JSON" (click)="exportJson()">📄 JSON</button>
        <button class="brutal-btn" title="Export PDF" (click)="exportPdf()">📕 PDF</button>

        <!-- Save Board Layout (only in board view) -->
        <button class="brutal-btn"
          *ngIf="viewMode() === 'board'"
          [disabled]="!canUpdateLayout"
          style="background: var(--blue); color: white;"
          (click)="saveBoardLayout()">💾 Save Layout</button>
      </div>

      <!-- Time Travel Debugger -->
      <div *ngIf="showTimeTravel()" style="margin-bottom: 20px;">
        <cb-time-travel-debugger></cb-time-travel-debugger>
      </div>

      <!-- Loading -->
      <div *ngIf="store.uiState().isLoading" class="brutal-card" style="text-align: center; padding: 40px;">
        Loading case details...
      </div>

      <!-- Case Not Found -->
      <div *ngIf="!store.uiState().isLoading && !currentCase()" class="brutal-card" style="text-align: center; padding: 40px;">
        <div style="font-size: 4rem; margin-bottom: 10px;">🔍</div>
        <h2>Case Not Found</h2>
        <p style="margin-top: 10px;">The requested case could not be found.</p>
      </div>

      <!-- Main Content -->
      <div *ngIf="!store.uiState().isLoading && currentCase()">

        <!-- ==================== TIMELINE VIEW ==================== -->
        <div *ngIf="viewMode() === 'timeline'" class="case-detail-layout">
          <!-- Sidebar -->
          <aside>
            <div class="brutal-card" style="background: var(--lavender)">
              <h2 style="margin-bottom: 10px;">Case Info</h2>
              <div class="form-group">
                <label>Title</label>
                <p style="font-weight: bold;">{{ caseTitle }}</p>
              </div>
              <div class="form-group">
                <label>Severity</label>
                <span class="badge" [style.background]="getSeverityColor(currentCase()?.severity || 'low')">
                  {{ currentCase()?.severity | uppercase }}
                </span>
              </div>
              <div class="form-group">
                <label>Status</label>
                <p>{{ currentCase()?.status | uppercase }} ({{ daysOpen }} Days Open)</p>
              </div>
              <div class="form-group">
                <label>Description</label>
                <p style="font-size: 0.85rem;">{{ caseDescription }}</p>
              </div>
              <hr style="border: 1px solid black; margin: 15px 0;">

              <!-- Case Stats -->
              <div style="display: flex; flex-direction: column; gap: 8px; font-size: 0.85rem;">
                <div style="display: flex; justify-content: space-between;">
                  <span>📎 Evidence</span>
                  <strong>{{ evidenceCount }}</strong>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span>🔗 Connections</span>
                  <strong>{{ connectionCount }}</strong>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span>💡 Hypotheses</span>
                  <strong>{{ activeHypothesisCount }}</strong>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span>📝 Notes</span>
                  <strong>{{ noteCount }}</strong>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span>🧭 Paths</span>
                  <strong>{{ pathsCount }}</strong>
                </div>
              </div>

              <hr style="border: 1px solid black; margin: 15px 0;">

              <!-- Permissions -->
              <label>Your Permissions</label>
              <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-top: 5px;">
                <span *ngIf="canAddEvidence" class="badge" style="background: white; font-size: 0.65rem;">Add Evidence</span>
                <span *ngIf="canCreateConnections" class="badge" style="background: white; font-size: 0.65rem;">Connect</span>
                <span *ngIf="canCreateHypotheses" class="badge" style="background: white; font-size: 0.65rem;">Hypothesize</span>
                <span *ngIf="canCloseCase" class="badge" style="background: white; font-size: 0.65rem;">Close Case</span>
              </div>
            </div>
          </aside>

          <!-- Timeline -->
          <main class="active-work-area">
            <div class="timeline-header">
              <h2>📅 Timeline View</h2>
            </div>

            <div class="timeline">
              <div class="timeline-item" *ngFor="let entry of timeline()">
                <div class="timeline-icon">
                  {{ getEventIcon(entry.type) }}
                </div>
                <div class="brutal-card" style="margin-bottom: 0;"
                     [style.background]="getEventCardColor(entry.type)">
                  <!-- Chain of Custody Sticker -->
                  <span class="sticker" *ngIf="entry.actorId">
                    {{ entry.actorId | uppercase | slice:0:3 }} &bull; {{ formatTimestamp(entry.occurredAt) }}
                  </span>

                  <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span class="badge" style="background: white; color: black;">{{ entry.type }}</span>
                    <span class="mono" style="font-size: 0.7rem;">{{ entry.occurredAt }}</span>
                  </div>
                  <h4 [style.color]="entry.type === 'NOTE_ADDED' ? 'white' : 'black'">
                    {{ entry.title || entry.type }}
                  </h4>
                  <p *ngIf="entry.description"
                     [style.color]="entry.type === 'NOTE_ADDED' ? 'rgba(255,255,255,0.9)' : 'black'">
                    {{ entry.description }}
                  </p>
                  <div style="margin-top: 10px; font-size: 0.8rem; font-weight: bold;"
                       *ngIf="entry.actorId">
                    👤 {{ entry.actorId }}
                  </div>
                </div>
              </div>
            </div>

            <div *ngIf="timeline().length === 0" class="brutal-card" style="text-align: center; padding: 30px;">
              <p>No timeline events yet.</p>
            </div>
          </main>
        </div>

        <!-- ==================== BOARD VIEW ==================== -->
        <div *ngIf="viewMode() === 'board'" class="board-view-container">
          <div class="board-header-bar">
            <div style="display: flex; align-items: center; gap: 15px;">
              <h2>🧠 Investigation Board</h2>
              <button class="brutal-btn" style="padding: 6px 12px; font-size: 0.75rem;" (click)="showBoardInstructions()">❓ Help</button>
            </div>
            <div class="board-stats">
              <span>{{ nodesCount() }} nodes</span>
              <span style="color: #999;">|</span>
              <span>{{ connectionsCount() }} connections</span>
              <span style="color: #999;">|</span>
              <span>{{ boardMode() | titlecase }} mode</span>
            </div>
          </div>

          <div class="board-layout">
            <div class="toolbar-sidebar brutal-card">
              <cb-board-toolbar></cb-board-toolbar>
            </div>
            <div class="canvas-container">
              <cb-investigation-board></cb-investigation-board>
            </div>
          </div>

          <div class="board-status-bar">
            <div style="display: flex; align-items: center; gap: 12px; font-size: 0.85rem;">
              <span>Grid: {{ isGridVisible() ? 'On' : 'Off' }}</span>
              <span style="color: #999;">|</span>
              <span>Zoom: {{ boardZoom() }}%</span>
              <span style="color: #999;">|</span>
              <span>Grid Size: {{ gridSize() }}px</span>
            </div>
            <div style="font-size: 0.8rem;">
              <kbd class="kbd">Space</kbd> pan &bull;
              <kbd class="kbd">Esc</kbd> deselect
            </div>
          </div>

          <!-- Instructions Overlay -->
          <div *ngIf="showInstructions()" class="instructions-overlay" (click)="dismissBoardInstructions()">
            <div class="brutal-card instructions-card" (click)="$event.stopPropagation()">
              <h3 style="margin-bottom: 15px;">🧠 Board — Quick Guide</h3>
              <div class="instructions-content">
                <div class="instruction-item">
                  <span class="instruction-icon">🖱️</span>
                  <div><strong>Select</strong><p>Click to select, drag to move</p></div>
                </div>
                <div class="instruction-item">
                  <span class="instruction-icon">🔗</span>
                  <div><strong>Connect</strong><p>Click source → click target</p></div>
                </div>
                <div class="instruction-item">
                  <span class="instruction-icon">👆</span>
                  <div><strong>Pan</strong><p>Drag to pan, or hold Space</p></div>
                </div>
                <div class="instruction-item">
                  <span class="instruction-icon">🔍</span>
                  <div><strong>Zoom</strong><p>Mouse wheel</p></div>
                </div>
                <div class="instruction-item">
                  <span class="instruction-icon">⌨️</span>
                  <div><strong>Shortcuts</strong><p>Ctrl+Z Undo | Ctrl+Y Redo | Esc Deselect</p></div>
                </div>
              </div>
              <button class="brutal-btn" style="width: 100%; background: var(--lime);" (click)="dismissBoardInstructions()">Got it! 💪</button>
            </div>
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

    .board-header-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
      padding: 12px 16px;
      background: white;
      border: var(--border-width) solid var(--border);
      box-shadow: var(--shadow);
      flex-wrap: wrap;
      gap: 10px;
    }

    .board-stats {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 0.85rem;
      font-weight: bold;
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
      border: var(--border-width) solid var(--border);
      overflow: hidden;
      background: var(--dark-bg);
    }

    .board-status-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 16px;
      margin-top: 16px;
      background: white;
      border: var(--border-width) solid var(--border);
      box-shadow: var(--shadow);
      flex-wrap: wrap;
      gap: 10px;
    }

    .kbd {
      display: inline-block;
      padding: 2px 6px;
      background: #eee;
      border: 2px solid black;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.75rem;
    }

    .instructions-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
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
      color: #666;
      font-size: 0.85rem;
    }

    @media (max-width: 900px) {
      .board-layout {
        flex-direction: column;
      }
      .toolbar-sidebar {
        width: 100%;
      }
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

  getSeverityColor = getSeverityColor;

  // Helper getters
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

  getEventIcon(type: string): string {
    if (type.includes('EVIDENCE')) return '💾';
    if (type.includes('HYPOTHESIS')) return '🧠';
    if (type.includes('NOTE')) return '📝';
    if (type.includes('CONNECTION')) return '🔗';
    if (type.includes('CASE')) return '📁';
    return '📌';
  }

  getEventCardColor(type: string): string {
    if (type.includes('HYPOTHESIS')) return 'var(--yellow)';
    if (type.includes('NOTE')) return 'var(--blue)';
    if (type.includes('EVIDENCE')) return 'white';
    if (type.includes('CONNECTION')) return 'var(--lavender)';
    return 'white';
  }

  formatTimestamp(iso: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

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
