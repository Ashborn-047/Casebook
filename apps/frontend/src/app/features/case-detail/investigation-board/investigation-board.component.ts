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
import { BoardNode, BoardConnection, ConnectionType, ConnectionStrength } from '@casbook/shared-models';
import { PathCreatorComponent } from './path-creator/path-creator.component';
import { ConnectionModalComponent, ConnectionFormData } from './connection-modal/connection-modal.component';
import { YarnInspectorComponent } from './yarn-inspector/yarn-inspector.component';

@Component({
    selector: 'app-investigation-board',
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
    connections = this.boardStore.connections;
    viewport = this.boardStore.viewport;
    mode = this.boardStore.mode;
    tools = this.boardStore.tools;
    selectedNode = this.boardStore.selectedNode;

    @ViewChild('pathCreator') pathCreator!: PathCreatorComponent;
    isPathPanelOpen = signal(false);

    // Computed
    evidenceNodes = computed(() =>
        this.nodes().filter(node => node.type === 'evidence')
    );

    hypothesisNodes = computed(() =>
        this.nodes().filter(node => node.type === 'hypothesis')
    );

    gridSize = computed(() => this.tools().gridSize);

    // Interaction state
    isDragging = false;
    isPanning = false;
    isDrawingConnection = false;

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
    inspectedConnection = signal<BoardConnection | null>(null);
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

                    const srcNode = this.nodes().find(n => n.id === this.connectionSource);
                    this.pendingSourceLabel.set(srcNode ? this.getNodeTitle(srcNode) : 'Evidence A');
                    this.pendingTargetLabel.set(this.getNodeTitle(targetNode));

                    // Find shared tokens for suggestion chips
                    this.pendingSuggestedTokens.set(this.findSharedTokens(this.connectionSource, targetNode.id));

                    this.showConnectionModal.set(true);
                }
                this.isDrawingConnection = false;
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

        if (this.isPanning) {
            const deltaX = event.clientX - this.panStart.x;
            const deltaY = event.clientY - this.panStart.y;
            this.boardStore.pan(deltaX, deltaY);
            this.panStart = { x: event.clientX, y: event.clientY };
        } else if (this.isDragging && this.dragNodeId) {
            const newX = boardPos.x - this.dragStart.x;
            const newY = boardPos.y - this.dragStart.y;
            this.boardStore.moveNode(this.dragNodeId, { x: newX, y: newY });
        } else if (this.isDrawingConnection && this.tempConnection()) {
            this.tempConnection.update(tc => tc ? { ...tc, targetPos: boardPos } : null);
        }
    }

    onBoardMouseUp(event: MouseEvent): void {
        if (this.isDragging && this.dragNodeId) {
            this.boardStore.finishDragging(this.dragNodeId);
        }

        this.isDragging = false;
        this.isPanning = false;
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
                    this.isDragging = true;
                    this.dragNodeId = nodeId;
                }
            }
        } else if (this.mode() === 'connect') {
            if (this.connectionSource) {
                if (this.connectionSource !== nodeId) {
                    this.boardStore.createConnection(this.connectionSource, nodeId);
                }
                this.connectionSource = null;
                this.isDrawingConnection = false;
                this.tempConnection.set(null);
            } else {
                this.connectionSource = nodeId;
                this.isDrawingConnection = true;
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
        this.isPanning = true;
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
        const data = this.getNodeData(node);
        if (!data) return `Node ${node.id.slice(0, 8)}`;

        if (node.type === 'evidence') {
            return (data['description'] as string) || `Evidence ${node.id.slice(0, 8)}`;
        }

        const title = data['title'] as string | undefined;
        const description = data['description'] as string | undefined;
        return title || description?.substring(0, 30) || `Node ${node.id.slice(0, 8)}`;
    }

    getNodeDescription(node: BoardNode): string {
        const data = this.getNodeData(node);
        if (!data) return 'No description';

        if (node.type === 'evidence') {
            return (data['content'] as string) || (data['description'] as string) || 'No content';
        }

        const description = data['description'] as string | undefined;
        return description || 'No description';
    }

    getHypothesisConfidence(node: BoardNode): string {
        const data = this.getNodeData(node);
        if (!data) return 'medium';
        return (data['confidence'] as string) || 'medium';
    }

    getHypothesisConfidenceClass(node: BoardNode): string {
        const confidence = this.getHypothesisConfidence(node);
        switch (confidence) {
            case 'high': return 'bg-red-100 text-red-800';
            case 'medium': return 'bg-yellow-100 text-yellow-800';
            case 'low': return 'bg-green-100 text-green-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    }

    getSupportingEvidenceCount(node: BoardNode): number {
        const data = this.getNodeData(node);
        if (!data) return 0;
        const supporting = data['supportingEvidenceIds'] as string[] | undefined;
        return supporting?.length || 0;
    }

    getNodeData(node: BoardNode): Record<string, unknown> | null {
        const caseState = this.caseStore.currentCase();
        if (!caseState) return null;

        switch (node.type) {
            case 'evidence':
                return caseState.evidence.find(e => e.id === node.dataId) as unknown as Record<string, unknown> || null;
            case 'hypothesis':
                return caseState.hypotheses.find(h => h.id === node.dataId) as unknown as Record<string, unknown> || null;
            default:
                return null;
        }
    }

    getConnectionPathD(connection: BoardConnection): string {
        if (connection.path.length >= 2) {
            const [start, ...rest] = connection.path;
            let d = `M ${start.x} ${start.y}`;

            if (connection.path.length === 2) {
                const end = connection.path[1];
                d += ` L ${end.x} ${end.y}`;
            } else if (connection.path.length === 4) {
                const [c1, c2, end] = rest;
                d += ` C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${end.x} ${end.y}`;
            } else {
                rest.forEach(point => {
                    d += ` L ${point.x} ${point.y}`;
                });
            }

            return d;
        }

        return '';
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

    getConnectionMidpoint(connection: BoardConnection): { x: number; y: number } {
        if (connection.path.length >= 2) {
            const midIndex = Math.floor(connection.path.length / 2);
            return connection.path[midIndex];
        }

        return { x: 0, y: 0 };
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
                this.isDrawingConnection = false;
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
        const connection = this.connections().find(c => c.id === connectionId);
        if (!connection) return;

        const midpoint = this.getConnectionMidpoint(connection);
        this.inspectedConnection.set(connection);
        this.yarnInspectorPos.set(midpoint);
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

    // === TRUST LEVEL HELPERS ===

    getEvidenceTrustBadge(node: BoardNode): string {
        const caseState = this.caseStore.currentCase();
        if (!caseState) return '🟡';

        const evidence = caseState.evidence.find(e => e.id === node.dataId);
        if (!evidence) return '🟡';

        const badges: Record<string, string> = {
            'unverified': '🟡',
            'verified': '🟢',
            'disputed': '🔴',
            'disproven': '⚫',
        };

        return badges[evidence.trustLevel] || '🟡';
    }

    getEvidenceTrustLevel(node: BoardNode): string {
        const caseState = this.caseStore.currentCase();
        if (!caseState) return 'unverified';
        const evidence = caseState.evidence.find(e => e.id === node.dataId);
        return evidence?.trustLevel || 'unverified';
    }

    /** Get connection visual class based on linked evidence trust levels */
    getConnectionTrustClass(connection: BoardConnection): string {
        const caseState = this.caseStore.currentCase();
        if (!caseState) return '';

        const srcNode = this.nodes().find(n => n.id === connection.sourceNodeId);
        const tgtNode = this.nodes().find(n => n.id === connection.targetNodeId);
        if (!srcNode || !tgtNode) return '';

        const srcEvidence = caseState.evidence.find(e => e.id === srcNode.dataId);
        const tgtEvidence = caseState.evidence.find(e => e.id === tgtNode.dataId);

        const srcTrust = srcEvidence?.trustLevel || 'unverified';
        const tgtTrust = tgtEvidence?.trustLevel || 'unverified';

        if (srcTrust === 'disproven' || tgtTrust === 'disproven') return 'yarn-disproven';
        if (srcTrust === 'disputed' || tgtTrust === 'disputed') return 'yarn-disputed';
        return '';
    }
}
