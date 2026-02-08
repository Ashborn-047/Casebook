# Casebook – Event-Sourced Case Management System

[![CI](https://github.com/Ashborn-047/Casebook/actions/workflows/ci.yml/badge.svg)](https://github.com/Ashborn-047/Casebook/actions/workflows/ci.yml)

A modern, event-sourced case management application for investigations and evidence. Built with Angular, NX monorepo, and Convex. Immutable audit trails and role-based access are core to the design.

## 🛠️ Tech Stack

| Category | Technology | Version |
|----------|------------|---------|
| **Frontend** | Angular | 21.1 |
| **UI Components** | Angular Material | 21.1 |
| **Styling** | Tailwind CSS | 3.4 |
| **Monorepo** | NX | 22.4 |
| **Backend / Sync** | Convex | 1.31 |
| **Language** | TypeScript | 5.9 |
| **Testing** | Vitest | 4.0 |
| **E2E Testing** | Playwright | 1.36 |
| **Linting** | ESLint | 9.8 |
| **State** | RxJS, Angular Signals | 7.8 |
| **Build** | esbuild (via Angular) | - |

## 🏗️ Architecture

- **Event Sourcing** – All state changes are immutable events; full audit trails and time-travel debugging.
- **Local-first** – IndexedDB is the primary source of truth; Convex acts as a remote event mirror for sync.
- **Repository pattern** – Swappable backends (In-memory, IndexedDB, Convex) keep the frontend decoupled.
- **RBAC** – Role-based access control with a compile-time checked permission matrix.
- **Pure reducers** – Deterministic state computation from the event stream in `shared-logic`.
- **Evidence integrity** – Client-side SHA-256 hashing and correction events instead of edits/deletes.

## 📦 Project Structure

```
casbook/
├── apps/
│   ├── frontend/           # Angular application
│   └── frontend-e2e/       # Playwright E2E tests
├── convex/
│   ├── schema.ts           # Convex tables (events mirror)
│   └── events.ts           # Convex functions
├── libs/
│   ├── shared-models/      # Event, domain, permission models
│   ├── shared-logic/       # Event reducer and business logic
│   ├── shared-ui/          # Reusable UI components
│   └── shared-utils/       # Crypto, export, utilities
└── docs/                   # Implementation plans and decisions
```

## 🚀 Getting Started

### Prerequisites

- Node.js 20.x
- npm 10.x
- [Convex](https://www.convex.dev/) account (for cloud sync)

### Installation

```bash
npm install
```

### Development

```bash
# Start Convex dev server (optional; for sync)
npx convex dev

# Start frontend
npx nx serve frontend

# Run unit tests
npx nx test shared-logic

# Run E2E tests
npx nx e2e frontend-e2e

# Lint
npx nx lint shared-models shared-logic
```

### Build

```bash
npx nx build frontend
```

## 🎨 Design System

"Uncanny Minimalism" – Glassmorphism meets Neo-brutalism:

- **Palette**: Coral, Tiffany Blue, Mustard
- High contrast, bold borders and soft transparency/blur
- Tailwind for layout; Angular Material for complex, accessible components

## 📚 Documentation

- [Architectural Decisions](../docs/DECISIONS.md)
- [Phase 1 Implementation Plan](./docs/PHASE1_IMPLEMENTATION_PLAN.md)
- [Phase 1 Task List](./docs/PHASE1_TASK_LIST.md)
- [Phase 2 Implementation Plan](./docs/phase-2-implementation-plan.md)
- [Phase 2 Task Checklist](./docs/phase-2-task-checklist.md)
- [Phase 3 – Investigation Board](./docs/phase-3-investigation-board.md)
- [Phase 4 – Forensics and Auditing](./docs/phase-4-forensics-and-auditing.md)

## 🔐 User Roles

| Role | Capabilities |
|------|-------------|
| **Viewer** | View cases and public evidence |
| **Investigator** | Add evidence, notes, create cases |
| **Supervisor** | Full access including restricted evidence, case assignment |

## 📄 License

MIT
