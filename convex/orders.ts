import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get all orders for a store
export const getByStore = query({
    args: { storeId: v.id("stores") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("orders")
            .withIndex("by_store", (q) => q.eq("storeId", args.storeId))
            .order("desc")
            .collect();
    },
});

// Get orders by status (for Kitchen Display)
export const getByStoreAndStatus = query({
    args: {
        storeId: v.id("stores"),
        statuses: v.array(v.string()),
    },
    handler: async (ctx, args) => {
        const orders = await ctx.db
            .query("orders")
            .withIndex("by_store", (q) => q.eq("storeId", args.storeId))
            .order("desc")
            .collect();

        return orders.filter((order) =>
            args.statuses.includes(order.status)
        );
    },
});

// Get a single order with items
export const getWithItems = query({
    args: { orderId: v.id("orders") },
    handler: async (ctx, args) => {
        const order = await ctx.db.get(args.orderId);
        if (!order) return null;

        const items = await ctx.db
            .query("orderItems")
            .withIndex("by_order", (q) => q.eq("orderId", args.orderId))
            .collect();

        return { ...order, items };
    },
});

// Create a new order
export const create = mutation({
    args: {
        storeId: v.id("stores"),
        tableId: v.optional(v.id("tables")),
        orderNumber: v.string(),
        tokenNumber: v.optional(v.number()),
        type: v.string(),
        customer: v.optional(
            v.object({
                name: v.optional(v.string()),
                phone: v.optional(v.string()),
                address: v.optional(v.string()),
            })
        ),
        subtotal: v.number(),
        tax: v.number(),
        total: v.number(),
        status: v.optional(v.string()),
        paymentStatus: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const now = Date.now();
        const orderId = await ctx.db.insert("orders", {
            storeId: args.storeId,
            tableId: args.tableId,
            orderNumber: args.orderNumber,
            tokenNumber: args.tokenNumber,
            type: args.type as "dine_in" | "takeaway" | "delivery_swiggy" | "delivery_zomato" | "delivery_rapido" | "delivery_direct",
            status: (args.status as any) || "pending",
            paymentStatus: (args.paymentStatus as any) || "pending",
            customer: args.customer,
            subtotal: args.subtotal,
            tax: args.tax,
            total: args.total,
            createdAt: now,
            updatedAt: now,
        });

        // Update table status if dine-in
        if (args.tableId) {
            await ctx.db.patch(args.tableId, {
                status: "occupied",
                currentOrderId: orderId,
            });
        }

        return orderId;
    },
});

// Update order status
export const updateStatus = mutation({
    args: {
        orderId: v.id("orders"),
        status: v.string(),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.orderId, {
            status: args.status as "pending" | "confirmed" | "cooking" | "ready" | "served" | "completed" | "cancelled",
            updatedAt: Date.now(),
        });
    },
});

// Complete payment
export const completePayment = mutation({
    args: {
        orderId: v.id("orders"),
        paymentMethod: v.string(),
    },
    handler: async (ctx, args) => {
        const order = await ctx.db.get(args.orderId);
        if (!order) throw new Error("Order not found");

        await ctx.db.patch(args.orderId, {
            paymentStatus: "paid",
            paymentMethod: args.paymentMethod as "cash" | "card" | "upi" | "online",
            status: "completed",
            updatedAt: Date.now(),
        });

        // Free up the table if dine-in
        if (order.tableId) {
            await ctx.db.patch(order.tableId, {
                status: "available",
                currentOrderId: undefined,
            });
        }
    },
});

// Add items to order
export const addItems = mutation({
    args: {
        orderId: v.id("orders"),
        items: v.array(
            v.object({
                menuItemId: v.id("menuItems"),
                name: v.string(),
                price: v.number(),
                quantity: v.number(),
                notes: v.optional(v.string()),
                status: v.optional(v.string()),
            })
        ),
    },
    handler: async (ctx, args) => {
        for (const item of args.items) {
            await ctx.db.insert("orderItems", {
                orderId: args.orderId,
                menuItemId: item.menuItemId,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                notes: item.notes,
                status: (item.status as any) || "pending",
            });
        }
    },
});
