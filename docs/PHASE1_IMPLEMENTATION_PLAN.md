# Implementation Plan - Phase 1: Project Setup and Core Models

This plan follows the exact 6-step execution order to initialize the CASBOOK NX monorepo and implement the core models.

## Proposed Changes

---

### [Step 1: Setup NX Workspace] ✅ DONE
- Initialize NX monorepo `casbook` with Angular frontend
- Create libraries: `shared-models`, `shared-logic`, `shared-ui`, `shared-utils`

---

### [Step 2: Configure Tailwind] ✅ DONE

- **[NEW]** `tailwind.config.js`
- **[NEW]** `postcss.config.js`
- **[MODIFY]** `apps/frontend/src/styles.scss`
- **[MODIFY]** `apps/frontend/project.json`

Implement "Uncanny Minimalism" design system.

---

### [Step 3: Create Event Models] ✅ DONE

- **[NEW]** `libs/shared-models/src/lib/event.models.ts`
- **[MODIFY]** `libs/shared-models/src/index.ts`

Define immutable event types and creators:
- `CASE_CREATED`, `CASE_ASSIGNED`, `CASE_CLOSED`, `CASE_REOPENED`
- `EVIDENCE_ADDED`, `EVIDENCE_CORRECTED`, `EVIDENCE_VISIBILITY_CHANGED`
- `NOTE_ADDED`

---

### [Step 4: Create Domain Models] ✅ DONE

- **[NEW]** `libs/shared-models/src/lib/domain.models.ts`
- **[MODIFY]** `libs/shared-models/src/index.ts`

Define derived state and entity interfaces:
- `CaseState`, `Evidence`, `Note`, `User`
- `TimelineEntry`, `CaseSummary`, `AppState`
- Initial states and helper types

---

### [Step 5: Create Permission Models] ✅ DONE

- **[NEW]** `libs/shared-models/src/lib/permission.models.ts`
- **[MODIFY]** `libs/shared-models/src/index.ts`

Implement RBAC and business rules.

---

### [Step 6: Create Event Reducer] ✅ DONE

- **[NEW]** `libs/shared-logic/src/lib/event-reducer.ts`
- **[NEW]** `libs/shared-logic/src/lib/event-reducer.spec.ts`
- **[NEW]** `libs/shared-logic/src/index.ts`

Implement state computation from events:
- `reduceEvents()` - Core reducer function
- `applyEvent()` - Single event application
- `getStateAtTime()` - Time-travel debugging
- `replayEvents()` - Step-by-step replay
- `validateEventSequence()` - Sequence validation

---

## Verification Plan

### Automated Tests
```bash
npx nx test shared-logic
npx nx serve frontend
```

### Manual Verification
- Verify workspace structure matches expected layout
- Confirm all models export correctly from `@casbook/shared-models`
- Confirm reducer exports from `@casbook/shared-logic`

---

## Architecture Decisions

### Event Sourcing
- All state changes are immutable events
- State is computed by reducing events chronologically
- Enables time-travel debugging and audit trails

### Pure Reducer Pattern
- `reduceEvents()` is a pure function with no side effects
- Same events always produce identical state
- Facilitates testing and predictability
