/**
 * MIND PALACE - Board Visualization Models
 * Models for the interactive investigation board
 */



// ===== BOARD NODE TYPES =====
export type BoardNodeType = 'evidence' | 'hypothesis' | 'note' | 'case';

export interface BoardNode {
    readonly id: string;
    readonly type: BoardNodeType;
    readonly dataId: string; // ID of the actual evidence/hypothesis/note
    readonly position: { x: number; y: number };
    readonly size: { width: number; height: number };
    readonly zIndex: number;
    readonly isSelected: boolean;
    readonly isDragging: boolean;
    readonly metadata: {
        color: string;
        icon: string;
        isPinned: boolean;
        createdAt: string;
        lastUpdated: string;
    };
}

export interface BoardConnection {
    readonly id: string;
    readonly sourceNodeId: string;
    readonly targetNodeId: string;
    readonly connectionId: string; // Reference to InvestigationConnection
    readonly type: string;
    readonly strength: number;
    readonly path: Array<{ x: number; y: number }>; // For curved connections
    readonly metadata: {
        color: string;
        lineStyle: 'solid' | 'dashed' | 'dotted';
        label?: string;
        isActive: boolean;
    };
}

// ===== BOARD STATE =====
export interface BoardState {
    readonly caseId: string;
    readonly nodes: BoardNode[];
    readonly connections: BoardConnection[];
    readonly viewport: {
        zoom: number;
        panX: number;
        panY: number;
        width: number;
        height: number;
    };
    readonly selectedNodeId: string | null;
    readonly selectedConnectionId: string | null;
    readonly mode: 'select' | 'connect' | 'hypothesis' | 'pan' | 'delete';
    readonly tools: {
        isGridVisible: boolean;
        isSnapToGrid: boolean;
        gridSize: number;
        connectionStyle: 'straight' | 'bezier' | 'orthogonal';
        showLabels: boolean;
    };
    readonly history: {
        canUndo: boolean;
        canRedo: boolean;
        steps: number;
    };
}

// ===== BOARD EVENTS =====
export interface BoardNodeMovedEvent {
    type: 'NODE_MOVED';
    nodeId: string;
    oldPosition: { x: number; y: number };
    newPosition: { x: number; y: number };
    movedBy: string;
}

export interface BoardConnectionCreatedEvent {
    type: 'CONNECTION_CREATED';
    connection: Omit<BoardConnection, 'id'>;
    createdBy: string;
}

export interface BoardConnectionDeletedEvent {
    type: 'CONNECTION_DELETED';
    connectionId: string;
    deletedBy: string;
    reason?: string;
}

export interface BoardViewportChangedEvent {
    type: 'VIEWPORT_CHANGED';
    viewport: BoardState['viewport'];
    changedBy: string;
}

export interface BoardLayoutSavedEvent {
    type: 'LAYOUT_SAVED';
    layout: {
        nodePositions: Record<string, { x: number; y: number }>;
        viewport: BoardState['viewport'];
    };
    savedBy: string;
}

// ===== INITIAL STATES =====
export const INITIAL_BOARD_STATE: BoardState = {
    caseId: '',
    nodes: [],
    connections: [],
    viewport: {
        zoom: 1,
        panX: 0,
        panY: 0,
        width: 1200,
        height: 800,
    },
    selectedNodeId: null,
    selectedConnectionId: null,
    mode: 'select',
    tools: {
        isGridVisible: true,
        isSnapToGrid: false,
        gridSize: 20,
        connectionStyle: 'bezier',
        showLabels: true,
    },
    history: {
        canUndo: false,
        canRedo: false,
        steps: 0,
    },
};

// ===== HELPER FUNCTIONS =====
export function createBoardNode(
    type: BoardNodeType,
    dataId: string,
    position: { x: number; y: number },
    metadata?: Partial<BoardNode['metadata']>
): BoardNode {
    const defaultMetadata: BoardNode['metadata'] = {
        color: getDefaultColor(type),
        icon: getDefaultIcon(type),
        isPinned: false,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
    };

    return {
        id: `node-${crypto.randomUUID()}`,
        type,
        dataId,
        position,
        size: getDefaultSize(type),
        zIndex: 1,
        isSelected: false,
        isDragging: false,
        metadata: { ...defaultMetadata, ...metadata },
    };
}

export function createBoardConnection(
    sourceNodeId: string,
    targetNodeId: string,
    connectionId: string,
    type: string,
    strength = 2
): BoardConnection {
    return {
        id: `board-conn-${crypto.randomUUID()}`,
        sourceNodeId,
        targetNodeId,
        connectionId,
        type,
        strength,
        path: [],
        metadata: {
            color: getConnectionColor(type, strength),
            lineStyle: 'solid',
            isActive: true,
        },
    };
}

function getDefaultColor(type: BoardNodeType): string {
    switch (type) {
        case 'evidence': return '#4ECDC4'; // Teal
        case 'hypothesis': return '#FFE66D'; // Yellow
        case 'note': return '#A78BFA'; // Purple
        case 'case': return '#FF6B6B'; // Red
        default: return '#6B7280'; // Gray
    }
}

function getDefaultIcon(type: BoardNodeType): string {
    switch (type) {
        case 'evidence': return '🔍';
        case 'hypothesis': return '💡';
        case 'note': return '📝';
        case 'case': return '📁';
        default: return '○';
    }
}

function getDefaultSize(type: BoardNodeType): { width: number; height: number } {
    switch (type) {
        case 'evidence': return { width: 200, height: 120 };
        case 'hypothesis': return { width: 240, height: 160 };
        case 'note': return { width: 180, height: 100 };
        case 'case': return { width: 300, height: 200 };
        default: return { width: 150, height: 100 };
    }
}

export function getConnectionColor(type: string, strength: number): string {
    const colorMap: Record<string, string> = {
        'supports': '#10B981', // Green
        'contradicts': '#EF4444', // Red
        'related_to': '#3B82F6', // Blue
        'timeline': '#8B5CF6', // Purple
        'causality': '#F59E0B', // Amber
        'default': '#6B7280', // Gray
    };

    const baseColor = colorMap[type] || colorMap['default'];
    const opacity = Math.min(100, 40 + (strength * 20));
    return `${baseColor}${opacity.toString(16).padStart(2, '0')}`;
}

// ===== BOARD UTILITIES =====
export function calculateConnectionPath(
    sourcePos: { x: number; y: number },
    targetPos: { x: number; y: number },
    style: 'straight' | 'bezier' | 'orthogonal' = 'bezier'
): Array<{ x: number; y: number }> {
    switch (style) {
        case 'straight':
            return [sourcePos, targetPos];

        case 'bezier': {
            const midX = (sourcePos.x + targetPos.x) / 2;
            const control1 = { x: midX, y: sourcePos.y - 50 };
            const control2 = { x: midX, y: targetPos.y + 50 };
            return [sourcePos, control1, control2, targetPos];
        }

        case 'orthogonal': {
            const midY = (sourcePos.y + targetPos.y) / 2;
            return [
                sourcePos,
                { x: sourcePos.x + 50, y: sourcePos.y },
                { x: sourcePos.x + 50, y: midY },
                { x: targetPos.x - 50, y: midY },
                { x: targetPos.x - 50, y: targetPos.y },
                targetPos,
            ];
        }

        default:
            return [sourcePos, targetPos];
    }
}

export function areNodesConnected(
    node1Id: string,
    node2Id: string,
    connections: BoardConnection[]
): boolean {
    return connections.some(conn =>
        (conn.sourceNodeId === node1Id && conn.targetNodeId === node2Id) ||
        (conn.sourceNodeId === node2Id && conn.targetNodeId === node1Id)
    );
}
