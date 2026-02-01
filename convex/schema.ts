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
    v.literal("active"),
    v.literal("past_due"),
    v.literal("cancelled")
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
    v.literal("delivery_direct")
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
            currentPeriodEnd: v.optional(v.number()), // Timestamp
            stripeCustomerId: v.optional(v.string()),
            features: v.optional(v.array(v.string())), // Feature overrides
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
        areaWisePricing: v.optional(v.object({
            homeWebsite: v.optional(v.number()),
            parcel: v.optional(v.number()),
            swiggy: v.optional(v.number()),
            zomato: v.optional(v.number()),
        })),
        onlineAvailability: v.optional(v.object({
            swiggy: v.boolean(),
            zomato: v.boolean(),
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
});
