/** Read models for public pages. Only consented, approved profiles are ever public. */
import { and, arrayContains, asc, desc, eq, gte, ilike, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import { experts, packages, speakers, workshops } from "@/db/schema";

export function showSampleData(): boolean {
  return process.env.SHOW_SAMPLE_DATA !== "false";
}

function publicExpert(): SQL {
  const base = and(eq(experts.status, "APPROVED"), eq(experts.consentToList, true))!;
  return showSampleData() ? base : and(base, eq(experts.isSample, false))!;
}

export const isFeatured = sql<boolean>`coalesce(${experts.featuredUntil} > now(), false)`;

export interface ExpertFilters {
  role?: string;
  topic?: string;
  format?: string;
  language?: string;
  q?: string;
}

const ROLES = ["TRAINER", "FACILITATOR", "COACH", "CONSULTANT"] as const;
const FORMATS = ["ONLINE", "ONSITE"] as const;

export async function listExperts(f: ExpertFilters = {}, limit = 60) {
  const conds: SQL[] = [publicExpert()];
  const role = ROLES.find((r) => r === f.role);
  if (role) conds.push(eq(experts.role, role));
  if (f.topic) conds.push(arrayContains(experts.topics, [f.topic]));
  const format = FORMATS.find((x) => x === f.format);
  if (format) conds.push(arrayContains(experts.formats, [format]));
  if (f.language) conds.push(arrayContains(experts.languages, [f.language]));
  if (f.q?.trim()) {
    const like = `%${f.q.trim().slice(0, 60)}%`;
    conds.push(or(ilike(experts.name, like), ilike(experts.headline, like), sql`array_to_string(${experts.topics}, ' ') ilike ${like}`)!);
  }
  const db = getDb();
  const rows = await db
    .select({
      expert: experts,
      featured: isFeatured,
      minPrice: sql<number | null>`(select min(${packages.priceMinor}) from ${packages} where ${packages.expertId} = ${experts.id})`,
    })
    .from(experts)
    .where(and(...conds))
    .orderBy(desc(isFeatured), desc(experts.rating), desc(experts.reviewCount))
    .limit(limit);
  return rows;
}

export async function listTopics(): Promise<string[]> {
  const db = getDb();
  const rows = await db
    .selectDistinct({ topic: sql<string>`unnest(${experts.topics})` })
    .from(experts)
    .where(publicExpert());
  return rows.map((r) => r.topic).sort();
}

export async function getPublicExpert(slug: string) {
  const db = getDb();
  const [row] = await db
    .select({ expert: experts, featured: isFeatured })
    .from(experts)
    .where(and(eq(experts.slug, slug), publicExpert()));
  if (!row) return null;
  const pkgs = await db.select().from(packages).where(eq(packages.expertId, row.expert.id)).orderBy(asc(packages.sortOrder));
  const upcoming = await db
    .select()
    .from(workshops)
    .where(and(eq(workshops.expertId, row.expert.id), eq(workshops.status, "PUBLISHED"), gte(workshops.startsAt, new Date())))
    .orderBy(asc(workshops.startsAt));
  return { ...row, packages: pkgs, workshops: upcoming };
}

function publicSpeaker(): SQL {
  const base = eq(speakers.consentToList, true);
  return showSampleData() ? base : and(base, eq(speakers.isSample, false))!;
}

export async function listSpeakers(tier?: string) {
  const conds: SQL[] = [publicSpeaker()];
  if (tier === "ICON" || tier === "EXECUTIVE" || tier === "EXPERT") conds.push(eq(speakers.tier, tier));
  return getDb().select().from(speakers).where(and(...conds)).orderBy(asc(speakers.tier), asc(speakers.name));
}

export async function getPublicSpeaker(slug: string) {
  const [row] = await getDb().select().from(speakers).where(and(eq(speakers.slug, slug), publicSpeaker()));
  return row ?? null;
}

export async function listWorkshops(format?: string) {
  const conds: SQL[] = [eq(workshops.status, "PUBLISHED"), gte(workshops.startsAt, new Date()), publicExpert()];
  if (format === "ONLINE" || format === "ONSITE") conds.push(eq(workshops.format, format));
  return getDb()
    .select({ workshop: workshops, expert: { name: experts.name, slug: experts.slug } })
    .from(workshops)
    .innerJoin(experts, eq(workshops.expertId, experts.id))
    .where(and(...conds))
    .orderBy(asc(workshops.startsAt));
}

export async function getPublicWorkshop(id: string) {
  const [row] = await getDb()
    .select({ workshop: workshops, expert: experts })
    .from(workshops)
    .innerJoin(experts, eq(workshops.expertId, experts.id))
    .where(and(eq(workshops.id, id), eq(workshops.status, "PUBLISHED"), publicExpert()));
  return row ?? null;
}
