import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get all dining sections for a store
export const getByStore = query({
    args: { storeId: v.id("stores") },
    handler: async (ctx, args) => {
        const sections = await ctx.db
            .query("diningSections")
            .withIndex("by_store", (q) => q.eq("storeId", args.storeId))
            .collect();

        return sections.sort((a, b) => a.sortOrder - b.sortOrder);
    },
});

// Get active dining sections for a store
export const getActiveByStore = query({
    args: { storeId: v.id("stores") },
    handler: async (ctx, args) => {
        const sections = await ctx.db
            .query("diningSections")
            .withIndex("by_store", (q) => q.eq("storeId", args.storeId))
            .collect();

        return sections
            .filter(s => s.isActive)
            .sort((a, b) => a.sortOrder - b.sortOrder);
    },
});

// Create a new dining section
export const create = mutation({
    args: {
        storeId: v.id("stores"),
        name: v.string(),
        description: v.optional(v.string()),
        sortOrder: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        // Get current max sort order
        const existingSections = await ctx.db
            .query("diningSections")
            .withIndex("by_store", (q) => q.eq("storeId", args.storeId))
            .collect();

        const maxSortOrder = existingSections.length > 0
            ? Math.max(...existingSections.map(s => s.sortOrder))
            : -1;

        const sectionId = await ctx.db.insert("diningSections", {
            storeId: args.storeId,
            name: args.name,
            description: args.description,
            sortOrder: args.sortOrder ?? maxSortOrder + 1,
            isActive: true,
        });

        return sectionId;
    },
});

// Update a dining section
export const update = mutation({
    args: {
        sectionId: v.id("diningSections"),
        name: v.optional(v.string()),
        description: v.optional(v.string()),
        sortOrder: v.optional(v.number()),
        isActive: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const { sectionId, ...updates } = args;

        const updateData: Record<string, any> = {};
        if (updates.name !== undefined) updateData.name = updates.name;
        if (updates.description !== undefined) updateData.description = updates.description;
        if (updates.sortOrder !== undefined) updateData.sortOrder = updates.sortOrder;
        if (updates.isActive !== undefined) updateData.isActive = updates.isActive;

        await ctx.db.patch(sectionId, updateData);
    },
});

// Delete a dining section
export const remove = mutation({
    args: { sectionId: v.id("diningSections") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.sectionId);
    },
});

// Initialize default dining sections for a store
export const initializeDefaults = mutation({
    args: { storeId: v.id("stores") },
    handler: async (ctx, args) => {
        // Check if store already has sections
        const existingSections = await ctx.db
            .query("diningSections")
            .withIndex("by_store", (q) => q.eq("storeId", args.storeId))
            .collect();

        if (existingSections.length > 0) {
            return { message: "Sections already exist", count: existingSections.length };
        }

        // Default sections
        const defaultSections = [
            { name: "Dine In", description: "Regular dine-in seating", sortOrder: 0 },
            { name: "AC", description: "Air conditioned section", sortOrder: 1 },
            { name: "Non AC", description: "Non air conditioned section", sortOrder: 2 },
            { name: "Roof Top", description: "Rooftop seating area", sortOrder: 3 },
            { name: "Outdoor", description: "Outdoor/garden seating", sortOrder: 4 },
        ];

        for (const section of defaultSections) {
            await ctx.db.insert("diningSections", {
                storeId: args.storeId,
                name: section.name,
                description: section.description,
                sortOrder: section.sortOrder,
                isActive: true,
            });
        }

        return { message: "Default sections created", count: defaultSections.length };
    },
});
