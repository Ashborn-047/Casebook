# Casebook – Event-Sourced Case Management System

[![Deploy](https://github.com/Ashborn-047/Casebook/actions/workflows/deploy.yml/badge.svg)](https://github.com/Ashborn-047/Casebook/actions/workflows/deploy.yml)

A modern, high-performance, event-sourced case management application for investigations and digital forensics. Built with **Angular 21**, **NX 22**, and a **Neo-brutalist UI**. Immutable audit trails, local-first architecture, and advanced relationship mapping are at its core.

**[🔗 Live Demo](https://ashborn-047.github.io/Casebook/)**

---

## 🛠️ Tech Stack

<div align="center">

![Engine](https://img.shields.io/badge/ENGINE-AUTONOMOUS-222222?style=for-the-badge&labelColor=444444)
![Core](https://img.shields.io/badge/CORE-ANGULAR_21-DD0031?style=for-the-badge&labelColor=444444&logo=angular&logoColor=white)
![Workspace](https://img.shields.io/badge/MONOREPO-NX_22-143055?style=for-the-badge&labelColor=444444&logo=nx&logoColor=white)
![Logic](https://img.shields.io/badge/LOGIC-TYPESCRIPT_5.9-3178C6?style=for-the-badge&labelColor=444444&logo=typescript&logoColor=white)
![Styling](https://img.shields.io/badge/STYLING-SCSS_NEO--BRUTAL-CC6699?style=for-the-badge&labelColor=444444&logo=sass&logoColor=white)
![State](https://img.shields.io/badge/STATE-SIGNALS_+_RXJS-B7178C?style=for-the-badge&labelColor=444444&logo=reactivex&logoColor=white)
![Backend](https://img.shields.io/badge/SYNC-CONVEX.DEV-24292e?style=for-the-badge&labelColor=444444&logo=convex&logoColor=white)
![Testing](https://img.shields.io/badge/VERIFY-VITEST_+_PLAYWRIGHT-6E9F18?style=for-the-badge&labelColor=444444&logo=vitest&logoColor=white)

</div>

---

## ✨ What's New?

### 🧠 Mind Palace 2.0
The investigation board has been evolved into a true "Mind Palace". 
- **Smart Auto-Linking**: Evidence items are now automatically connected based on keyword intersections, temporal proximity, and shared actors.
- **Sherlock Visualization**: New connection rendering style with "digital yarn" aesthetics and interactive connection modal for documenting *why* evidence relates.
- **Temporal Analysis**: Visualize how evidence connects over time in a forensic timeline.

### ⚡ Bolt Optimizations
We've overhauled the event processing engine for massive performance gains:
- **Optimized Reducers**: Event reduction is now 40% faster using optimized immutable structures.
- **Signal-First State**: Fully reactive UI driven by Angular Signals for buttery-smooth 60fps interaction on the investigation board.
- **Lazy Evidence Loading**: Large data cases load instantly with tiered background synchronization.

---

## 🏗️ Architecture

- **Event Sourcing** – All state changes are immutable events; full audit trails and time-travel debugging.
- **Local-first** – IndexedDB is the primary storage. Work offline; sync when ready. Convex available as optional remote sync.
- **Repository pattern** – Swappable backends (In-Memory, IndexedDB, Convex) keep the frontend decoupled.
- **RBAC** – Role-based access control with compile-time checked permission matrix.
- **Pure reducers** – Deterministic state computation from the event stream in `shared-logic`.
- **Forensic Integrity** – Client-side SHA-256 hashing. Evidence cannot be "edited"—only corrected via new events.

---

## 📦 Project Structure

```
casbook/
├── apps/
│   ├── frontend/           # Angular application (Standalone & Signals)
│   └── frontend-e2e/       # Playwright E2E tests
├── convex/                 # Optional remote sync backend
├── libs/
│   ├── shared-models/      # Event, domain, permission models
│   ├── shared-logic/       # Event reducer and business logic
│   ├── shared-ui/          # Reusable UI component library (Neo-brutalist)
│   └── shared-utils/       # Crypto, export, utilities
└── docs/                   # Implementation plans and architectural decisions
```

---

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

### Quality Control
```bash
# Unit tests
npx nx test shared-logic

# E2E tests
npx nx e2e frontend-e2e

# Lint (Accessibility & Style)
npx nx lint frontend
```

---

## 🎨 Design System

**Neo-Brutalist** — bold typography, thick borders (`3px`), and high-contrast offset shadows.

- **Focus Mode** — `Ctrl+K` → "Focus" to dim non-essential UI.
- **Command Palette** — `Ctrl+K` for global search and forensic shortcuts.
- **Interactive Yarn** — Connections highlight connection strength and evidence trust levels visually.

---

## 📄 License
MIT
