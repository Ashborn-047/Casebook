import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * appendEvent
 * 
 * Safely appends an event to the remote mirror.
 * Includes a deduplication check to ensure we don't double-sync the same local event.
 */
export const appendEvent = mutation({
    args: {
        localId: v.string(),
        type: v.string(),
        caseId: v.string(),
        occurredAt: v.string(),
        payload: v.any(),
    },
    handler: async (ctx, args) => {
        // Check for deduplication
        const existing = await ctx.db
            .query("events")
            .withIndex("by_localId", (q) => q.eq("localId", args.localId))
            .first();

        if (existing) {
            return existing._id;
        }

        return await ctx.db.insert("events", {
            ...args,
            createdAt: Date.now(),
        });
    },
});

/**
 * getEventsByCase
 * 
 * Fetches the event stream for a specific case, ordered by original occurrence.
 */
export const getEventsByCase = query({
    args: { caseId: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("events")
            .withIndex("by_caseId", (q) => q.eq("caseId", args.caseId))
            .collect();
    },
});
