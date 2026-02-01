import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

// Seed function to create sample data
export const seed = mutation({
    args: {},
    handler: async (ctx) => {
        // Check if we already have data
        const existingOrg = await ctx.db.query("organizations").first();
        if (existingOrg) {
            // Ensure demo user has correct password
            const demoUser = await ctx.db.query("users").filter(q => q.eq(q.field("email"), "demo@pinpos.app")).first();
            if (demoUser) {
                await ctx.db.patch(demoUser._id, { passwordHash: "password123" });
                return { message: "Data exists. Demo user password reset to 'password123'", orgId: existingOrg._id };
            }
            return { message: "Data already exists", orgId: existingOrg._id };
        }

        // Create subscription plan
        const planId = await ctx.db.insert("subscriptionPlans", {
            name: "Basic",
            priceMonthly: 999,
            priceYearly: 9999,
            limits: {
                maxStores: 1,
                maxOrdersPerMonth: 1000,
                maxStaff: 5,
            },
            features: ["core_pos", "basic_reports"],
        });

        // Create a demo user first (we'll link org later)
        const userId = await ctx.db.insert("users", {
            email: "demo@pinpos.app",
            name: "Demo Owner",
            role: "owner",
            passwordHash: "password123", // MVP plaintext
        });

        // Create organization
        const orgId = await ctx.db.insert("organizations", {
            name: "Demo Restaurant",
            ownerId: userId,
            subscription: {
                planId: planId,
                status: "active",
            },
        });

        // Update user with org
        await ctx.db.patch(userId, { orgId: orgId });

        // Create store
        const storeId = await ctx.db.insert("stores", {
            orgId: orgId,
            name: "Main Branch",
            storeCode: "DEMO-001",
            address: "123 Food Street, Bangalore",
            settings: {
                taxRate: 5,
                currency: "INR",
            },
        });

        // Create tables
        const tableIds = [];
        for (let i = 1; i <= 6; i++) {
            const tableId = await ctx.db.insert("tables", {
                storeId: storeId,
                name: `Table ${i}`,
                capacity: i <= 2 ? 2 : i <= 4 ? 4 : 6,
                status: "available",
            });
            tableIds.push(tableId);
        }

        // Create menu categories
        const startersId = await ctx.db.insert("menuCategories", {
            storeId: storeId,
            name: "Starters",
            sortOrder: 1,
            isAvailable: true,
        });

        const mainCourseId = await ctx.db.insert("menuCategories", {
            storeId: storeId,
            name: "Main Course",
            sortOrder: 2,
            isAvailable: true,
        });

        const beveragesId = await ctx.db.insert("menuCategories", {
            storeId: storeId,
            name: "Beverages",
            sortOrder: 3,
            isAvailable: true,
        });

        // Create menu items
        const menuItems = [
            { categoryId: startersId, name: "Paneer Tikka", price: 250, type: "veg" as const },
            { categoryId: startersId, name: "Chicken 65", price: 280, type: "non_veg" as const },
            { categoryId: startersId, name: "Veg Spring Rolls", price: 180, type: "veg" as const },
            { categoryId: mainCourseId, name: "Butter Chicken", price: 350, type: "non_veg" as const },
            { categoryId: mainCourseId, name: "Paneer Butter Masala", price: 280, type: "veg" as const },
            { categoryId: mainCourseId, name: "Dal Makhani", price: 220, type: "veg" as const },
            { categoryId: mainCourseId, name: "Biryani", price: 320, type: "non_veg" as const },
            { categoryId: beveragesId, name: "Masala Chai", price: 40, type: "veg" as const },
            { categoryId: beveragesId, name: "Fresh Lime Soda", price: 60, type: "veg" as const },
            { categoryId: beveragesId, name: "Lassi", price: 80, type: "veg" as const },
        ];

        const menuItemIds: Record<string, Id<"menuItems">> = {};
        for (const item of menuItems) {
            const id = await ctx.db.insert("menuItems", {
                storeId: storeId,
                categoryId: item.categoryId,
                name: item.name,
                price: item.price,
                type: item.type,
                isAvailable: true,
                onlineAvailability: {
                    swiggy: true,
                    zomato: true,
                },
            });
            menuItemIds[item.name] = id;
        }

        // Create sample orders
        const now = Date.now();
        const orderTypes = ["dine_in", "takeaway", "delivery_swiggy"] as const;
        const statuses = ["pending", "cooking", "ready", "completed"] as const;

        for (let i = 1; i <= 5; i++) {
            const orderId = await ctx.db.insert("orders", {
                storeId: storeId,
                tableId: i <= 2 ? tableIds[i - 1] : undefined,
                orderNumber: `ORD-${String(i).padStart(3, "0")}`,
                type: orderTypes[i % 3],
                status: statuses[i % 4],
                paymentStatus: i === 4 ? "paid" : "pending",
                paymentMethod: i === 4 ? "upi" : undefined,
                subtotal: 500 + i * 100,
                tax: (500 + i * 100) * 0.05,
                total: (500 + i * 100) * 1.05,
                createdAt: now - (5 - i) * 600000, // Stagger by 10 mins
                updatedAt: now - (5 - i) * 600000,
            });

            // Add some items to each order
            await ctx.db.insert("orderItems", {
                orderId: orderId,
                menuItemId: menuItemIds["Paneer Tikka"],
                name: "Paneer Tikka",
                price: 250,
                quantity: 1,
                status: "pending",
            });
        }

        return {
            message: "Seed data created successfully!",
            storeId: storeId,
            orgId: orgId,
        };
    },
});

// Get the first store (for demo purposes)
export const getFirstStore = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db.query("stores").first();
    },
});
