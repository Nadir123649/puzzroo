import { NextRequest } from "next/server";
import Transaction from "@/lib/server/models/Transaction";
import Subscription from "@/lib/server/models/Subscription";
import { connectDB } from "@/lib/server/db";
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse";
import { auth } from "@/lib/server/middleware/auth";

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug?: string[] }> }) {
  const slug = (await params).slug;
  const action = slug?.[0];

  await connectDB();

  const userResult = auth(request);
  if ("error" in userResult) return userResult.error;

  try {
    // GET /api/v1/billing/history
    if (!action || action === "history") {
      const page = parseInt(request.nextUrl.searchParams.get("page") || "1");
      const limit = parseInt(request.nextUrl.searchParams.get("limit") || "20");
      const skip = (page - 1) * limit;

      const [transactions, total, subscription] = await Promise.all([
        Transaction.find({ userId: userResult.user.id }).sort({ createdAt: -1 }).skip(skip).limit(limit),
        Transaction.countDocuments({ userId: userResult.user.id }),
        Subscription.findOne({ userId: userResult.user.id }),
      ]);

      return successResponse({
        transactions: transactions.map((t) => ({
          id: t._id, amount: t.amount, currency: t.currency,
          status: t.status, description: t.description, createdAt: t.createdAt,
        })),
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        currentPlan: subscription
          ? { plan: subscription.plan, status: subscription.status, currentPeriodEnd: subscription.currentPeriodEnd }
          : { plan: "free", status: "active", currentPeriodEnd: null },
      });
    }

    return errorResponse(404, "not_found", "Route not found");
  } catch (error: any) {
    console.error(error);
    return errorResponse(500, "internal_error", "Internal Server Error");
  }
}
