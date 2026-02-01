import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const getLinkedDevices = query({
    args: { storeId: v.optional(v.id("stores")) },
    handler: async (ctx, args) => {
        if (!args.storeId) return [];

        return await ctx.db
            .query("mappingCodes")
            .withIndex("by_store", (q) => q.eq("storeId", args.storeId))
            .filter((q) => q.eq(q.field("status"), "linked"))
            .collect();
    },
});

export const generateCode = mutation({
    args: {
        deviceName: v.string(),
        deviceType: v.string(),
    },
    handler: async (ctx, args) => {
        // Generate a 6-character uppercase alphanumeric code
        const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed similar looking chars
        let code = "";
        for (let i = 0; i < 6; i++) {
            code += characters.charAt(Math.floor(Math.random() * characters.length));
        }

        const id = await ctx.db.insert("mappingCodes", {
            code: code,
            status: "pending",
            deviceName: args.deviceName,
            deviceType: args.deviceType,
            generatedAt: Date.now(),
        });

        return { code: code, id: id };
    },
});

export const checkStatus = query({
    args: { code: v.string() },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("mappingCodes")
            .withIndex("by_code", (q) => q.eq("code", args.code))
            .first();

        if (!existing) return { status: "not_found" };

        return {
            status: existing.status,
            storeId: existing.storeId,
            deviceName: existing.deviceName,
            id: existing._id,
        };
    },
});

export const verifyCode = mutation({
    args: {
        code: v.string(),
        storeId: v.id("stores")
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("mappingCodes")
            .withIndex("by_code", (q) => q.eq("code", args.code))
            .first();

        if (!existing) {
            throw new Error("Invalid mapping code. Please check the code and try again.");
        }

        if (existing.status === "linked") {
            throw new Error("This code has already been linked to a store.");
        }

        if (existing.status === "rejected") {
            throw new Error("This mapping request was previously rejected.");
        }

        // Update the mapping code to linked status
        await ctx.db.patch(existing._id, {
            status: "linked",
            storeId: args.storeId,
            linkedAt: Date.now(),
        });

        return { success: true };
    },
});

export const removeDevice = mutation({
    args: { id: v.id("mappingCodes") },
    handler: async (ctx, args) => {
        const existing = await ctx.db.get(args.id);
        if (!existing) {
            throw new Error("Device not found");
        }

        // Mark as rejected/unlinked rather than deleting
        await ctx.db.patch(args.id, {
            status: "rejected",
            storeId: undefined,
            linkedAt: undefined,
        });

        return { success: true };
    },
});

export const updateDeviceInfo = mutation({
    args: {
        id: v.id("mappingCodes"),
        systemInfo: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, {
            linkedAt: Date.now(), // Refresh "last seen" or similar
        });
    },
});
