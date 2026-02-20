import { v } from "convex/values";
import { query } from "./_generated/server";

// Get count of all active orders (POS pending/cooking + aggregator pending)
export const getCount = query({
    args: { storeId: v.id("stores") },
    handler: async (ctx, args) => {
        const pendingAggregator = await ctx.db
            .query("aggregatorOrders")
            .withIndex("by_store_status", (q) =>
                q.eq("storeId", args.storeId).eq("status", "pending")
            )
            .collect();

        const activePos = await ctx.db
            .query("orders")
            .withIndex("by_store", (q) => q.eq("storeId", args.storeId))
            .filter((q) =>
                q.or(
                    q.eq(q.field("status"), "pending"),
                    q.eq(q.field("status"), "confirmed"),
                    q.eq(q.field("status"), "cooking"),
                    q.eq(q.field("status"), "ready")
                )
            )
            .collect();

        return pendingAggregator.length + activePos.length;
    },
});

// Get all active POS orders for the live panel (Order View)
export const getActiveOrders = query({
    args: { storeId: v.id("stores") },
    handler: async (ctx, args) => {
        const orders = await ctx.db
            .query("orders")
            .withIndex("by_store", (q) => q.eq("storeId", args.storeId))
            .filter((q) =>
                q.or(
                    q.eq(q.field("status"), "pending"),
                    q.eq(q.field("status"), "confirmed"),
                    q.eq(q.field("status"), "cooking"),
                    q.eq(q.field("status"), "ready"),
                    q.eq(q.field("status"), "served")
                )
            )
            .order("desc")
            .collect();

        // Enrich with table name and order items
        const enriched = await Promise.all(
            orders.map(async (order) => {
                let tableName: string | undefined;
                if (order.tableId) {
                    const table = await ctx.db.get(order.tableId);
                    tableName = table?.name;
                }

                const items = await ctx.db
                    .query("orderItems")
                    .withIndex("by_order", (q) => q.eq("orderId", order._id))
                    .collect();

                return { ...order, tableName, items };
            })
        );

        return enriched;
    },
});

// Get order status summary counts for badges
export const getStatusCounts = query({
    args: { storeId: v.id("stores") },
    handler: async (ctx, args) => {
        const orders = await ctx.db
            .query("orders")
            .withIndex("by_store", (q) => q.eq("storeId", args.storeId))
            .filter((q) =>
                q.or(
                    q.eq(q.field("status"), "pending"),
                    q.eq(q.field("status"), "confirmed"),
                    q.eq(q.field("status"), "cooking"),
                    q.eq(q.field("status"), "ready"),
                    q.eq(q.field("status"), "served")
                )
            )
            .collect();

        const pending = orders.filter((o) => o.status === "pending" || o.status === "confirmed").length;
        const cooking = orders.filter((o) => o.status === "cooking").length;
        const foodReady = orders.filter((o) => o.status === "ready").length;
        const served = orders.filter((o) => o.status === "served").length;

        // Aggregator pending
        const aggregatorPending = await ctx.db
            .query("aggregatorOrders")
            .withIndex("by_store_status", (q) =>
                q.eq("storeId", args.storeId).eq("status", "pending")
            )
            .collect();

        return {
            pending,
            cooking,
            foodReady,
            served,
            online: aggregatorPending.length,
            total: orders.length + aggregatorPending.length,
        };
    },
});

// Get all live orders for desktop display
export const getAll = query({
    args: { storeId: v.id("stores") },
    handler: async (ctx, args) => {
        // Get pending and accepted orders (not yet completed/rejected)
        const orders = await ctx.db
            .query("aggregatorOrders")
            .withIndex("by_store", (q) => q.eq("storeId", args.storeId))
            .filter((q) =>
                q.or(
                    q.eq(q.field("status"), "pending"),
                    q.eq(q.field("status"), "accepted")
                )
            )
            .order("desc")
            .collect();

        // Enrich with aggregator details
        const enrichedOrders = await Promise.all(
            orders.map(async (order) => {
                const aggregator = await ctx.db.get(order.aggregatorId);

                // Calculate mapping status summary
                const mappedCount = order.items.filter(
                    (item) => item.mappingStatus === "mapped" || item.mappingStatus === "manual"
                ).length;
                const totalItems = order.items.length;

                return {
                    ...order,
                    aggregatorName: aggregator?.platform || "Unknown",
                    mappingSummary: {
                        mapped: mappedCount,
                        total: totalItems,
                        isFullyMapped: mappedCount === totalItems,
                    },
                };
            })
        );

        return enrichedOrders;
    },
});

// Get live orders grouped by platform
export const getByPlatform = query({
    args: { storeId: v.id("stores") },
    handler: async (ctx, args) => {
        const orders = await ctx.db
            .query("aggregatorOrders")
            .withIndex("by_store_status", (q) =>
                q.eq("storeId", args.storeId).eq("status", "pending")
            )
            .collect();

        // Group by platform
        const grouped: Record<string, typeof orders> = {
            swiggy: [],
            zomato: [],
            rapido: [],
        };

        for (const order of orders) {
            if (grouped[order.platform]) {
                grouped[order.platform].push(order);
            }
        }

        return {
            swiggy: grouped.swiggy,
            zomato: grouped.zomato,
            rapido: grouped.rapido,
            total: orders.length,
        };
    },
});

// Get recent completed/rejected orders (for history)
export const getRecentHistory = query({
    args: {
        storeId: v.id("stores"),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const limit = args.limit || 50;

        const orders = await ctx.db
            .query("aggregatorOrders")
            .withIndex("by_store", (q) => q.eq("storeId", args.storeId))
            .filter((q) =>
                q.or(
                    q.eq(q.field("status"), "mapped_to_pos"),
                    q.eq(q.field("status"), "rejected"),
                    q.eq(q.field("status"), "failed")
                )
            )
            .order("desc")
            .take(limit);

        return orders;
    },
});

// Get live order statistics
export const getStats = query({
    args: { storeId: v.id("stores") },
    handler: async (ctx, args) => {
        // Get today's orders
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const todayOrders = await ctx.db
            .query("aggregatorOrders")
            .withIndex("by_store", (q) => q.eq("storeId", args.storeId))
            .filter((q) => q.gte(q.field("createdAt"), startOfDay.getTime()))
            .collect();

        const pending = todayOrders.filter((o) => o.status === "pending").length;
        const accepted = todayOrders.filter((o) => o.status === "mapped_to_pos").length;
        const rejected = todayOrders.filter((o) => o.status === "rejected").length;
        const failed = todayOrders.filter((o) => o.status === "failed").length;

        // Revenue from accepted orders
        const revenue = todayOrders
            .filter((o) => o.status === "mapped_to_pos")
            .reduce((sum, o) => sum + o.total, 0);

        // Platform breakdown
        const byPlatform = {
            swiggy: todayOrders.filter((o) => o.platform === "swiggy").length,
            zomato: todayOrders.filter((o) => o.platform === "zomato").length,
            rapido: todayOrders.filter((o) => o.platform === "rapido").length,
        };

        return {
            today: {
                total: todayOrders.length,
                pending,
                accepted,
                rejected,
                failed,
                revenue,
            },
            byPlatform,
        };
    },
});
