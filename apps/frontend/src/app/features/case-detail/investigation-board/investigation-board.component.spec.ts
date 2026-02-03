import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InvestigationBoardComponent } from './investigation-board.component';
import { signal } from '@angular/core';
import { BoardStore } from '../../../core/state/board-store.service';
import { CaseStore } from '../../../core/state/case-store.service';

describe('InvestigationBoardComponent', () => {
    let component: InvestigationBoardComponent;
    let fixture: ComponentFixture<InvestigationBoardComponent>;

    beforeEach(async () => {
        const boardMode = signal('select');
        const selectedNodeId = signal<string | null>(null);

        const mockBoardStore = {
            mode: boardMode,
            selectedNode: selectedNodeId,
            nodes: signal([]),
            connections: signal([]),
            viewport: signal({ zoom: 1, panX: 0, panY: 0 }),
            tools: signal({ isGridVisible: true }),
            setMode: (mode: any) => boardMode.set(mode),
            selectNode: (id: any) => selectedNodeId.set(id),
            handleKeyboardEvent: (event: KeyboardEvent) => {
                if (event.key === ' ' && boardMode() === 'select') boardMode.set('pan');
                else if (event.key === ' ' && boardMode() === 'pan') boardMode.set('select');
                else if (event.key === 'Escape') {
                    boardMode.set('select');
                    selectedNodeId.set(null);
                }
            },
            viewMode: signal('board')
        };

        const mockCaseStore = {
            currentCase: signal(null),
            currentUser: signal({ id: 'test-user', name: 'Test User', role: 'investigator' })
        };

        await TestBed.configureTestingModule({
            imports: [InvestigationBoardComponent],
            providers: [
                { provide: BoardStore, useValue: mockBoardStore },
                { provide: CaseStore, useValue: mockCaseStore }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(InvestigationBoardComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize with default mode as select', () => {
        expect(component.mode()).toBe('select');
    });

    it('should toggle pan mode on space key', () => {
        const event = new KeyboardEvent('keydown', { key: ' ' });
        component.handleKeyboardEvent(event);
        expect(component.mode()).toBe('pan');

        component.handleKeyboardEvent(event);
        expect(component.mode()).toBe('select');
    });

    it('should reset on escape key', () => {
        component.handleKeyboardEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        expect(component.mode()).toBe('select');
        expect(component.selectedNode()).toBeNull();
    });
});
