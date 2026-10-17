/**
 * Seeds settings, the admin account, real profiles and (optionally) sample data.
 *
 *   ADMIN_EMAIL, ADMIN_PASSWORD   required — the first admin account
 *   SEED_SAMPLE_DATA=true         adds clearly marked sample experts, speakers and workshops
 *   DEMO_PASSWORD                 password for the sample expert and organization logins
 *
 * Safe to re-run: existing rows are left alone.
 */
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as s from "../src/db/schema";

const pool = new Pool({ connectionString: required("DATABASE_URL"), max: 1 });
const db = drizzle(pool, { schema: s });
const T = (taka: number) => taka * 100;
const inDays = (d: number) => new Date(Date.now() + d * 86_400_000);

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is required`);
  return v;
}

async function upsertExpert(values: typeof s.experts.$inferInsert, pkgs: [string, number, string][] = []) {
  const [existing] = await db.select().from(s.experts).where(eq(s.experts.slug, values.slug));
  if (existing) return existing;
  const [e] = await db.insert(s.experts).values(values).returning();
  if (pkgs.length) await db.insert(s.packages).values(pkgs.map(([title, price, unit], i) => ({ expertId: e!.id, title, priceMinor: T(price), unit, sortOrder: i })));
  return e!;
}

async function upsertUser(email: string, name: string, role: "ADMIN" | "EXPERT" | "ORG", password: string, orgId?: string) {
  const [existing] = await db.select().from(s.users).where(eq(s.users.email, email));
  if (existing) return existing;
  const [u] = await db.insert(s.users).values({ email, name, role, orgId, passwordHash: await bcrypt.hash(password, 12) }).returning();
  return u!;
}

async function main() {
  await db.insert(s.settings).values({ id: 1 }).onConflictDoNothing();

  const adminPassword = required("ADMIN_PASSWORD");
  if (adminPassword.length < 12) throw new Error("ADMIN_PASSWORD must be at least 12 characters");
  await upsertUser(required("ADMIN_EMAIL").toLowerCase(), "Mentora Admin", "ADMIN", adminPassword);

  // Real profile, listed with the owner's consent.
  await upsertExpert(
    {
      slug: "arifuzzaman-antor",
      name: "Arifuzzaman Antor",
      role: "TRAINER",
      headline: "Founder & CEO, AZAI Labs · Co-Founder & CTO, Upward",
      bio:
        "Technical Project Manager leading a 30+ person cross-functional team, with QA and automation work for Mastercard, Grameenphone (MyGP) and US healthcare, and four Bangladesh government systems. Founder of AZAI Labs, which builds AI agents and automation, and of AZADEMY. Host of the AZA Execution Podcast and lead facilitator of AI for Leaders.",
      city: "Dhaka",
      languages: ["Bangla", "English"],
      formats: ["ONLINE", "ONSITE"],
      topics: ["AI & Digital", "Project management", "Software quality"],
      yearsExperience: 6,
      plan: "PREMIER",
      status: "APPROVED",
      consentToList: true,
      consentAt: new Date(),
      rating: 5,
      reviewCount: 23,
    },
    [
      ["AI for Leaders — executive briefing", 80_000, "2 hours, leadership team"],
      ["AI for Leaders — one-day intensive", 250_000, "Up to 30 leaders"],
      ["AI & delivery advisory", 150_000, "Per month"],
    ],
  );

  // Draft from public information on quazi.global. Hidden until written consent is recorded
  // (set consent_to_list = true, then approve in Admin → Approvals). No contact details stored.
  await upsertExpert({
    slug: "quazi-m-ahmed",
    name: "Quazi M. Ahmed",
    role: "TRAINER",
    headline: "Global leadership trainer & executive coach · IFC-Certified Master Trainer",
    bio:
      "Leadership trainer and coach with 27+ years of experience across 13 countries. Founder & Managing Partner of QUAZI Consultants and Founder & CEO of Global Center of Excellence, LLC (USA). Facilitator for the PUMA Leadership Expedition in Asia Pacific, IFC-Certified Master Trainer and TEDx speaker. Co-founder of the Global Bangladeshi Chamber of Commerce (GBCC).",
    city: "Dhaka",
    languages: ["Bangla", "English"],
    formats: ["ONLINE", "ONSITE"],
    topics: ["Leadership", "Executive coaching", "Public speaking", "Emotional intelligence"],
    yearsExperience: 27,
    plan: "STARTER",
    status: "PENDING",
    consentToList: false,
  });

  if (process.env.SEED_SAMPLE_DATA === "true") await seedSamples();
  console.log("Seed complete.");
}

async function seedSamples() {
  const demoPassword = required("DEMO_PASSWORD");
  const S = (slug: string, name: string, role: s.Expert["role"], topics: string[], plan: s.ExpertPlan, extra: Partial<typeof s.experts.$inferInsert> = {}) =>
    upsertExpert(
      {
        slug, name, role, topics, plan,
        headline: `${role[0] + role.slice(1).toLowerCase()} · ${topics.join(", ")}`,
        bio: `${name} works with leadership and frontline teams across banking, telecom and development organizations. Sample profile for demonstration.`,
        city: "Dhaka", languages: ["Bangla", "English"], formats: ["ONLINE", "ONSITE"], yearsExperience: 10,
        status: "APPROVED", consentToList: true, isSample: true, rating: 4.8, reviewCount: 18, ...extra,
      },
      role === "COACH" ? [["Single coaching session", 12_000, "Per session"], ["6-session program", 60_000, "Per leader"]]
        : role === "CONSULTANT" ? [["Diagnostic assessment", 150_000, "Fixed scope"], ["Monthly advisory", 200_000, "Per month"]]
        : [["Half-day workshop", 35_000, "Per session"], ["Full-day workshop", 60_000, "Per day"]],
    );

  const nusrat = await S("sample-nusrat-jahan", "Nusrat Jahan", "TRAINER", ["Leadership", "Communication"], "PROFESSIONAL", { featuredUntil: inDays(20) });
  const tanvir = await S("sample-tanvir-rahman", "Tanvir Rahman", "CONSULTANT", ["AI & Digital", "Strategy"], "PREMIER");
  await S("sample-sabrina-chowdhury", "Sabrina Chowdhury", "COACH", ["Executive coaching", "Wellbeing"], "PROFESSIONAL");
  const lamia = await S("sample-lamia-haque", "Lamia Haque", "FACILITATOR", ["Design thinking", "Team building"], "PROFESSIONAL");
  await S("sample-imran-kabir", "Imran Kabir", "CONSULTANT", ["HR & OD", "Leadership"], "STARTER");
  const antor = (await db.select().from(s.experts).where(eq(s.experts.slug, "arifuzzaman-antor")))[0]!;

  // Demo logins
  const expertUser = await upsertUser("expert@demo.mentora.local", "Nusrat Jahan", "EXPERT", demoPassword);
  await db.update(s.experts).set({ userId: expertUser.id }).where(eq(s.experts.id, nusrat.id));
  let [org] = await db.select().from(s.organizations).where(eq(s.organizations.name, "Sample Bank PLC"));
  if (!org) [org] = await db.insert(s.organizations).values({ name: "Sample Bank PLC" }).returning();
  await upsertUser("org@demo.mentora.local", "HR Manager", "ORG", demoPassword, org!.id);

  const existingWs = await db.select({ id: s.workshops.id }).from(s.workshops).limit(1);
  if (!existingWs.length) {
    await db.insert(s.workshops).values([
      { title: "AI for Leaders — Executive Cohort", summary: "Four Saturdays of practical AI for managers: use cases, risk and policy, hands-on tools, and a 90-day plan.", expertId: antor.id, format: "ONLINE", startsAt: inDays(21), duration: "4 Saturdays · 3 hrs each", venue: "Live online", priceMinor: T(12_000), seats: 25, seatsSold: 9, status: "PUBLISHED" },
      { title: "Facilitation Mastery: Running Workshops That Work", summary: "Design and run sessions that keep people engaged and end with decisions.", expertId: lamia.id, format: "ONSITE", startsAt: inDays(28), duration: "1 day", venue: "Gulshan, Dhaka", priceMinor: T(8_500), seats: 20, seatsSold: 14, status: "PUBLISHED" },
      { title: "Emotional Intelligence for Managers", summary: "Practical tools for feedback, conflict and motivation.", expertId: nusrat.id, format: "ONSITE", startsAt: inDays(35), duration: "1 day", venue: "Banani, Dhaka", priceMinor: T(7_500), seats: 30, seatsSold: 4, status: "PUBLISHED" },
    ]);
    await db.insert(s.needs).values([
      { orgId: org!.id, title: "Leadership program for 40 branch managers", detail: "Three-day blended program on coaching, delegation and performance conversations.", participants: 40, budgetMinor: T(400_000), format: "ONSITE" },
      { orgId: org!.id, title: "AI-Ready Workforce for 60 operations staff", detail: "Practical AI tools for daily work, with data-privacy rules for banking.", participants: 60, budgetMinor: T(300_000), format: "ONLINE" },
    ]);
    const [n1] = await db.select().from(s.needs).where(eq(s.needs.title, "AI-Ready Workforce for 60 operations staff"));
    await db.insert(s.quotes).values({ needId: n1!.id, expertId: tanvir.id, amountMinor: T(280_000), message: "Two cohorts of 30, hands-on with banking-safe AI use cases." });
  }

  const existingSp = await db.select({ id: s.speakers.id }).from(s.speakers).limit(1);
  if (!existingSp.length) {
    await db.insert(s.speakers).values([
      { slug: "sample-rafiq-hossain", name: "Rafiq Hossain", title: "Managing Director, sample bank", tier: "EXECUTIVE", topics: ["Banking transformation", "Digital finance"], feeFromMinor: T(150_000), consentToList: true, isSample: true },
      { slug: "sample-nadia-karim", name: "Nadia Karim", title: "CEO, sample telecom company", tier: "EXECUTIVE", topics: ["Customer-first growth", "Women in leadership"], feeFromMinor: T(150_000), consentToList: true, isSample: true },
      { slug: "arifuzzaman-antor", name: "Arifuzzaman Antor", title: "Founder & CEO, AZAI Labs", tier: "EXPERT", topics: ["AI for leaders", "Execution"], consentToList: true },
    ]);
    await db.insert(s.sponsorships).values([
      { name: "Trainers Fest — title sponsor", priceMinor: T(500_000) },
      { name: "Trainers Fest — gold sponsor", priceMinor: T(200_000) },
      { name: "Monthly newsletter feature", priceMinor: T(25_000) },
    ]);
  }
}

main()
  .then(() => pool.end())
  .catch(async (err) => {
    console.error(err);
    await pool.end();
    process.exit(1);
  });
