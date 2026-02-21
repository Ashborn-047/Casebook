import {
    Component,
    OnInit,
    ElementRef,
    ViewChild,
    AfterViewInit,
    HostListener,
    inject,
    computed,
    signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { BoardStore } from '../../../core/state/board-store.service';
import { CaseStore } from '../../../core/state/case-store.service';
import { MindPalaceService } from '../../../core/services/mind-palace.service';
import { BoardNode, BoardConnection } from '@casbook/shared-models';
import { PathCreatorComponent } from './path-creator/path-creator.component';
import { ConnectionModalComponent, ConnectionFormData } from './connection-modal/connection-modal.component';
import { YarnInspectorComponent } from './yarn-inspector/yarn-inspector.component';

@Component({
    selector: 'cb-investigation-board',
    standalone: true,
    imports: [CommonModule, PathCreatorComponent, ConnectionModalComponent, YarnInspectorComponent],
    templateUrl: './investigation-board.component.html',
    styleUrls: ['./investigation-board.component.scss']
})
export class InvestigationBoardComponent implements OnInit, AfterViewInit {
    private boardStore = inject(BoardStore);
    private caseStore = inject(CaseStore);
    private mindPalace = inject(MindPalaceService);

    @ViewChild('boardContainer') boardContainer!: ElementRef<HTMLDivElement>;

    // Board state
    nodes = this.boardStore.nodes;
    uiNodes = this.boardStore.uiNodes;
    connections = this.boardStore.connections;
    uiConnections = this.boardStore.uiConnections;
    viewport = this.boardStore.viewport;
    mode = this.boardStore.mode;
    tools = this.boardStore.tools;
    selectedNode = this.boardStore.selectedNode;

    @ViewChild('pathCreator') pathCreator!: PathCreatorComponent;
    isPathPanelOpen = signal(false);

    // Computed (using pre-optimized UI models)
    evidenceNodes = computed(() =>
        this.uiNodes().filter(node => node.type === 'evidence')
    );

    hypothesisNodes = computed(() =>
        this.uiNodes().filter(node => node.type === 'hypothesis')
    );

    gridSize = computed(() => this.tools().gridSize);

    // Interaction state (as signals for performance-aware rendering)
    isDragging = signal(false);
    isPanning = signal(false);
    isDrawingConnection = signal(false);

    isInteracting = computed(() => this.isDragging() || this.isPanning() || this.isDrawingConnection());

    dragStart = { x: 0, y: 0 };
    panStart = { x: 0, y: 0 };
    dragNodeId: string | null = null;

    tempConnection = signal<{ sourceId: string; targetPos: { x: number; y: number } } | null>(null);
    connectionSource: string | null = null;

    // Math for template
    Math = Math;

    // Connection Modal state
    showConnectionModal = signal(false);
    pendingSourceNodeId: string | null = null;
    pendingTargetNodeId: string | null = null;
    pendingSourceLabel = signal('');
    pendingTargetLabel = signal('');
    pendingSuggestedTokens = signal<string[]>([]);

    // Yarn Inspector state
    showYarnInspector = signal(false);
    inspectedConnection = signal<(BoardConnection & { ui: NonNullable<BoardConnection['ui']> }) | null>(null);
    yarnInspectorPos = signal({ x: 0, y: 0 });

    ngOnInit(): void {
        const caseState = this.caseStore.currentCase();
        if (caseState) {
            this.boardStore.initializeBoard(caseState);
        }
    }

    ngAfterViewInit(): void {
        if (this.boardContainer) {
            const rect = this.boardContainer.nativeElement.getBoundingClientRect();
            this.boardStore.updateViewport({
                width: rect.width,
                height: rect.height,
            });
        }
    }

    // === EVENT HANDLERS ===

    onBoardMouseDown(event: MouseEvent): void {
        const boardPos = this.getBoardPosition(event.clientX, event.clientY);

        if (event.button === 0) {
            if (this.mode() === 'pan') {
                this.startPanning(event.clientX, event.clientY);
            } else if (this.mode() === 'connect' && this.connectionSource) {
                const targetNode = this.boardStore.findNodeAtPosition(boardPos.x, boardPos.y);
                if (targetNode && targetNode.id !== this.connectionSource) {
                    // Instead of instant connection, show the "Why?" modal
                    this.pendingSourceNodeId = this.connectionSource;
                    this.pendingTargetNodeId = targetNode.id;

                    const srcNode = this.uiNodes().find(n => n.id === this.connectionSource);
                    const uiTargetNode = this.uiNodes().find(n => n.id === targetNode.id);

                    this.pendingSourceLabel.set(srcNode ? this.getNodeTitle(srcNode) : 'Evidence A');
                    this.pendingTargetLabel.set(uiTargetNode ? this.getNodeTitle(uiTargetNode) : 'Evidence B');

                    // Find shared tokens for suggestion chips
                    this.pendingSuggestedTokens.set(this.findSharedTokens(this.connectionSource, targetNode.id));

                    this.showConnectionModal.set(true);
                }
                this.isDrawingConnection.set(false);
                this.connectionSource = null;
                this.tempConnection.set(null);
            } else if (this.mode() === 'select') {
                const clickedNode = this.boardStore.findNodeAtPosition(boardPos.x, boardPos.y);
                if (!clickedNode) {
                    this.boardStore.selectNode(null);
                }
            }
        } else if (event.button === 1) {
            event.preventDefault();
            this.startPanning(event.clientX, event.clientY);
        }
    }

    onBoardMouseMove(event: MouseEvent): void {
        const boardPos = this.getBoardPosition(event.clientX, event.clientY);

        if (this.isPanning()) {
            const deltaX = event.clientX - this.panStart.x;
            const deltaY = event.clientY - this.panStart.y;
            this.boardStore.pan(deltaX, deltaY);
            this.panStart = { x: event.clientX, y: event.clientY };
        } else if (this.isDragging() && this.dragNodeId) {
            const newX = boardPos.x - this.dragStart.x;
            const newY = boardPos.y - this.dragStart.y;
            this.boardStore.moveNode(this.dragNodeId, { x: newX, y: newY });
        } else if (this.isDrawingConnection() && this.tempConnection()) {
            this.tempConnection.update(tc => tc ? { ...tc, targetPos: boardPos } : null);
        }
    }

    onBoardMouseUp(): void {
        if (this.isDragging() && this.dragNodeId) {
            this.boardStore.finishDragging(this.dragNodeId);
        }

        this.isDragging.set(false);
        this.isPanning.set(false);
        this.dragNodeId = null;
    }

    onBoardWheel(event: WheelEvent): void {
        event.preventDefault();
        const delta = event.deltaY > 0 ? -0.1 : 0.1;
        const boardPos = this.getBoardPosition(event.clientX, event.clientY);
        this.boardStore.zoom(delta, boardPos);
    }

    onNodeMouseDown(nodeId: string, event: MouseEvent): void {
        event.stopPropagation();

        if (this.mode() === 'select') {
            this.boardStore.selectNode(nodeId);

            if (event.button === 0) {
                const node = this.nodes().find(n => n.id === nodeId);
                if (node) {
                    const boardPos = this.getBoardPosition(event.clientX, event.clientY);
                    this.dragStart = {
                        x: boardPos.x - node.position.x,
                        y: boardPos.y - node.position.y
                    };
                    this.isDragging.set(true);
                    this.dragNodeId = nodeId;
                }
            }
        } else if (this.mode() === 'connect') {
            if (this.connectionSource) {
                if (this.connectionSource !== nodeId) {
                    // Route through the same "Why?" modal as onBoardMouseDown
                    this.pendingSourceNodeId = this.connectionSource;
                    this.pendingTargetNodeId = nodeId;
                    const srcNode = this.uiNodes().find(n => n.id === this.connectionSource);
                    const tgtNode = this.uiNodes().find(n => n.id === nodeId);
                    this.pendingSourceLabel.set(srcNode ? this.getNodeTitle(srcNode) : 'Node A');
                    this.pendingTargetLabel.set(tgtNode ? this.getNodeTitle(tgtNode) : 'Node B');
                    this.pendingSuggestedTokens.set(this.findSharedTokens(this.connectionSource, nodeId));
                    this.showConnectionModal.set(true);
                }
                this.connectionSource = null;
                this.isDrawingConnection.set(false);
                this.tempConnection.set(null);
            } else {
                this.connectionSource = nodeId;
                this.isDrawingConnection.set(true);
                const boardPos = this.getBoardPosition(event.clientX, event.clientY);
                this.tempConnection.set({
                    sourceId: nodeId,
                    targetPos: boardPos,
                });
            }
        }
    }

    onConnectionClick(connectionId: string): void {
        if (this.mode() === 'delete') {
            this.boardStore.deleteConnection(connectionId);
        }
    }

    // === HELPER METHODS ===

    private getBoardPosition(clientX: number, clientY: number): { x: number; y: number } {
        const viewport = this.viewport();
        const rect = this.boardContainer?.nativeElement.getBoundingClientRect();

        if (!rect) return { x: 0, y: 0 };

        return {
            x: (clientX - rect.left - viewport.panX) / viewport.zoom,
            y: (clientY - rect.top - viewport.panY) / viewport.zoom,
        };
    }

    private startPanning(clientX: number, clientY: number): void {
        this.isPanning.set(true);
        this.panStart = { x: clientX, y: clientY };
    }

    // === UI HELPERS ===

    getNodeClasses(node: BoardNode): string {
        const base = 'h-full transition-all duration-200 hover:shadow-lg ';
        const selected = node.isSelected ? 'ring-2 ring-blue-500 ring-offset-2 ' : '';
        const dragging = node.isDragging ? 'opacity-80 ' : '';

        return base + selected + dragging;
    }

    getHypothesisNodeClasses(node: BoardNode): string {
        const base = 'h-full transition-all duration-200 hover:shadow-xl ';
        const selected = node.isSelected ? 'ring-3 ring-yellow-500 ring-offset-2 ' : '';

        return base + selected;
    }

    getNodeTitle(node: BoardNode): string {
        return node.ui?.title || `Node ${node.id.slice(0, 8)}`;
    }

    getTempConnectionPathD(): string {
        const tc = this.tempConnection();
        if (!tc) return '';

        const sourceNode = this.nodes().find(n => n.id === tc.sourceId);
        if (!sourceNode) return '';

        const start = {
            x: sourceNode.position.x + sourceNode.size.width / 2,
            y: sourceNode.position.y + sourceNode.size.height / 2
        };
        const end = tc.targetPos;

        return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
    }

    // === KEYBOARD SHORTCUTS ===

    @HostListener('document:keydown', ['$event'])
    handleKeyboardEvent(event: KeyboardEvent): void {
        if (event.target instanceof HTMLInputElement ||
            event.target instanceof HTMLTextAreaElement) {
            return;
        }

        switch (event.key) {
            case ' ':
                event.preventDefault();
                this.boardStore.setMode(this.mode() === 'pan' ? 'select' : 'pan');
                break;

            case 'Delete':
            case 'Backspace':
                if (this.selectedNode()) {
                    event.preventDefault();
                }
                break;

            case 'z':
                if ((event.ctrlKey || event.metaKey) && !event.shiftKey) {
                    event.preventDefault();
                    if (this.boardStore.canUndo()) {
                        this.boardStore.undo();
                    }
                }
                break;

            case 'y':
                if (event.ctrlKey || event.metaKey) {
                    event.preventDefault();
                    if (this.boardStore.canRedo()) {
                        this.boardStore.redo();
                    }
                }
                break;

            case 'Escape':
                this.boardStore.selectNode(null);
                this.boardStore.setMode('select');
                this.isDrawingConnection.set(false);
                this.connectionSource = null;
                this.tempConnection.set(null);
                this.showConnectionModal.set(false);
                this.showYarnInspector.set(false);
                break;
        }
    }

    // === CONNECTION MODAL HANDLERS ===

    /** Find shared tokens between two nodes' evidence content */
    findSharedTokens(sourceNodeId: string, targetNodeId: string): string[] {
        const caseState = this.caseStore.currentCase();
        if (!caseState) return [];

        const srcNode = this.nodes().find(n => n.id === sourceNodeId);
        const tgtNode = this.nodes().find(n => n.id === targetNodeId);
        if (!srcNode || !tgtNode) return [];

        const srcEvidence = caseState.evidence.find(e => e.id === srcNode.dataId);
        const tgtEvidence = caseState.evidence.find(e => e.id === tgtNode.dataId);
        if (!srcEvidence || !tgtEvidence) return [];

        const srcTokens = this.mindPalace.extractTokens(srcEvidence);
        const tgtTokens = this.mindPalace.extractTokens(tgtEvidence);

        const shared: string[] = [];
        for (const token of srcTokens) {
            if (tgtTokens.has(token)) {
                shared.push(token);
            }
        }
        return shared.slice(0, 10); // Cap at 10
    }

    /** Handle modal confirmation */
    onConnectionConfirmed(data: ConnectionFormData): void {
        if (this.pendingSourceNodeId && this.pendingTargetNodeId) {
            this.boardStore.createConnection(
                this.pendingSourceNodeId,
                this.pendingTargetNodeId,
                data.connectionType,
                data.strength,
                data.reason
            );
        }
        this.resetConnectionModal();
    }

    /** Handle modal cancellation */
    onConnectionCancelled(): void {
        this.resetConnectionModal();
    }

    private resetConnectionModal(): void {
        this.showConnectionModal.set(false);
        this.pendingSourceNodeId = null;
        this.pendingTargetNodeId = null;
        this.pendingSourceLabel.set('');
        this.pendingTargetLabel.set('');
        this.pendingSuggestedTokens.set([]);
    }

    // === YARN INSPECTOR ===

    /** Handle click on a connection path to show the inspector */
    onYarnClick(connectionId: string, event: MouseEvent): void {
        if (this.mode() === 'delete') {
            this.onConnectionClick(connectionId);
            return;
        }

        event.stopPropagation();
        const connection = this.uiConnections().find(c => c.id === connectionId);
        if (!connection || !connection.ui) return;

        this.inspectedConnection.set(connection as BoardConnection & { ui: NonNullable<BoardConnection['ui']> });
        this.yarnInspectorPos.set(connection.ui.midpoint);
        this.showYarnInspector.set(true);
    }

    onYarnInspectorClose(): void {
        this.showYarnInspector.set(false);
        this.inspectedConnection.set(null);
    }

    onYarnDeleted(): void {
        const connection = this.inspectedConnection();
        if (connection) {
            this.boardStore.deleteConnection(connection.id);
        }
        this.onYarnInspectorClose();
    }

}
