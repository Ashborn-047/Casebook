import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { Router } from '@angular/router';
import {
    AppEvent,
    UserRole
} from '@casbook/shared-models';
import {
    User,
    CaseState,
    TimelineEntry,
    INITIAL_CASE_STATE
} from '@casbook/shared-models';
import { reduceEvents, getStateAtTime, applyEvent } from '@casbook/shared-logic';
import { can } from '@casbook/shared-models';
import { IEventRepository } from '../storage/repositories/event-repository.interface';
import { IndexedDBEventRepository } from '../storage/repositories/indexed-db-event-repository.service';
import { EventSyncService } from '../sync/event-sync.service';

@Injectable({ providedIn: 'root' })
export class CaseStore {
    private router = inject(Router);
    private eventRepository: IEventRepository = inject(IndexedDBEventRepository);
    private syncService = inject(EventSyncService);

    readonly currentUser = signal<User>({
        id: 'user-investigator-1',
        name: 'Alex Rivera',
        email: 'alex.rivera@casbook.com',
        role: 'investigator',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
        department: 'Cyber Security',
        joinedAt: new Date('2023-01-15').toISOString(),
    });

    readonly uiState = signal<{
        currentCaseId: string | null;
        selectedEvidenceId: string | null;
        selectedTimelineDate: string | null;
        viewMode: 'timeline' | 'board' | 'evidence';
        roleOverride?: UserRole;
        isLoading: boolean;
        error: string | null;
        storageInfo: {
            type: 'indexeddb' | 'memory' | 'convex';
            isInitialized: boolean;
            eventCount: number;
            caseCount: number;
        };
    }>({
        currentCaseId: null,
        selectedEvidenceId: null,
        selectedTimelineDate: null,
        viewMode: 'timeline',
        roleOverride: undefined,
        isLoading: true,
        error: null,
        storageInfo: {
            type: 'indexeddb',
            isInitialized: false,
            eventCount: 0,
            caseCount: 0,
        },
    });

    private readonly events = signal<AppEvent[]>([]);
    private readonly caseStates = signal<Record<string, CaseState>>({});
    private readonly eventsByCase = signal<Record<string, AppEvent[]>>({});

    readonly cases = computed(() => {
        const states = this.caseStates();
        const effectiveRole = this.uiState().roleOverride || this.currentUser().role;
        const now = new Date();

        const cases: Record<string, CaseState> = {};

        for (const [caseId, rawState] of Object.entries(states)) {
            const permissions = this.computePermissions(effectiveRole, rawState);

            const createdAt = new Date(rawState.createdAt);
            const daysOpen = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

            cases[caseId] = { ...rawState, permissions, daysOpen };
        }

        return cases;
    });

    readonly currentCase = computed(() => {
        const caseId = this.uiState().currentCaseId;
        if (!caseId) return null;
        return this.cases()[caseId] || null;
    });

    readonly currentCaseEvents = computed(() => {
        const caseId = this.uiState().currentCaseId;
        if (!caseId) return [];
        return this.eventsByCase()[caseId] || [];
    });

    readonly timeline = computed(() => {
        const caseEvents = this.currentCaseEvents();
        const effectiveRole = this.uiState().roleOverride || this.currentUser().role;

        return caseEvents
            .map(event => this.eventToTimelineEntry(event))
            .filter(entry => entry.isVisibleTo.includes(effectiveRole));
    });

    readonly visibleEvidence = computed(() => {
        const caseState = this.currentCase();
        if (!caseState) return [];

        const effectiveRole = this.uiState().roleOverride || this.currentUser().role;
        const canViewRestricted = can(effectiveRole, 'view_restricted_evidence', caseState).allowed;

        return caseState.evidence.filter(evidence =>
            evidence.visibility === 'normal' || canViewRestricted
        );
    });

    readonly caseSummaries = computed(() => {
        const cases = this.cases();
        return Object.entries(cases).map(([id, caseState]) => ({
            id,
            title: caseState.title,
            description: caseState.description,
            status: caseState.status,
            severity: caseState.severity,
            assignedInvestigatorId: caseState.assignedInvestigatorId,
            evidenceCount: caseState.evidenceCount,
            connectionCount: caseState.connectionCount,
            hypothesisCount: caseState.hypotheses.length,
            lastActivityAt: caseState.lastActivityAt,
            createdAt: caseState.createdAt,
            tags: caseState.tags,
        }));
    });

    readonly historicalState = computed(() => {
        const caseId = this.uiState().currentCaseId;
        const selectedDate = this.uiState().selectedTimelineDate;

        if (!caseId || !selectedDate) return null;

        const caseEvents = this.eventsByCase()[caseId] || [];

        return getStateAtTime(caseEvents, selectedDate);
    });

    constructor() {
        this.initializeStore();

        effect(() => {
            const cases = this.cases();
            console.log('📊 Store updated:', {
                cases: Object.keys(cases).length,
                events: this.events().length,
                storage: this.uiState().storageInfo
            });
        });
    }

    private async initializeStore(): Promise<void> {
        try {
            this.uiState.update(ui => ({ ...ui, isLoading: true, error: null }));

            await this.eventRepository.initialize();
            const events = await this.eventRepository.getEvents();

            // Perform initial grouping and reduction (done once)
            const grouped: Record<string, AppEvent[]> = {};
            events.forEach(event => {
                const caseId = (event.payload as any).caseId;
                if (caseId) {
                    if (!grouped[caseId]) grouped[caseId] = [];
                    grouped[caseId].push(event);
                }
            });

            const states: Record<string, CaseState> = {};
            for (const [caseId, caseEvents] of Object.entries(grouped)) {
                states[caseId] = reduceEvents(caseEvents);
            }

            this.events.set(events);
            this.eventsByCase.set(grouped);
            this.caseStates.set(states);

            const eventCount = await this.eventRepository.getEventCount();
            const caseCount = await this.eventRepository.getCaseCount();

            this.uiState.update(ui => ({
                ...ui,
                isLoading: false,
                storageInfo: { ...ui.storageInfo, isInitialized: true, eventCount, caseCount }
            }));

            console.log(`✅ Store initialized with ${events.length} events, ${caseCount} cases`);
        } catch (error) {
            console.error('❌ Failed to initialize store:', error);
            this.uiState.update(ui => ({
                ...ui,
                isLoading: false,
                error: `Failed to initialize: ${error instanceof Error ? error.message : 'Unknown error'}`
            }));
        }
    }

    async addEvent(event: Omit<AppEvent, 'id' | 'occurredAt'>): Promise<{ success: boolean; error?: string }> {
        try {
            const fullEvent: AppEvent = {
                ...event,
                id: crypto.randomUUID(),
                occurredAt: new Date().toISOString(),
            } as AppEvent;

            await this.eventRepository.saveEvent(fullEvent);

            // Update global events log
            this.events.update(events => [...events, fullEvent]);

            // Incremental update of case-specific signals
            const caseId = (fullEvent.payload as any).caseId;
            if (caseId) {
                this.eventsByCase.update(map => ({
                    ...map,
                    [caseId]: [...(map[caseId] || []), fullEvent]
                }));

                this.caseStates.update(states => {
                    const currentState = states[caseId] || {
                        ...INITIAL_CASE_STATE,
                        id: '',
                        createdAt: '',
                    } as CaseState;

                    return {
                        ...states,
                        [caseId]: applyEvent(currentState, fullEvent)
                    };
                });
            }

            return { success: true };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }

    async refreshEvents(): Promise<void> {
        try {
            const events = await this.eventRepository.getEvents();

            const grouped: Record<string, AppEvent[]> = {};
            events.forEach(event => {
                const caseId = (event.payload as any).caseId;
                if (caseId) {
                    if (!grouped[caseId]) grouped[caseId] = [];
                    grouped[caseId].push(event);
                }
            });

            const states: Record<string, CaseState> = {};
            for (const [caseId, caseEvents] of Object.entries(grouped)) {
                states[caseId] = reduceEvents(caseEvents);
            }

            this.events.set(events);
            this.eventsByCase.set(grouped);
            this.caseStates.set(states);

            const eventCount = await this.eventRepository.getEventCount();
            const caseCount = await this.eventRepository.getCaseCount();

            this.uiState.update(ui => ({
                ...ui,
                storageInfo: { ...ui.storageInfo, eventCount, caseCount }
            }));
        } catch (error) {
            console.error('Failed to refresh events:', error);
        }
    }

    async exportData(): Promise<string> {
        return this.eventRepository.exportData();
    }

    async importData(data: string): Promise<void> {
        await this.eventRepository.importData(data);
        await this.refreshEvents();
    }

    async clearData(): Promise<void> {
        await this.eventRepository.clear();
        this.events.set([]);
        this.eventsByCase.set({});
        this.caseStates.set({});
        this.uiState.update(ui => ({
            ...ui,
            currentCaseId: null,
            storageInfo: { ...ui.storageInfo, eventCount: 0, caseCount: 0 }
        }));
    }

    switchRole(newRole: UserRole): void {
        this.uiState.update(ui => ({ ...ui, roleOverride: newRole }));
    }

    selectCase(caseId: string | null): void {
        // Unwatch previous case
        const previousCaseId = this.uiState().currentCaseId;
        if (previousCaseId) {
            this.syncService.unwatchCase(previousCaseId);
        }

        this.uiState.update(ui => ({
            ...ui,
            currentCaseId: caseId,
            selectedEvidenceId: null,
            selectedTimelineDate: null,
        }));

        if (caseId) {
            this.syncService.watchCase(caseId);
            this.router.navigate(['/cases', caseId]);
        } else {
            this.router.navigate(['/cases']);
        }
    }

    async createCase(title: string, description: string, severity: 'low' | 'medium' | 'high' | 'critical'): Promise<{ success: boolean; caseId?: string; error?: string }> {
        const caseId = `case-${crypto.randomUUID().split('-')[0]}`;

        const event = {
            type: 'CASE_CREATED' as const,
            actorId: this.currentUser().id,
            actorRole: this.currentUser().role,
            payload: {
                caseId,
                title,
                description,
                createdBy: this.currentUser().id,
                severity,
                tags: [],
            },
        };

        const result = await this.addEvent(event);
        if (result.success) {
            this.selectCase(caseId);
            return { success: true, caseId };
        }
        return { success: false, error: result.error };
    }

    async addEvidence(
        caseId: string,
        type: 'file' | 'text' | 'url',
        content: string,
        hash: string,
        description: string,
        visibility: 'normal' | 'restricted' = 'normal',
        tags: string[] = []
    ): Promise<{ success: boolean; error?: string }> {
        const evidenceId = `ev-${crypto.randomUUID().split('-')[0]}`;

        const event = {
            type: 'EVIDENCE_ADDED' as const,
            actorId: this.currentUser().id,
            actorRole: this.currentUser().role,
            payload: {
                evidenceId,
                caseId,
                type,
                content,
                hash,
                description,
                submittedBy: this.currentUser().id,
                visibility,
                tags,
            },
        };

        return this.addEvent(event);
    }

    async createInvestigationPath(
        caseId: string,
        title: string,
        description: string,
        sequence: string[],
        summary: string
    ): Promise<{ success: boolean; error?: string }> {
        const pathId = `path-${crypto.randomUUID().split('-')[0]}`;

        const event = {
            type: 'INVESTIGATION_PATH_CREATED' as const,
            actorId: this.currentUser().id,
            actorRole: this.currentUser().role,
            payload: {
                pathId,
                caseId,
                title,
                description,
                sequence,
                summary,
            },
        };

        return this.addEvent(event);
    }

    private computePermissions(role: UserRole, caseState: CaseState): CaseState['permissions'] {
        return {
            canAddEvidence: can(role, 'add_evidence', caseState).allowed,
            canAddNote: can(role, 'add_note', caseState).allowed,
            canCloseCase: can(role, 'close_case', caseState).allowed,
            canReopenCase: can(role, 'reopen_case', caseState).allowed,
            canViewRestrictedEvidence: can(role, 'view_restricted_evidence', caseState).allowed,
            canChangeEvidenceVisibility: can(role, 'change_evidence_visibility', caseState).allowed,
            canAssignInvestigator: can(role, 'assign_case', caseState).allowed,
            canCorrectEvidence: can(role, 'correct_evidence', caseState).allowed,
            canExportCase: can(role, 'export_case', caseState).allowed,
            canTimeTravel: can(role, 'time_travel', caseState).allowed,
            canCreateConnections: can(role, 'create_connection', caseState).allowed,
            canCreateHypotheses: can(role, 'create_hypothesis', caseState).allowed,
            canUpdateLayout: can(role, 'update_layout', caseState).allowed,
            canCreateInvestigationPaths: can(role, 'create_investigation_path', caseState).allowed,
            canViewBoard: can(role, 'view_board', caseState).allowed,
        };
    }

    private eventToTimelineEntry(event: AppEvent): TimelineEntry {
        const baseEntry = {
            id: event.id, // Use event.id for stable tracking in UI
            eventId: event.id,
            type: event.type,
            actorId: event.actorId,
            actorRole: event.actorRole,
            occurredAt: event.occurredAt,
            payload: event.payload as unknown as Record<string, unknown>,
            formattedTime: new Date(event.occurredAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        };

        const type = event.type;

        // Pre-compute UI-specific icons (emojis for neo-brutalist theme)
        let icon = '📌';
        if (type.includes('EVIDENCE')) icon = '💾';
        else if (type.includes('HYPOTHESIS')) icon = '🧠';
        else if (type.includes('NOTE')) icon = '📝';
        else if (type.includes('CONNECTION')) icon = '🔗';
        else if (type.includes('CASE')) icon = '📁';

        // Pre-compute UI-specific colors (CSS variables from design system)
        let colorClass = 'white';
        if (type.includes('HYPOTHESIS')) colorClass = 'var(--yellow)';
        else if (type.includes('NOTE')) colorClass = 'var(--blue)';
        else if (type.includes('EVIDENCE')) colorClass = 'white';
        else if (type.includes('CONNECTION')) colorClass = 'var(--lavender)';

        switch (event.type) {
            case 'CASE_CREATED':
                return { ...baseEntry, title: 'Case Created', description: `"${event.payload.title}"`, icon, colorClass, isVisibleTo: ['viewer', 'investigator', 'supervisor'] as UserRole[] };
            case 'EVIDENCE_ADDED': {
                const isRestricted = event.payload.visibility === 'restricted';
                return { ...baseEntry, title: isRestricted ? 'Restricted Evidence Added' : 'Evidence Added', description: `${event.payload.type}: ${event.payload.description}`, icon: isRestricted ? '🔒' : icon, colorClass, isVisibleTo: isRestricted ? ['supervisor'] as UserRole[] : ['viewer', 'investigator', 'supervisor'] as UserRole[] };
            }
            case 'NOTE_ADDED':
                return { ...baseEntry, title: event.payload.isInternal ? 'Internal Note Added' : 'Note Added', description: event.payload.content.substring(0, 100), icon, colorClass, isVisibleTo: event.payload.isInternal ? ['investigator', 'supervisor'] as UserRole[] : ['viewer', 'investigator', 'supervisor'] as UserRole[] };
            case 'EVIDENCE_CONNECTED':
                return { ...baseEntry, title: 'Evidence Connected', description: `${event.payload.connectionType}: ${event.payload.reason}`, icon, colorClass, isVisibleTo: ['investigator', 'supervisor'] as UserRole[], metadata: { isMindPalace: true } };
            case 'HYPOTHESIS_CREATED':
                return { ...baseEntry, title: 'Hypothesis Created', description: `"${event.payload.title}" (${event.payload.confidence} confidence)`, icon, colorClass, isVisibleTo: ['investigator', 'supervisor'] as UserRole[], metadata: { isMindPalace: true } };
            case 'HYPOTHESIS_RESOLVED':
                return { ...baseEntry, title: 'Hypothesis Resolved', description: `${event.payload.resolution}: ${event.payload.conclusion}`, icon: event.payload.resolution === 'proven' ? '✅' : '❌', colorClass, isVisibleTo: ['investigator', 'supervisor'] as UserRole[], metadata: { isMindPalace: true } };
            default:
                return { ...baseEntry, title: event.type.replace(/_/g, ' '), description: '', icon, colorClass, isVisibleTo: ['viewer', 'investigator', 'supervisor'] as UserRole[] };
        }
    }
}
