import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get all tables for a store
export const getByStore = query({
    args: { storeId: v.id("stores") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("tables")
            .withIndex("by_store", (q) => q.eq("storeId", args.storeId))
            .collect();
    },
});

// Create a table
export const create = mutation({
    args: {
        storeId: v.id("stores"),
        name: v.string(),
        capacity: v.number(),
        qrCode: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("tables", {
            storeId: args.storeId,
            name: args.name,
            capacity: args.capacity,
            qrCode: args.qrCode,
            status: "available",
        });
    },
});

// Update table status
export const updateStatus = mutation({
    args: {
        tableId: v.id("tables"),
        status: v.string(),
        currentOrderId: v.optional(v.id("orders")),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.tableId, {
            status: args.status as "available" | "occupied" | "reserved",
            currentOrderId: args.currentOrderId,
        });
    },
});
