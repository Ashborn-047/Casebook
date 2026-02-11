import {
    Component,
    inject,
    signal,
    computed,
    input,
    output,
    OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CaseStore } from '../../../../core/state/case-store.service';
import { Evidence, InvestigationPath } from '@casbook/shared-models';

@Component({
    selector: 'cb-path-creator',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './path-creator.component.html',
    styleUrls: ['./path-creator.component.scss'],
})
export class PathCreatorComponent implements OnInit {
    private caseStore = inject(CaseStore);

    /** Whether the panel is open */
    isOpen = signal(false);

    /** Are we in path-building mode? */
    isBuilding = signal(false);

    /** Current path being built */
    pathTitle = signal('');
    pathDescription = signal('');
    pathSummary = signal('');
    selectedEvidenceIds = signal<string[]>([]);

    /** Saved paths for current case */
    savedPaths = computed(() => {
        const caseState = this.caseStore.currentCase();
        return caseState?.investigationPaths ?? [];
    });

    /** Available evidence to select from */
    availableEvidence = computed(() => {
        return this.caseStore.visibleEvidence();
    });

    /** Evidence objects for the selected IDs, in sequence order */
    sequencedEvidence = computed(() => {
        const ids = this.selectedEvidenceIds();
        const allEvidence = this.availableEvidence();
        return ids
            .map(id => allEvidence.find(e => e.id === id))
            .filter((e): e is Evidence => !!e);
    });

    /** Whether saving is allowed */
    canSave = computed(() => {
        return (
            this.pathTitle().trim().length > 0 &&
            this.selectedEvidenceIds().length >= 2
        );
    });

    /** Permissions */
    canCreate = computed(() => {
        const caseState = this.caseStore.currentCase();
        return caseState?.permissions.canCreateInvestigationPaths ?? false;
    });

    /** Current expanded path */
    expandedPathId = signal<string | null>(null);

    isSaving = signal(false);

    ngOnInit(): void { }

    // === PUBLIC API ===

    toggle(): void {
        this.isOpen.update(v => !v);
    }

    startBuilding(): void {
        this.isBuilding.set(true);
        this.pathTitle.set('');
        this.pathDescription.set('');
        this.pathSummary.set('');
        this.selectedEvidenceIds.set([]);
    }

    cancelBuilding(): void {
        this.isBuilding.set(false);
    }

    /** Called when user clicks evidence on the board or in the list */
    toggleEvidence(evidenceId: string): void {
        this.selectedEvidenceIds.update(ids => {
            if (ids.includes(evidenceId)) {
                return ids.filter(id => id !== evidenceId);
            }
            return [...ids, evidenceId];
        });
    }

    /** Is this evidence selected? */
    isSelected(evidenceId: string): boolean {
        return this.selectedEvidenceIds().includes(evidenceId);
    }

    /** Get the sequence number for a selected evidence */
    getSequenceNumber(evidenceId: string): number {
        return this.selectedEvidenceIds().indexOf(evidenceId) + 1;
    }

    /** Move evidence up in the sequence */
    moveUp(index: number): void {
        if (index <= 0) return;
        this.selectedEvidenceIds.update(ids => {
            const newIds = [...ids];
            [newIds[index - 1], newIds[index]] = [newIds[index], newIds[index - 1]];
            return newIds;
        });
    }

    /** Move evidence down in the sequence */
    moveDown(index: number): void {
        const ids = this.selectedEvidenceIds();
        if (index >= ids.length - 1) return;
        this.selectedEvidenceIds.update(ids => {
            const newIds = [...ids];
            [newIds[index], newIds[index + 1]] = [newIds[index + 1], newIds[index]];
            return newIds;
        });
    }

    /** Remove from sequence */
    removeFromSequence(index: number): void {
        this.selectedEvidenceIds.update(ids => ids.filter((_, i) => i !== index));
    }

    /** Save the path */
    async savePath(): Promise<void> {
        if (!this.canSave()) return;

        const caseState = this.caseStore.currentCase();
        if (!caseState) return;

        this.isSaving.set(true);

        const result = await this.caseStore.createInvestigationPath(
            caseState.id,
            this.pathTitle(),
            this.pathDescription(),
            this.selectedEvidenceIds(),
            this.pathSummary() || `Path through ${this.selectedEvidenceIds().length} evidence items`
        );

        this.isSaving.set(false);

        if (result.success) {
            this.isBuilding.set(false);
        }
    }

    /** Toggle expanded path */
    togglePath(pathId: string): void {
        this.expandedPathId.update(id => id === pathId ? null : pathId);
    }

    /** Get evidence description for a path step */
    getEvidenceForId(evidenceId: string): Evidence | undefined {
        return this.availableEvidence().find(e => e.id === evidenceId);
    }
}
