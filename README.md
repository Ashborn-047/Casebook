# Casebook - Event-Sourced Case Management System

[![CI](https://github.com/Ashborn-047/Casebook/actions/workflows/ci.yml/badge.svg)](https://github.com/Ashborn-047/Casebook/actions/workflows/ci.yml)

A modern, event-sourced case management application built with Angular and NX monorepo architecture.

## 🛠️ Tech Stack

| Category | Technology | Version |
|----------|------------|---------|
| **Frontend** | Angular | 21.1 |
| **UI Components** | Angular Material | 21.1 |
| **Styling** | Tailwind CSS | 3.4 |
| **Monorepo** | NX | 22.4 |
| **Language** | TypeScript | 5.9 |
| **Testing** | Vitest | 4.0 |
| **E2E Testing** | Playwright | 1.36 |
| **Linting** | ESLint | 9.8 |
| **State** | RxJS | 7.8 |
| **Build** | esbuild (via Angular) | - |

## 🏗️ Architecture

- **Event Sourcing**: All state changes are immutable events, enabling full audit trails and time-travel debugging
- **RBAC Permissions**: Role-based access control with compile-time checked permission matrix
- **NX Monorepo**: Scalable workspace with shared libraries
- **Pure Reducers**: Deterministic state computation from events

## 📦 Project Structure

```
casbook/
├── apps/
│   └── frontend/         # Angular application
├── libs/
│   ├── shared-models/    # Event, Domain, Permission models
│   ├── shared-logic/     # Event reducer and business logic
│   ├── shared-ui/        # Reusable UI components
│   └── shared-utils/     # Utility functions
└── docs/                 # Documentation
```

## 🚀 Getting Started

### Prerequisites

- Node.js 20.x
- npm 10.x

### Installation

```bash
npm install
```

### Development

```bash
# Start frontend
npx nx serve frontend

# Run tests
npx nx test shared-logic

# Run linting
npx nx lint shared-models shared-logic
```

### Build

```bash
npx nx build frontend
```

## 🎨 Design System

The project uses an "Uncanny Minimalism" design system with:
- Dark theme with subtle amber accents
- Clean, professional typography
- Smooth animations and transitions

## 📚 Documentation

- [Phase 1 Implementation Plan](./docs/PHASE1_IMPLEMENTATION_PLAN.md)
- [Phase 1 Task List](./docs/PHASE1_TASK_LIST.md)

## 🔐 User Roles

| Role | Capabilities |
|------|-------------|
| **Viewer** | View cases and public evidence |
| **Investigator** | Add evidence, notes, create cases |
| **Supervisor** | Full access including restricted evidence, case assignment |

## 📄 License

MIT
