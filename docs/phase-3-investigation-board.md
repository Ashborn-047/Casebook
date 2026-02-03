# Phase 3: Investigation Board Implementation Plan

Implement an interactive investigation board ("Mind Palace") with draggable evidence/hypothesis cards, connection drawing tools, and board state persistence.

> [!IMPORTANT]
> **Dependency order is critical:** board.models.ts → event-reducer.ts → board-store.service.ts → Components

---

## Step 1: Create Board Models (MUST BE FIRST)

### libs/shared-models

#### [NEW] [board.models.ts](file:///e:/My%20Projects/Case%20book/casbook/libs/shared-models/src/lib/board.models.ts)

Enhanced board-specific models:
- `BoardNodeType`: `'evidence' | 'hypothesis' | 'note' | 'case'`
- `BoardNode`: position, size, zIndex, isSelected, isDragging, metadata
- `BoardConnection`: path array for curves, visual metadata
- `BoardState`: viewport, mode, tools, history tracking
- `INITIAL_BOARD_STATE` constant
- Helpers: `createBoardNode()`, `createBoardConnection()`, `calculateConnectionPath()`, `areNodesConnected()`
- Color/icon/size utilities per node type

#### [MODIFY] [index.ts](file:///e:/My%20Projects/Case%20book/casbook/libs/shared-models/src/index.ts)

```diff
+export * from './lib/board.models';
```

---

## Step 2: Update Event Reducer

### libs/shared-logic

#### [MODIFY] [event-reducer.ts](file:///e:/My%20Projects/Case%20book/casbook/libs/shared-logic/src/lib/event-reducer.ts)

Add helper function:
```typescript
export function createInitialBoardState(caseState: CaseState): BoardState {
  // Convert evidence → BoardNode[] with initial grid positions
  // Convert hypotheses → BoardNode[]
  // Convert InvestigationConnection[] → BoardConnection[]
  // Calculate connection paths
}
```

---

## Step 3: Create Board Store Service

### apps/frontend/src/app/core/state

#### [NEW] [board-store.service.ts](file:///e:/My%20Projects/Case%20book/casbook/apps/frontend/src/app/core/state/board-store.service.ts)

```typescript
@Injectable({ providedIn: 'root' })
export class BoardStore {
  private caseStore = inject(CaseStore);  // Required integration
  
  // Signal-based board state
  // Node selection/movement
  // Connection creation/deletion
  // Viewport controls (zoom, pan, reset)
  // Undo/redo with history stack
  // saveLayout() → calls caseStore.addEvent()
}
```

---

## Step 4: Create Board Components

### apps/frontend/src/app/features/case-detail/investigation-board/

| File | Description |
|------|-------------|
| `investigation-board.component.ts` | Main canvas component |
| `investigation-board.component.html` | Template |
| `investigation-board.component.scss` | Styles |
| `investigation-board.component.spec.ts` | Tests |

Features: Grid canvas, zoom/pan, SVG connections, draggable nodes, keyboard shortcuts

---

### apps/frontend/src/app/features/case-detail/board-tools/

| File | Description |
|------|-------------|
| `board-toolbar.component.ts` | Toolbar component |
| `board-toolbar.component.html` | Template |
| `board-toolbar.component.scss` | Styles |
| `board-toolbar.component.spec.ts` | Tests |

Features: Mode selector, view controls, connection styles, actions, stats

---

## Step 5: Integration

### [MODIFY] [case-detail-container.component.ts](file:///e:/My%20Projects/Case%20book/casbook/apps/frontend/src/app/features/case-detail/case-detail-container.component.ts)

```typescript
import { BoardStore } from '../../core/state/board-store.service';
import { InvestigationBoardComponent } from './investigation-board/investigation-board.component';
import { BoardToolbarComponent } from './board-tools/board-toolbar.component';

// Add injection
private boardStore = inject(BoardStore);

// Replace placeholder with real board view
```

---

## Step 6: Tests

- `board-store.service.spec.ts`
- `investigation-board.component.spec.ts`
- `board-toolbar.component.spec.ts`

---

## Verification Plan

### Automated Tests
```bash
npx nx test shared-logic --testPathPattern=event-reducer
npx nx test frontend
```

### Manual Browser Testing
1. Navigate to case detail → "Investigation Board" view
2. Verify: Grid visible, nodes displayed, drag works, zoom/pan works
3. Test: Connection tool, toolbar modes, Save Layout, Undo/Redo
4. Verify keyboard shortcuts: Space (pan), ESC (deselect), Ctrl+Z/Y (undo/redo)
