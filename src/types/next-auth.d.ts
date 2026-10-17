import "next-auth";
import "next-auth/jwt";

type Role = "EXPERT" | "ORG" | "ADMIN";

declare module "next-auth" {
  interface User {
    id: string;
    role: Role;
    orgId: string | null;
    expertId: string | null;
  }
  interface Session {
    user: { id: string; name: string; email: string; role: Role; orgId: string | null; expertId: string | null };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid: string;
    role: Role;
    orgId: string | null;
    expertId: string | null;
  }
}
