import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

// Helper to validate webhook signature (placeholder - implement based on actual aggregator docs)
function validateWebhookSignature(
    _platform: string,
    _signature: string | null,
    _secret: string | undefined,
    _body: string
): boolean {
    // TODO: Implement actual signature validation based on aggregator documentation
    // For now, return true for development/testing
    return true;
}

// Swiggy Webhook Handler
http.route({
    path: "/webhook/swiggy",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        try {
            const body = await request.text();
            const signature = request.headers.get("x-swiggy-signature");

            // Parse the payload
            let payload;
            try {
                payload = JSON.parse(body);
            } catch {
                return new Response(JSON.stringify({ error: "Invalid JSON payload" }), {
                    status: 400,
                    headers: { "Content-Type": "application/json" },
                });
            }

            // Extract store ID from payload (adjust based on actual Swiggy payload structure)
            const restaurantId = payload.restaurant_id || payload.restaurantId;
            if (!restaurantId) {
                return new Response(JSON.stringify({ error: "Missing restaurant ID" }), {
                    status: 400,
                    headers: { "Content-Type": "application/json" },
                });
            }

            // Find the aggregator configuration
            // Note: In real implementation, you'd query by restaurantId
            // For now, we'll need the storeId from the payload or look it up

            // Transform Swiggy payload to our format
            const orderData = {
                aggregatorOrderId: payload.order_id || payload.orderId,
                aggregatorOrderNumber: payload.order_number || payload.orderNumber || payload.order_id,
                customer: {
                    name: payload.customer?.name || payload.customerName,
                    phone: payload.customer?.phone || payload.customerPhone,
                    address: payload.delivery_address?.full_address || payload.deliveryAddress,
                },
                items: (payload.items || []).map((item: any) => ({
                    aggregatorItemId: item.id || item.item_id,
                    name: item.name || item.item_name,
                    quantity: item.quantity || 1,
                    price: item.price || item.total_price || 0,
                })),
                subtotal: payload.subtotal || payload.item_total || 0,
                tax: payload.tax || payload.taxes?.total || 0,
                deliveryFee: payload.delivery_fee || payload.delivery_charges || 0,
                discount: payload.discount || 0,
                total: payload.total || payload.order_total || 0,
                estimatedTime: payload.estimated_delivery_time || 30,
                rawPayload: body,
            };

            // For webhook processing, we need to find the store
            // This is a simplified version - in production you'd look up the store by restaurantId
            return new Response(
                JSON.stringify({
                    success: true,
                    message: "Webhook received - use testWebhooks for testing",
                    data: orderData,
                }),
                {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                }
            );
        } catch (error) {
            console.error("Swiggy webhook error:", error);
            return new Response(
                JSON.stringify({ error: "Internal server error" }),
                {
                    status: 500,
                    headers: { "Content-Type": "application/json" },
                }
            );
        }
    }),
});

// Zomato Webhook Handler
http.route({
    path: "/webhook/zomato",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        try {
            const body = await request.text();
            const signature = request.headers.get("x-zomato-signature");

            let payload;
            try {
                payload = JSON.parse(body);
            } catch {
                return new Response(JSON.stringify({ error: "Invalid JSON payload" }), {
                    status: 400,
                    headers: { "Content-Type": "application/json" },
                });
            }

            // Transform Zomato payload to our format
            const orderData = {
                aggregatorOrderId: payload.order_id || payload.id,
                aggregatorOrderNumber: payload.order_number || payload.display_id,
                customer: {
                    name: payload.customer?.name,
                    phone: payload.customer?.phone,
                    address: payload.delivery?.address?.full_address,
                },
                items: (payload.items || payload.order_items || []).map((item: any) => ({
                    aggregatorItemId: item.item_id || item.id,
                    name: item.name,
                    quantity: item.quantity || 1,
                    price: item.price || item.total || 0,
                })),
                subtotal: payload.order_subtotal || payload.subtotal || 0,
                tax: payload.tax || 0,
                deliveryFee: payload.delivery_charge || 0,
                discount: payload.discount || 0,
                total: payload.order_total || payload.total || 0,
                estimatedTime: payload.delivery_time || 30,
                rawPayload: body,
            };

            return new Response(
                JSON.stringify({
                    success: true,
                    message: "Webhook received - use testWebhooks for testing",
                    data: orderData,
                }),
                {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                }
            );
        } catch (error) {
            console.error("Zomato webhook error:", error);
            return new Response(
                JSON.stringify({ error: "Internal server error" }),
                {
                    status: 500,
                    headers: { "Content-Type": "application/json" },
                }
            );
        }
    }),
});

// Rapido Webhook Handler
http.route({
    path: "/webhook/rapido",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        try {
            const body = await request.text();
            const signature = request.headers.get("x-rapido-signature");

            let payload;
            try {
                payload = JSON.parse(body);
            } catch {
                return new Response(JSON.stringify({ error: "Invalid JSON payload" }), {
                    status: 400,
                    headers: { "Content-Type": "application/json" },
                });
            }

            // Transform Rapido payload to our format
            const orderData = {
                aggregatorOrderId: payload.order_id || payload.orderId,
                aggregatorOrderNumber: payload.order_number || payload.orderNumber,
                customer: {
                    name: payload.customer_name || payload.customer?.name,
                    phone: payload.customer_phone || payload.customer?.phone,
                    address: payload.delivery_address || payload.address,
                },
                items: (payload.items || []).map((item: any) => ({
                    aggregatorItemId: item.id || item.item_id,
                    name: item.name,
                    quantity: item.quantity || 1,
                    price: item.price || 0,
                })),
                subtotal: payload.subtotal || 0,
                tax: payload.tax || 0,
                deliveryFee: payload.delivery_fee || 0,
                discount: payload.discount || 0,
                total: payload.total || 0,
                estimatedTime: payload.estimated_time || 30,
                rawPayload: body,
            };

            return new Response(
                JSON.stringify({
                    success: true,
                    message: "Webhook received - use testWebhooks for testing",
                    data: orderData,
                }),
                {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                }
            );
        } catch (error) {
            console.error("Rapido webhook error:", error);
            return new Response(
                JSON.stringify({ error: "Internal server error" }),
                {
                    status: 500,
                    headers: { "Content-Type": "application/json" },
                }
            );
        }
    }),
});

// Razorpay Payment Webhook Handler
http.route({
    path: "/webhook/razorpay",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        try {
            const body = await request.text();
            const signature = request.headers.get("x-razorpay-signature");

            const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
            if (!webhookSecret) {
                console.error("RAZORPAY_WEBHOOK_SECRET not configured");
                return new Response(JSON.stringify({ error: "Webhook secret not configured" }), {
                    status: 500,
                    headers: { "Content-Type": "application/json" },
                });
            }

            if (!signature) {
                return new Response(JSON.stringify({ error: "Missing signature" }), {
                    status: 401,
                    headers: { "Content-Type": "application/json" },
                });
            }

            // Verify HMAC SHA256 signature
            const encoder = new TextEncoder();
            const key = await crypto.subtle.importKey(
                "raw",
                encoder.encode(webhookSecret),
                { name: "HMAC", hash: "SHA-256" },
                false,
                ["sign"]
            );
            const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
            const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
                .map((b) => b.toString(16).padStart(2, "0"))
                .join("");

            if (expectedSignature !== signature) {
                console.error("Razorpay webhook signature mismatch");
                return new Response(JSON.stringify({ error: "Invalid signature" }), {
                    status: 401,
                    headers: { "Content-Type": "application/json" },
                });
            }

            // Parse payload
            let payload;
            try {
                payload = JSON.parse(body);
            } catch {
                return new Response(JSON.stringify({ error: "Invalid JSON payload" }), {
                    status: 400,
                    headers: { "Content-Type": "application/json" },
                });
            }

            const event = payload.event;

            // Handle payment.captured event
            if (event === "payment.captured") {
                const payment = payload.payload?.payment?.entity;
                if (!payment) {
                    return new Response(JSON.stringify({ error: "Missing payment entity" }), {
                        status: 400,
                        headers: { "Content-Type": "application/json" },
                    });
                }

                const orgId = payment.notes?.orgId;
                const planType = payment.notes?.planType;
                const orderId = payment.order_id;
                const paymentId = payment.id;

                if (!orgId || !planType || !orderId) {
                    console.error("Razorpay webhook: missing notes (orgId, planType) or order_id");
                    return new Response(JSON.stringify({ error: "Missing required payment notes" }), {
                        status: 400,
                        headers: { "Content-Type": "application/json" },
                    });
                }

                // Record successful payment (server-side safety net)
                await ctx.runMutation(api.subscription.recordPaymentSuccess, {
                    orgId,
                    razorpayOrderId: orderId,
                    razorpayPaymentId: paymentId,
                    razorpaySignature: signature,
                    planType,
                    amount: payment.amount,
                });

                console.log(`Razorpay webhook: payment.captured for org ${orgId}, plan ${planType}`);
            }

            return new Response(JSON.stringify({ success: true }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            });
        } catch (error) {
            console.error("Razorpay webhook error:", error);
            return new Response(
                JSON.stringify({ error: "Internal server error" }),
                {
                    status: 500,
                    headers: { "Content-Type": "application/json" },
                }
            );
        }
    }),
});

// Health check endpoint
http.route({
    path: "/webhook/health",
    method: "GET",
    handler: httpAction(async () => {
        return new Response(
            JSON.stringify({
                status: "ok",
                timestamp: new Date().toISOString(),
                endpoints: ["/webhook/swiggy", "/webhook/zomato", "/webhook/rapido", "/webhook/razorpay"],
            }),
            {
                status: 200,
                headers: { "Content-Type": "application/json" },
            }
        );
    }),
});

export default http;
