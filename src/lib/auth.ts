import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { z } from "zod";
import { getDb } from "@/db";
import { experts, users } from "@/db/schema";
import { log } from "./log";
import { allow } from "./rate-limit";

let DUMMY_HASH: string | undefined;

const credentials = z.object({
  email: z.string().email().transform((e) => e.toLowerCase().trim()),
  password: z.string().min(1).max(200),
});

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 7 * 24 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Email and password",
      credentials: { email: { label: "Email", type: "email" }, password: { label: "Password", type: "password" } },
      async authorize(raw) {
        const parsed = credentials.safeParse(raw);
        if (!parsed.success) return null;
        // 10 attempts per email per 15 minutes slows password guessing.
        if (!(await allow(`login:${parsed.data.email}`, 10, 900))) {
          log("warn", "auth.rate_limited", { email: parsed.data.email });
          return null;
        }
        const db = getDb();
        const [user] = await db.select().from(users).where(eq(users.email, parsed.data.email));
        // Compare against a dummy hash when the user doesn't exist, so timing doesn't reveal accounts.
        const hash = user?.passwordHash ?? (DUMMY_HASH ??= bcrypt.hashSync("not-a-real-password", 12));
        const ok = await bcrypt.compare(parsed.data.password, hash);
        if (!user || !ok) return null;
        const [expert] = user.role === "EXPERT" ? await db.select({ id: experts.id }).from(experts).where(eq(experts.userId, user.id)) : [];
        return { id: user.id, name: user.name, email: user.email, role: user.role, orgId: user.orgId, expertId: expert?.id ?? null };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        token.role = user.role;
        token.orgId = user.orgId ?? null;
        token.expertId = user.expertId ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      session.user = {
        id: token.uid,
        name: token.name ?? "",
        email: token.email ?? "",
        role: token.role,
        orgId: token.orgId,
        expertId: token.expertId,
      };
      return session;
    },
  },
};

export const PASSWORD_MIN = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}
