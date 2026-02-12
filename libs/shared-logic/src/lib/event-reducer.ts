/**
 * PURE EVENT REDUCER with Mind Palace
 * Deterministic function that computes state from events
 * NO side effects, NO dependencies, NO mutations
 */

import {
    AppEvent,
    CaseCreatedEvent,
    CaseAssignedEvent,
    EvidenceAddedEvent,
    NoteAddedEvent,
    EvidenceConnectedEvent,
    EvidenceDisconnectedEvent,
    HypothesisCreatedEvent,
    HypothesisUpdatedEvent,
    HypothesisResolvedEvent,
    VisualLayoutUpdatedEvent,
    InvestigationPathCreatedEvent,
    EvidenceTrustChangedEvent,
    CaseStatus,
    ConnectionType,
    ConnectionStrength
} from '@casbook/shared-models';
import {
    CaseState,
    Evidence,
    Note,
    InvestigationConnection,
    Hypothesis,
    InvestigationPath,
    VisualLayout,
    INITIAL_CASE_STATE
} from '@casbook/shared-models';
import {
    BoardState,
    BoardNode,
    BoardConnection,
    INITIAL_BOARD_STATE,
    createBoardNode,
    createBoardConnection,
    calculateConnectionPath
} from '@casbook/shared-models';

// ===== REDUCER CORE =====

/**
 * Reduce array of events to CaseState
 */
export function reduceEvents(events: AppEvent[]): CaseState {
    // Start with empty state (no ID yet)
    let state: CaseState = {
        ...INITIAL_CASE_STATE,
        id: '',
        createdAt: '',
    } as CaseState;

    // Sort events chronologically
    const sortedEvents = [...events].sort(
        (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime()
    );

    // Apply each event
    for (const event of sortedEvents) {
        state = applyEvent(state, event);
    }

    return state;
}

/**
 * Apply single event to state (immutable)
 */
function applyEvent(state: CaseState, event: AppEvent): CaseState {
    switch (event.type) {
        case 'CASE_CREATED':
            return applyCaseCreated(state, event);

        case 'CASE_ASSIGNED':
            return applyCaseAssigned(state, event);

        case 'CASE_CLOSED':
            return applyCaseClosed(state, event);

        case 'CASE_REOPENED':
            return applyCaseReopened(state, event);

        case 'EVIDENCE_ADDED':
            return applyEvidenceAdded(state, event);

        case 'EVIDENCE_CORRECTED':
            return applyEvidenceCorrected(state, event);

        case 'EVIDENCE_VISIBILITY_CHANGED':
            return applyEvidenceVisibilityChanged(state, event);

        case 'NOTE_ADDED':
            return applyNoteAdded(state, event);

        // ===== MIND PALACE EVENTS =====
        case 'EVIDENCE_CONNECTED':
            return applyEvidenceConnected(state, event);

        case 'EVIDENCE_DISCONNECTED':
            return applyEvidenceDisconnected(state, event);

        case 'HYPOTHESIS_CREATED':
            return applyHypothesisCreated(state, event);

        case 'HYPOTHESIS_UPDATED':
            return applyHypothesisUpdated(state, event);

        case 'HYPOTHESIS_RESOLVED':
            return applyHypothesisResolved(state, event);

        case 'VISUAL_LAYOUT_UPDATED':
            return applyVisualLayoutUpdated(state, event);

        case 'INVESTIGATION_PATH_CREATED':
            return applyInvestigationPathCreated(state, event);

        case 'EVIDENCE_TRUST_CHANGED':
            return applyEvidenceTrustChanged(state, event);

        default: {
            // Exhaustiveness check for TypeScript
            const check: never = event as never;
            return check || state;
        }
    }
}

// ===== EVENT APPLIERS =====

function applyCaseCreated(state: CaseState, event: CaseCreatedEvent): CaseState {
    return {
        ...state,
        id: event.payload.caseId,
        title: event.payload.title,
        description: event.payload.description,
        severity: event.payload.severity,
        tags: [...event.payload.tags],
        createdAt: event.occurredAt,
        updatedAt: event.occurredAt,
        lastActivityAt: event.occurredAt,
        eventIds: [...state.eventIds, event.id],
    };
}

function applyCaseAssigned(state: CaseState, event: CaseAssignedEvent): CaseState {
    return {
        ...state,
        assignedInvestigatorId: event.payload.assignedTo,
        assignedBy: event.payload.assignedBy,
        assignedAt: event.occurredAt,
        updatedAt: event.occurredAt,
        lastActivityAt: event.occurredAt,
        eventIds: [...state.eventIds, event.id],
    };
}

function applyCaseClosed(state: CaseState, event: AppEvent): CaseState {
    if (event.type !== 'CASE_CLOSED') return state;

    return {
        ...state,
        status: 'closed' as CaseStatus,
        closedAt: event.occurredAt,
        updatedAt: event.occurredAt,
        lastActivityAt: event.occurredAt,
        eventIds: [...state.eventIds, event.id],
    };
}

function applyCaseReopened(state: CaseState, event: AppEvent): CaseState {
    if (event.type !== 'CASE_REOPENED') return state;

    return {
        ...state,
        status: 'open' as CaseStatus,
        reopenedAt: event.occurredAt,
        updatedAt: event.occurredAt,
        lastActivityAt: event.occurredAt,
        eventIds: [...state.eventIds, event.id],
    };
}

function applyEvidenceAdded(state: CaseState, event: EvidenceAddedEvent): CaseState {
    const newEvidence: Evidence = {
        id: event.payload.evidenceId,
        caseId: event.payload.caseId,
        type: event.payload.type,
        content: event.payload.content,
        hash: event.payload.hash,
        description: event.payload.description,
        submittedBy: event.payload.submittedBy,
        submittedAt: event.occurredAt,
        visibility: event.payload.visibility,
        version: 1,
        tags: [...event.payload.tags],
        trustLevel: 'unverified',
    };

    const restrictedCount = event.payload.visibility === 'restricted'
        ? state.restrictedEvidenceCount + 1
        : state.restrictedEvidenceCount;

    return {
        ...state,
        evidence: [...state.evidence, newEvidence],
        evidenceCount: state.evidence.length + 1,
        restrictedEvidenceCount: restrictedCount,
        updatedAt: event.occurredAt,
        lastActivityAt: event.occurredAt,
        eventIds: [...state.eventIds, event.id],
    };
}

function applyEvidenceCorrected(state: CaseState, event: AppEvent): CaseState {
    if (event.type !== 'EVIDENCE_CORRECTED') return state;

    const evidenceIndex = state.evidence.findIndex(
        e => e.id === event.payload.originalEvidenceId
    );

    if (evidenceIndex === -1) return state;

    const originalEvidence = state.evidence[evidenceIndex];
    const correctedEvidence: Evidence = {
        ...originalEvidence,
        id: event.payload.newEvidenceId,
        version: originalEvidence.version + 1,
        corrections: [
            ...(originalEvidence.corrections || []),
            {
                originalId: event.payload.originalEvidenceId,
                reason: event.payload.correctionReason,
                correctedAt: event.occurredAt,
                correctedBy: event.payload.correctedBy,
            }
        ],
    };

    const newEvidence = [...state.evidence];
    newEvidence[evidenceIndex] = correctedEvidence;

    // Update connections to reference new evidence ID
    const newConnections = state.connections.map(conn => {
        let updatedConn = conn;
        if (conn.sourceEvidenceId === event.payload.originalEvidenceId) {
            updatedConn = { ...updatedConn, sourceEvidenceId: event.payload.newEvidenceId };
        }
        if (conn.targetEvidenceId === event.payload.originalEvidenceId) {
            updatedConn = { ...updatedConn, targetEvidenceId: event.payload.newEvidenceId };
        }
        return updatedConn;
    });

    // Update hypotheses to reference new evidence ID
    const newHypotheses = state.hypotheses.map(hyp => {
        if (hyp.supportingEvidenceIds.includes(event.payload.originalEvidenceId)) {
            return {
                ...hyp,
                supportingEvidenceIds: hyp.supportingEvidenceIds.map(id =>
                    id === event.payload.originalEvidenceId ? event.payload.newEvidenceId : id
                )
            };
        }
        return hyp;
    });

    return {
        ...state,
        evidence: newEvidence,
        connections: newConnections,
        hypotheses: newHypotheses,
        updatedAt: event.occurredAt,
        lastActivityAt: event.occurredAt,
        eventIds: [...state.eventIds, event.id],
    };
}

function applyEvidenceVisibilityChanged(state: CaseState, event: AppEvent): CaseState {
    if (event.type !== 'EVIDENCE_VISIBILITY_CHANGED') return state;

    const evidenceIndex = state.evidence.findIndex(
        e => e.id === event.payload.evidenceId
    );

    if (evidenceIndex === -1) return state;

    const evidence = state.evidence[evidenceIndex];
    const updatedEvidence: Evidence = {
        ...evidence,
        visibility: event.payload.newVisibility,
    };

    const newEvidence = [...state.evidence];
    newEvidence[evidenceIndex] = updatedEvidence;

    // Recalculate count from source of truth to avoid drift
    const restrictedCount = newEvidence.filter(e => e.visibility === 'restricted').length;

    return {
        ...state,
        evidence: newEvidence,
        restrictedEvidenceCount: restrictedCount,
        updatedAt: event.occurredAt,
        lastActivityAt: event.occurredAt,
        eventIds: [...state.eventIds, event.id],
    };
}

function applyNoteAdded(state: CaseState, event: NoteAddedEvent): CaseState {
    const newNote: Note = {
        id: event.payload.noteId,
        caseId: event.payload.caseId,
        content: event.payload.content,
        addedBy: event.payload.addedBy,
        addedAt: event.occurredAt,
        isInternal: event.payload.isInternal,
        tags: [],
    };

    const internalNoteCount = event.payload.isInternal
        ? state.internalNoteCount + 1
        : state.internalNoteCount;

    return {
        ...state,
        notes: [...state.notes, newNote],
        noteCount: state.notes.length + 1,
        internalNoteCount,
        updatedAt: event.occurredAt,
        lastActivityAt: event.occurredAt,
        eventIds: [...state.eventIds, event.id],
    };
}

// ===== MIND PALACE EVENT APPLIERS =====

function applyEvidenceConnected(state: CaseState, event: EvidenceConnectedEvent): CaseState {
    const connection: InvestigationConnection = {
        id: event.payload.connectionId,
        caseId: event.payload.caseId,
        sourceEvidenceId: event.payload.sourceEvidenceId,
        targetEvidenceId: event.payload.targetEvidenceId,
        connectionType: event.payload.connectionType,
        reason: event.payload.reason,
        strength: event.payload.strength,
        createdBy: event.actorId,
        createdAt: event.occurredAt,
        notes: event.payload.notes,
        metadata: {
            color: getConnectionColor(event.payload.connectionType),
            lineStyle: getLineStyle(event.payload.strength),
            isActive: true,
        },
    };

    return {
        ...state,
        connections: [...state.connections, connection],
        connectionCount: state.connections.length + 1,
        updatedAt: event.occurredAt,
        lastActivityAt: event.occurredAt,
        eventIds: [...state.eventIds, event.id],
    };
}

function applyEvidenceDisconnected(state: CaseState, event: EvidenceDisconnectedEvent): CaseState {
    const connectionIndex = state.connections.findIndex(
        c => c.id === event.payload.connectionId
    );

    if (connectionIndex === -1) return state;

    const newConnections = state.connections.filter(
        c => c.id !== event.payload.connectionId
    );

    return {
        ...state,
        connections: newConnections,
        connectionCount: newConnections.length,
        updatedAt: event.occurredAt,
        lastActivityAt: event.occurredAt,
        eventIds: [...state.eventIds, event.id],
    };
}

function applyHypothesisCreated(state: CaseState, event: HypothesisCreatedEvent): CaseState {
    const hypothesis: Hypothesis = {
        id: event.payload.hypothesisId,
        caseId: event.payload.caseId,
        title: event.payload.title,
        description: event.payload.description,
        supportingEvidenceIds: [...event.payload.supportingEvidenceIds],
        confidence: event.payload.confidence,
        status: event.payload.status,
        createdBy: event.actorId,
        createdAt: event.occurredAt,
        updatedAt: event.occurredAt,
        metadata: {
            color: event.payload.color || getHypothesisColor(event.payload.confidence),
        },
    };

    const activeCount = event.payload.status === 'active'
        ? state.activeHypothesisCount + 1
        : state.activeHypothesisCount;

    return {
        ...state,
        hypotheses: [...state.hypotheses, hypothesis],
        activeHypothesisCount: activeCount,
        updatedAt: event.occurredAt,
        lastActivityAt: event.occurredAt,
        eventIds: [...state.eventIds, event.id],
    };
}

function applyHypothesisUpdated(state: CaseState, event: HypothesisUpdatedEvent): CaseState {
    const hypothesisIndex = state.hypotheses.findIndex(
        h => h.id === event.payload.hypothesisId
    );

    if (hypothesisIndex === -1) return state;

    const originalHypothesis = state.hypotheses[hypothesisIndex];
    const updates = event.payload.updates;

    const updatedHypothesis: Hypothesis = {
        ...originalHypothesis,
        title: updates.title ?? originalHypothesis.title,
        description: updates.description ?? originalHypothesis.description,
        confidence: updates.confidence ?? originalHypothesis.confidence,
        status: updates.status ?? originalHypothesis.status,
        supportingEvidenceIds: updates.supportingEvidenceIds ?? originalHypothesis.supportingEvidenceIds,
        updatedAt: event.occurredAt,
    };

    const newHypotheses = [...state.hypotheses];
    newHypotheses[hypothesisIndex] = updatedHypothesis;

    // Recalculate active hypothesis count
    const activeCount = newHypotheses.filter(h => h.status === 'active').length;

    return {
        ...state,
        hypotheses: newHypotheses,
        activeHypothesisCount: activeCount,
        updatedAt: event.occurredAt,
        lastActivityAt: event.occurredAt,
        eventIds: [...state.eventIds, event.id],
    };
}

function applyHypothesisResolved(state: CaseState, event: HypothesisResolvedEvent): CaseState {
    const hypothesisIndex = state.hypotheses.findIndex(
        h => h.id === event.payload.hypothesisId
    );

    if (hypothesisIndex === -1) return state;

    const originalHypothesis = state.hypotheses[hypothesisIndex];
    const resolvedHypothesis: Hypothesis = {
        ...originalHypothesis,
        status: event.payload.resolution,
        resolution: event.payload.resolution,
        conclusion: event.payload.conclusion,
        resolvedAt: event.occurredAt,
        updatedAt: event.occurredAt,
    };

    const newHypotheses = [...state.hypotheses];
    newHypotheses[hypothesisIndex] = resolvedHypothesis;

    const activeCount = newHypotheses.filter(h => h.status === 'active').length;

    return {
        ...state,
        hypotheses: newHypotheses,
        activeHypothesisCount: activeCount,
        updatedAt: event.occurredAt,
        lastActivityAt: event.occurredAt,
        eventIds: [...state.eventIds, event.id],
    };
}

function applyVisualLayoutUpdated(state: CaseState, event: VisualLayoutUpdatedEvent): CaseState {
    const layout: VisualLayout = {
        caseId: event.payload.caseId,
        nodePositions: { ...event.payload.nodePositions },
        hypothesisPositions: state.visualLayout?.hypothesisPositions || {},
        canvasView: {
            ...event.payload.canvasView,
            lastUpdated: event.occurredAt,
        },
    };

    return {
        ...state,
        visualLayout: layout,
        updatedAt: event.occurredAt,
        lastActivityAt: event.occurredAt,
        eventIds: [...state.eventIds, event.id],
    };
}

function applyInvestigationPathCreated(state: CaseState, event: InvestigationPathCreatedEvent): CaseState {
    const path: InvestigationPath = {
        id: event.payload.pathId,
        caseId: event.payload.caseId,
        title: event.payload.title,
        description: event.payload.description,
        sequence: [...event.payload.sequence],
        summary: event.payload.summary,
        createdBy: event.actorId,
        createdAt: event.occurredAt,
    };

    return {
        ...state,
        investigationPaths: [...state.investigationPaths, path],
        updatedAt: event.occurredAt,
        lastActivityAt: event.occurredAt,
        eventIds: [...state.eventIds, event.id],
    };
}

// ===== HELPER FUNCTIONS =====

function applyEvidenceTrustChanged(state: CaseState, event: EvidenceTrustChangedEvent): CaseState {
    const evidenceIndex = state.evidence.findIndex(
        e => e.id === event.payload.evidenceId
    );

    if (evidenceIndex === -1) return state;

    const evidence = state.evidence[evidenceIndex];
    const updatedEvidence = {
        ...evidence,
        trustLevel: event.payload.newTrustLevel,
    };

    const newEvidence = [...state.evidence];
    newEvidence[evidenceIndex] = updatedEvidence;

    return {
        ...state,
        evidence: newEvidence,
        updatedAt: event.occurredAt,
        lastActivityAt: event.occurredAt,
        eventIds: [...state.eventIds, event.id],
    };
}

// ===== HELPER FUNCTIONS  =====

function getConnectionColor(type: ConnectionType): string {
    const colors: Record<ConnectionType, string> = {
        supports: '#22C55E',      // green
        contradicts: '#EF4444',   // red
        related_to: '#3B82F6',    // blue
        timeline: '#A855F7',      // purple
        causality: '#F59E0B',     // amber
        metadata: '#6B7280',      // gray
    };
    return colors[type] || '#6B7280';
}

function getLineStyle(strength: ConnectionStrength): 'solid' | 'dashed' | 'dotted' {
    switch (strength) {
        case 3: return 'solid';
        case 2: return 'dashed';
        case 1: return 'dotted';
        default: return 'dashed';
    }
}

function getHypothesisColor(confidence: 'low' | 'medium' | 'high'): string {
    const colors = {
        low: '#FCD34D',     // yellow
        medium: '#FB923C',  // orange
        high: '#22C55E',    // green
    };
    return colors[confidence] || '#6B7280';
}

// ===== UTILITY FUNCTIONS =====

/**
 * Get case state at specific point in time
 */
export function getStateAtTime(events: AppEvent[], timestamp: string): CaseState {
    const eventsUpToTime = events.filter(event =>
        new Date(event.occurredAt) <= new Date(timestamp)
    );
    return reduceEvents(eventsUpToTime);
}

/**
 * Replay events step by step (for debugging/time travel)
 */
export function replayEvents(events: AppEvent[]): CaseState[] {
    const states: CaseState[] = [];
    const sortedEvents = [...events].sort(
        (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime()
    );

    let currentState: CaseState = {
        ...INITIAL_CASE_STATE,
        id: '',
        createdAt: '',
    } as CaseState;

    for (const event of sortedEvents) {
        currentState = applyEvent(currentState, event);
        states.push({ ...currentState });
    }

    return states;
}

/**
 * Validate event sequence (no future events, proper ordering)
 */
export function validateEventSequence(events: AppEvent[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    // Check sequence in order provided (no sorting)
    const firstEvent = events[0];
    if (firstEvent && firstEvent.type !== 'CASE_CREATED') {
        errors.push('First event must be CASE_CREATED');
    }

    for (let i = 1; i < events.length; i++) {
        const prevTime = new Date(events[i - 1].occurredAt).getTime();
        const currTime = new Date(events[i].occurredAt).getTime();

        if (currTime < prevTime) {
            errors.push(`Event ${events[i].id} occurs before previous event`);
        }
    }

    const eventIds = new Set<string>();
    for (const event of events) {
        if (eventIds.has(event.id)) {
            errors.push(`Duplicate event ID: ${event.id}`);
        }
        eventIds.add(event.id);
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}

// ===== BOARD STATE CREATION =====

/**
 * Create initial board state from case state
 * Converts evidence and hypotheses to board nodes, connections to board connections
 */
export function createInitialBoardState(caseState: CaseState): BoardState {
    const nodes: BoardNode[] = [];
    const nodeMap = new Map<string, string>(); // dataId -> nodeId mapping

    // Create evidence nodes in a grid layout
    caseState.evidence.forEach((evidence, index) => {
        const x = 100 + (index % 5) * 250;
        const y = 100 + Math.floor(index / 5) * 180;

        const node = createBoardNode('evidence', evidence.id, { x, y }, {
            color: evidence.visibility === 'restricted' ? '#EF4444' : '#4ECDC4',
            icon: evidence.visibility === 'restricted' ? '🔒' : '🔍',
        });

        nodes.push(node);
        nodeMap.set(evidence.id, node.id);
    });

    // Create hypothesis nodes below evidence
    caseState.hypotheses.forEach((hypothesis, index) => {
        const x = 100 + (index % 4) * 300;
        const y = 500 + Math.floor(index / 4) * 200;

        const node = createBoardNode('hypothesis', hypothesis.id, { x, y }, {
            color: hypothesis.metadata?.color || '#FFE66D',
            icon: '💡',
        });

        nodes.push(node);
        nodeMap.set(hypothesis.id, node.id);
    });

    // Create board connections from investigation connections
    const connections: BoardConnection[] = [];

    for (const conn of caseState.connections) {
        const sourceNodeId = nodeMap.get(conn.sourceEvidenceId);
        const targetNodeId = nodeMap.get(conn.targetEvidenceId);

        if (!sourceNodeId || !targetNodeId) continue;

        const sourceNode = nodes.find(n => n.id === sourceNodeId);
        const targetNode = nodes.find(n => n.id === targetNodeId);

        if (!sourceNode || !targetNode) continue;

        const boardConn = createBoardConnection(
            sourceNodeId,
            targetNodeId,
            conn.id,
            conn.connectionType,
            conn.strength
        );

        // Calculate path for the connection
        const path = calculateConnectionPath(
            sourceNode.position,
            targetNode.position,
            'bezier'
        );

        connections.push({
            ...boardConn,
            path,
            metadata: {
                ...boardConn.metadata,
                label: conn.reason.substring(0, 30),
            },
        });
    }

    // Apply saved layout if it exists
    if (caseState.visualLayout) {
        nodes.forEach(node => {
            const savedPos = caseState.visualLayout?.nodePositions[node.dataId];
            if (savedPos) {
                (node as { position: { x: number; y: number } }).position = savedPos;
            }
        });
    }

    return {
        ...INITIAL_BOARD_STATE,
        caseId: caseState.id,
        nodes,
        connections,
        viewport: caseState.visualLayout?.canvasView ? {
            ...INITIAL_BOARD_STATE.viewport,
            zoom: caseState.visualLayout.canvasView.zoom,
            panX: caseState.visualLayout.canvasView.panX,
            panY: caseState.visualLayout.canvasView.panY,
        } : INITIAL_BOARD_STATE.viewport,
    };
}
