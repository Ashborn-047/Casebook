# Casebook Phase 4: Forensics and Auditing

This phase introduces advanced forensics and auditing features to the Casebook system, ensuring a robust, append-only, and verifiable investigative workflow.

## Key Features

### 1. Time Travel Debugger
- **Deterministic Replay**: Leverages Event Sourcing to reconstruct case state as it existed at any historical point.
- **Playback Controls**: Slider-based scrubbing, step-by-step navigation, and auto-play functionality.
- **Signal-Based Implementation**: Uses Angular Signals to maintain ephemeral UI state (`currentEventIndex`) without affecting the persistent event log.

### 2. Audit Export System
- **Deterministic JSON Export**: Generates a full event log and derived state summary for data portability and secondary audit.
- **Formal PDF Export**: Utilizes `jsPDF` to create professional reports with case summaries and detailed timeline tables.
- **Appendix for Hashing**: Includes SHA-256 evidence hashes in the export to ensure provenance.

### 3. Forensic Evidence Hashing
- **Web Crypto Integration**: Every piece of evidence (file, text, or URL) is hashed using SHA-256 immediately upon upload.
- **Immutable Provenance**: The hash is embedded in the `EVIDENCE_ADDED` event payload, creating a permanent record that proves the evidence has not been tampered with since the moment of upload.

### 4. Convex Remote Mirroring
- **Background Synchronization**: A dedicated `EventSyncService` pushes local events to a Convex cloud mirror in the background.
- **Non-Blocking Architecture**: Failures or latency in cloud syncing never block local operations or UI responsiveness.
- **Secondary Mirror Layer**: Provides a forensic safety layer with a cloud-based copy of the immutable event stream.

## Implementation Details

- **Time Travel**: [time-travel.store.ts](file:///e:/My%20Projects/Case%20book/casbook/apps/frontend/src/app/features/time-travel/time-travel.store.ts)
- **JSON Export**: [json-export.service.ts](file:///e:/My%20Projects/Case%20book/casbook/libs/shared-utils/src/lib/export/json-export.service.ts)
- **PDF Export**: [pdf-export.service.ts](file:///e:/My%20Projects/Case%20book/casbook/libs/shared-utils/src/lib/export/pdf-export.service.ts)
- **Hashing**: [hash.service.ts](file:///e:/My%20Projects/Case%20book/casbook/libs/shared-utils/src/lib/crypto/hash.service.ts)
- **Convex Sync**: [event-sync.service.ts](file:///e:/My%20Projects/Case%20book/casbook/apps/frontend/src/app/core/sync/event-sync.service.ts)

## Verification

### Automated Tests
- **Frontend**: `npx nx test frontend` (31/31 passing)
- **Shared Utils**: `npx nx test shared-utils` (13/13 passing)

### Verification Checklist
- [x] Scrub through timeline using playback controls.
- [x] Export case history as JSON and PDF.
- [x] Verify evidence hash generation on upload.
- [x] Confirm background synchronization to Convex.
