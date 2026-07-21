import { NextRequest } from "next/server";
import Subscription from "@/lib/server/models/Subscription";
import Transaction from "@/lib/server/models/Transaction";
import User from "@/lib/server/models/User";
import { connectDB } from "@/lib/server/db";
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse";
import { auth } from "@/lib/server/middleware/auth";
import { validate } from "@/lib/server/middleware/validate";
import { createCheckoutSchema } from "@/lib/server/validators/subscriptionValidator";
import { trackServer } from "@/lib/server/utils/trackEvent";

const PLANS = [
  { id: "monthly", name: "Monthly", price: 0.99, currency: "usd", interval: "month", description: "Billed monthly" },
  { id: "yearly", name: "Yearly", price: 9.90, currency: "usd", interval: "year", description: "Billed annually — save 17%" },
  { id: "lifetime", name: "Lifetime", price: 29.90, currency: "usd", interval: "one-time", description: "Pay once, play forever" },
];

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug?: string[] }> }) {
  const slug = (await params).slug;
  const action = slug?.[0];

  await connectDB();

  try {
    // GET /api/v1/subscriptions/plans
    if (!action || action === "plans") {
      return successResponse({ plans: PLANS });
    }

    // GET /api/v1/subscriptions/me
    if (action === "me") {
      const userResult = await auth(request);
      if ("error" in userResult) return userResult.error;

      const user = await User.findById(userResult.user.id);
      if (!user) return errorResponse(404, "user_not_found", "User not found");
      const sub = await Subscription.findOne({ userId: userResult.user.id });
      return successResponse({
        plan: sub ? { id: sub.plan, status: sub.status, currentPeriodEnd: sub.currentPeriodEnd, cancelledAt: sub.cancelledAt } : null,
        role: user.role,
      });
    }

    return errorResponse(404, "not_found", "Route not found");
  } catch (error: any) {
    console.error(error);
    return errorResponse(500, "internal_error", "Internal Server Error");
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug?: string[] }> }) {
  const slug = (await params).slug;
  const action = slug?.[0];
  let body: any = {};
  try {
    body = await request.json();
  } catch {}

  await connectDB();

  try {
    // POST /api/v1/subscriptions/checkout
    if (action === "checkout") {
      const userResult = await auth(request);
      if ("error" in userResult) return userResult.error;

      const val = validate(createCheckoutSchema, body);
      if (val.error) return val.error;
      const { planId } = val.data!;
      const plan = PLANS.find((p) => p.id === planId);
      if (!plan) return errorResponse(400, "invalid_plan", "Invalid plan selected");

      const user = await User.findById(userResult.user.id);
      if (!user) return errorResponse(404, "user_not_found", "User not found");

      // Lifetime — handle directly
      if (plan.id === "lifetime") {
        user.role = "premium";
        await user.save();
        await Subscription.findOneAndUpdate(
          { userId: user._id },
          { userId: user._id, plan: "lifetime", status: "active", currentPeriodStart: new Date(), currentPeriodEnd: null },
          { upsert: true, new: true }
        );
        await Transaction.create({
          userId: user._id, amount: plan.price, currency: plan.currency,
          status: "completed", description: "Lifetime subscription",
        });
        await trackServer({ userId: user._id.toString(), event: "subscription_started", properties: { plan: "lifetime", price: plan.price }, request });
        return successResponse({ message: "Lifetime subscription activated", role: "premium" });
      }

      // Stripe checkout for monthly/yearly
      try {
        const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
        const customer = await stripe.customers.create({ email: user.email, metadata: { userId: String(user._id) } });
        const session = await stripe.checkout.sessions.create({
          customer: customer.id,
          payment_method_types: ["card"],
          line_items: [{
            price_data: {
              currency: plan.currency,
              product_data: { name: `Puzzroo ${plan.name} Subscription` },
              unit_amount: Math.round(plan.price * 100),
              recurring: plan.interval !== "one-time" ? { interval: plan.interval } : undefined,
            },
            quantity: 1,
          }],
          mode: plan.interval === "one-time" ? "payment" : "subscription",
          success_url: `${process.env.FRONTEND_URL}/account-information?checkout=success`,
          cancel_url: `${process.env.FRONTEND_URL}/subscription?checkout=cancelled`,
          metadata: { userId: String(user._id), planId: plan.id },
        });
        await trackServer({ userId: user._id.toString(), event: "subscription_checkout_started", properties: { plan: plan.id, price: plan.price }, request });
        return successResponse({ url: session.url, sessionId: session.id });
      } catch {
        return errorResponse(500, "stripe_not_configured", "Stripe is not configured");
      }
    }

    // POST /api/v1/subscriptions/cancel
    if (action === "cancel") {
      const userResult = await auth(request);
      if ("error" in userResult) return userResult.error;

      const sub = await Subscription.findOne({ userId: userResult.user.id, status: "active" });
      if (!sub) return errorResponse(404, "no_active_subscription", "No active subscription found");

      if (sub.stripeSubscriptionId) {
        try {
          const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
          await stripe.subscriptions.update(sub.stripeSubscriptionId, { cancel_at_period_end: true });
        } catch {}
      }

      sub.status = "cancelled";
      sub.cancelledAt = new Date();
      await sub.save();
      await trackServer({ userId: userResult.user.id, event: "subscription_cancelled", properties: { plan: sub.plan }, request });
      return successResponse({ message: "Subscription cancelled. Access continues until period end." });
    }

    return errorResponse(404, "not_found", "Route not found");
  } catch (error: any) {
    console.error(error);
    return errorResponse(500, "internal_error", "Internal Server Error");
  }
}
