# Casebook – Event-Sourced Case Management System

[![Deploy](https://github.com/Ashborn-047/Casebook/actions/workflows/deploy.yml/badge.svg)](https://github.com/Ashborn-047/Casebook/actions/workflows/deploy.yml)

A modern, event-sourced case management application for investigations and digital forensics. Built with Angular 21, NX monorepo, and a neo-brutalist UI. Immutable audit trails, role-based access, and local-first architecture are core to the design.

**[🔗 Live Demo](https://ashborn-047.github.io/Casebook/)**

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| **Frontend** | Angular 21 |
| **Styling** | Neo-brutalist CSS (custom design system) |
| **Monorepo** | NX 22 |
| **Backend (optional)** | Convex |
| **Language** | TypeScript 5.9 |
| **State** | Angular Signals + RxJS |
| **Storage** | IndexedDB (local-first) |
| **Testing** | Vitest + Playwright |
| **Build** | esbuild (via Angular) |

## 🏗️ Architecture

- **Event Sourcing** – All state changes are immutable events; full audit trails and time-travel debugging.
- **Local-first** – IndexedDB is the primary storage. No backend required. Convex available as optional remote sync.
- **Repository pattern** – Swappable backends (In-Memory, IndexedDB, Convex) keep the frontend decoupled.
- **RBAC** – Role-based access control with compile-time checked permission matrix.
- **Pure reducers** – Deterministic state computation from the event stream in `shared-logic`.
- **Evidence integrity** – Client-side SHA-256 hashing. Correction events instead of edits/deletes.

## 📦 Project Structure

```
casbook/
├── apps/
│   ├── frontend/           # Angular application
│   └── frontend-e2e/       # Playwright E2E tests
├── convex/                 # Optional remote sync backend
├── libs/
│   ├── shared-models/      # Event, domain, permission models
│   ├── shared-logic/       # Event reducer and business logic
│   ├── shared-ui/          # Reusable UI component library
│   └── shared-utils/       # Crypto, export, utilities
└── docs/                   # Implementation plans and decisions
```

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- npm 10+

### Install & Run

```bash
# Install dependencies
npm install

# Start dev server
npx nx serve frontend

# Build for production
npx nx build frontend
```

### Testing

```bash
# Unit tests
npx nx test shared-logic

# E2E tests
npx nx e2e frontend-e2e

# Lint
npx nx lint shared-models shared-logic
```

## 🎨 Design System

**Neo-Brutalist** — thick borders, offset shadows, bold typography, and a loud color palette:

| Token | Color |
|-------|-------|
| Lime | `#BFFF00` |
| Pink | `#FF6B9D` |
| Yellow | `#FFD93D` |
| Orange | `#FF8C42` |
| Lavender | `#C4B5FD` |

Key UI features:
- **Focus Mode** — dims non-essential UI for deep investigation work (`Ctrl+K` → "Focus")
- **Command Palette** — `Ctrl+K` for quick navigation and commands
- **Confidence Scoring** — hypothesis nodes visually weighted by confidence level
- **Chain of Custody** — timeline stickers tracking evidence handling

## 🔐 User Roles

| Role | Capabilities |
|------|-------------|
| **Viewer** | View cases and public evidence |
| **Investigator** | Add evidence, notes, create cases |
| **Supervisor** | Full access including restricted evidence |

Roles can be switched in the header for testing purposes.

## 📄 License

MIT
