import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Platform type for type safety
type AggregatorPlatform = "swiggy" | "zomato" | "rapido";

// Get all aggregators for a store
export const getByStore = query({
    args: { storeId: v.id("stores") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("aggregators")
            .withIndex("by_store", (q) => q.eq("storeId", args.storeId))
            .collect();
    },
});

// Get a specific aggregator by platform
export const getByPlatform = query({
    args: {
        storeId: v.id("stores"),
        platform: v.union(v.literal("swiggy"), v.literal("zomato"), v.literal("rapido")),
    },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("aggregators")
            .withIndex("by_store_platform", (q) =>
                q.eq("storeId", args.storeId).eq("platform", args.platform)
            )
            .first();
    },
});

// Get a single aggregator by ID
export const get = query({
    args: { aggregatorId: v.id("aggregators") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.aggregatorId);
    },
});

// Create a new aggregator configuration
export const create = mutation({
    args: {
        storeId: v.id("stores"),
        platform: v.union(v.literal("swiggy"), v.literal("zomato"), v.literal("rapido")),
        credentials: v.optional(v.object({
            apiKey: v.optional(v.string()),
            apiSecret: v.optional(v.string()),
            restaurantId: v.optional(v.string()),
            webhookSecret: v.optional(v.string()),
        })),
    },
    handler: async (ctx, args) => {
        // Check if aggregator already exists for this store/platform
        const existing = await ctx.db
            .query("aggregators")
            .withIndex("by_store_platform", (q) =>
                q.eq("storeId", args.storeId).eq("platform", args.platform)
            )
            .first();

        if (existing) {
            throw new Error(`Aggregator ${args.platform} already exists for this store`);
        }

        const aggregatorId = await ctx.db.insert("aggregators", {
            storeId: args.storeId,
            platform: args.platform,
            isEnabled: false,
            credentials: args.credentials || {
                apiKey: undefined,
                apiSecret: undefined,
                restaurantId: undefined,
                webhookSecret: undefined,
            },
            webhookUrl: undefined,
            status: "inactive",
            lastSyncAt: undefined,
        });

        return aggregatorId;
    },
});

// Update aggregator credentials/settings
export const update = mutation({
    args: {
        aggregatorId: v.id("aggregators"),
        credentials: v.optional(v.object({
            apiKey: v.optional(v.string()),
            apiSecret: v.optional(v.string()),
            restaurantId: v.optional(v.string()),
            webhookSecret: v.optional(v.string()),
        })),
        webhookUrl: v.optional(v.string()),
        status: v.optional(v.union(v.literal("active"), v.literal("inactive"), v.literal("error"))),
    },
    handler: async (ctx, args) => {
        const aggregator = await ctx.db.get(args.aggregatorId);
        if (!aggregator) {
            throw new Error("Aggregator not found");
        }

        const updates: Record<string, unknown> = {};

        if (args.credentials !== undefined) {
            updates.credentials = {
                ...aggregator.credentials,
                ...args.credentials,
            };
        }

        if (args.webhookUrl !== undefined) {
            updates.webhookUrl = args.webhookUrl;
        }

        if (args.status !== undefined) {
            updates.status = args.status;
        }

        await ctx.db.patch(args.aggregatorId, updates);

        return args.aggregatorId;
    },
});

// Toggle aggregator enabled/disabled
export const toggleEnabled = mutation({
    args: { aggregatorId: v.id("aggregators") },
    handler: async (ctx, args) => {
        const aggregator = await ctx.db.get(args.aggregatorId);
        if (!aggregator) {
            throw new Error("Aggregator not found");
        }

        const newEnabled = !aggregator.isEnabled;
        const newStatus = newEnabled ? "active" : "inactive";

        await ctx.db.patch(args.aggregatorId, {
            isEnabled: newEnabled,
            status: newStatus,
        });

        return { isEnabled: newEnabled };
    },
});

// Delete an aggregator
export const remove = mutation({
    args: { aggregatorId: v.id("aggregators") },
    handler: async (ctx, args) => {
        const aggregator = await ctx.db.get(args.aggregatorId);
        if (!aggregator) {
            throw new Error("Aggregator not found");
        }

        // Delete associated item mappings
        const itemMappings = await ctx.db
            .query("aggregatorItemMappings")
            .withIndex("by_aggregator", (q) => q.eq("aggregatorId", args.aggregatorId))
            .collect();

        for (const mapping of itemMappings) {
            await ctx.db.delete(mapping._id);
        }

        // Delete associated category mappings
        const categoryMappings = await ctx.db
            .query("aggregatorCategoryMappings")
            .withIndex("by_aggregator", (q) => q.eq("aggregatorId", args.aggregatorId))
            .collect();

        for (const mapping of categoryMappings) {
            await ctx.db.delete(mapping._id);
        }

        // Delete the aggregator
        await ctx.db.delete(args.aggregatorId);

        return { success: true };
    },
});

// Update last sync timestamp
export const updateLastSync = mutation({
    args: { aggregatorId: v.id("aggregators") },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.aggregatorId, {
            lastSyncAt: Date.now(),
        });
    },
});

// Get aggregator statistics (mapping counts, order counts)
export const getStats = query({
    args: { aggregatorId: v.id("aggregators") },
    handler: async (ctx, args) => {
        const aggregator = await ctx.db.get(args.aggregatorId);
        if (!aggregator) {
            return null;
        }

        // Count item mappings
        const itemMappings = await ctx.db
            .query("aggregatorItemMappings")
            .withIndex("by_aggregator", (q) => q.eq("aggregatorId", args.aggregatorId))
            .collect();

        const mappedItems = itemMappings.filter((m) => m.posItemId !== undefined).length;
        const unmappedItems = itemMappings.filter((m) => m.posItemId === undefined).length;

        // Count category mappings
        const categoryMappings = await ctx.db
            .query("aggregatorCategoryMappings")
            .withIndex("by_aggregator", (q) => q.eq("aggregatorId", args.aggregatorId))
            .collect();

        const mappedCategories = categoryMappings.filter((m) => m.counterId !== undefined).length;
        const unmappedCategories = categoryMappings.filter((m) => m.counterId === undefined).length;

        // Count today's orders
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const todayOrders = await ctx.db
            .query("aggregatorOrders")
            .withIndex("by_store", (q) => q.eq("storeId", aggregator.storeId))
            .filter((q) =>
                q.and(
                    q.eq(q.field("platform"), aggregator.platform),
                    q.gte(q.field("createdAt"), startOfDay.getTime())
                )
            )
            .collect();

        return {
            totalItems: itemMappings.length,
            mappedItems,
            unmappedItems,
            totalCategories: categoryMappings.length,
            mappedCategories,
            unmappedCategories,
            ordersToday: todayOrders.length,
            pendingOrders: todayOrders.filter((o) => o.status === "pending").length,
        };
    },
});
