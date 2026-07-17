import { NextRequest, NextResponse } from "next/server";
import User from "@/lib/server/models/User";
import Subscription from "@/lib/server/models/Subscription";
import Transaction from "@/lib/server/models/Transaction";
import { connectDB } from "@/lib/server/db";

export async function POST(request: NextRequest) {
  try {
    const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
    const sig = request.headers.get("stripe-signature");
    if (!sig) return NextResponse.json({ received: false }, { status: 400 });

    const rawBody = await request.arrayBuffer();
    const event = stripe.webhooks.constructEvent(
      Buffer.from(rawBody),
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    await connectDB();

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.metadata.userId;
        const planId = session.metadata.planId;
        if (userId && planId) {
          await User.findByIdAndUpdate(userId, { role: "premium" });
          await Subscription.findOneAndUpdate(
            { userId },
            {
              userId, plan: planId, status: "active",
              stripeCustomerId: session.customer,
              stripeSubscriptionId: session.subscription || null,
              currentPeriodStart: new Date(session.created * 1000),
              currentPeriodEnd: session.expires_at ? new Date(session.expires_at * 1000) : null,
            },
            { upsert: true, new: true }
          );
          await Transaction.create({
            userId, amount: session.amount_total / 100, currency: session.currency,
            status: "completed", stripePaymentIntentId: session.payment_intent,
            description: `${planId} subscription`,
          });
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const sub = await Subscription.findOne({ stripeSubscriptionId: subscription.id });
        if (sub) {
          sub.status = subscription.status === "active" ? "active" : "expired";
          sub.currentPeriodEnd = new Date(subscription.current_period_end * 1000);
          await sub.save();
          if (sub.status !== "active") {
            await User.findByIdAndUpdate(sub.userId, { role: "free" });
          }
        }
        break;
      }
      case "invoice.paid": {
        const invoice = event.data.object;
        if (invoice.subscription) {
          await Transaction.create({
            userId: null, amount: invoice.amount_paid / 100, currency: invoice.currency,
            status: "completed", stripePaymentIntentId: invoice.payment_intent,
            description: "Subscription renewal",
          });
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ received: false }, { status: 400 });
  }
}
