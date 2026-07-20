import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    usernameSet: { type: Boolean, default: false },
    // Stable, human-friendly account identifier (10 digits, formatted xxx-xxx-xxx-x).
    // Assigned once an account becomes "real" (email signup, OAuth, or guest
    // conversion). Guests have none until they convert. sparse+unique so the many
    // null guests don't collide.
    publicId: { type: String, default: null, unique: true, sparse: true },
    name: { type: String, trim: true, default: null },
    email: { type: String, lowercase: true, trim: true, default: null },
    password: { type: String, default: null },
    phone: { type: String, default: null },
    firebaseUid: { type: String, default: null },
    firebaseProvider: { type: String, default: null },
    provider: {
      type: String,
      enum: ["email", "google", "facebook", "phone", "guest"],
      default: "email",
    },
    linkedProviders: { type: [String], default: [] },
    avatar: { type: String, default: null },
    role: {
      type: String,
      enum: ["guest", "free", "premium", "admin"],
      default: "guest",
    },
    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active",
    },
    isSuperUser: { type: Boolean, default: false },
    lastLoginAt: { type: Date, default: null },
    lastActiveAt: { type: Date, default: null },
    isVerified: { type: Boolean, default: false },
    emailVerificationToken: String,
    emailVerificationTokenExpire: Date,
    resetPasswordToken: String,
    resetPasswordTokenExpire: Date,
  },
  { timestamps: true }
);

// ─────────────────────────────────────────────────────────────────────────────
// publicId is PERMANENT. Once a real account is assigned its 10-digit id it can
// NEVER change or be cleared — the account always opens with the id it was born
// with, no matter how the user later signs in (email, then Google with the same
// email links to the SAME account & id). We still allow the very first
// assignment (null → value) so brand-new accounts, backfills, and guest
// conversions work.
// ─────────────────────────────────────────────────────────────────────────────

// Remember the id the document had when it was loaded from the database.
(userSchema as any).post("init", function (this: any) {
  this.$locals.originalPublicId = this.publicId;
});

// On save, if the document already had a publicId, silently revert any attempt
// to change or clear it. (Mongoose 9 hooks are sync/async — no `next`.)
(userSchema as any).pre("save", function (this: any) {
  const original = this.$locals?.originalPublicId;
  if (!this.isNew && original && this.publicId !== original) {
    this.publicId = original;
  }
});

// Block query-based updates (updateOne/updateMany/findOneAndUpdate) from ever
// touching an existing publicId.
function stripPublicIdFromUpdate(this: any) {
  const update = this.getUpdate() || {};
  if (update.publicId !== undefined) delete update.publicId;
  if (update.$set && update.$set.publicId !== undefined) delete update.$set.publicId;
  if (update.$unset && update.$unset.publicId !== undefined) delete update.$unset.publicId;
  this.setUpdate(update);
}
(userSchema as any).pre("findOneAndUpdate", stripPublicIdFromUpdate);
(userSchema as any).pre("updateOne", stripPublicIdFromUpdate);
(userSchema as any).pre("updateMany", stripPublicIdFromUpdate);

export default mongoose.models.User || mongoose.model("User", userSchema);
