import { mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Intelligent Unified Login
 * 
 * Logic:
 * 1. Desktop Login (Email + Pass/PIN for Owners, Username + PIN for Crew)
 * 2. Web Dashboard Login (Strictly Email + Pass for Owners)
 */
export const login = mutation({
    args: {
        email: v.optional(v.string()),
        username: v.optional(v.string()),
        password: v.optional(v.string()),
        pin: v.optional(v.string()),
        storeId: v.optional(v.id("stores")),
        platform: v.optional(v.union(v.literal("web"), v.literal("desktop"))),
    },
    handler: async (ctx, args) => {
        const isDesktop = args.platform === "desktop";

        // --- 1. OWNER LOGIN (Via Email) ---
        if (args.email) {
            const user = await ctx.db
                .query("users")
                .withIndex("by_email", (q) => q.eq("email", args.email!))
                .first();

            if (user) {
                // Determine validation method
                if (args.password) {
                    if (user.passwordHash !== args.password) throw new Error("Invalid password");
                } else if (isDesktop && args.pin) {
                    // PIN login for Owners is only allowed on Desktop for security
                    if (user.pin !== args.pin) throw new Error("Invalid security PIN");
                } else {
                    throw new Error("Valid credentials required for Owner access");
                }

                return {
                    userId: user._id,
                    name: user.name,
                    role: user.role,
                    orgId: user.orgId,
                    storeId: user.storeIds?.[0], // Fallback to first store
                    type: "owner"
                };
            }
        }

        // --- 2. CREW LOGIN (Only for Desktop/POS via Username + PIN) ---
        if (isDesktop && args.username && args.storeId && args.pin) {
            const crew = await ctx.db
                .query("crew")
                .withIndex("by_username_store", (q) =>
                    q.eq("username", args.username!).eq("storeId", args.storeId!)
                )
                .first();

            if (crew) {
                if (!crew.isActive) throw new Error("This account is currently inactive");

                // Allow login via Password (if set) OR PIN
                const isPasswordValid = args.password && crew.passwordHash === args.password;
                const isPinValid = args.pin && crew.pin === args.pin;

                if (!isPasswordValid && !isPinValid) {
                    throw new Error("Invalid password or security PIN");
                }

                await ctx.db.patch(crew._id, { lastLogin: Date.now() });

                return {
                    userId: crew._id,
                    name: crew.name,
                    role: crew.role,
                    storeId: crew.storeId,
                    type: "crew"
                };
            }
        }

        throw new Error("Authentication failed. Please check your credentials and store selection.");
    },
});
