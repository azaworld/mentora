/**
 * Validates configuration once at startup. In production a bad configuration stops the
 * server instead of failing later in front of a customer.
 */
import { z } from "zod";

const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    NEXTAUTH_SECRET: z.string().min(32, "NEXTAUTH_SECRET must be at least 32 characters"),
    NEXTAUTH_URL: z.string().url().optional(),
    APP_URL: z.string().url().optional(),
    PAYMENT_PROVIDER: z.enum(["mock", "sslcommerz"]).default("mock"),
    ALLOW_MOCK_PAYMENTS: z.enum(["true", "false"]).optional(),
    SSLCOMMERZ_STORE_ID: z.string().optional(),
    SSLCOMMERZ_STORE_PASSWORD: z.string().optional(),
    EMAIL_PROVIDER: z.enum(["console", "resend"]).default("console"),
    RESEND_API_KEY: z.string().optional(),
    EMAIL_FROM: z.string().optional(),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV !== "production") return;
    const fail = (message: string) => ctx.addIssue({ code: z.ZodIssueCode.custom, message });
    if (!env.APP_URL?.startsWith("https://")) fail("APP_URL must be an https:// URL in production");
    if (env.PAYMENT_PROVIDER === "mock" && env.ALLOW_MOCK_PAYMENTS !== "true") fail("PAYMENT_PROVIDER=mock is not allowed in production");
    if (env.PAYMENT_PROVIDER === "sslcommerz" && (!env.SSLCOMMERZ_STORE_ID || !env.SSLCOMMERZ_STORE_PASSWORD)) fail("SSLCommerz credentials are required");
    if (env.EMAIL_PROVIDER === "resend" && (!env.RESEND_API_KEY || !env.EMAIL_FROM)) fail("RESEND_API_KEY and EMAIL_FROM are required");
    if (env.EMAIL_PROVIDER === "console") fail("EMAIL_PROVIDER must be a real provider in production");
  });

export function checkEnv(): void {
  const result = schema.safeParse(process.env);
  if (!result.success) {
    const problems = result.error.issues.map((i) => `  - ${i.message}`).join("\n");
    throw new Error(`Mentora configuration is invalid:\n${problems}`);
  }
}
