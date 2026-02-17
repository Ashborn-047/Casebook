# Casebook – Event-Sourced Case Management System

[![Deploy](https://github.com/Ashborn-047/Casebook/actions/workflows/deploy.yml/badge.svg)](https://github.com/Ashborn-047/Casebook/actions/workflows/deploy.yml)

A modern, high-performance, event-sourced case management application for investigations and digital forensics. Built with **Angular 21**, **NX 22**, and a **Neo-brutalist UI**. Immutable audit trails, local-first architecture, and advanced relationship mapping are at its core.

**[🔗 Live Demo](https://ashborn-047.github.io/Casebook/)**

---

## 🎯 Who Is This For?

Casebook is designed for:
- **Digital Forensics Investigators** – Track evidence with cryptographic integrity
- **Security Analysts** – Manage incident investigations with full audit trails
- **Legal Professionals** – Maintain chain of custody for case documentation
- **Research Teams** – Organize complex investigations with relationship mapping
- **Anyone** – Who needs reliable, tamper-proof case management

---

## ✨ Key Benefits

### 🔒 **Forensic Integrity**
- **Immutable Evidence**: All evidence is SHA-256 hashed before storage—nothing can be altered without detection
- **Complete Audit Trail**: Every action is recorded as an event. See exactly who did what and when
- **Chain of Custody**: Perfect documentation for legal proceedings

### 🧠 **Mind Palace Investigation Board**
- **Smart Auto-Linking**: Evidence automatically connects based on keywords, timing, and shared actors
- **Visual Relationship Mapping**: See how evidence pieces connect with interactive "digital yarn" visualization
- **Temporal Analysis**: Track how evidence relationships evolve over time
- **Hypothesis Tracking**: Build and test investigation theories visually

### ⚡ **Performance & Reliability**
- **Local-First Architecture**: Your data lives in your browser (IndexedDB). Work completely offline
- **Instant Loading**: Large cases load instantly with optimized event processing (40% faster reducers)
- **60fps Interactions**: Smooth, responsive UI powered by Angular Signals
- **Time-Travel Debugging**: Replay events step-by-step to understand case evolution

### 🔐 **Security & Access Control**
- **Role-Based Permissions**: Fine-grained access control (Investigator, Analyst, Viewer roles)
- **Restricted Evidence**: Mark sensitive evidence as restricted—only authorized users can view
- **Compile-Time Safety**: Permission checks are enforced at the TypeScript level

### 📦 **Data Portability**
- **Export Capabilities**: Export cases to PDF or JSON for external analysis
- **Optional Cloud Sync**: Use Convex.dev for team collaboration (optional)
- **No Vendor Lock-in**: Your data stays in your control

---

## 🚀 How to Use Casebook

### Getting Started

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start the Development Server**
   ```bash
   npx nx serve frontend
   ```
   The app will open at `http://localhost:4200`

3. **Or Try the Live Demo**
   Visit [https://ashborn-047.github.io/Casebook/](https://ashborn-047.github.io/Casebook/)

### Basic Workflow

#### 1. **Create a New Case**
- Click the **"➕ CREATE NEW CASE"** card on the dashboard
- Enter:
  - **Title**: e.g., "Unauthorized Network Access"
  - **Description**: Brief overview of the investigation
  - **Severity**: Low, Medium, High, or Critical
- Click **"Create Case ⚡"**

#### 2. **Add Evidence**
- Open your case from the dashboard
- Click **"Add Evidence"**
- Choose evidence type:
  - **File**: Upload documents, images, logs (automatically hashed)
  - **Text**: Paste text evidence (emails, notes, etc.)
  - **URL**: Link to external resources
- Add:
  - **Description**: What this evidence represents
  - **Tags**: Keywords for easy searching (e.g., "suspicious-activity", "user-john")
  - **Visibility**: Normal or Restricted (for sensitive evidence)
- The system automatically computes SHA-256 hash for integrity verification

#### 3. **Explore the Investigation Board**
- Navigate to the **Investigation Board** tab
- See your evidence visualized as connected nodes
- **Auto-Linking**: Related evidence automatically connects based on:
  - Shared keywords/tags
  - Temporal proximity (created around the same time)
  - Shared actors or entities
- **Manual Connections**: Click and drag between evidence items to create custom connections
- **Connection Details**: Click any connection to document *why* evidence relates

#### 4. **Build Hypotheses**
- Create hypotheses to test theories
- Link evidence to hypotheses
- Track which hypotheses are supported or refuted by evidence
- Visualize investigation paths

#### 5. **Add Notes**
- Add case notes for observations, analysis, or reminders
- Notes can be:
  - **Public**: Visible to all team members
  - **Internal**: Only visible to investigators
- All notes are timestamped and linked to the actor who created them

#### 6. **Track Timeline**
- View the complete timeline of case events
- See when evidence was added, cases were assigned, notes were created
- Use time-travel debugging to see case state at any point in time

#### 7. **Export & Share**
- Export cases to PDF for reports
- Export to JSON for backup or external analysis
- (Optional) Enable Convex sync for team collaboration

### Keyboard Shortcuts

- **`Ctrl+K`** (or **`Cmd+K`** on Mac): Open command palette
  - Search cases, evidence, navigate quickly
  - Access forensic shortcuts
- **`Ctrl+Shift+F`** (or **`Cmd+Shift+F`**): Toggle Focus Mode
  - Dims non-essential UI for distraction-free investigation

### Advanced Features

#### **Time-Travel Debugging**
- Replay events step-by-step to understand case evolution
- See case state at any point in history
- Perfect for understanding how conclusions were reached

#### **Role-Based Access**
- **Investigator**: Full access, can add evidence, create connections, close cases
- **Analyst**: Can view and analyze, add notes, but cannot modify evidence
- **Viewer**: Read-only access to non-restricted evidence

#### **Offline Mode**
- Casebook works completely offline
- All data stored locally in IndexedDB
- Sync when online (if Convex is configured)

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

## 🏗️ Architecture Highlights

- **Event Sourcing** – All state changes are immutable events; full audit trails and time-travel debugging
- **Local-first** – IndexedDB is the primary storage. Work offline; sync when ready. Convex available as optional remote sync
- **Repository pattern** – Swappable backends (In-Memory, IndexedDB, Convex) keep the frontend decoupled
- **RBAC** – Role-based access control with compile-time checked permission matrix
- **Pure reducers** – Deterministic state computation from the event stream in `shared-logic`
- **Forensic Integrity** – Client-side SHA-256 hashing. Evidence cannot be "edited"—only corrected via new events

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

## 🚀 Development Setup

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

- **Focus Mode** — `Ctrl+K` → "Focus" to dim non-essential UI
- **Command Palette** — `Ctrl+K` for global search and forensic shortcuts
- **Interactive Yarn** — Connections highlight connection strength and evidence trust levels visually

---

## 📄 License

MIT

---

## 🤝 Contributing

Contributions welcome! Please read our contributing guidelines and code of conduct before submitting pull requests.

---

## 📚 Learn More

- **Event Sourcing**: Understand how immutable events create perfect audit trails
- **Local-First Architecture**: Learn about offline-first applications
- **Forensic Integrity**: See how cryptographic hashing ensures evidence authenticity

---

**Built with ❤️ for investigators, analysts, and anyone who values data integrity.**
