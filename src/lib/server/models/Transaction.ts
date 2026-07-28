import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: "Subscription", default: null },
    amount: { type: Number, required: true },
    currency: { type: String, default: "usd" },
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "refunded"],
      default: "completed",
    },
    stripePaymentIntentId: { type: String, default: null },
    description: { type: String, default: "" },
  },
  { timestamps: true }
);

transactionSchema.index({ userId: 1 });
transactionSchema.index({ stripePaymentIntentId: 1 }, { sparse: true });

export default mongoose.models.Transaction || mongoose.model("Transaction", transactionSchema);
