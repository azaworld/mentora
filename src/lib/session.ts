import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "./auth";

export type SessionUser = { id: string; name: string; email: string; role: "EXPERT" | "ORG" | "ADMIN"; orgId: string | null; expertId: string | null };

export async function currentUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  return session?.user ?? null;
}

export async function requireRole<R extends SessionUser["role"]>(role: R, next = "/dashboard"): Promise<SessionUser & { role: R }> {
  const user = await currentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (user.role !== role) redirect("/dashboard");
  return user as SessionUser & { role: R };
}
