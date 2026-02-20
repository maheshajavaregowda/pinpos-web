import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ============================================
// ITEM MAPPINGS
// ============================================

// Get all item mappings for an aggregator
export const getItemMappings = query({
    args: { aggregatorId: v.id("aggregators") },
    handler: async (ctx, args) => {
        const mappings = await ctx.db
            .query("aggregatorItemMappings")
            .withIndex("by_aggregator", (q) => q.eq("aggregatorId", args.aggregatorId))
            .collect();

        // Enrich with POS item details
        const enrichedMappings = await Promise.all(
            mappings.map(async (mapping) => {
                let posItem = null;
                let posVariation = null;

                if (mapping.posItemId) {
                    posItem = await ctx.db.get(mapping.posItemId);
                }
                if (mapping.posVariationId) {
                    posVariation = await ctx.db.get(mapping.posVariationId);
                }

                return {
                    ...mapping,
                    posItem,
                    posVariation,
                };
            })
        );

        return enrichedMappings;
    },
});

// Get item mappings by store (all platforms)
export const getItemMappingsByStore = query({
    args: { storeId: v.id("stores") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("aggregatorItemMappings")
            .withIndex("by_store", (q) => q.eq("storeId", args.storeId))
            .collect();
    },
});

// Create a new item mapping
export const createItemMapping = mutation({
    args: {
        storeId: v.id("stores"),
        aggregatorId: v.id("aggregators"),
        platform: v.union(v.literal("swiggy"), v.literal("zomato"), v.literal("rapido")),
        aggregatorItemId: v.string(),
        aggregatorItemName: v.string(),
        aggregatorCategory: v.optional(v.string()),
        posItemId: v.optional(v.id("menuItems")),
        posVariationId: v.optional(v.id("itemVariations")),
        mappingType: v.union(v.literal("item"), v.literal("variation")),
    },
    handler: async (ctx, args) => {
        // Check if mapping already exists
        const existing = await ctx.db
            .query("aggregatorItemMappings")
            .withIndex("by_aggregator_item", (q) =>
                q.eq("aggregatorId", args.aggregatorId).eq("aggregatorItemId", args.aggregatorItemId)
            )
            .first();

        if (existing) {
            throw new Error("Mapping for this aggregator item already exists");
        }

        const mappingId = await ctx.db.insert("aggregatorItemMappings", {
            storeId: args.storeId,
            aggregatorId: args.aggregatorId,
            platform: args.platform,
            aggregatorItemId: args.aggregatorItemId,
            aggregatorItemName: args.aggregatorItemName,
            aggregatorCategory: args.aggregatorCategory,
            posItemId: args.posItemId,
            posVariationId: args.posVariationId,
            mappingType: args.mappingType,
            isActive: true,
        });

        return mappingId;
    },
});

// Update an item mapping (link to POS item)
export const updateItemMapping = mutation({
    args: {
        mappingId: v.id("aggregatorItemMappings"),
        posItemId: v.optional(v.id("menuItems")),
        posVariationId: v.optional(v.id("itemVariations")),
        mappingType: v.optional(v.union(v.literal("item"), v.literal("variation"))),
        isActive: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const mapping = await ctx.db.get(args.mappingId);
        if (!mapping) {
            throw new Error("Mapping not found");
        }

        const updates: Record<string, unknown> = {};

        if (args.posItemId !== undefined) {
            updates.posItemId = args.posItemId;
        }
        if (args.posVariationId !== undefined) {
            updates.posVariationId = args.posVariationId;
        }
        if (args.mappingType !== undefined) {
            updates.mappingType = args.mappingType;
        }
        if (args.isActive !== undefined) {
            updates.isActive = args.isActive;
        }

        await ctx.db.patch(args.mappingId, updates);

        return args.mappingId;
    },
});

// Delete an item mapping
export const deleteItemMapping = mutation({
    args: { mappingId: v.id("aggregatorItemMappings") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.mappingId);
        return { success: true };
    },
});

// Bulk create item mappings (for importing from aggregator)
export const bulkCreateItemMappings = mutation({
    args: {
        storeId: v.id("stores"),
        aggregatorId: v.id("aggregators"),
        platform: v.union(v.literal("swiggy"), v.literal("zomato"), v.literal("rapido")),
        items: v.array(v.object({
            aggregatorItemId: v.string(),
            aggregatorItemName: v.string(),
            aggregatorCategory: v.optional(v.string()),
        })),
    },
    handler: async (ctx, args) => {
        const created: string[] = [];
        const skipped: string[] = [];

        for (const item of args.items) {
            // Check if already exists
            const existing = await ctx.db
                .query("aggregatorItemMappings")
                .withIndex("by_aggregator_item", (q) =>
                    q.eq("aggregatorId", args.aggregatorId).eq("aggregatorItemId", item.aggregatorItemId)
                )
                .first();

            if (existing) {
                skipped.push(item.aggregatorItemId);
                continue;
            }

            const mappingId = await ctx.db.insert("aggregatorItemMappings", {
                storeId: args.storeId,
                aggregatorId: args.aggregatorId,
                platform: args.platform,
                aggregatorItemId: item.aggregatorItemId,
                aggregatorItemName: item.aggregatorItemName,
                aggregatorCategory: item.aggregatorCategory,
                posItemId: undefined,
                posVariationId: undefined,
                mappingType: "item",
                isActive: true,
            });

            created.push(mappingId);
        }

        return { created: created.length, skipped: skipped.length };
    },
});

// Auto-map items by matching names
export const autoMapByName = mutation({
    args: { aggregatorId: v.id("aggregators") },
    handler: async (ctx, args) => {
        const aggregator = await ctx.db.get(args.aggregatorId);
        if (!aggregator) {
            throw new Error("Aggregator not found");
        }

        // Get all unmapped items for this aggregator
        const unmappedItems = await ctx.db
            .query("aggregatorItemMappings")
            .withIndex("by_aggregator", (q) => q.eq("aggregatorId", args.aggregatorId))
            .filter((q) => q.eq(q.field("posItemId"), undefined))
            .collect();

        // Get all POS menu items for this store
        const posItems = await ctx.db
            .query("menuItems")
            .withIndex("by_store", (q) => q.eq("storeId", aggregator.storeId))
            .collect();

        let mappedCount = 0;

        for (const unmapped of unmappedItems) {
            // Try to find a matching POS item by name (case-insensitive)
            const normalizedAggName = unmapped.aggregatorItemName.toLowerCase().trim();

            const matchingPosItem = posItems.find((posItem) => {
                const normalizedPosName = posItem.name.toLowerCase().trim();
                return (
                    normalizedPosName === normalizedAggName ||
                    normalizedPosName.includes(normalizedAggName) ||
                    normalizedAggName.includes(normalizedPosName)
                );
            });

            if (matchingPosItem) {
                await ctx.db.patch(unmapped._id, {
                    posItemId: matchingPosItem._id,
                    mappingType: "item",
                });
                mappedCount++;
            }
        }

        return { mappedCount, totalUnmapped: unmappedItems.length };
    },
});

// ============================================
// CATEGORY MAPPINGS
// ============================================

// Get all category mappings for an aggregator
export const getCategoryMappings = query({
    args: { aggregatorId: v.id("aggregators") },
    handler: async (ctx, args) => {
        const mappings = await ctx.db
            .query("aggregatorCategoryMappings")
            .withIndex("by_aggregator", (q) => q.eq("aggregatorId", args.aggregatorId))
            .collect();

        // Enrich with counter details
        const enrichedMappings = await Promise.all(
            mappings.map(async (mapping) => {
                let counter = null;
                if (mapping.counterId) {
                    counter = await ctx.db.get(mapping.counterId);
                }
                return {
                    ...mapping,
                    counter,
                };
            })
        );

        return enrichedMappings;
    },
});

// Get category mappings by store
export const getCategoryMappingsByStore = query({
    args: { storeId: v.id("stores") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("aggregatorCategoryMappings")
            .withIndex("by_store", (q) => q.eq("storeId", args.storeId))
            .collect();
    },
});

// Create a new category mapping
export const createCategoryMapping = mutation({
    args: {
        storeId: v.id("stores"),
        aggregatorId: v.id("aggregators"),
        platform: v.union(v.literal("swiggy"), v.literal("zomato"), v.literal("rapido")),
        aggregatorCategoryId: v.string(),
        aggregatorCategoryName: v.string(),
        counterId: v.optional(v.id("counters")),
    },
    handler: async (ctx, args) => {
        const mappingId = await ctx.db.insert("aggregatorCategoryMappings", {
            storeId: args.storeId,
            aggregatorId: args.aggregatorId,
            platform: args.platform,
            aggregatorCategoryId: args.aggregatorCategoryId,
            aggregatorCategoryName: args.aggregatorCategoryName,
            counterId: args.counterId,
            isActive: true,
        });

        return mappingId;
    },
});

// Update a category mapping
export const updateCategoryMapping = mutation({
    args: {
        mappingId: v.id("aggregatorCategoryMappings"),
        counterId: v.optional(v.id("counters")),
        isActive: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const mapping = await ctx.db.get(args.mappingId);
        if (!mapping) {
            throw new Error("Category mapping not found");
        }

        const updates: Record<string, unknown> = {};

        if (args.counterId !== undefined) {
            updates.counterId = args.counterId;
        }
        if (args.isActive !== undefined) {
            updates.isActive = args.isActive;
        }

        await ctx.db.patch(args.mappingId, updates);

        return args.mappingId;
    },
});

// Delete a category mapping
export const deleteCategoryMapping = mutation({
    args: { mappingId: v.id("aggregatorCategoryMappings") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.mappingId);
        return { success: true };
    },
});

// Bulk create category mappings
export const bulkCreateCategoryMappings = mutation({
    args: {
        storeId: v.id("stores"),
        aggregatorId: v.id("aggregators"),
        platform: v.union(v.literal("swiggy"), v.literal("zomato"), v.literal("rapido")),
        categories: v.array(v.object({
            aggregatorCategoryId: v.string(),
            aggregatorCategoryName: v.string(),
        })),
    },
    handler: async (ctx, args) => {
        const created: string[] = [];

        for (const category of args.categories) {
            const mappingId = await ctx.db.insert("aggregatorCategoryMappings", {
                storeId: args.storeId,
                aggregatorId: args.aggregatorId,
                platform: args.platform,
                aggregatorCategoryId: category.aggregatorCategoryId,
                aggregatorCategoryName: category.aggregatorCategoryName,
                counterId: undefined,
                isActive: true,
            });

            created.push(mappingId);
        }

        return { created: created.length };
    },
});
