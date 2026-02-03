import { Component, inject } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { BoardStore } from '../../../core/state/board-store.service';
import { CaseStore } from '../../../core/state/case-store.service';
import { BrutalButtonComponent, GlassCardComponent } from '@casbook/shared-ui';

@Component({
    selector: 'cb-board-toolbar',
    standalone: true,
    imports: [CommonModule, BrutalButtonComponent, GlassCardComponent, TitleCasePipe],
    templateUrl: './board-toolbar.component.html',
    styleUrls: ['./board-toolbar.component.scss']
})
export class BoardToolbarComponent {
    private boardStore = inject(BoardStore);
    private caseStore = inject(CaseStore);

    // State
    mode = this.boardStore.mode;
    viewport = this.boardStore.viewport;
    tools = this.boardStore.tools;
    nodes = this.boardStore.nodes;
    connections = this.boardStore.connections;
    selectedNode = this.boardStore.selectedNode;

    // Permissions
    canSave = () => this.caseStore.currentCase()?.permissions?.canUpdateLayout || false;
    canUndo = this.boardStore.canUndo;
    canRedo = this.boardStore.canRedo;

    // Methods
    setMode(mode: 'select' | 'connect' | 'hypothesis' | 'pan' | 'delete'): void {
        this.boardStore.setMode(mode);
    }

    zoom(delta: number): void {
        this.boardStore.zoom(delta);
    }

    resetViewport(): void {
        this.boardStore.resetViewport();
    }

    toggleGrid(): void {
        this.boardStore.updateTools({
            isGridVisible: !this.tools().isGridVisible
        });
    }

    toggleSnapToGrid(): void {
        this.boardStore.updateTools({
            isSnapToGrid: !this.tools().isSnapToGrid
        });
    }

    updateGridSize(event: Event): void {
        const value = (event.target as HTMLInputElement).value;
        this.boardStore.updateTools({
            gridSize: parseInt(value, 10)
        });
    }

    updateConnectionStyle(event: Event): void {
        const value = (event.target as HTMLSelectElement).value as 'straight' | 'bezier' | 'orthogonal';
        this.boardStore.updateTools({
            connectionStyle: value
        });
    }

    toggleLabels(): void {
        this.boardStore.updateTools({
            showLabels: !this.tools().showLabels
        });
    }

    saveLayout(): void {
        this.boardStore.saveLayout();
    }

    undo(): void {
        this.boardStore.undo();
    }

    redo(): void {
        this.boardStore.redo();
    }

    autoArrange(): void {
        this.boardStore.autoArrange();
    }
}
