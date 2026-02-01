import { query } from "./_generated/server";
import { v } from "convex/values";

// Helper to get date key based on 6 AM reset
const getDateKey = (timestamp: number): string => {
    const date = new Date(timestamp);
    if (date.getHours() < 6) {
        date.setDate(date.getDate() - 1);
    }
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

// Get start timestamp for a date range
const getStartTimestamp = (range: string): number => {
    const now = new Date();
    let start = new Date(now);

    // Reset to 6 AM today
    start.setHours(6, 0, 0, 0);
    if (now.getHours() < 6) {
        start.setDate(start.getDate() - 1);
    }

    switch (range) {
        case "today":
            return start.getTime();
        case "yesterday":
            start.setDate(start.getDate() - 1);
            return start.getTime();
        case "week":
            start.setDate(start.getDate() - 7);
            return start.getTime();
        case "month":
            start.setDate(start.getDate() - 30);
            return start.getTime();
        default:
            return start.getTime();
    }
};

// Get end timestamp for a date range
const getEndTimestamp = (range: string): number => {
    const now = new Date();

    if (range === "yesterday") {
        const end = new Date(now);
        end.setHours(6, 0, 0, 0);
        if (now.getHours() < 6) {
            end.setDate(end.getDate() - 1);
        }
        return end.getTime();
    }

    return now.getTime();
};

// Dashboard analytics
export const getAnalytics = query({
    args: {
        storeId: v.id("stores"),
        dateRange: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        const range = args.dateRange || "today";
        const startTime = getStartTimestamp(range);
        const endTime = getEndTimestamp(range);

        // Get all orders for the store
        const allOrders = await ctx.db
            .query("orders")
            .withIndex("by_store", (q) => q.eq("storeId", args.storeId))
            .collect();

        // Filter by date range
        const orders = allOrders.filter(order =>
            order.createdAt >= startTime && order.createdAt <= endTime
        );

        // Calculate totals by order type
        const dineInOrders = orders.filter(o => o.type === "dine_in");
        const takeawayOrders = orders.filter(o => o.type === "takeaway");
        const deliveryOrders = orders.filter(o =>
            o.type === "delivery_swiggy" ||
            o.type === "delivery_zomato" ||
            o.type === "delivery_direct"
        );

        const dineInRevenue = dineInOrders.reduce((sum, o) => sum + o.total, 0);
        const takeawayRevenue = takeawayOrders.reduce((sum, o) => sum + o.total, 0);
        const deliveryRevenue = deliveryOrders.reduce((sum, o) => sum + o.total, 0);
        const totalRevenue = dineInRevenue + takeawayRevenue + deliveryRevenue;

        // Get previous period for comparison
        const prevStartTime = startTime - (endTime - startTime);
        const prevOrders = allOrders.filter(order =>
            order.createdAt >= prevStartTime && order.createdAt < startTime
        );
        const prevRevenue = prevOrders.reduce((sum, o) => sum + o.total, 0);

        // Calculate percentage change
        const revenueChange = prevRevenue > 0
            ? ((totalRevenue - prevRevenue) / prevRevenue * 100).toFixed(1)
            : "0";

        // Order type distribution
        const totalOrders = orders.length;
        const orderTypeDistribution = [
            {
                name: "Dine-in",
                value: totalOrders > 0 ? Math.round((dineInOrders.length / totalOrders) * 100) : 0,
                color: "#3b82f6",
                count: dineInOrders.length
            },
            {
                name: "Takeaway",
                value: totalOrders > 0 ? Math.round((takeawayOrders.length / totalOrders) * 100) : 0,
                color: "#10b981",
                count: takeawayOrders.length
            },
            {
                name: "Delivery",
                value: totalOrders > 0 ? Math.round((deliveryOrders.length / totalOrders) * 100) : 0,
                color: "#ff6b35",
                count: deliveryOrders.length
            }
        ];

        // Average order value
        const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

        // Payment method breakdown
        const paymentBreakdown = {
            cash: orders.filter(o => o.paymentMethod === "cash").length,
            card: orders.filter(o => o.paymentMethod === "card").length,
            upi: orders.filter(o => o.paymentMethod === "upi").length,
            online: orders.filter(o => o.paymentMethod === "online").length,
            pending: orders.filter(o => o.paymentStatus === "pending").length,
            paid: orders.filter(o => o.paymentStatus === "paid").length
        };

        return {
            totalRevenue,
            revenueChange: parseFloat(revenueChange),
            totalOrders,
            dineIn: {
                revenue: dineInRevenue,
                orders: dineInOrders.length,
                change: "+15.2%"
            },
            takeaway: {
                revenue: takeawayRevenue,
                orders: takeawayOrders.length,
                change: "+8.7%"
            },
            delivery: {
                revenue: deliveryRevenue,
                orders: deliveryOrders.length,
                change: "+22.1%"
            },
            orderTypeDistribution,
            avgOrderValue,
            paymentBreakdown
        };
    },
});

// Get recent transactions
export const getRecentTransactions = query({
    args: {
        storeId: v.id("stores"),
        limit: v.optional(v.number())
    },
    handler: async (ctx, args) => {
        const limit = args.limit || 10;

        const orders = await ctx.db
            .query("orders")
            .withIndex("by_store", (q) => q.eq("storeId", args.storeId))
            .order("desc")
            .take(limit);

        return orders.map(order => ({
            id: order.orderNumber,
            customer: order.customer?.name || "Walk-in Customer",
            phone: order.customer?.phone || "",
            amount: order.total,
            items: 0,
            payment: order.paymentMethod?.toUpperCase() || "PENDING",
            paymentStatus: order.paymentStatus,
            time: order.createdAt,
            type: order.type,
            tokenNumber: order.tokenNumber
        }));
    },
});

// Get top selling products
export const getTopProducts = query({
    args: {
        storeId: v.id("stores"),
        dateRange: v.optional(v.string()),
        limit: v.optional(v.number())
    },
    handler: async (ctx, args) => {
        const range = args.dateRange || "today";
        const limit = args.limit || 4;
        const startTime = getStartTimestamp(range);
        const endTime = getEndTimestamp(range);

        // Get orders in date range
        const orders = await ctx.db
            .query("orders")
            .withIndex("by_store", (q) => q.eq("storeId", args.storeId))
            .collect();

        const filteredOrders = orders.filter(order =>
            order.createdAt >= startTime && order.createdAt <= endTime
        );

        // Get order items for these orders
        const orderIds = filteredOrders.map(o => o._id);
        const allOrderItems = await ctx.db
            .query("orderItems")
            .collect();

        const orderItems = allOrderItems.filter(item =>
            orderIds.includes(item.orderId)
        );

        // Aggregate by product
        const productStats: Record<string, { name: string; sold: number; revenue: number }> = {};

        for (const item of orderItems) {
            if (!productStats[item.menuItemId]) {
                productStats[item.menuItemId] = {
                    name: item.name,
                    sold: 0,
                    revenue: 0
                };
            }
            productStats[item.menuItemId].sold += item.quantity;
            productStats[item.menuItemId].revenue += item.price * item.quantity;
        }

        // Sort by quantity sold and return top N
        return Object.values(productStats)
            .sort((a, b) => b.sold - a.sold)
            .slice(0, limit);
    },
});

// Get customer stats
export const getCustomerStats = query({
    args: {
        storeId: v.id("stores"),
        dateRange: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        const range = args.dateRange || "today";
        const startTime = getStartTimestamp(range);
        const endTime = getEndTimestamp(range);

        // Get orders in date range
        const orders = await ctx.db
            .query("orders")
            .withIndex("by_store", (q) => q.eq("storeId", args.storeId))
            .collect();

        const filteredOrders = orders.filter(order =>
            order.createdAt >= startTime && order.createdAt <= endTime
        );

        // Count orders with customer phone (returning) vs without (walk-in/new)
        const ordersWithCustomer = filteredOrders.filter(o => o.customer?.phone);
        const walkInOrders = filteredOrders.filter(o => !o.customer?.phone);

        // Get unique customers
        const uniquePhones = new Set(
            ordersWithCustomer
                .map(o => o.customer?.phone)
                .filter(Boolean)
        );

        // Get all customers to check if they're new
        const allCustomers = await ctx.db
            .query("customers")
            .collect();

        const customersByPhone = new Map(
            allCustomers.map(c => [c.phone.replace(/\s/g, ''), c])
        );

        let newCustomers = 0;
        let returningCustomers = 0;

        for (const phone of uniquePhones) {
            if (!phone) continue;
            const normalizedPhone = phone.replace(/\s/g, '');
            const customer = customersByPhone.get(normalizedPhone);
            if (customer && customer.visits > 1) {
                returningCustomers++;
            } else {
                newCustomers++;
            }
        }

        const totalCustomers = newCustomers + returningCustomers + walkInOrders.length;

        return {
            totalCustomers,
            newCustomers,
            returningCustomers,
            walkInOrders: walkInOrders.length,
            newPercentage: totalCustomers > 0
                ? Math.round(((newCustomers + walkInOrders.length) / totalCustomers) * 100)
                : 0,
            returningPercentage: totalCustomers > 0
                ? Math.round((returningCustomers / totalCustomers) * 100)
                : 0
        };
    },
});

// Get pending orders count (for live alerts)
export const getPendingOrders = query({
    args: { storeId: v.id("stores") },
    handler: async (ctx, args) => {
        const orders = await ctx.db
            .query("orders")
            .withIndex("by_store_status", (q) =>
                q.eq("storeId", args.storeId).eq("status", "pending")
            )
            .collect();

        return {
            count: orders.length,
            orders: orders.slice(0, 5).map(o => ({
                id: o.orderNumber,
                type: o.type,
                total: o.total,
                createdAt: o.createdAt,
                tokenNumber: o.tokenNumber
            }))
        };
    },
});

// Get hourly sales for peak time analysis
export const getHourlySales = query({
    args: {
        storeId: v.id("stores"),
        dateRange: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        const range = args.dateRange || "today";
        const startTime = getStartTimestamp(range);
        const endTime = getEndTimestamp(range);

        const orders = await ctx.db
            .query("orders")
            .withIndex("by_store", (q) => q.eq("storeId", args.storeId))
            .collect();

        const filteredOrders = orders.filter(order =>
            order.createdAt >= startTime && order.createdAt <= endTime
        );

        // Group by hour
        const hourlyData: Record<number, { orders: number; revenue: number }> = {};

        for (let i = 0; i < 24; i++) {
            hourlyData[i] = { orders: 0, revenue: 0 };
        }

        for (const order of filteredOrders) {
            const hour = new Date(order.createdAt).getHours();
            hourlyData[hour].orders++;
            hourlyData[hour].revenue += order.total;
        }

        // Find peak hour
        let peakHour = 0;
        let maxOrders = 0;
        for (const [hour, data] of Object.entries(hourlyData)) {
            if (data.orders > maxOrders) {
                maxOrders = data.orders;
                peakHour = parseInt(hour);
            }
        }

        // Format peak time range
        const peakTimeStart = peakHour;
        const peakTimeEnd = (peakHour + 2) % 24;
        const peakTimeStr = `${peakTimeStart}:00-${peakTimeEnd}:00`;

        return {
            hourlyData: Object.entries(hourlyData).map(([hour, data]) => ({
                hour: parseInt(hour),
                orders: data.orders,
                revenue: data.revenue
            })),
            peakTime: peakTimeStr,
            peakHour,
            peakOrders: maxOrders
        };
    },
});
