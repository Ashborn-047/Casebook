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
    <div class="case-detail-host" [class.board-view]="viewMode() === 'board'">
      <!-- Case Meta Bar (Integrated Header) -->
      @if (currentCase()) {
        <div class="case-meta-bar">
          <div class="meta-left">
            <button class="back-btn brutal-btn" (click)='goBack()' title="Back to Cases" aria-label="Back to Cases">←</button>
            <div class="case-title-stack">
              <span class="case-id">#{{ currentCase()?.id?.slice(-6)?.toUpperCase() }}</span>
              <h1 class="case-title">{{ caseTitle }}</h1>
            </div>
          </div>

          <div class="meta-center">
            <div class="segmented-control">
              <button [class.active]="viewMode() === 'timeline'" (click)="setViewMode('timeline')">
                📋 TIMELINE
              </button>
              <button [class.active]="viewMode() === 'board'" (click)="setViewMode('board')">
                🧠 MIND PALACE
              </button>
            </div>
          </div>

          <div class="meta-right">
            <button class="brutal-btn tool-btn"
              [class.active]="showTimeTravel()"
              (click)="showTimeTravel.set(!showTimeTravel())"
              title="Toggle Time Travel"
              aria-label="Toggle Time Travel">
              ⏳
            </button>
            <button class="brutal-btn tool-btn upload-trigger"
              (click)="showUpload.set(true)"
              title="Upload Evidence"
              aria-label="Upload Evidence">
              📎
            </button>
            <div class="export-tray">
              <button (click)="exportJson()">JSON</button>
              <button (click)="exportPdf()">PDF</button>
            </div>
          </div>
        </div>
      }

      <!-- Time Travel Debugger -->
      @if (showTimeTravel()) {
        <div style="margin-bottom: 20px; flex-shrink: 0;">
          <cb-time-travel-debugger></cb-time-travel-debugger>
        </div>
      }

      <!-- Loading -->
      @if (store.uiState().isLoading) {
        <div class="brutal-card" style="text-align: center; padding: 40px;">
          Loading case details...
        </div>
      }

      <!-- Case Not Found -->
      @if (!store.uiState().isLoading && !currentCase()) {
        <div class="brutal-card" style="text-align: center; padding: 40px;">
          <div style="font-size: 4rem; margin-bottom: 10px;">🔍</div>
          <h2>Case Not Found</h2>
          <p style="margin-top: 10px;">The requested case could not be found.</p>
        </div>
      }

      <!-- Main Content -->
      @if (!store.uiState().isLoading && currentCase()) {
        <div style="flex: 1; display: flex; flex-direction: column; min-height: 0;">

          <!-- ==================== TIMELINE VIEW ==================== -->
          @if (viewMode() === 'timeline') {
            <div class="case-detail-layout">
              <!-- Sidebar -->
              <aside>
                <div class="brutal-card" style="background: var(--lavender)">
                  <h2 style="margin-bottom: 10px;">Case Info</h2>
                  <div class="form-group">
                    <span class="label-text">Title</span>
                    <p style="font-weight: bold;">{{ caseTitle }}</p>
                  </div>
                  <div class="form-group">
                    <span class="label-text">Severity</span>
                    <span class="badge" [style.background]="getSeverityColor(currentCase()?.severity || 'low')">
                      {{ currentCase()?.severity | uppercase }}
                    </span>
                  </div>
                  <div class="form-group">
                    <span class="label-text">Status</span>
                    <p>{{ currentCase()?.status | uppercase }} ({{ daysOpen }} Days Open)</p>
                  </div>
                  <div class="form-group">
                    <span class="label-text">Description</span>
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
                </div>
              </aside>

              <!-- Timeline -->
              <main class="active-work-area">
                <div class="timeline-header">
                  <h2>📅 Timeline View</h2>
                </div>

                <div class="timeline">
                  @for (entry of timeline(); track $index) {
                    <div class="timeline-item">
                      <div class="timeline-icon">
                        {{ getEventIcon(entry.type) }}
                      </div>
                      <div class="brutal-card" style="margin-bottom: 0;"
                           [style.background]="getEventCardColor(entry.type)">
                        <!-- Chain of Custody Sticker -->
                        @if (entry.actorId) {
                          <span class="sticker">
                            {{ entry.actorId | uppercase | slice:0:3 }} &bull; {{ formatTimestamp(entry.occurredAt) }}
                          </span>
                        }

                        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                          <span class="badge" style="background: white; color: black;">{{ entry.type }}</span>
                          <span class="mono" style="font-size: 0.7rem;">{{ entry.occurredAt }}</span>
                        </div>
                        <h4 [style.color]="entry.type === 'NOTE_ADDED' ? 'white' : 'black'">
                          {{ entry.title || entry.type }}
                        </h4>
                        @if (entry.description) {
                          <p [style.color]="entry.type === 'NOTE_ADDED' ? 'rgba(255,255,255,0.9)' : 'black'">
                            {{ entry.description }}
                          </p>
                        }
                        @if (entry.actorId) {
                          <div style="margin-top: 10px; font-size: 0.8rem; font-weight: bold;">
                            👤 {{ entry.actorId }}
                          </div>
                        }
                      </div>
                    </div>
                  }
                </div>

                @if (timeline().length === 0) {
                  <div class="brutal-card" style="text-align: center; padding: 30px;">
                    <p>No timeline events yet.</p>
                  </div>
                }
              </main>
            </div>
          }

          <!-- ==================== BOARD VIEW ==================== -->
          @if (viewMode() === 'board') {
            <div class="board-view-container">
              <div class="board-layout">
                <div class="canvas-container">
                  <!-- Floating Toolbar -->
                  <div class="floating-toolbar">
                    <cb-board-toolbar></cb-board-toolbar>
                  </div>

                  <cb-investigation-board></cb-investigation-board>
                </div>
              </div>

              <div class="board-status-bar">
                <div class="status-group">
                  <span class="stat-tag">NODES: {{ nodesCount() }}</span>
                  <span class="stat-tag">LINKS: {{ connectionsCount() }}</span>
                  <span class="stat-tag mode-tag">{{ boardMode() | uppercase }} MODE</span>
                </div>

                <div class="status-group central-group">
                  <span>Grid: {{ isGridVisible() ? 'On' : 'Off' }}</span>
                  <span class="divider">|</span>
                  <span>Zoom: {{ boardZoom() }}%</span>
                  <span class="divider">|</span>
                  <span>Size: {{ gridSize() }}px</span>
                  <button class="mini-help-btn" (click)="showBoardInstructions()" aria-label="Show Board Instructions">?</button>
                </div>

                <div class="status-group hotkeys">
                  <kbd class="kbd">Space</kbd> pan &bull;
                  <kbd class="kbd">Esc</kbd> deselect
                </div>
              </div>

              <!-- Instructions Overlay -->
              @if (showInstructions()) {
                <div class="instructions-overlay" (click)="dismissBoardInstructions()" (keydown.escape)="dismissBoardInstructions()" (keydown.enter)="dismissBoardInstructions()" tabindex="0" role="button" aria-label="Close instructions">
                  <div class="brutal-card instructions-card" (click)="$event.stopPropagation()" (keydown)="$event.stopPropagation()" role="dialog" aria-modal="true" aria-label="Board Instructions" tabindex="-1">
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
              }
            </div>
          }
        </div>
      }

      <!-- Evidence Upload Overlay -->
      @if (showUpload()) {
        <cb-evidence-upload
          [caseId]="currentCase()?.id || ''"
          (completed)="showUpload.set(false)"
          (cancelled)="showUpload.set(false)"
        ></cb-evidence-upload>
      }
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      height: 100%;
      width: 100%;
    }

    .case-detail-host {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 20px;
      width: 100%;
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 0;
      overflow-y: auto;
    }

    .case-detail-host.board-view {
      max-width: none !important;
      padding: 0 !important;
      overflow: hidden;
    }

    .main-content-area {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 0;
    }

    /* === NEW PREMIUM HEADER === */
    .case-meta-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 15px;
      background: white;
      border: 3px solid black;
      box-shadow: 4px 4px 0 black;
      margin-top: 10px;
      margin-bottom: 8px;
      z-index: 100;
      flex-shrink: 0;
      gap: 15px;
    }

    .meta-left {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
    }

    .meta-center {
      display: flex;
      justify-content: center;
      flex: 1;
    }

    .meta-right {
      display: flex;
      align-items: center;
      gap: 8px;
      justify-content: flex-end;
      flex: 1;
    }

    .case-title-stack {
      display: flex;
      flex-direction: column;
    }

    .case-id {
      font-size: 0.6rem;
      font-weight: 900;
      color: #666;
      letter-spacing: 1px;
    }

    .case-title {
      font-size: 1rem;
      font-weight: 900;
      margin: 0;
      text-transform: uppercase;
      line-height: 1;
    }

    .segmented-control {
      display: flex;
      background: #eee;
      border: 2px solid black;
      padding: 0;
      overflow: hidden;
      border-radius: 4px;
    }

    .segmented-control button {
      border: none;
      border-right: 2px solid black;
      padding: 4px 15px;
      font-weight: 900;
      font-size: 0.7rem;
      cursor: pointer;
      background: transparent;
      transition: all 0.2s;
    }

    .segmented-control button:last-child {
      border-right: none;
    }

    .segmented-control button.active {
      background: var(--lime);
    }

    .segmented-control button[disabled] {
      opacity: 0.3;
      cursor: not-allowed;
    }

    .meta-right .tool-btn {
      padding: 4px 8px !important;
      font-size: 0.8rem !important;
      background: white;
      border: 2px solid black;
    }

    .meta-right .tool-btn.active {
      background: var(--pink);
    }

    .export-tray {
      display: flex;
      border: 2px solid black;
      background: black;
      gap: 2px;
      padding: 2px;
    }

    .export-tray button {
      background: white;
      border: none;
      padding: 2px 6px;
      font-size: 0.6rem;
      font-weight: 900;
      cursor: pointer;
    }

    .export-tray button:hover {
      background: var(--yellow);
    }

    .toggle-btn {
      font-size: 0.8rem;
      font-weight: 900;
      background: white;
      padding: 10px 20px;
    }

    .toggle-btn.active {
      background: var(--orange);
      box-shadow: inset 4px 4px 0 rgba(0,0,0,0.2);
    }

    .back-btn {
      padding: 10px 15px;
      background: white;
      font-size: 1.2rem;
    }

    .case-detail-layout {
      display: grid;
      grid-template-columns: 300px 1fr;
      gap: 20px;
    }

    .board-view-container {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      padding-bottom: 5px;
    }

    .board-header-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 5px;
      padding: 5px 15px;
      background: white;
      border: 3px solid black;
      box-shadow: 4px 4px 0 black;
      flex-shrink: 0;
      gap: 10px;
    }

    .board-stats {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 0.7rem;
      font-weight: bold;
      text-transform: uppercase;
    }

    .board-layout {
      flex: 1;
      display: flex;
      min-height: 0;
    }

    .canvas-container {
      flex: 1;
      border: 3px solid black;
      overflow: hidden;
      background: var(--dark-bg);
      position: relative;
    }

    .floating-toolbar {
      position: absolute;
      top: 10px;
      left: 10px;
      z-index: 100;
      width: 170px;
      max-height: calc(100% - 20px);
      overflow-y: auto;
      background: #f8f8f8;
      border: 3px solid black;
      box-shadow: 4px 4px 0 black;
      padding: 0;
    }

    .board-status-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 4px 15px;
      background: white;
      border: 3px solid black;
      border-top: none;
      flex-shrink: 0;
      font-size: 0.7rem;
      font-weight: bold;
    }

    .status-group {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .stat-tag {
      background: var(--lime);
      padding: 2px 8px;
      border: 2px solid black;
    }

    .mode-tag {
      background: var(--yellow);
    }

    .divider {
      color: #999;
      margin: 0 5px;
    }

    .mini-help-btn {
      background: black;
      color: white;
      border: none;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      font-size: 0.65rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-left: 5px;
    }

    .mini-help-btn:hover {
      background: var(--pink);
    }

    .hotkeys {
      font-size: 0.65rem;
    }

    .kbd {
      display: inline-block;
      padding: 1px 4px;
      background: #eee;
      border: 1.5px solid black;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.65rem;
      border-radius: 3px;
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

    .label-text {
      display: block;
      font-weight: bold;
      margin-bottom: 5px;
      text-transform: uppercase;
      font-size: 0.8rem;
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
    this.viewMode.set(mode);
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
