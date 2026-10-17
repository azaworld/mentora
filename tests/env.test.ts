import { afterEach, describe, expect, it } from "vitest";
import { checkEnv } from "@/lib/env";

const saved = { ...process.env };
afterEach(() => {
  process.env = { ...saved };
});

const good = {
  DATABASE_URL: "postgres://x",
  NEXTAUTH_SECRET: "x".repeat(40),
  APP_URL: "https://mentora.example",
  PAYMENT_PROVIDER: "sslcommerz",
  SSLCOMMERZ_STORE_ID: "id",
  SSLCOMMERZ_STORE_PASSWORD: "pw",
  EMAIL_PROVIDER: "resend",
  RESEND_API_KEY: "key",
  EMAIL_FROM: "Mentora <no-reply@mentora.example>",
};

describe("production configuration check", () => {
  it("accepts a complete production configuration", () => {
    process.env = { ...good, NODE_ENV: "production" } as NodeJS.ProcessEnv;
    expect(() => checkEnv()).not.toThrow();
  });
  it("refuses the test gateway and console email in production", () => {
    process.env = { ...good, NODE_ENV: "production", PAYMENT_PROVIDER: "mock", EMAIL_PROVIDER: "console" } as NodeJS.ProcessEnv;
    expect(() => checkEnv()).toThrow(/mock is not allowed[\s\S]*real provider/);
  });
  it("refuses a short secret", () => {
    process.env = { ...good, NODE_ENV: "production", NEXTAUTH_SECRET: "short" } as NodeJS.ProcessEnv;
    expect(() => checkEnv()).toThrow(/NEXTAUTH_SECRET/);
  });
});
