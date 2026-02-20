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

// Get table with sales info
export const getByStoreWithSales = query({
    args: { storeId: v.id("stores") },
    handler: async (ctx, args) => {
        const tables = await ctx.db
            .query("tables")
            .withIndex("by_store", (q) => q.eq("storeId", args.storeId))
            .collect();

        // Get all orders for this store to calculate sales per table
        const orders = await ctx.db
            .query("orders")
            .withIndex("by_store", (q) => q.eq("storeId", args.storeId))
            .collect();

        // Calculate sales per table
        const tableWithSales = tables.map(table => {
            const tableOrders = orders.filter(
                order => order.tableId === table._id &&
                (order.status === "completed" || order.paymentStatus === "paid")
            );
            const totalSales = tableOrders.reduce((sum, order) => sum + order.total, 0);
            const totalOrders = tableOrders.length;

            // Get current active order if occupied
            const currentOrder = table.currentOrderId
                ? orders.find(o => o._id === table.currentOrderId)
                : null;

            return {
                ...table,
                totalSales,
                totalOrders,
                currentOrderTotal: currentOrder?.total ?? 0,
            };
        });

        return tableWithSales;
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

// Get or create table by name (for dynamic table creation)
export const getOrCreateByName = mutation({
    args: {
        storeId: v.id("stores"),
        name: v.string(),
        capacity: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        // Check if table with this name already exists
        const existingTables = await ctx.db
            .query("tables")
            .withIndex("by_store", (q) => q.eq("storeId", args.storeId))
            .collect();

        const existing = existingTables.find(t => t.name.toLowerCase() === args.name.toLowerCase());

        if (existing) {
            return { tableId: existing._id, isNew: false };
        }

        // Create new table
        const tableId = await ctx.db.insert("tables", {
            storeId: args.storeId,
            name: args.name,
            capacity: args.capacity ?? 4,
            status: "available",
        });

        return { tableId, isNew: true };
    },
});

// Mark table as available (after billing/print)
export const markAvailable = mutation({
    args: { tableId: v.id("tables") },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.tableId, {
            status: "available",
            currentOrderId: undefined,
        });
    },
});
