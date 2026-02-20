import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Sample menu items for testing
const sampleItems = {
    swiggy: [
        { id: "SWG001", name: "Masala Dosa", category: "South Indian", price: 120 },
        { id: "SWG002", name: "Idli Sambar (2 pcs)", category: "South Indian", price: 80 },
        { id: "SWG003", name: "Filter Coffee", category: "Beverages", price: 40 },
        { id: "SWG004", name: "Pav Bhaji", category: "Chats", price: 100 },
        { id: "SWG005", name: "Paneer Butter Masala", category: "Main Course", price: 220 },
    ],
    zomato: [
        { id: "ZOM001", name: "Butter Chicken", category: "North Indian", price: 280 },
        { id: "ZOM002", name: "Dal Makhani", category: "North Indian", price: 180 },
        { id: "ZOM003", name: "Garlic Naan", category: "Breads", price: 60 },
        { id: "ZOM004", name: "Veg Biryani", category: "Rice", price: 200 },
        { id: "ZOM005", name: "Gulab Jamun (2 pcs)", category: "Desserts", price: 80 },
    ],
    rapido: [
        { id: "RAP001", name: "Chicken Biryani", category: "Biryani", price: 250 },
        { id: "RAP002", name: "Mutton Seekh Kebab", category: "Starters", price: 300 },
        { id: "RAP003", name: "Lassi", category: "Beverages", price: 60 },
        { id: "RAP004", name: "Egg Fried Rice", category: "Rice", price: 150 },
        { id: "RAP005", name: "Chicken 65", category: "Starters", price: 200 },
    ],
};

const sampleCustomers = [
    { name: "Rahul Sharma", phone: "9876543210", address: "123, MG Road, Koramangala, Bangalore - 560034" },
    { name: "Priya Patel", phone: "9988776655", address: "45, HSR Layout, Sector 2, Bangalore - 560102" },
    { name: "Amit Kumar", phone: "8877665544", address: "78, Indiranagar, 12th Main, Bangalore - 560038" },
    { name: "Sneha Reddy", phone: "7766554433", address: "32, Whitefield, EPIP Zone, Bangalore - 560066" },
    { name: "Vikram Singh", phone: "6655443322", address: "91, JP Nagar, 6th Phase, Bangalore - 560078" },
];

function generateOrderId(platform: string): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const prefix = platform.substring(0, 3).toUpperCase();
    return `${prefix}${timestamp}${random}`;
}

function generateOrderNumber(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

function pickRandom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

function pickRandomItems(platform: "swiggy" | "zomato" | "rapido") {
    const itemCount = Math.floor(Math.random() * 4) + 1;
    const selectedItems = [];
    const availableItems = [...sampleItems[platform]];

    for (let i = 0; i < itemCount && availableItems.length > 0; i++) {
        const index = Math.floor(Math.random() * availableItems.length);
        const item = availableItems.splice(index, 1)[0];
        selectedItems.push({
            aggregatorItemId: item.id,
            name: item.name,
            quantity: Math.floor(Math.random() * 3) + 1,
            price: item.price,
        });
    }

    return selectedItems;
}

function calculateTotals(items: { price: number; quantity: number }[], deliveryFee: number) {
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const tax = Math.round(subtotal * 0.05);
    const discount = Math.random() > 0.7 ? Math.round(subtotal * 0.1) : 0;
    const total = subtotal + tax + deliveryFee - discount;
    return { subtotal, tax, deliveryFee, discount, total };
}

// Simulate a Swiggy order
export const simulateSwiggyOrder = mutation({
    args: {
        storeId: v.id("stores"),
        aggregatorId: v.id("aggregators"),
    },
    handler: async (ctx, args) => {
        const aggregator = await ctx.db.get(args.aggregatorId);
        if (!aggregator || aggregator.platform !== "swiggy") {
            throw new Error("Invalid Swiggy aggregator");
        }

        const customer = pickRandom(sampleCustomers);
        const selectedItems = pickRandomItems("swiggy");
        const totals = calculateTotals(selectedItems, 30);

        const orderId = await ctx.db.insert("aggregatorOrders", {
            storeId: args.storeId,
            aggregatorId: args.aggregatorId,
            platform: "swiggy",
            aggregatorOrderId: generateOrderId("swiggy"),
            aggregatorOrderNumber: generateOrderNumber(),
            status: "pending",
            posOrderId: undefined,
            customer: {
                name: customer.name,
                phone: customer.phone,
                address: customer.address,
            },
            items: selectedItems.map((item) => ({
                ...item,
                posItemId: undefined,
                posVariationId: undefined,
                mappingStatus: "unmapped" as const,
            })),
            ...totals,
            estimatedTime: 30 + Math.floor(Math.random() * 15),
            rawPayload: JSON.stringify({ simulated: true, platform: "swiggy" }),
            createdAt: Date.now(),
            acceptedAt: undefined,
            errorMessage: undefined,
        });

        return { orderId, platform: "swiggy" };
    },
});

// Simulate a Zomato order
export const simulateZomatoOrder = mutation({
    args: {
        storeId: v.id("stores"),
        aggregatorId: v.id("aggregators"),
    },
    handler: async (ctx, args) => {
        const aggregator = await ctx.db.get(args.aggregatorId);
        if (!aggregator || aggregator.platform !== "zomato") {
            throw new Error("Invalid Zomato aggregator");
        }

        const customer = pickRandom(sampleCustomers);
        const selectedItems = pickRandomItems("zomato");
        const totals = calculateTotals(selectedItems, 25);

        const orderId = await ctx.db.insert("aggregatorOrders", {
            storeId: args.storeId,
            aggregatorId: args.aggregatorId,
            platform: "zomato",
            aggregatorOrderId: generateOrderId("zomato"),
            aggregatorOrderNumber: generateOrderNumber(),
            status: "pending",
            posOrderId: undefined,
            customer: {
                name: customer.name,
                phone: customer.phone,
                address: customer.address,
            },
            items: selectedItems.map((item) => ({
                ...item,
                posItemId: undefined,
                posVariationId: undefined,
                mappingStatus: "unmapped" as const,
            })),
            ...totals,
            estimatedTime: 25 + Math.floor(Math.random() * 20),
            rawPayload: JSON.stringify({ simulated: true, platform: "zomato" }),
            createdAt: Date.now(),
            acceptedAt: undefined,
            errorMessage: undefined,
        });

        return { orderId, platform: "zomato" };
    },
});

// Simulate a Rapido order
export const simulateRapidoOrder = mutation({
    args: {
        storeId: v.id("stores"),
        aggregatorId: v.id("aggregators"),
    },
    handler: async (ctx, args) => {
        const aggregator = await ctx.db.get(args.aggregatorId);
        if (!aggregator || aggregator.platform !== "rapido") {
            throw new Error("Invalid Rapido aggregator");
        }

        const customer = pickRandom(sampleCustomers);
        const selectedItems = pickRandomItems("rapido");
        const totals = calculateTotals(selectedItems, 35);

        const orderId = await ctx.db.insert("aggregatorOrders", {
            storeId: args.storeId,
            aggregatorId: args.aggregatorId,
            platform: "rapido",
            aggregatorOrderId: generateOrderId("rapido"),
            aggregatorOrderNumber: generateOrderNumber(),
            status: "pending",
            posOrderId: undefined,
            customer: {
                name: customer.name,
                phone: customer.phone,
                address: customer.address,
            },
            items: selectedItems.map((item) => ({
                ...item,
                posItemId: undefined,
                posVariationId: undefined,
                mappingStatus: "unmapped" as const,
            })),
            ...totals,
            estimatedTime: 20 + Math.floor(Math.random() * 25),
            rawPayload: JSON.stringify({ simulated: true, platform: "rapido" }),
            createdAt: Date.now(),
            acceptedAt: undefined,
            errorMessage: undefined,
        });

        return { orderId, platform: "rapido" };
    },
});

// Get sample items for a platform
export const getSampleItems = query({
    args: {
        platform: v.union(v.literal("swiggy"), v.literal("zomato"), v.literal("rapido")),
    },
    handler: async (_, args) => {
        return sampleItems[args.platform];
    },
});

// Import sample items as aggregator item mappings (for testing)
export const importSampleItems = mutation({
    args: {
        storeId: v.id("stores"),
        aggregatorId: v.id("aggregators"),
        platform: v.union(v.literal("swiggy"), v.literal("zomato"), v.literal("rapido")),
    },
    handler: async (ctx, args) => {
        const items = sampleItems[args.platform];
        let created = 0;

        for (const item of items) {
            const existing = await ctx.db
                .query("aggregatorItemMappings")
                .withIndex("by_aggregator_item", (q) =>
                    q.eq("aggregatorId", args.aggregatorId).eq("aggregatorItemId", item.id)
                )
                .first();

            if (!existing) {
                await ctx.db.insert("aggregatorItemMappings", {
                    storeId: args.storeId,
                    aggregatorId: args.aggregatorId,
                    platform: args.platform,
                    aggregatorItemId: item.id,
                    aggregatorItemName: item.name,
                    aggregatorCategory: item.category,
                    posItemId: undefined,
                    posVariationId: undefined,
                    mappingType: "item",
                    isActive: true,
                });
                created++;
            }
        }

        return { created, total: items.length };
    },
});

// Import sample categories as aggregator category mappings (for testing)
export const importSampleCategories = mutation({
    args: {
        storeId: v.id("stores"),
        aggregatorId: v.id("aggregators"),
        platform: v.union(v.literal("swiggy"), v.literal("zomato"), v.literal("rapido")),
    },
    handler: async (ctx, args) => {
        const items = sampleItems[args.platform];
        const categories = [...new Set(items.map((item) => item.category))];
        let created = 0;

        for (const categoryName of categories) {
            const categoryId = `${args.platform.toUpperCase()}_CAT_${categoryName.replace(/\s+/g, "_").toUpperCase()}`;

            const existing = await ctx.db
                .query("aggregatorCategoryMappings")
                .withIndex("by_aggregator", (q) => q.eq("aggregatorId", args.aggregatorId))
                .filter((q) => q.eq(q.field("aggregatorCategoryId"), categoryId))
                .first();

            if (!existing) {
                await ctx.db.insert("aggregatorCategoryMappings", {
                    storeId: args.storeId,
                    aggregatorId: args.aggregatorId,
                    platform: args.platform,
                    aggregatorCategoryId: categoryId,
                    aggregatorCategoryName: categoryName,
                    counterId: undefined,
                    isActive: true,
                });
                created++;
            }
        }

        return { created, total: categories.length };
    },
});
