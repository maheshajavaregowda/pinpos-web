import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get all counters for a store
export const getByStore = query({
    args: { storeId: v.id("stores") },
    handler: async (ctx, args) => {
        const counters = await ctx.db
            .query("counters")
            .withIndex("by_store", (q) => q.eq("storeId", args.storeId))
            .collect();

        return counters
            .filter(c => c.isActive)
            .sort((a, b) => a.sortOrder - b.sortOrder);
    },
});

// Get all counters including inactive
export const getAllByStore = query({
    args: { storeId: v.id("stores") },
    handler: async (ctx, args) => {
        const counters = await ctx.db
            .query("counters")
            .withIndex("by_store", (q) => q.eq("storeId", args.storeId))
            .collect();

        return counters.sort((a, b) => a.sortOrder - b.sortOrder);
    },
});

// Create a counter
export const create = mutation({
    args: {
        storeId: v.id("stores"),
        name: v.string(),
        printerId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("counters")
            .withIndex("by_store", (q) => q.eq("storeId", args.storeId))
            .collect();

        const maxOrder = existing.length > 0
            ? Math.max(...existing.map(c => c.sortOrder))
            : -1;

        return await ctx.db.insert("counters", {
            storeId: args.storeId,
            name: args.name,
            printerId: args.printerId,
            sortOrder: maxOrder + 1,
            isActive: true,
        });
    },
});

// Update a counter
export const update = mutation({
    args: {
        counterId: v.id("counters"),
        name: v.optional(v.string()),
        printerId: v.optional(v.string()),
        sortOrder: v.optional(v.number()),
        isActive: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const { counterId, ...updates } = args;
        const updateData: Record<string, any> = {};

        if (updates.name !== undefined) updateData.name = updates.name;
        if (updates.printerId !== undefined) updateData.printerId = updates.printerId;
        if (updates.sortOrder !== undefined) updateData.sortOrder = updates.sortOrder;
        if (updates.isActive !== undefined) updateData.isActive = updates.isActive;

        await ctx.db.patch(counterId, updateData);
    },
});

// Delete a counter
export const remove = mutation({
    args: { counterId: v.id("counters") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.counterId);
    },
});

// Get counter with item count
export const getByStoreWithStats = query({
    args: { storeId: v.id("stores") },
    handler: async (ctx, args) => {
        const counters = await ctx.db
            .query("counters")
            .withIndex("by_store", (q) => q.eq("storeId", args.storeId))
            .collect();

        const counterWithStats = await Promise.all(
            counters.map(async (counter) => {
                const items = await ctx.db
                    .query("menuItems")
                    .withIndex("by_store", (q) => q.eq("storeId", args.storeId))
                    .collect();

                const itemCount = items.filter(item => item.counterId === counter._id).length;

                return {
                    ...counter,
                    itemCount,
                };
            })
        );

        return counterWithStats.sort((a, b) => a.sortOrder - b.sortOrder);
    },
});

// Assign counter to menu item
export const assignToMenuItem = mutation({
    args: {
        menuItemId: v.id("menuItems"),
        counterId: v.optional(v.id("counters")),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.menuItemId, {
            counterId: args.counterId,
        });
    },
});

// Bulk assign counter to menu items
export const bulkAssignToMenuItems = mutation({
    args: {
        menuItemIds: v.array(v.id("menuItems")),
        counterId: v.id("counters"),
    },
    handler: async (ctx, args) => {
        for (const menuItemId of args.menuItemIds) {
            await ctx.db.patch(menuItemId, {
                counterId: args.counterId,
            });
        }
    },
});

// Initialize default counters for a store
export const initializeDefaults = mutation({
    args: { storeId: v.id("stores") },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("counters")
            .withIndex("by_store", (q) => q.eq("storeId", args.storeId))
            .collect();

        if (existing.length > 0) {
            return existing;
        }

        const defaultCounters = [
            "Main Kitchen",
            "Chats Counter",
            "Dosa Counter",
            "Beverages",
        ];

        const ids = [];
        for (let i = 0; i < defaultCounters.length; i++) {
            const id = await ctx.db.insert("counters", {
                storeId: args.storeId,
                name: defaultCounters[i],
                sortOrder: i,
                isActive: true,
            });
            ids.push(id);
        }

        return ids;
    },
});
