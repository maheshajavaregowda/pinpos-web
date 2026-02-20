import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Get pending orders for a store
export const getPending = query({
    args: { storeId: v.id("stores") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("aggregatorOrders")
            .withIndex("by_store_status", (q) =>
                q.eq("storeId", args.storeId).eq("status", "pending")
            )
            .collect();
    },
});

// Get orders by status
export const getByStatus = query({
    args: {
        storeId: v.id("stores"),
        status: v.union(
            v.literal("pending"),
            v.literal("accepted"),
            v.literal("rejected"),
            v.literal("mapped_to_pos"),
            v.literal("failed")
        ),
    },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("aggregatorOrders")
            .withIndex("by_store_status", (q) =>
                q.eq("storeId", args.storeId).eq("status", args.status)
            )
            .collect();
    },
});

// Get all recent orders for a store (last 24 hours)
export const getRecent = query({
    args: { storeId: v.id("stores") },
    handler: async (ctx, args) => {
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

        const orders = await ctx.db
            .query("aggregatorOrders")
            .withIndex("by_store", (q) => q.eq("storeId", args.storeId))
            .filter((q) => q.gte(q.field("createdAt"), oneDayAgo))
            .order("desc")
            .collect();

        return orders;
    },
});

// Get a single order by ID
export const getById = query({
    args: { orderId: v.id("aggregatorOrders") },
    handler: async (ctx, args) => {
        const order = await ctx.db.get(args.orderId);
        if (!order) return null;

        // Get item mapping details
        const enrichedItems = await Promise.all(
            order.items.map(async (item) => {
                let posItem = null;
                let posVariation = null;

                if (item.posItemId) {
                    posItem = await ctx.db.get(item.posItemId);
                }
                if (item.posVariationId) {
                    posVariation = await ctx.db.get(item.posVariationId);
                }

                return {
                    ...item,
                    posItem,
                    posVariation,
                };
            })
        );

        return {
            ...order,
            items: enrichedItems,
        };
    },
});

// Create order from webhook (internal use)
export const createFromWebhook = mutation({
    args: {
        storeId: v.id("stores"),
        aggregatorId: v.id("aggregators"),
        platform: v.union(v.literal("swiggy"), v.literal("zomato"), v.literal("rapido")),
        aggregatorOrderId: v.string(),
        aggregatorOrderNumber: v.string(),
        customer: v.object({
            name: v.optional(v.string()),
            phone: v.optional(v.string()),
            address: v.optional(v.string()),
        }),
        items: v.array(v.object({
            aggregatorItemId: v.string(),
            name: v.string(),
            quantity: v.number(),
            price: v.number(),
        })),
        subtotal: v.number(),
        tax: v.optional(v.number()),
        deliveryFee: v.optional(v.number()),
        discount: v.optional(v.number()),
        total: v.number(),
        estimatedTime: v.optional(v.number()),
        rawPayload: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // Check for duplicate order
        const existing = await ctx.db
            .query("aggregatorOrders")
            .withIndex("by_aggregator_order", (q) =>
                q.eq("aggregatorId", args.aggregatorId).eq("aggregatorOrderId", args.aggregatorOrderId)
            )
            .first();

        if (existing) {
            return { orderId: existing._id, isDuplicate: true };
        }

        // Resolve item mappings
        const resolvedItems = await Promise.all(
            args.items.map(async (item) => {
                // Look up mapping
                const mapping = await ctx.db
                    .query("aggregatorItemMappings")
                    .withIndex("by_aggregator_item", (q) =>
                        q.eq("aggregatorId", args.aggregatorId).eq("aggregatorItemId", item.aggregatorItemId)
                    )
                    .first();

                return {
                    aggregatorItemId: item.aggregatorItemId,
                    name: item.name,
                    quantity: item.quantity,
                    price: item.price,
                    posItemId: mapping?.posItemId,
                    posVariationId: mapping?.posVariationId,
                    mappingStatus: (mapping?.posItemId ? "mapped" : "unmapped") as "mapped" | "unmapped" | "manual",
                };
            })
        );

        const orderId = await ctx.db.insert("aggregatorOrders", {
            storeId: args.storeId,
            aggregatorId: args.aggregatorId,
            platform: args.platform,
            aggregatorOrderId: args.aggregatorOrderId,
            aggregatorOrderNumber: args.aggregatorOrderNumber,
            status: "pending",
            posOrderId: undefined,
            customer: args.customer,
            items: resolvedItems,
            subtotal: args.subtotal,
            tax: args.tax,
            deliveryFee: args.deliveryFee,
            discount: args.discount,
            total: args.total,
            estimatedTime: args.estimatedTime,
            rawPayload: args.rawPayload,
            createdAt: Date.now(),
            acceptedAt: undefined,
            errorMessage: undefined,
        });

        return { orderId, isDuplicate: false };
    },
});

// Accept an order and create POS order
export const acceptOrder = mutation({
    args: { orderId: v.id("aggregatorOrders") },
    handler: async (ctx, args) => {
        const aggregatorOrder = await ctx.db.get(args.orderId);
        if (!aggregatorOrder) {
            throw new Error("Order not found");
        }

        if (aggregatorOrder.status !== "pending") {
            throw new Error("Order is not in pending status");
        }

        // Check if all items are mapped
        const unmappedItems = aggregatorOrder.items.filter(
            (item) => item.mappingStatus === "unmapped"
        );

        if (unmappedItems.length > 0) {
            throw new Error(
                `Cannot accept order: ${unmappedItems.length} items are not mapped to POS items`
            );
        }

        // Determine order type based on platform
        const orderTypeMap: Record<string, string> = {
            swiggy: "delivery_swiggy",
            zomato: "delivery_zomato",
            rapido: "delivery_rapido",
        };
        const orderType = orderTypeMap[aggregatorOrder.platform] || "delivery_direct";

        // Generate order number
        const now = new Date();
        const datePrefix = `${now.getFullYear().toString().slice(-2)}${(now.getMonth() + 1)
            .toString()
            .padStart(2, "0")}${now.getDate().toString().padStart(2, "0")}`;
        const orderNumber = `${aggregatorOrder.platform.toUpperCase().slice(0, 3)}-${datePrefix}-${aggregatorOrder.aggregatorOrderNumber}`;

        // Get next token number (6 AM reset logic)
        const today6AM = new Date();
        today6AM.setHours(6, 0, 0, 0);
        if (now < today6AM) {
            today6AM.setDate(today6AM.getDate() - 1);
        }

        const todayOrders = await ctx.db
            .query("orders")
            .withIndex("by_store", (q) => q.eq("storeId", aggregatorOrder.storeId))
            .filter((q) => q.gte(q.field("createdAt"), today6AM.getTime()))
            .collect();

        const tokenNumber = todayOrders.length + 1;

        // Create POS order
        const posOrderId = await ctx.db.insert("orders", {
            storeId: aggregatorOrder.storeId,
            tableId: undefined,
            diningSectionId: undefined,
            diningSectionName: undefined,
            orderNumber,
            kotNumber: undefined,
            tokenNumber,
            type: orderType as "delivery_swiggy" | "delivery_zomato" | "delivery_rapido" | "delivery_direct",
            status: "confirmed",
            paymentStatus: "pending",
            paymentMethod: undefined,
            customer: aggregatorOrder.customer,
            aggregator: {
                aggregatorOrderId: aggregatorOrder.aggregatorOrderId,
                platform: aggregatorOrder.platform,
                deliveryPartnerName: undefined,
                deliveryPartnerPhone: undefined,
            },
            subtotal: aggregatorOrder.subtotal,
            tax: aggregatorOrder.tax || 0,
            discount: aggregatorOrder.discount,
            total: aggregatorOrder.total,
            isPrinted: false,
            isScheduled: false,
            scheduledFor: undefined,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });

        // Create order items
        for (const item of aggregatorOrder.items) {
            if (!item.posItemId) continue;

            const menuItem = await ctx.db.get(item.posItemId);
            if (!menuItem) continue;

            let variationName = undefined;
            let variationPrice = undefined;

            if (item.posVariationId) {
                const variation = await ctx.db.get(item.posVariationId);
                if (variation) {
                    variationName = variation.name;
                    variationPrice = variation.price;
                }
            }

            // Use aggregator price or fall back to area-wise pricing
            let itemPrice = item.price;
            if (aggregatorOrder.platform === "swiggy" && menuItem.areaWisePricing?.swiggy) {
                itemPrice = menuItem.areaWisePricing.swiggy;
            } else if (aggregatorOrder.platform === "zomato" && menuItem.areaWisePricing?.zomato) {
                itemPrice = menuItem.areaWisePricing.zomato;
            }

            await ctx.db.insert("orderItems", {
                orderId: posOrderId,
                menuItemId: item.posItemId,
                name: menuItem.name,
                price: itemPrice,
                quantity: item.quantity,
                notes: undefined,
                status: "pending",
                variationId: item.posVariationId,
                variationName,
                variationPrice,
                addons: undefined,
                itemTotal: itemPrice * item.quantity,
            });
        }

        // Update aggregator order status
        await ctx.db.patch(args.orderId, {
            status: "mapped_to_pos",
            posOrderId,
            acceptedAt: Date.now(),
        });

        return { posOrderId, orderNumber, tokenNumber };
    },
});

// Reject an order
export const rejectOrder = mutation({
    args: {
        orderId: v.id("aggregatorOrders"),
        reason: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const order = await ctx.db.get(args.orderId);
        if (!order) {
            throw new Error("Order not found");
        }

        if (order.status !== "pending") {
            throw new Error("Order is not in pending status");
        }

        await ctx.db.patch(args.orderId, {
            status: "rejected",
            errorMessage: args.reason || "Order rejected by user",
        });

        return { success: true };
    },
});

// Retry a failed order
export const retryOrder = mutation({
    args: { orderId: v.id("aggregatorOrders") },
    handler: async (ctx, args) => {
        const order = await ctx.db.get(args.orderId);
        if (!order) {
            throw new Error("Order not found");
        }

        if (order.status !== "failed") {
            throw new Error("Order is not in failed status");
        }

        // Reset to pending status
        await ctx.db.patch(args.orderId, {
            status: "pending",
            errorMessage: undefined,
        });

        return { success: true };
    },
});

// Update item mapping in an order (manual mapping)
export const updateOrderItemMapping = mutation({
    args: {
        orderId: v.id("aggregatorOrders"),
        itemIndex: v.number(),
        posItemId: v.id("menuItems"),
        posVariationId: v.optional(v.id("itemVariations")),
    },
    handler: async (ctx, args) => {
        const order = await ctx.db.get(args.orderId);
        if (!order) {
            throw new Error("Order not found");
        }

        if (args.itemIndex < 0 || args.itemIndex >= order.items.length) {
            throw new Error("Invalid item index");
        }

        const updatedItems = [...order.items];
        updatedItems[args.itemIndex] = {
            ...updatedItems[args.itemIndex],
            posItemId: args.posItemId,
            posVariationId: args.posVariationId,
            mappingStatus: "manual",
        };

        await ctx.db.patch(args.orderId, { items: updatedItems });

        return { success: true };
    },
});
