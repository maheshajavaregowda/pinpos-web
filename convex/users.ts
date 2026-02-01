import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get user by email
export const getByEmail = query({
    args: { email: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", args.email))
            .first();
    },
});

// Get user by ID
export const get = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.userId);
    },
});

// Create a new user
export const create = mutation({
    args: {
        email: v.string(),
        name: v.string(),
        role: v.string(),
        orgId: v.optional(v.id("organizations")),
        storeIds: v.optional(v.array(v.id("stores"))),
        passwordHash: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // Check if email already exists
        const existing = await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", args.email))
            .first();

        if (existing) {
            throw new Error("Email already exists");
        }

        return await ctx.db.insert("users", {
            email: args.email,
            name: args.name,
            role: args.role as "super_admin" | "owner" | "manager" | "waiter" | "chef",
            orgId: args.orgId,
            storeIds: args.storeIds,
            passwordHash: args.passwordHash,
        });
    },
});

// Update user store access
export const updateStoreAccess = mutation({
    args: {
        userId: v.id("users"),
        storeIds: v.array(v.id("stores")),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.userId, {
            storeIds: args.storeIds,
        });
    },
});

// Get all users for an organization
export const getByOrg = query({
    args: { orgId: v.id("organizations") },
    handler: async (ctx, args) => {
        const users = await ctx.db.query("users").collect();
        return users.filter((user) => user.orgId === args.orgId);
    },
});
