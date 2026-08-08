import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import Stripe from "npm:stripe@14.21.0";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

serve(async (req) => {
    // CORS Preflight - return 200/204 with headers for OPTIONS requests
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        // Check Config inside the handler to prevent 500 crashes on Preflight
        const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
        if (!stripeKey) {
            console.error("Missing STRIPE_SECRET_KEY env variable");
            throw new Error("Server configuration error: Stripe key missing");
        }

        const stripe = new Stripe(stripeKey, {
            apiVersion: "2023-10-16",
        });

        const clientURL = Deno.env.get("CLIENT_URL") ?? "http://localhost:3000";

        if (req.method === "GET") {
            const url = new URL(req.url);
            const sessionId = url.searchParams.get("session_id");
            if (!sessionId) {
                throw new Error("Missing session_id");
            }
            const session = await stripe.checkout.sessions.retrieve(sessionId);
            return new Response(JSON.stringify(session), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            });
        }

        if (req.method !== "POST") {
            throw new Error("Method not allowed");
        }

        const body = await req.json();

        // Basic Validation
        if (!body.amount || !body.email || !body.currency) {
            throw new Error("Missing required fields (amount, email, currency)");
        }

        // Create Checkout Session
        const session = await stripe.checkout.sessions.create({
            mode: "payment",
            metadata: body.metadata,
            payment_method_types: ["card"],
            customer_email: body.email,
            line_items: [
                {
                    price_data: {
                        currency: body.currency.toLowerCase(),
                        // Expecting amount in cents
                        unit_amount: body.amount,
                        product_data: {
                            name: body.name || "Payment",
                            description: body.description || "",
                        },
                    },
                    quantity: 1,
                },
            ],
            // Use passed success/cancel URLs or defaults. Append session_id for tracking.
            success_url: `${clientURL}/${body.successUrl || 'payment/success'}?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${clientURL}/${body.cancelUrl || 'payment/cancel'}`,
        });

        return new Response(JSON.stringify({ id: session.id, url: session.url }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });

    } catch (error) {
        console.error("Error creating session:", error);
        return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
        });
    }
});
