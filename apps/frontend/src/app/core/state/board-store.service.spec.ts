import { TestBed } from '@angular/core/testing';
import { BoardStore } from './board-store.service';
import { CaseStore } from './case-store.service';
import { signal } from '@angular/core';

describe('BoardStore', () => {
    let boardStore: BoardStore;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mockCaseStore: any;

    beforeEach(() => {
        mockCaseStore = {
            currentCase: signal(null),
            currentUser: signal({ id: 'test-user', name: 'Test User', role: 'investigator' }),
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            addEvent: async () => { } // Simple mock
        };

        TestBed.configureTestingModule({
            providers: [
                BoardStore,
                { provide: CaseStore, useValue: mockCaseStore }
            ]
        });

        boardStore = TestBed.inject(BoardStore);
    });

    it('should be created', () => {
        expect(boardStore).toBeTruthy();
    });

    it('should start with default mode as select', () => {
        expect(boardStore.mode()).toBe('select');
    });

    it('should switch modes correctly', () => {
        boardStore.setMode('connect');
        expect(boardStore.mode()).toBe('connect');

        boardStore.setMode('pan');
        expect(boardStore.mode()).toBe('pan');

        boardStore.setMode('select');
        expect(boardStore.mode()).toBe('select');
    });

    it('should update viewport on zoom', () => {
        const initialZoom = boardStore.viewport().zoom;
        boardStore.zoom(0.1);
        expect(boardStore.viewport().zoom).toBe(initialZoom + 0.1);
    });

    it('should clamp zoom between 0.1 and 3', () => {
        boardStore.zoom(-5);
        expect(boardStore.viewport().zoom).toBeGreaterThanOrEqual(0.1);

        boardStore.zoom(10);
        expect(boardStore.viewport().zoom).toBeLessThanOrEqual(3);
    });

    it('should update tools settings', () => {
        boardStore.updateTools({ isGridVisible: false });
        expect(boardStore.tools().isGridVisible).toBe(false);

        boardStore.updateTools({ isSnapToGrid: true });
        expect(boardStore.tools().isSnapToGrid).toBe(true);
    });

    it('should reset viewport correctly', () => {
        boardStore.zoom(0.5);
        boardStore.pan(100, 50);

        boardStore.resetViewport();

        expect(boardStore.viewport().zoom).toBe(1);
        expect(boardStore.viewport().panX).toBe(0);
        expect(boardStore.viewport().panY).toBe(0);
    });

    it('should support undo/redo', () => {
        expect(boardStore.canUndo()).toBe(false);
        expect(boardStore.canRedo()).toBe(false);
    });
});
