import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BoardToolbarComponent } from './board-toolbar.component';
import { signal } from '@angular/core';
import { BoardStore } from '../../../core/state/board-store.service';
import { CaseStore } from '../../../core/state/case-store.service';

describe('BoardToolbarComponent', () => {
    let component: BoardToolbarComponent;
    let fixture: ComponentFixture<BoardToolbarComponent>;

    beforeEach(async () => {
        const boardMode = signal('select');
        const toolsSignal = signal({ isGridVisible: true, isSnapToGrid: false, gridSize: 20, connectionStyle: 'bezier', showLabels: true });

        const mockBoardStore = {
            mode: boardMode,
            viewport: signal({ zoom: 1, panX: 0, panY: 0 }),
            tools: toolsSignal,
            nodes: signal([]),
            connections: signal([]),
            selectedNode: signal(null),
            canUndo: signal(false),
            canRedo: signal(false),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setMode: (mode: any) => boardMode.set(mode),
            // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function
            zoom: (_delta: number) => { },
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            resetViewport: () => { },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            updateTools: (newTools: any) => toolsSignal.update(t => ({ ...t, ...newTools })),
            toggleGrid: () => toolsSignal.update(t => ({ ...t, isGridVisible: !t.isGridVisible })),
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            toggleSnapToGrid: () => { },
            // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, @typescript-eslint/no-empty-function
            updateGridSize: (_event: any) => { },
            // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, @typescript-eslint/no-empty-function
            updateConnectionStyle: (_event: any) => { },
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            toggleLabels: () => { },
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            saveLayout: () => { },
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            undo: () => { },
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            redo: () => { },
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            autoArrange: () => { },
            canSave: () => true
        };

        const mockCaseStore = {
            currentCase: signal(null),
            currentUser: signal({ id: 'test-user', name: 'Test User', role: 'investigator' })
        };

        await TestBed.configureTestingModule({
            imports: [BoardToolbarComponent],
            providers: [
                { provide: BoardStore, useValue: mockBoardStore },
                { provide: CaseStore, useValue: mockCaseStore }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(BoardToolbarComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should switch mode when setMode is called', () => {
        component.setMode('connect');
        expect(component.mode()).toBe('connect');

        component.setMode('pan');
        expect(component.mode()).toBe('pan');
    });

    it('should toggle grid visibility', () => {
        const initialVisibility = component.tools().isGridVisible;
        component.toggleGrid();
        expect(component.tools().isGridVisible).toBe(!initialVisibility);
    });
});
