# Phase 2 Implementation Plan

## Goal

Implement Phase 2 of the Casbook architecture: Mind Palace features, IndexedDB persistence layer, and enhanced UI components.

---

## Proposed Changes

### Shared Models (`libs/shared-models/`)

#### [MODIFY] event.models.ts
- Add 7 Mind Palace event types: `EVIDENCE_CONNECTED`, `EVIDENCE_DISCONNECTED`, `HYPOTHESIS_CREATED`, `HYPOTHESIS_UPDATED`, `HYPOTHESIS_RESOLVED`, `VISUAL_LAYOUT_UPDATED`, `INVESTIGATION_PATH_CREATED`
- Add corresponding payload interfaces

#### [MODIFY] domain.models.ts  
- Add Mind Palace entities: `InvestigationConnection`, `Hypothesis`, `VisualLayout`, `InvestigationPath`
- Update `CaseState` with Mind Palace collections and permission flags

#### [MODIFY] permission.models.ts
- Add 8 Mind Palace actions: `create_connection`, `delete_connection`, `create_hypothesis`, etc.
- Update permission matrix
- Add 4 Mind Palace business rules

---

### Shared Logic (`libs/shared-logic/`)

#### [MODIFY] event-reducer.ts
- Add 7 Mind Palace event appliers with helper functions

---

### Storage Layer (`apps/frontend/src/app/core/storage/`)

#### [NEW] repositories/event-repository.interface.ts
- Abstract `IEventRepository` interface for swappable storage backends

#### [NEW] schemas/indexed-db.schema.ts
- IndexedDB store definitions for events, snapshots, metadata

#### [NEW] migration.service.ts
- Schema migration management

#### [NEW] repositories/in-memory-event-repository.service.ts
- In-memory implementation for testing/fallback

#### [NEW] repositories/indexed-db-event-repository.service.ts
- Production IndexedDB implementation

---

### State Management (`apps/frontend/src/app/core/state/`)

#### [NEW] case-store.service.ts
- Angular Signals-based reactive state management
- Integrates with IndexedDB repository

---

### UI Components (`libs/shared-ui/src/lib/components/`)

#### [NEW] glass-card/
- Glassmorphism card with blur effect

#### [NEW] brutal-button/
- Neo-brutalist button with variants

#### [NEW] role-badge/
- Role indicator with icons

#### [NEW] timeline-item/
- Timeline entry with formatting

---

### Feature Components (`apps/frontend/src/app/features/`)

#### [NEW] cases/case-list/case-list.component.ts
- Case list with stats dashboard and role switching

#### [NEW] case-detail/case-detail-container.component.ts
- Case detail with timeline/board views

#### [NEW] cases/cases.routes.ts
- Lazy-loaded feature routes

---

## Verification Plan

### Automated Tests
- `npx nx build shared-models`
- `npx nx build shared-logic`
- `npx nx build shared-ui`
- `npx nx serve frontend`

### Manual Verification
- Open `http://localhost:4200/`
- Check case list displays demo data
- Verify role switching works
- Check timeline displays events
- Verify IndexedDB persistence (refresh browser)
