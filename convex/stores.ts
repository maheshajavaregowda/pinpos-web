import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get all categories for a store
export const getAll = query({
    handler: async (ctx) => {
        return await ctx.db.query("stores").collect();
    },
});

// Get all stores for an organization
export const getByOrg = query({
    args: { orgId: v.id("organizations") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("stores")
            .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
            .collect();
    },
});

// Get store by code (for login)
export const getByCode = query({
    args: { storeCode: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("stores")
            .withIndex("by_store_code", (q) => q.eq("storeCode", args.storeCode))
            .first();
    },
});

// Get store with full details
export const get = query({
    args: { storeId: v.id("stores") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.storeId);
    },
});

// Create a new store
export const create = mutation({
    args: {
        orgId: v.id("organizations"),
        name: v.string(),
        storeCode: v.string(),
        address: v.optional(v.string()),
        settings: v.optional(
            v.object({
                taxRate: v.optional(v.number()),
                currency: v.optional(v.string()),
            })
        ),
        gstNumber: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // Check if store code is unique
        const existing = await ctx.db
            .query("stores")
            .withIndex("by_store_code", (q) => q.eq("storeCode", args.storeCode))
            .first();

        if (existing) {
            throw new Error("Store code already exists");
        }

        return await ctx.db.insert("stores", {
            orgId: args.orgId,
            name: args.name,
            storeCode: args.storeCode,
            address: args.address,
            settings: args.settings,
            gstNumber: args.gstNumber,
        });
    },
});

// Update store settings
export const updateSettings = mutation({
    args: {
        storeId: v.id("stores"),
        settings: v.object({
            taxRate: v.optional(v.number()),
            currency: v.optional(v.string()),
            printSettings: v.optional(v.any()),
        }),
        gstNumber: v.optional(v.string()),
        address: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.storeId, {
            settings: args.settings,
            gstNumber: args.gstNumber,
            address: args.address,
        });
    },
});

// Get all stores for the current organization of a user
export const getAccessibleStores = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.userId);
        if (!user || (!user.orgId && !user.storeIds)) return [];

        if (user.orgId) {
            return await ctx.db
                .query("stores")
                .withIndex("by_org", (q) => q.eq("orgId", user.orgId!))
                .collect();
        }

        if (user.storeIds) {
            const stores = [];
            for (const storeId of user.storeIds) {
                const store = await ctx.db.get(storeId);
                if (store) stores.push(store);
            }
            return stores;
        }

        return [];
    },
});
