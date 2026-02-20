import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Enums as string validators
const userRoleValidator = v.union(
    v.literal("super_admin"),
    v.literal("owner"),
    v.literal("manager"),
    v.literal("billing"),
    v.literal("waiter"),
    v.literal("chef")
);

const subscriptionStatusValidator = v.union(
    v.literal("trialing"),
    v.literal("active"),
    v.literal("past_due"),
    v.literal("cancelled"),
    v.literal("expired")
);

const tableStatusValidator = v.union(
    v.literal("available"),
    v.literal("occupied"),
    v.literal("reserved")
);

const itemTypeValidator = v.union(
    v.literal("veg"),
    v.literal("non_veg"),
    v.literal("egg")
);

const orderTypeValidator = v.union(
    v.literal("dine_in"),
    v.literal("takeaway"),
    v.literal("delivery_swiggy"),
    v.literal("delivery_zomato"),
    v.literal("delivery_rapido"),
    v.literal("delivery_direct")
);

// Aggregator platform validator
const aggregatorPlatformValidator = v.union(
    v.literal("swiggy"),
    v.literal("zomato"),
    v.literal("rapido")
);

// Aggregator status validator
const aggregatorStatusValidator = v.union(
    v.literal("active"),
    v.literal("inactive"),
    v.literal("error")
);

// Aggregator order status validator
const aggregatorOrderStatusValidator = v.union(
    v.literal("pending"),
    v.literal("accepted"),
    v.literal("rejected"),
    v.literal("mapped_to_pos"),
    v.literal("failed")
);

// Aggregator item mapping type validator
const aggregatorMappingTypeValidator = v.union(
    v.literal("item"),
    v.literal("variation")
);

// Aggregator item mapping status validator
const aggregatorItemMappingStatusValidator = v.union(
    v.literal("mapped"),
    v.literal("unmapped"),
    v.literal("manual")
);

const orderStatusValidator = v.union(
    v.literal("pending"),
    v.literal("confirmed"),
    v.literal("cooking"),
    v.literal("ready"),
    v.literal("served"),
    v.literal("completed"),
    v.literal("cancelled")
);

const paymentStatusValidator = v.union(
    v.literal("pending"),
    v.literal("paid"),
    v.literal("refunded")
);

const paymentMethodValidator = v.union(
    v.literal("cash"),
    v.literal("card"),
    v.literal("upi"),
    v.literal("online")
);

const orderItemStatusValidator = v.union(
    v.literal("pending"),
    v.literal("cooking"),
    v.literal("ready")
);

const reservationStatusValidator = v.union(
    v.literal("pending"),
    v.literal("confirmed"),
    v.literal("seated"),
    v.literal("cancelled")
);

const inventoryUnitValidator = v.union(
    v.literal("kg"),
    v.literal("ltr"),
    v.literal("pcs")
);

export default defineSchema({
    // 1. Users (Global Authentication)
    users: defineTable({
        email: v.string(),
        name: v.string(),
        role: userRoleValidator,
        orgId: v.optional(v.id("organizations")),
        storeIds: v.optional(v.array(v.id("stores"))),
        passwordHash: v.optional(v.string()), // For basic auth
        pin: v.optional(v.string()), // 4-digit PIN for quick POS/Desktop login
    }).index("by_email", ["email"]),

    // 1a. Crew Members (Store-specific personnel)
    crew: defineTable({
        storeId: v.id("stores"),
        name: v.string(),
        username: v.string(),
        role: v.union(v.literal("billing"), v.literal("waiter"), v.literal("chef")),
        pin: v.string(), // 4-digit PIN
        passwordHash: v.optional(v.string()), // Optional password for some roles
        isActive: v.boolean(),
        lastLogin: v.optional(v.number()),
    })
        .index("by_store", ["storeId"])
        .index("by_username_store", ["username", "storeId"])
        .index("by_pin_store", ["pin", "storeId"]),

    // 2. Organizations (Tenants & Subscriptions)
    organizations: defineTable({
        name: v.string(),
        ownerId: v.id("users"),
        subscription: v.object({
            planId: v.id("subscriptionPlans"),
            status: subscriptionStatusValidator,
            currentPeriodStart: v.optional(v.number()),
            currentPeriodEnd: v.optional(v.number()),
            trialEndsAt: v.optional(v.number()),
            stripeCustomerId: v.optional(v.string()),
            razorpayCustomerId: v.optional(v.string()),
            razorpaySubscriptionId: v.optional(v.string()),
            features: v.optional(v.array(v.string())),
        }),
    }).index("by_owner", ["ownerId"]),

    // 2a. Subscription Plans (SaaS Config)
    subscriptionPlans: defineTable({
        name: v.string(), // 'Basic', 'Pro'
        priceMonthly: v.number(),
        priceYearly: v.number(),
        limits: v.object({
            maxStores: v.number(),
            maxOrdersPerMonth: v.number(),
            maxStaff: v.number(),
        }),
        features: v.array(v.string()), // ['ai_insights', 'inventory', 'loyalty']
    }),

    // 2b. Subscription Unlock Codes (Admin-generated temporary extensions)
    subscriptionUnlockCodes: defineTable({
        code: v.string(),
        orgId: v.optional(v.id("organizations")),
        createdBy: v.string(),
        extensionDays: v.number(),
        isUsed: v.boolean(),
        usedBy: v.optional(v.id("organizations")),
        usedAt: v.optional(v.number()),
        expiresAt: v.number(),
        createdAt: v.number(),
    })
        .index("by_code", ["code"])
        .index("by_org", ["orgId"]),

    // 2c. Subscription Payments (Payment history / invoices)
    subscriptionPayments: defineTable({
        orgId: v.id("organizations"),
        razorpayOrderId: v.string(),
        razorpayPaymentId: v.optional(v.string()),
        amount: v.number(),
        currency: v.string(),
        planType: v.union(v.literal("monthly"), v.literal("yearly")),
        status: v.union(
            v.literal("created"),
            v.literal("captured"),
            v.literal("failed"),
            v.literal("refunded")
        ),
        periodStart: v.optional(v.number()),
        periodEnd: v.optional(v.number()),
        receipt: v.optional(v.string()),
        razorpaySignature: v.optional(v.string()),
        failureReason: v.optional(v.string()),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index("by_org", ["orgId"])
        .index("by_razorpay_order", ["razorpayOrderId"]),

    // 3. Stores (Physical Locations)
    stores: defineTable({
        orgId: v.id("organizations"),
        name: v.string(),
        storeCode: v.string(), // Unique identifier for login
        address: v.optional(v.string()),
        gstNumber: v.optional(v.string()),
        settings: v.optional(
            v.object({
                taxRate: v.optional(v.number()),
                currency: v.optional(v.string()),
                printSettings: v.optional(v.any()),
            })
        ),
        integrations: v.optional(
            v.object({
                swiggyId: v.optional(v.string()),
                zomatoId: v.optional(v.string()),
                rapidoId: v.optional(v.string()),
            })
        ),
    })
        .index("by_org", ["orgId"])
        .index("by_store_code", ["storeCode"]),

    // 4. Tables (Dining Areas)
    tables: defineTable({
        storeId: v.id("stores"),
        name: v.string(),
        capacity: v.number(),
        qrCode: v.optional(v.string()),
        status: tableStatusValidator,
        currentOrderId: v.optional(v.id("orders")),
    }).index("by_store", ["storeId"]),

    // 4a. Dining Sections (Sub Order Types for Dine-In)
    diningSections: defineTable({
        storeId: v.id("stores"),
        name: v.string(),
        description: v.optional(v.string()),
        sortOrder: v.number(),
        isActive: v.boolean(),
    }).index("by_store", ["storeId"]),

    // 4b. Counters (Kitchen Stations)
    counters: defineTable({
        storeId: v.id("stores"),
        name: v.string(),
        printerId: v.optional(v.string()),
        sortOrder: v.number(),
        isActive: v.boolean(),
    }).index("by_store", ["storeId"]),

    // 5. Menu Categories
    menuCategories: defineTable({
        storeId: v.id("stores"),
        name: v.string(),
        sortOrder: v.number(),
        isAvailable: v.optional(v.boolean()),
    }).index("by_store", ["storeId"]),

    // 6. Menu Items
    menuItems: defineTable({
        storeId: v.id("stores"),
        categoryId: v.id("menuCategories"),
        name: v.string(),
        shortCode: v.optional(v.string()),
        shortCode2: v.optional(v.string()),
        description: v.optional(v.string()),
        price: v.number(),
        type: itemTypeValidator,
        isAvailable: v.optional(v.boolean()),
        orderTypes: v.optional(v.array(v.string())),
        hsnCode: v.optional(v.string()),
        unit: v.optional(v.string()),
        ignoreTax: v.optional(v.boolean()),
        ignoreDiscount: v.optional(v.boolean()),
        counterId: v.optional(v.id("counters")),
        areaWisePricing: v.optional(v.object({
            homeWebsite: v.optional(v.number()),
            parcel: v.optional(v.number()),
            swiggy: v.optional(v.number()),
            zomato: v.optional(v.number()),
            rapido: v.optional(v.number()),
        })),
        onlineAvailability: v.optional(v.object({
            swiggy: v.boolean(),
            zomato: v.boolean(),
            rapido: v.optional(v.boolean()),
        })),
        imageUrl: v.optional(v.string()),
        hasVariations: v.optional(v.boolean()),
        hasAddons: v.optional(v.boolean()),
    })
        .index("by_store", ["storeId"])
        .index("by_category", ["categoryId"])
        .index("by_short_code", ["storeId", "shortCode"]),

    // 6a. Item Variations
    itemVariations: defineTable({
        menuItemId: v.id("menuItems"),
        name: v.string(),
        price: v.number(),
        sortOrder: v.number(),
        isActive: v.boolean(),
    }).index("by_menu_item", ["menuItemId"]),

    // 6b. Addon Categories
    addonCategories: defineTable({
        storeId: v.id("stores"),
        name: v.string(),
        selectionType: v.union(v.literal("single"), v.literal("multiple")),
        minSelection: v.number(),
        maxSelection: v.number(),
        sortOrder: v.number(),
        isActive: v.boolean(),
    }).index("by_store", ["storeId"]),

    // 6c. Addon Items
    addonItems: defineTable({
        categoryId: v.id("addonCategories"),
        name: v.string(),
        price: v.number(),
        sortOrder: v.number(),
        isActive: v.boolean(),
    }).index("by_category", ["categoryId"]),

    // 6d. Menu Item Addon Mapping
    menuItemAddons: defineTable({
        menuItemId: v.id("menuItems"),
        addonCategoryId: v.id("addonCategories"),
        isRequired: v.boolean(),
        sortOrder: v.number(),
    })
        .index("by_menu_item", ["menuItemId"])
        .index("by_addon_category", ["addonCategoryId"]),

    // 7. Orders (Core Transaction)
    orders: defineTable({
        storeId: v.id("stores"),
        tableId: v.optional(v.id("tables")),
        diningSectionId: v.optional(v.id("diningSections")),
        diningSectionName: v.optional(v.string()),
        orderNumber: v.string(),
        kotNumber: v.optional(v.string()),
        tokenNumber: v.optional(v.number()),
        type: orderTypeValidator,
        status: orderStatusValidator,
        paymentStatus: paymentStatusValidator,
        paymentMethod: v.optional(paymentMethodValidator),
        customer: v.optional(
            v.object({
                name: v.optional(v.string()),
                phone: v.optional(v.string()),
                address: v.optional(v.string()),
            })
        ),
        aggregator: v.optional(
            v.object({
                aggregatorOrderId: v.optional(v.string()),
                platform: v.optional(v.string()),
                deliveryPartnerName: v.optional(v.string()),
                deliveryPartnerPhone: v.optional(v.string()),
            })
        ),
        subtotal: v.number(),
        tax: v.number(),
        discount: v.optional(v.number()),
        total: v.number(),
        isPrinted: v.optional(v.boolean()),
        isScheduled: v.optional(v.boolean()),
        scheduledFor: v.optional(v.number()),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index("by_store", ["storeId"])
        .index("by_store_status", ["storeId", "status"])
        .index("by_table", ["tableId"]),

    // 8. Order Items
    orderItems: defineTable({
        orderId: v.id("orders"),
        menuItemId: v.id("menuItems"),
        name: v.string(),
        price: v.number(),
        quantity: v.number(),
        notes: v.optional(v.string()),
        status: orderItemStatusValidator,
        variationId: v.optional(v.id("itemVariations")),
        variationName: v.optional(v.string()),
        variationPrice: v.optional(v.number()),
        addons: v.optional(v.array(v.object({
            addonId: v.id("addonItems"),
            name: v.string(),
            price: v.number(),
            quantity: v.number(),
        }))),
        itemTotal: v.optional(v.number()),
    }).index("by_order", ["orderId"]),

    // 9. Inventory
    inventory: defineTable({
        storeId: v.id("stores"),
        name: v.string(),
        unit: inventoryUnitValidator,
        quantity: v.number(),
        lowStockThreshold: v.number(),
        costPrice: v.number(),
    }).index("by_store", ["storeId"]),

    // 10. Recipes (Inventory Linking)
    recipes: defineTable({
        menuItemId: v.id("menuItems"),
        ingredients: v.array(
            v.object({
                inventoryId: v.id("inventory"),
                quantityRequired: v.number(),
            })
        ),
    }).index("by_menu_item", ["menuItemId"]),

    // 11. Reservations
    reservations: defineTable({
        storeId: v.id("stores"),
        customerName: v.string(),
        customerPhone: v.string(),
        tableId: v.optional(v.id("tables")),
        partySize: v.number(),
        reservationTime: v.number(), // Timestamp
        status: reservationStatusValidator,
    })
        .index("by_store", ["storeId"])
        .index("by_store_time", ["storeId", "reservationTime"]),

    // 12. Customers (Loyalty)
    customers: defineTable({
        phone: v.string(),
        name: v.optional(v.string()),
        points: v.number(),
        visits: v.number(),
    }).index("by_phone", ["phone"]),

    // 12a. Loyalty Rewards
    loyaltyRewards: defineTable({
        storeId: v.id("stores"),
        pointsRequired: v.number(),
        rewardDescription: v.string(),
    }).index("by_store", ["storeId"]),

    // 13. Mapping Codes (Device Sync)
    mappingCodes: defineTable({
        code: v.string(),
        status: v.union(v.literal("pending"), v.literal("linked"), v.literal("rejected")),
        storeId: v.optional(v.id("stores")),
        deviceName: v.optional(v.string()),
        deviceType: v.optional(v.string()), // "pos", "kds", "waiter"
        generatedAt: v.number(),
        linkedAt: v.optional(v.number()),
    }).index("by_code", ["code"])
        .index("by_store", ["storeId"]),

    // ============================================
    // AGGREGATOR INTEGRATION TABLES
    // ============================================

    // 14. Aggregators (Platform Configuration per Store)
    aggregators: defineTable({
        storeId: v.id("stores"),
        platform: aggregatorPlatformValidator,
        isEnabled: v.boolean(),
        credentials: v.object({
            apiKey: v.optional(v.string()),
            apiSecret: v.optional(v.string()),
            restaurantId: v.optional(v.string()),
            webhookSecret: v.optional(v.string()),
        }),
        webhookUrl: v.optional(v.string()),
        status: aggregatorStatusValidator,
        lastSyncAt: v.optional(v.number()),
    })
        .index("by_store", ["storeId"])
        .index("by_store_platform", ["storeId", "platform"]),

    // 15. Aggregator Item Mappings (Menu Item Mappings)
    aggregatorItemMappings: defineTable({
        storeId: v.id("stores"),
        aggregatorId: v.id("aggregators"),
        platform: aggregatorPlatformValidator,
        aggregatorItemId: v.string(),
        aggregatorItemName: v.string(),
        aggregatorCategory: v.optional(v.string()),
        posItemId: v.optional(v.id("menuItems")),
        posVariationId: v.optional(v.id("itemVariations")),
        mappingType: aggregatorMappingTypeValidator,
        isActive: v.boolean(),
    })
        .index("by_store", ["storeId"])
        .index("by_aggregator", ["aggregatorId"])
        .index("by_aggregator_item", ["aggregatorId", "aggregatorItemId"]),

    // 16. Aggregator Category Mappings (Category to Counter Mappings)
    aggregatorCategoryMappings: defineTable({
        storeId: v.id("stores"),
        aggregatorId: v.id("aggregators"),
        platform: aggregatorPlatformValidator,
        aggregatorCategoryId: v.string(),
        aggregatorCategoryName: v.string(),
        counterId: v.optional(v.id("counters")),
        isActive: v.boolean(),
    })
        .index("by_store", ["storeId"])
        .index("by_aggregator", ["aggregatorId"]),

    // 17. Aggregator Orders (Incoming Orders Queue)
    aggregatorOrders: defineTable({
        storeId: v.id("stores"),
        aggregatorId: v.id("aggregators"),
        platform: aggregatorPlatformValidator,
        aggregatorOrderId: v.string(),
        aggregatorOrderNumber: v.string(),
        status: aggregatorOrderStatusValidator,
        posOrderId: v.optional(v.id("orders")),
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
            posItemId: v.optional(v.id("menuItems")),
            posVariationId: v.optional(v.id("itemVariations")),
            mappingStatus: aggregatorItemMappingStatusValidator,
        })),
        subtotal: v.number(),
        tax: v.optional(v.number()),
        deliveryFee: v.optional(v.number()),
        discount: v.optional(v.number()),
        total: v.number(),
        estimatedTime: v.optional(v.number()),
        rawPayload: v.optional(v.string()),
        createdAt: v.number(),
        acceptedAt: v.optional(v.number()),
        errorMessage: v.optional(v.string()),
    })
        .index("by_store", ["storeId"])
        .index("by_store_status", ["storeId", "status"])
        .index("by_aggregator_order", ["aggregatorId", "aggregatorOrderId"]),
});
