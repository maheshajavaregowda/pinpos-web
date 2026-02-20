import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get all categories for a store
export const getCategories = query({
    args: { storeId: v.id("stores") },
    handler: async (ctx, args) => {
        const categories = await ctx.db
            .query("menuCategories")
            .withIndex("by_store", (q) => q.eq("storeId", args.storeId))
            .collect();
        return categories.map(cat => ({
            ...cat,
            isAvailable: cat.isAvailable ?? true
        }));
    },
});

// Get all items for a store
export const getItems = query({
    args: { storeId: v.id("stores") },
    handler: async (ctx, args) => {
        const items = await ctx.db
            .query("menuItems")
            .withIndex("by_store", (q) => q.eq("storeId", args.storeId))
            .collect();
        return items.map(item => ({
            ...item,
            isAvailable: item.isAvailable ?? true,
            onlineAvailability: item.onlineAvailability ?? { swiggy: true, zomato: true, rapido: true }
        }));
    },
});

// Get items by category
export const getItemsByCategory = query({
    args: { categoryId: v.id("menuCategories") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("menuItems")
            .withIndex("by_category", (q) => q.eq("categoryId", args.categoryId))
            .collect();
    },
});

// Create a category
export const createCategory = mutation({
    args: {
        storeId: v.id("stores"),
        name: v.string(),
        sortOrder: v.number(),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("menuCategories", {
            storeId: args.storeId,
            name: args.name,
            sortOrder: args.sortOrder,
            isAvailable: true,
        });
    },
});

// Create a menu item
export const createItem = mutation({
    args: {
        storeId: v.id("stores"),
        categoryId: v.id("menuCategories"),
        name: v.string(),
        shortCode: v.optional(v.string()),
        shortCode2: v.optional(v.string()),
        description: v.optional(v.string()),
        price: v.number(),
        hsnCode: v.optional(v.string()),
        unit: v.optional(v.string()),
        type: v.string(),
        orderTypes: v.optional(v.array(v.string())),
        ignoreTax: v.optional(v.boolean()),
        ignoreDiscount: v.optional(v.boolean()),
        isAvailable: v.optional(v.boolean()),
        areaWisePricing: v.optional(v.object({
            homeWebsite: v.optional(v.number()),
            parcel: v.optional(v.number()),
            swiggy: v.optional(v.number()),
            zomato: v.optional(v.number()),
            rapido: v.optional(v.number()),
        })),
        imageUrl: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("menuItems", {
            storeId: args.storeId,
            categoryId: args.categoryId,
            name: args.name,
            shortCode: args.shortCode,
            shortCode2: args.shortCode2,
            description: args.description,
            price: args.price,
            hsnCode: args.hsnCode,
            unit: args.unit,
            type: args.type as "veg" | "non_veg" | "egg",
            orderTypes: args.orderTypes ?? ["dine_in", "takeaway", "delivery"],
            ignoreTax: args.ignoreTax ?? false,
            ignoreDiscount: args.ignoreDiscount ?? false,
            isAvailable: args.isAvailable ?? true,
            onlineAvailability: {
                swiggy: true,
                zomato: true,
                rapido: true,
            },
            areaWisePricing: args.areaWisePricing,
            imageUrl: args.imageUrl,
        });
    },
});

// Update menu item availability
export const toggleAvailability = mutation({
    args: {
        itemId: v.id("menuItems"),
        isAvailable: v.boolean(),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.itemId, {
            isAvailable: args.isAvailable,
        });
    },
});

// Update menu item
export const updateItem = mutation({
    args: {
        itemId: v.id("menuItems"),
        name: v.optional(v.string()),
        description: v.optional(v.string()),
        price: v.optional(v.number()),
        type: v.optional(v.string()),
        imageUrl: v.optional(v.string()),
        onlineAvailability: v.optional(v.object({
            swiggy: v.boolean(),
            zomato: v.boolean(),
            rapido: v.optional(v.boolean()),
        })),
    },
    handler: async (ctx, args) => {
        const { itemId, type, ...updates } = args;
        const patchData: Record<string, unknown> = { ...updates };
        if (type) {
            patchData.type = type as "veg" | "non_veg" | "egg";
        }
        await ctx.db.patch(itemId, patchData);
    },
});

// Toggle category availability
export const toggleCategoryAvailability = mutation({
    args: {
        categoryId: v.id("menuCategories"),
        isAvailable: v.boolean(),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.categoryId, {
            isAvailable: args.isAvailable,
        });
    },
});

// Update online availability
export const updateOnlineAvailability = mutation({
    args: {
        itemId: v.id("menuItems"),
        platform: v.union(v.literal("swiggy"), v.literal("zomato"), v.literal("rapido")),
        isAvailable: v.boolean(),
    },
    handler: async (ctx, args) => {
        const item = await ctx.db.get(args.itemId);
        if (!item) throw new Error("Item not found");

        const onlineAvailability = item.onlineAvailability
            ? { ...item.onlineAvailability }
            : { swiggy: true, zomato: true, rapido: true };
        if (!("rapido" in onlineAvailability)) {
            (onlineAvailability as any).rapido = true;
        }
        (onlineAvailability as any)[args.platform] = args.isAvailable;

        await ctx.db.patch(args.itemId, { onlineAvailability });
    },
});

// Remove menu item
export const removeItem = mutation({
    args: { itemId: v.id("menuItems") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.itemId);
    },
});

// Remove category
export const removeCategory = mutation({
    args: { categoryId: v.id("menuCategories") },
    handler: async (ctx, args) => {
        // First delete all items in the category
        const items = await ctx.db
            .query("menuItems")
            .withIndex("by_category", (q) => q.eq("categoryId", args.categoryId))
            .collect();

        for (const item of items) {
            await ctx.db.delete(item._id);
        }

        // Then delete the category
        await ctx.db.delete(args.categoryId);
    },
});
