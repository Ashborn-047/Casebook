import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { Router } from '@angular/router';
import {
    AppEvent,
    UserRole,
    createEvent,
    EventType
} from '@casbook/shared-models';
import {
    User,
    CaseState,
    TimelineEntry,
    INITIAL_CASE_STATE
} from '@casbook/shared-models';
import { reduceEvents, getStateAtTime } from '@casbook/shared-logic';
import { can, eventTypeToAction, BUSINESS_RULES } from '@casbook/shared-models';
import { IEventRepository } from '../storage/repositories/event-repository.interface';
import { IndexedDBEventRepository } from '../storage/repositories/indexed-db-event-repository.service';

@Injectable({ providedIn: 'root' })
export class CaseStore {
    private router = inject(Router);
    private eventRepository: IEventRepository = inject(IndexedDBEventRepository);

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

    readonly cases = computed(() => {
        const allEvents = this.events();
        const eventsByCase = allEvents.reduce((acc, event) => {
            if ('caseId' in event.payload) {
                const caseId = (event.payload as { caseId: string }).caseId;
                if (!acc[caseId]) acc[caseId] = [];
                acc[caseId].push(event);
            }
            return acc;
        }, {} as Record<string, AppEvent[]>);

        const cases: Record<string, CaseState> = {};

        for (const [caseId, caseEvents] of Object.entries(eventsByCase)) {
            const rawState = reduceEvents(caseEvents);
            const effectiveRole = this.uiState().roleOverride || this.currentUser().role;
            const permissions = this.computePermissions(effectiveRole, rawState);

            const createdAt = new Date(rawState.createdAt);
            const now = new Date();
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

    readonly timeline = computed(() => {
        const caseId = this.uiState().currentCaseId;
        if (!caseId) return [];

        const caseEvents = this.events().filter(event =>
            'caseId' in event.payload && (event.payload as { caseId: string }).caseId === caseId
        );

        const effectiveRole = this.uiState().roleOverride || this.currentUser().role;

        return caseEvents
            .sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime())
            .map(event => this.eventToTimelineEntry(event, effectiveRole))
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

        const caseEvents = this.events().filter(event =>
            'caseId' in event.payload && (event.payload as { caseId: string }).caseId === caseId
        );

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
            this.events.set(events);

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
            this.events.update(events => [...events, fullEvent]);

            return { success: true };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }

    async refreshEvents(): Promise<void> {
        try {
            const events = await this.eventRepository.getEvents();
            this.events.set(events);

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
        this.uiState.update(ui => ({
            ...ui,
            currentCaseId: caseId,
            selectedEvidenceId: null,
            selectedTimelineDate: null,
        }));

        if (caseId) {
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

    private eventToTimelineEntry(event: AppEvent, currentRole: UserRole): TimelineEntry {
        const baseEntry = {
            id: crypto.randomUUID(),
            eventId: event.id,
            type: event.type,
            actorId: event.actorId,
            actorRole: event.actorRole,
            occurredAt: event.occurredAt,
            payload: event.payload as unknown as Record<string, unknown>,
        };

        switch (event.type) {
            case 'CASE_CREATED':
                return { ...baseEntry, title: 'Case Created', description: `"${event.payload.title}"`, icon: 'add_circle', colorClass: 'text-yellow-500', isVisibleTo: ['viewer', 'investigator', 'supervisor'] as UserRole[] };
            case 'EVIDENCE_ADDED':
                const isRestricted = event.payload.visibility === 'restricted';
                return { ...baseEntry, title: isRestricted ? 'Restricted Evidence Added' : 'Evidence Added', description: `${event.payload.type}: ${event.payload.description}`, icon: isRestricted ? 'lock' : 'attach_file', colorClass: isRestricted ? 'text-red-500' : 'text-purple-500', isVisibleTo: isRestricted ? ['supervisor'] as UserRole[] : ['viewer', 'investigator', 'supervisor'] as UserRole[] };
            case 'NOTE_ADDED':
                return { ...baseEntry, title: event.payload.isInternal ? 'Internal Note Added' : 'Note Added', description: event.payload.content.substring(0, 100), icon: 'note', colorClass: 'text-blue-500', isVisibleTo: event.payload.isInternal ? ['investigator', 'supervisor'] as UserRole[] : ['viewer', 'investigator', 'supervisor'] as UserRole[] };
            case 'EVIDENCE_CONNECTED':
                return { ...baseEntry, title: 'Evidence Connected', description: `${event.payload.connectionType}: ${event.payload.reason}`, icon: 'link', colorClass: 'text-indigo-500', isVisibleTo: ['investigator', 'supervisor'] as UserRole[], metadata: { isMindPalace: true } };
            case 'HYPOTHESIS_CREATED':
                return { ...baseEntry, title: 'Hypothesis Created', description: `"${event.payload.title}" (${event.payload.confidence} confidence)`, icon: 'lightbulb', colorClass: 'text-green-500', isVisibleTo: ['investigator', 'supervisor'] as UserRole[], metadata: { isMindPalace: true } };
            case 'HYPOTHESIS_RESOLVED':
                return { ...baseEntry, title: 'Hypothesis Resolved', description: `${event.payload.resolution}: ${event.payload.conclusion}`, icon: 'check_circle', colorClass: event.payload.resolution === 'proven' ? 'text-green-600' : 'text-red-600', isVisibleTo: ['investigator', 'supervisor'] as UserRole[], metadata: { isMindPalace: true } };
            default:
                return { ...baseEntry, title: event.type.replace(/_/g, ' '), description: '', icon: 'event', colorClass: 'text-gray-400', isVisibleTo: ['viewer', 'investigator', 'supervisor'] as UserRole[] };
        }
    }
}
