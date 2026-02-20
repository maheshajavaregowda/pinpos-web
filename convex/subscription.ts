import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// ── Helper ──────────────────────────────────────────────────
function generateRandomCode(length: number): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No 0/O/1/I confusion
    let code = "";
    for (let i = 0; i < length; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// ── Queries ─────────────────────────────────────────────────

// Get subscription status for an organization (used by web billing page)
export const getSubscriptionStatus = query({
    args: { orgId: v.id("organizations") },
    handler: async (ctx, args) => {
        const org = await ctx.db.get(args.orgId);
        if (!org) throw new Error("Organization not found");

        const plan = await ctx.db.get(org.subscription.planId);
        const now = Date.now();

        const status = org.subscription.status;
        const trialEndsAt = org.subscription.trialEndsAt;
        const currentPeriodEnd = org.subscription.currentPeriodEnd;

        let effectiveStatus = status;
        let daysRemaining = 0;

        if (status === "trialing" && trialEndsAt) {
            daysRemaining = Math.max(0, Math.ceil((trialEndsAt - now) / (1000 * 60 * 60 * 24)));
            if (daysRemaining <= 0) effectiveStatus = "expired";
        } else if (status === "active" && currentPeriodEnd) {
            daysRemaining = Math.max(0, Math.ceil((currentPeriodEnd - now) / (1000 * 60 * 60 * 24)));
            if (daysRemaining <= 0) effectiveStatus = "expired";
        } else if (status === "cancelled" || status === "expired") {
            effectiveStatus = "expired";
        }

        return {
            status: effectiveStatus,
            planName: plan?.name || "Basic",
            priceMonthly: plan?.priceMonthly || 999,
            priceYearly: plan?.priceYearly || 9999,
            trialEndsAt,
            currentPeriodStart: org.subscription.currentPeriodStart,
            currentPeriodEnd,
            daysRemaining,
            isTrialing: status === "trialing" && daysRemaining > 0,
            isExpired: effectiveStatus === "expired",
            isActive: effectiveStatus === "active" || (status === "trialing" && daysRemaining > 0),
        };
    },
});

// Get subscription status for a store (used by desktop to gate POS access)
export const getSubscriptionForStore = query({
    args: { storeId: v.id("stores") },
    handler: async (ctx, args) => {
        const store = await ctx.db.get(args.storeId);
        if (!store) return { isActive: false, status: "expired" as const, daysRemaining: 0, orgId: undefined };

        const org = await ctx.db.get(store.orgId);
        if (!org) return { isActive: false, status: "expired" as const, daysRemaining: 0, orgId: undefined };

        const now = Date.now();
        const { status, trialEndsAt, currentPeriodEnd } = org.subscription;

        let effectiveStatus = status;
        let daysRemaining = 0;

        if (status === "trialing" && trialEndsAt) {
            daysRemaining = Math.max(0, Math.ceil((trialEndsAt - now) / (1000 * 60 * 60 * 24)));
            if (daysRemaining <= 0) effectiveStatus = "expired";
        } else if (status === "active" && currentPeriodEnd) {
            daysRemaining = Math.max(0, Math.ceil((currentPeriodEnd - now) / (1000 * 60 * 60 * 24)));
            if (daysRemaining <= 0) effectiveStatus = "expired";
        } else if (status === "cancelled" || status === "expired") {
            effectiveStatus = "expired";
        }

        return {
            isActive: effectiveStatus === "active" || (status === "trialing" && daysRemaining > 0),
            status: effectiveStatus,
            daysRemaining,
            orgId: org._id,
        };
    },
});

// Get payment history for billing page
export const getPaymentHistory = query({
    args: { orgId: v.id("organizations") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("subscriptionPayments")
            .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
            .order("desc")
            .collect();
    },
});

// Get org ID for a user (owner)
export const getOrgForUser = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const org = await ctx.db
            .query("organizations")
            .withIndex("by_owner", (q) => q.eq("ownerId", args.userId))
            .first();
        return org?._id;
    },
});

// ── Mutations ───────────────────────────────────────────────

// Apply an unlock code to extend subscription
export const applyUnlockCode = mutation({
    args: {
        orgId: v.id("organizations"),
        code: v.string(),
    },
    handler: async (ctx, args) => {
        const unlockCode = await ctx.db
            .query("subscriptionUnlockCodes")
            .withIndex("by_code", (q) => q.eq("code", args.code.toUpperCase()))
            .first();

        if (!unlockCode) throw new Error("Invalid unlock code");
        if (unlockCode.isUsed) throw new Error("This code has already been used");
        if (unlockCode.expiresAt < Date.now()) throw new Error("This code has expired");
        if (unlockCode.orgId && unlockCode.orgId !== args.orgId) {
            throw new Error("This code is not valid for your organization");
        }

        const org = await ctx.db.get(args.orgId);
        if (!org) throw new Error("Organization not found");

        const now = Date.now();
        const extensionMs = unlockCode.extensionDays * 24 * 60 * 60 * 1000;

        // Extend from current period end or from now, whichever is later
        const baseDate = Math.max(
            org.subscription.currentPeriodEnd || now,
            org.subscription.trialEndsAt || now,
            now
        );
        const newPeriodEnd = baseDate + extensionMs;

        await ctx.db.patch(args.orgId, {
            subscription: {
                ...org.subscription,
                status: "active",
                currentPeriodEnd: newPeriodEnd,
                currentPeriodStart: org.subscription.currentPeriodStart || now,
            },
        });

        // Mark code as used
        await ctx.db.patch(unlockCode._id, {
            isUsed: true,
            usedBy: args.orgId,
            usedAt: now,
        });

        return { success: true, newPeriodEnd, extensionDays: unlockCode.extensionDays };
    },
});

// Record payment as "created" before Razorpay checkout opens
export const recordPaymentCreated = mutation({
    args: {
        orgId: v.id("organizations"),
        razorpayOrderId: v.string(),
        amount: v.number(),
        planType: v.union(v.literal("monthly"), v.literal("yearly")),
    },
    handler: async (ctx, args) => {
        const now = Date.now();
        await ctx.db.insert("subscriptionPayments", {
            orgId: args.orgId,
            razorpayOrderId: args.razorpayOrderId,
            amount: args.amount,
            currency: "INR",
            planType: args.planType,
            status: "created",
            createdAt: now,
            updatedAt: now,
        });
    },
});

// Record successful payment and activate subscription
export const recordPaymentSuccess = mutation({
    args: {
        orgId: v.id("organizations"),
        razorpayOrderId: v.string(),
        razorpayPaymentId: v.string(),
        razorpaySignature: v.string(),
        planType: v.union(v.literal("monthly"), v.literal("yearly")),
        amount: v.number(),
    },
    handler: async (ctx, args) => {
        const org = await ctx.db.get(args.orgId);
        if (!org) throw new Error("Organization not found");

        const now = Date.now();
        const periodDurationMs = args.planType === "monthly"
            ? 30 * 24 * 60 * 60 * 1000
            : 365 * 24 * 60 * 60 * 1000;

        const periodStart = now;
        const periodEnd = now + periodDurationMs;

        // Update organization subscription
        await ctx.db.patch(args.orgId, {
            subscription: {
                ...org.subscription,
                status: "active",
                currentPeriodStart: periodStart,
                currentPeriodEnd: periodEnd,
            },
        });

        // Update existing payment record or create new one
        const existingPayment = await ctx.db
            .query("subscriptionPayments")
            .withIndex("by_razorpay_order", (q) => q.eq("razorpayOrderId", args.razorpayOrderId))
            .first();

        if (existingPayment) {
            await ctx.db.patch(existingPayment._id, {
                razorpayPaymentId: args.razorpayPaymentId,
                razorpaySignature: args.razorpaySignature,
                status: "captured",
                periodStart,
                periodEnd,
                receipt: `PINPOS-${now}`,
                updatedAt: now,
            });
        } else {
            await ctx.db.insert("subscriptionPayments", {
                orgId: args.orgId,
                razorpayOrderId: args.razorpayOrderId,
                razorpayPaymentId: args.razorpayPaymentId,
                amount: args.amount,
                currency: "INR",
                planType: args.planType,
                status: "captured",
                periodStart,
                periodEnd,
                receipt: `PINPOS-${now}`,
                razorpaySignature: args.razorpaySignature,
                createdAt: now,
                updatedAt: now,
            });
        }

        return { success: true, periodEnd };
    },
});

// Generate unlock code (super_admin only)
export const generateUnlockCode = mutation({
    args: {
        orgId: v.optional(v.id("organizations")),
        extensionDays: v.number(),
        createdBy: v.string(),
    },
    handler: async (ctx, args) => {
        const code = generateRandomCode(8);
        const now = Date.now();

        await ctx.db.insert("subscriptionUnlockCodes", {
            code,
            orgId: args.orgId,
            createdBy: args.createdBy,
            extensionDays: args.extensionDays,
            isUsed: false,
            expiresAt: now + 30 * 24 * 60 * 60 * 1000, // 30-day expiry
            createdAt: now,
        });

        return { code };
    },
});

// ── Actions (External HTTP calls) ───────────────────────────

// Create a Razorpay order for subscription payment
export const createRazorpayOrder = action({
    args: {
        orgId: v.id("organizations"),
        planType: v.union(v.literal("monthly"), v.literal("yearly")),
    },
    handler: async (ctx, args) => {
        const amount = args.planType === "monthly" ? 999 * 100 : 9999 * 100; // paise

        const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
        const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

        if (!razorpayKeyId || !razorpayKeySecret) {
            throw new Error("Razorpay credentials not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables.");
        }

        const response = await fetch("https://api.razorpay.com/v1/orders", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Basic " + btoa(`${razorpayKeyId}:${razorpayKeySecret}`),
            },
            body: JSON.stringify({
                amount,
                currency: "INR",
                receipt: `PP-${Date.now()}`,
                notes: {
                    orgId: args.orgId,
                    planType: args.planType,
                },
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Razorpay order creation failed: ${error}`);
        }

        const order = await response.json();

        // Record the order
        await ctx.runMutation(api.subscription.recordPaymentCreated, {
            orgId: args.orgId,
            razorpayOrderId: order.id,
            amount,
            planType: args.planType,
        });

        return {
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            keyId: razorpayKeyId,
        };
    },
});

// Verify Razorpay payment signature and activate subscription
export const verifyRazorpayPayment = action({
    args: {
        orgId: v.id("organizations"),
        razorpayOrderId: v.string(),
        razorpayPaymentId: v.string(),
        razorpaySignature: v.string(),
        planType: v.union(v.literal("monthly"), v.literal("yearly")),
        amount: v.number(),
    },
    handler: async (ctx, args) => {
        const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
        if (!razorpayKeySecret) throw new Error("Razorpay secret not configured");

        // Verify signature using HMAC SHA256 (Web Crypto API)
        const encoder = new TextEncoder();
        const data = `${args.razorpayOrderId}|${args.razorpayPaymentId}`;
        const key = await crypto.subtle.importKey(
            "raw",
            encoder.encode(razorpayKeySecret),
            { name: "HMAC", hash: "SHA-256" },
            false,
            ["sign"]
        );
        const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
        const expectedSignature = Array.from(new Uint8Array(signature))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");

        if (expectedSignature !== args.razorpaySignature) {
            throw new Error("Payment verification failed: Invalid signature");
        }

        // Record successful payment
        await ctx.runMutation(api.subscription.recordPaymentSuccess, {
            orgId: args.orgId,
            razorpayOrderId: args.razorpayOrderId,
            razorpayPaymentId: args.razorpayPaymentId,
            razorpaySignature: args.razorpaySignature,
            planType: args.planType,
            amount: args.amount,
        });

        return { success: true };
    },
});
