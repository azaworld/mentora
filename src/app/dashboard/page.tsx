import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";

export default async function DashboardIndex() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/dashboard");
  redirect(user.role === "ADMIN" ? "/dashboard/admin" : user.role === "EXPERT" ? "/dashboard/expert" : "/dashboard/org");
}
