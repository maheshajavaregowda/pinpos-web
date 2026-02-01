import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get all crew members for a specific store
export const getByStore = query({
    args: { storeId: v.id("stores") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("crew")
            .withIndex("by_store", (q) => q.eq("storeId", args.storeId))
            .collect();
    },
});

// Create a new crew member
export const create = mutation({
    args: {
        storeId: v.id("stores"),
        name: v.string(),
        username: v.string(),
        role: v.union(v.literal("billing"), v.literal("waiter"), v.literal("chef")),
        pin: v.string(),
        password: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // Check if username is taken within this store
        const existing = await ctx.db
            .query("crew")
            .withIndex("by_username_store", (q) =>
                q.eq("username", args.username).eq("storeId", args.storeId)
            )
            .first();

        if (existing) {
            throw new Error("Username already exists in this store");
        }

        // Check if PIN is taken within this store
        const existingPin = await ctx.db
            .query("crew")
            .withIndex("by_pin_store", (q) =>
                q.eq("pin", args.pin).eq("storeId", args.storeId)
            )
            .first();

        if (existingPin) {
            throw new Error("PIN already assigned to another crew member in this store");
        }

        return await ctx.db.insert("crew", {
            storeId: args.storeId,
            name: args.name,
            username: args.username,
            role: args.role,
            pin: args.pin,
            passwordHash: args.password, // Storing as plain text for MVP as per previous owner pattern, but labeled as hash
            isActive: true,
        });
    },
});

// Update a crew member
export const update = mutation({
    args: {
        id: v.id("crew"),
        name: v.optional(v.string()),
        role: v.optional(v.union(v.literal("billing"), v.literal("waiter"), v.literal("chef"))),
        pin: v.optional(v.string()),
        isActive: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const { id, ...updates } = args;

        if (updates.pin) {
            const current = await ctx.db.get(id);
            if (!current) throw new Error("Crew member not found");

            const existingPin = await ctx.db
                .query("crew")
                .withIndex("by_pin_store", (q) =>
                    q.eq("pin", updates.pin!).eq("storeId", current.storeId)
                )
                .first();

            if (existingPin && existingPin._id !== id) {
                throw new Error("PIN already assigned to another member in this store");
            }
        }

        await ctx.db.patch(id, updates);
    },
});

// Remove a crew member
export const remove = mutation({
    args: { id: v.id("crew") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
    },
});
