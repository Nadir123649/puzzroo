import { z } from "zod"

const requiredVars = [
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
  "MONGODB_URI",
  "NEXT_PUBLIC_APP_URL",
] as const

const optionalWithWarning: Record<string, string> = {
  MONGO_URI: "Use MONGODB_URI instead. MONGO_URI is deprecated.",
}

export function validateEnv(): void {
  const missing: string[] = []
  for (const key of requiredVars) {
    if (!process.env[key]) {
      missing.push(key)
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}. ` +
      "Set them in .env.local or Vercel environment variables."
    )
  }

  const jwtAccess = process.env.JWT_ACCESS_SECRET!
  if (jwtAccess.length < 16) {
    console.warn("[ENV] WARNING: JWT_ACCESS_SECRET is too short. Use a random string >= 32 characters.")
  }

  const jwtRefresh = process.env.JWT_REFRESH_SECRET!
  if (jwtRefresh.length < 16) {
    console.warn("[ENV] WARNING: JWT_REFRESH_SECRET is too short. Use a random string >= 32 characters.")
  }

  for (const [key, msg] of Object.entries(optionalWithWarning)) {
    if (process.env[key]) {
      console.warn(`[ENV] ${msg}`)
    }
  }
}

const envSchema = z.object({
  MONGODB_URI: z.string().min(1),
  MONGO_URI: z.string().optional(),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  NEXT_PUBLIC_APP_URL: z.string().url().optional().default("http://localhost:3000"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  ACCESS_TOKEN_EXPIRES: z.string().optional().default("15m"),
  REFRESH_TOKEN_EXPIRES: z.string().optional().default("7d"),
  MAX_BODY_SIZE: z.string().optional(),
})

export function getEnv() {
  return envSchema.parse({
    MONGODB_URI: process.env.MONGODB_URI || process.env.MONGO_URI,
    JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NODE_ENV: process.env.NODE_ENV,
    ACCESS_TOKEN_EXPIRES: process.env.ACCESS_TOKEN_EXPIRES,
    REFRESH_TOKEN_EXPIRES: process.env.REFRESH_TOKEN_EXPIRES,
    MAX_BODY_SIZE: process.env.MAX_BODY_SIZE,
  })
}
