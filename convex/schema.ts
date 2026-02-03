import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Convex Schema for Casebook
 * 
 * Convex is used as a remote event mirror.
 * It is NOT the primary source of truth (IndexedDB is).
 * Sync logic is additive and non-blocking.
 */
export default defineSchema({
    events: defineTable({
        // localEventId: The UUID generated in the frontend
        localId: v.string(),

        // type: The event type (e.g., CASE_CREATED)
        type: v.string(),

        // caseId: The ID of the case this event belongs to
        caseId: v.string(),

        // occurredAt: The original ISO timestamp of the event
        occurredAt: v.string(),

        // payload: The full, immutable event payload
        payload: v.any(),

        // createdAt: Internal server-side timestamp for reliable ordering
        createdAt: v.number(),
    })
        .index("by_caseId", ["caseId"])
        .index("by_localId", ["localId"]),
});
