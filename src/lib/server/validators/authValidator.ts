import { z } from "zod";

const usernameField = z
  .string()
  .trim()
  .regex(
    /^[a-z0-9._-]{3,20}$/,
    "Username must be 3-20 characters: lowercase letters, numbers, . _ or - only"
  );

const nameField = z
  .string()
  .trim()
  .min(1, "Full name is required")
  .max(50, "Full name must be at most 50 characters");

export const registerSchema = z.object({
  name: nameField,
  email: z.string().trim().email("Please enter a valid email"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(20, "Password must be at most 20 characters"),
});

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Email or username is required"),
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Please enter a valid email"),
});

export const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(20, "Password must be at most 20 characters"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(6, "New password must be at least 6 characters")
    .max(20, "New password must be at most 20 characters"),
});

export const chooseUsernameSchema = z.object({
  username: usernameField,
});

export const updateProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Full name must be at least 3 characters")
    .max(30, "Full name must be at most 30 characters")
    .optional(),
  phone: z.string().optional(),
  avatar: z.string().url().nullish(),
  theme: z.enum(["light", "dark"]).nullish(),
});

export const unlinkProviderSchema = z.object({
  provider: z.enum(["email", "google", "facebook"]),
});

export const manageEmailSchema = z.object({
  email: z.string().trim().email("Please enter a valid email"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(20, "Password must be at most 20 characters")
    .optional(),
});
