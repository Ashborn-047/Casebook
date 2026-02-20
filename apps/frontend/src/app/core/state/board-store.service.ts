import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { CaseStore } from './case-store.service';
import { MindPalaceService, SuggestedLink } from '../services/mind-palace.service';
import {
    BoardState,
    BoardNode,
    BoardConnection,
    INITIAL_BOARD_STATE,
    createBoardConnection,
    calculateConnectionPath,
    CaseState,
    AppEvent,
    ConnectionType,
    ConnectionStrength,
    EvidenceTrustLevel
} from '@casbook/shared-models';
import { createInitialBoardState } from '@casbook/shared-logic';

@Injectable({ providedIn: 'root' })
export class BoardStore {
    private caseStore = inject(CaseStore);
    private mindPalace = inject(MindPalaceService);

    // === SIGNAL DEFINITIONS ===

    /** Current board state */
    private readonly boardState = signal<BoardState>(INITIAL_BOARD_STATE);

    /** History stack for undo/redo */
    private readonly historyStack = signal<BoardState[]>([]);
    private readonly futureStack = signal<BoardState[]>([]);

    // === COMPUTED SIGNALS ===

    /** Current case state from CaseStore */
    readonly currentCase = this.caseStore.currentCase;

    /** Board state exposed for components */
    readonly state = computed(() => this.boardState());

    /** Nodes for the current case */
    readonly nodes = computed(() => this.boardState().nodes);

    /** Optimized UI nodes with pre-computed display properties */
    readonly uiNodes = computed(() => {
        const nodes = this.nodes();
        const caseState = this.currentCase();
        if (!caseState) return [];

        // Build lookup maps to avoid O(N*M) complexity in the loop
        const evidenceMap = new Map(caseState.evidence.map(e => [e.id, e]));
        const hypothesisMap = new Map(caseState.hypotheses.map(h => [h.id, h]));

        return nodes.map(node => {
            let title = '';
            let description = '';
            let trustLevel = 'unverified';
            let trustBadge = '🟡';
            let confidence = 'medium';
            let supportingCount = 0;

            if (node.type === 'evidence') {
                const evidence = evidenceMap.get(node.dataId);
                title = evidence?.description || `Evidence ${node.id.slice(0, 8)}`;
                description = evidence?.content || evidence?.description || 'No content';
                trustLevel = evidence?.trustLevel || 'unverified';
                const badges: Record<string, string> = {
                    'unverified': '🟡',
                    'verified': '🟢',
                    'disputed': '🔴',
                    'disproven': '⚫',
                };
                trustBadge = badges[trustLevel] || '🟡';
            } else if (node.type === 'hypothesis') {
                const hypothesis = hypothesisMap.get(node.dataId);
                title = hypothesis?.title || hypothesis?.description?.substring(0, 30) || `Hypothesis ${node.id.slice(0, 8)}`;
                description = hypothesis?.description || 'No description';
                confidence = hypothesis?.confidence || 'medium';
                supportingCount = hypothesis?.supportingEvidenceIds?.length || 0;
            }

            return {
                ...node,
                ui: {
                    title,
                    description,
                    trustLevel,
                    trustBadge,
                    confidence,
                    supportingCount
                }
            };
        });
    });

    /** Connections for the current case */
    readonly connections = computed(() => this.boardState().connections);

    /** Optimized UI connections with pre-computed display properties */
    readonly uiConnections = computed(() => {
        const connections = this.connections();
        const caseState = this.currentCase();
        if (!caseState) return [];

        // Use a map for O(1) lookup of evidence data
        const evidenceMap = new Map(caseState.evidence.map(e => [e.id, e]));
        const nodes = this.nodes();
        const nodeTrustMap = new Map<string, string>();

        nodes.forEach(n => {
            if (n.type === 'evidence') {
                const evidence = evidenceMap.get(n.dataId);
                if (evidence) nodeTrustMap.set(n.id, evidence.trustLevel);
            }
        });

        return connections.map(conn => {
            const srcTrust = nodeTrustMap.get(conn.sourceNodeId) || 'unverified';
            const tgtTrust = nodeTrustMap.get(conn.targetNodeId) || 'unverified';

            let trustClass = '';
            if (srcTrust === 'disproven' || tgtTrust === 'disproven') trustClass = 'yarn-disproven';
            else if (srcTrust === 'disputed' || tgtTrust === 'disputed') trustClass = 'yarn-disputed';

            const midpoint = conn.path.length >= 2
                ? conn.path[Math.floor(conn.path.length / 2)]
                : { x: 0, y: 0 };

            return {
                ...conn,
                ui: {
                    trustClass,
                    midpoint,
                    pathD: this.calculateConnectionPathD(conn.path)
                }
            };
        });
    });

    /** Selected node */
    readonly selectedNode = computed(() => {
        const selectedId = this.boardState().selectedNodeId;
        if (!selectedId) return null;
        return this.boardState().nodes.find(n => n.id === selectedId) || null;
    });

    /** Viewport state */
    readonly viewport = computed(() => this.boardState().viewport);

    /** Current mode */
    readonly mode = computed(() => this.boardState().mode);

    /** Tool settings */
    readonly tools = computed(() => this.boardState().tools);

    /** Can undo/redo */
    readonly canUndo = computed(() => this.historyStack().length > 0);
    readonly canRedo = computed(() => this.futureStack().length > 0);

    /** Smart suggestions (ephemeral, in-memory only) */
    readonly suggestedLinks = signal<SuggestedLink[]>([]);
    readonly suggestedConnectionCount = computed(() => this.suggestedLinks().length);

    // === CONSTRUCTOR ===

    constructor() {
        // Initialize board when case changes
        effect(() => {
            const caseState = this.currentCase();
            if (caseState && caseState.id !== this.boardState().caseId) {
                this.initializeBoard(caseState);
            }
        });
    }

    // === PUBLIC METHODS ===

    /** Initialize board from case state */
    initializeBoard(caseState: CaseState): void {
        const boardState = createInitialBoardState(caseState);
        this.boardState.set(boardState);
        this.clearHistory();
    }

    /** Select a node */
    selectNode(nodeId: string | null): void {
        this.boardState.update(state => {
            const nodes = state.nodes.map(node => ({
                ...node,
                isSelected: node.id === nodeId,
            }));

            return {
                ...state,
                nodes,
                selectedNodeId: nodeId,
                selectedConnectionId: null,
            };
        });
    }

    /** Move a node */
    moveNode(nodeId: string, newPosition: { x: number; y: number }): void {
        this.boardState.update(state => {
            const nodes = state.nodes.map(node => {
                if (node.id === nodeId) {
                    // Apply grid snapping if enabled
                    let finalPosition = { ...newPosition };
                    if (state.tools.isSnapToGrid) {
                        finalPosition = {
                            x: Math.round(newPosition.x / state.tools.gridSize) * state.tools.gridSize,
                            y: Math.round(newPosition.y / state.tools.gridSize) * state.tools.gridSize,
                        };
                    }

                    return {
                        ...node,
                        position: finalPosition,
                        isDragging: true,
                        metadata: {
                            ...node.metadata,
                            lastUpdated: new Date().toISOString(),
                        },
                    };
                }
                return node;
            });

            // Update connection paths (optimized to only update paths for the moved node)
            const connections = this.updateConnectionPaths(state.connections, nodes, state.tools.connectionStyle, nodeId);

            return {
                ...state,
                nodes,
                connections,
            };
        });
    }

    /** Finish dragging a node */
    finishDragging(nodeId: string): void {
        this.saveToHistory();

        this.boardState.update(state => {
            const nodes = state.nodes.map(node => {
                if (node.id === nodeId) {
                    return { ...node, isDragging: false };
                }
                return node;
            });

            return { ...state, nodes };
        });
    }

    /** Create a connection between nodes with mandatory reasoning */
    createConnection(
        sourceNodeId: string,
        targetNodeId: string,
        type: ConnectionType = 'related_to',
        strength: ConnectionStrength = 2,
        reason = ''
    ): void {
        this.saveToHistory();

        this.boardState.update(state => {
            const sourceNode = state.nodes.find(n => n.id === sourceNodeId);
            const targetNode = state.nodes.find(n => n.id === targetNodeId);

            if (!sourceNode || !targetNode) return state;

            const connection = createBoardConnection(sourceNodeId, targetNodeId, `conn-${Date.now()}`, type, strength);

            // Calculate path
            const path = calculateConnectionPath(
                sourceNode.position,
                targetNode.position,
                state.tools.connectionStyle
            );

            const updatedConnection: BoardConnection = {
                ...connection,
                path,
                metadata: {
                    ...connection.metadata,
                    label: reason,
                },
            };

            return {
                ...state,
                connections: [...state.connections, updatedConnection],
                mode: 'select' as const,
            };
        });

        // Also fire the event for persistence
        const caseId = this.boardState().caseId;
        if (caseId && reason) {
            const sourceNode = this.boardState().nodes.find(n => n.id === sourceNodeId);
            const targetNode = this.boardState().nodes.find(n => n.id === targetNodeId);
            if (sourceNode && targetNode) {
                const currentUser = this.caseStore.currentUser();
                const event: AppEvent = {
                    id: crypto.randomUUID(),
                    type: 'EVIDENCE_CONNECTED',
                    actorId: currentUser.id,
                    actorRole: currentUser.role,
                    occurredAt: new Date().toISOString(),
                    payload: {
                        connectionId: `conn-${crypto.randomUUID().split('-')[0]}`,
                        caseId,
                        sourceEvidenceId: sourceNode.dataId,
                        targetEvidenceId: targetNode.dataId,
                        connectionType: type,
                        reason,
                        strength,
                    }
                };
                this.caseStore.addEvent(event);
            }
        }
    }

    /** Delete a connection */
    deleteConnection(connectionId: string): void {
        this.saveToHistory();

        this.boardState.update(state => ({
            ...state,
            connections: state.connections.filter(conn => conn.id !== connectionId),
            selectedConnectionId: state.selectedConnectionId === connectionId ? null : state.selectedConnectionId,
        }));
    }

    /** Set board mode */
    setMode(mode: BoardState['mode']): void {
        this.boardState.update(state => ({
            ...state,
            mode,
            selectedNodeId: null,
            selectedConnectionId: null,
        }));
    }

    /** Update viewport (zoom/pan) */
    updateViewport(viewport: Partial<BoardState['viewport']>): void {
        this.boardState.update(state => ({
            ...state,
            viewport: { ...state.viewport, ...viewport },
        }));
    }

    /** Zoom in/out */
    zoom(delta: number, center?: { x: number; y: number }): void {
        this.boardState.update(state => {
            const newZoom = Math.max(0.1, Math.min(3, state.viewport.zoom + delta));

            if (center) {
                // Adjust pan to keep center point stable
                const zoomFactor = newZoom / state.viewport.zoom;
                const newPanX = center.x - (center.x - state.viewport.panX) * zoomFactor;
                const newPanY = center.y - (center.y - state.viewport.panY) * zoomFactor;

                return {
                    ...state,
                    viewport: {
                        ...state.viewport,
                        zoom: newZoom,
                        panX: newPanX,
                        panY: newPanY,
                    },
                };
            }

            return {
                ...state,
                viewport: { ...state.viewport, zoom: newZoom },
            };
        });
    }

    /** Pan the board */
    pan(deltaX: number, deltaY: number): void {
        this.boardState.update(state => ({
            ...state,
            viewport: {
                ...state.viewport,
                panX: state.viewport.panX + deltaX,
                panY: state.viewport.panY + deltaY,
            },
        }));
    }

    /** Reset viewport */
    resetViewport(): void {
        this.boardState.update(state => ({
            ...state,
            viewport: {
                ...state.viewport,
                zoom: 1,
                panX: 0,
                panY: 0,
            },
        }));
    }

    /** Update tool settings */
    updateTools(settings: Partial<BoardState['tools']>): void {
        this.boardState.update(state => ({
            ...state,
            tools: { ...state.tools, ...settings },
        }));
    }

    /** Save board layout as VISUAL_LAYOUT_UPDATED event */
    async saveLayout(): Promise<void> {
        const caseId = this.boardState().caseId;
        if (!caseId) return;

        const nodePositions: Record<string, { x: number; y: number }> = {};
        this.boardState().nodes.forEach(node => {
            nodePositions[node.dataId] = node.position;
        });

        const currentUser = this.caseStore.currentUser();

        const layoutEvent: AppEvent = {
            id: crypto.randomUUID(),
            type: 'VISUAL_LAYOUT_UPDATED',
            actorId: currentUser.id,
            actorRole: currentUser.role,
            occurredAt: new Date().toISOString(),
            payload: {
                caseId,
                nodePositions,
                canvasView: {
                    zoom: this.boardState().viewport.zoom,
                    panX: this.boardState().viewport.panX,
                    panY: this.boardState().viewport.panY
                }
            }
        };

        await this.caseStore.addEvent(layoutEvent);
    }

    autoArrange(): void {
        this.saveToHistory();
        const state = this.boardState();
        const nodes = state.nodes;
        if (nodes.length === 0) return;

        const padding = 100;
        const spacingX = 300;
        const spacingY = 220;
        const maxNodesPerRow = 4;

        const updatedNodes = nodes.map((node, index) => {
            const row = Math.floor(index / maxNodesPerRow);
            const col = index % maxNodesPerRow;

            return {
                ...node,
                position: {
                    x: padding + col * spacingX,
                    y: padding + row * spacingY
                }
            };
        });

        this.boardState.update(s => {
            const nodesWithPaths = this.updateConnectionPaths(s.connections, updatedNodes, s.tools.connectionStyle);
            return {
                ...s,
                nodes: updatedNodes,
                connections: nodesWithPaths
            };
        });
    }

    /** Undo last action */
    undo(): void {
        const history = this.historyStack();
        const future = this.futureStack();
        const current = this.boardState();

        if (history.length === 0) return;

        const previousState = history[history.length - 1];

        this.historyStack.set(history.slice(0, -1));
        this.futureStack.set([current, ...future]);
        this.boardState.set(previousState);
    }

    /** Redo last undone action */
    redo(): void {
        const history = this.historyStack();
        const future = this.futureStack();
        const current = this.boardState();

        if (future.length === 0) return;

        const nextState = future[0];

        this.historyStack.set([...history, current]);
        this.futureStack.set(future.slice(1));
        this.boardState.set(nextState);
    }

    // === MIND PALACE: SMART SUGGESTIONS ===

    /** Run token-based discovery to find potential connections */
    runDiscovery(): void {
        const caseState = this.caseStore.currentCase();
        if (!caseState) return;

        // Build set of existing connection pairs
        const existingPairs = new Set<string>();
        for (const conn of this.boardState().connections) {
            const sourceNode = this.boardState().nodes.find(n => n.id === conn.sourceNodeId);
            const targetNode = this.boardState().nodes.find(n => n.id === conn.targetNodeId);
            if (sourceNode && targetNode) {
                existingPairs.add(this.mindPalace.makePairKey(sourceNode.dataId, targetNode.dataId));
            }
        }

        const suggestions = this.mindPalace.discoverLinks(caseState.evidence, existingPairs);
        this.suggestedLinks.set(suggestions);
    }

    /** Change the trust level of an evidence item */
    async changeEvidenceTrust(evidenceId: string, newTrustLevel: EvidenceTrustLevel, reason: string): Promise<void> {
        const caseState = this.caseStore.currentCase();
        if (!caseState) return;

        const evidence = caseState.evidence.find(e => e.id === evidenceId);
        if (!evidence) return;

        const currentUser = this.caseStore.currentUser();

        const event: AppEvent = {
            id: crypto.randomUUID(),
            type: 'EVIDENCE_TRUST_CHANGED',
            actorId: currentUser.id,
            actorRole: currentUser.role,
            occurredAt: new Date().toISOString(),
            payload: {
                evidenceId,
                caseId: caseState.id,
                oldTrustLevel: evidence.trustLevel || 'unverified',
                newTrustLevel,
                changedBy: currentUser.id,
                reason,
            }
        };

        await this.caseStore.addEvent(event);
    }

    // === PRIVATE METHODS ===

    /** Save current state to history */
    private saveToHistory(): void {
        const currentState = this.boardState();
        this.historyStack.update(history => [...history.slice(-49), { ...currentState }]); // Keep last 50
        this.futureStack.set([]); // Clear redo stack on new action
    }

    /** Clear history */
    private clearHistory(): void {
        this.historyStack.set([]);
        this.futureStack.set([]);
    }

    /** Update connection paths when nodes move */
    private updateConnectionPaths(
        connections: BoardConnection[],
        nodes: BoardNode[],
        style: 'straight' | 'bezier' | 'orthogonal',
        movedNodeId?: string
    ): BoardConnection[] {
        const nodeMap = new Map(nodes.map(n => [n.id, n]));

        return connections.map(conn => {
            // Optimization: Only recalculate paths for connections attached to the moved node
            if (movedNodeId && conn.sourceNodeId !== movedNodeId && conn.targetNodeId !== movedNodeId) {
                return conn;
            }

            const sourceNode = nodeMap.get(conn.sourceNodeId);
            const targetNode = nodeMap.get(conn.targetNodeId);

            if (!sourceNode || !targetNode) return conn;

            const path = calculateConnectionPath(
                sourceNode.position,
                targetNode.position,
                style
            );

            return { ...conn, path };
        });
    }

    private calculateConnectionPathD(path: { x: number; y: number }[]): string {
        if (path.length < 2) return '';

        const [start, ...rest] = path;
        let d = `M ${start.x} ${start.y}`;

        if (path.length === 2) {
            const end = path[1];
            d += ` L ${end.x} ${end.y}`;
        } else if (path.length === 4) {
            const [c1, c2, end] = rest;
            d += ` C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${end.x} ${end.y}`;
        } else {
            rest.forEach(point => {
                d += ` L ${point.x} ${point.y}`;
            });
        }

        return d;
    }

    /** Find node at position */
    findNodeAtPosition(x: number, y: number, tolerance = 10): BoardNode | null {
        const state = this.boardState();

        for (const node of state.nodes) {
            const nodeX = node.position.x;
            const nodeY = node.position.y;
            const nodeWidth = node.size.width;
            const nodeHeight = node.size.height;

            if (
                x >= nodeX - tolerance &&
                x <= nodeX + nodeWidth + tolerance &&
                y >= nodeY - tolerance &&
                y <= nodeY + nodeHeight + tolerance
            ) {
                return node;
            }
        }

        return null;
    }
}
