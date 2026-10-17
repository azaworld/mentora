/**
 * Mentora data model (PostgreSQL via Drizzle ORM).
 * Money is stored as integer minor units (poisha: 1 BDT = 100).
 * Rates are basis points (1% = 100 bps).
 */
import { randomUUID } from "node:crypto";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const id = () => text("id").primaryKey().$defaultFn(() => randomUUID());
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const roleEnum = pgEnum("role", ["EXPERT", "ORG", "ADMIN"]);
export const expertRoleEnum = pgEnum("expert_role", ["TRAINER", "FACILITATOR", "COACH", "CONSULTANT"]);
export const expertPlanEnum = pgEnum("expert_plan", ["STARTER", "PROFESSIONAL", "PREMIER"]);
export const orgPlanEnum = pgEnum("org_plan", ["PAYG", "PARTNER", "ENTERPRISE"]);
export const profileStatusEnum = pgEnum("profile_status", ["PENDING", "APPROVED", "REJECTED"]);
export const formatEnum = pgEnum("delivery_format", ["ONLINE", "ONSITE", "EITHER"]);
export const speakerTierEnum = pgEnum("speaker_tier", ["ICON", "EXECUTIVE", "EXPERT"]);
export const workshopStatusEnum = pgEnum("workshop_status", ["PENDING_REVIEW", "PUBLISHED", "REJECTED"]);
export const needStatusEnum = pgEnum("need_status", ["OPEN", "BOOKED", "CLOSED"]);
export const quoteStatusEnum = pgEnum("quote_status", ["SENT", "ACCEPTED", "DECLINED"]);
export const bookingStatusEnum = pgEnum("booking_status", ["CONFIRMED", "COMPLETED", "CANCELLED"]);
export const stageEnum = pgEnum("pipeline_stage", ["REQUESTED", "QUOTED", "CONFIRMED", "PAID", "DECLINED"]);
export const aiPackageEnum = pgEnum("ai_package", ["EXECUTIVE_BRIEFING", "ONE_DAY_INTENSIVE"]);
export const orderKindEnum = pgEnum("order_kind", ["TICKET", "BOOKING", "EXPERT_PLAN", "BOOST", "ORG_PLAN", "CERTIFICATE"]);
export const orderStatusEnum = pgEnum("order_status", ["PENDING", "PAID", "FAILED", "NEEDS_REFUND"]);
export const streamEnum = pgEnum("stream", [
  "BOOKING_COMMISSION",
  "WORKSHOP_TICKETS",
  "SPEAKER_FEES",
  "AI_FOR_LEADERS",
  "CERTIFICATES",
  "EXPERT_SUBSCRIPTIONS",
  "FEATURED_LISTINGS",
  "ORGANIZATION_PLANS",
  "SPONSORSHIP",
]);

export const organizations = pgTable("organizations", {
  id: id(),
  name: text("name").notNull(),
  plan: orgPlanEnum("plan").notNull().default("PAYG"),
  planRenewsAt: timestamp("plan_renews_at", { withTimezone: true }),
  createdAt: createdAt(),
});

export const users = pgTable("users", {
  id: id(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull(),
  orgId: text("org_id").references(() => organizations.id),
  createdAt: createdAt(),
});

export const experts = pgTable(
  "experts",
  {
    id: id(),
    slug: text("slug").notNull().unique(),
    userId: text("user_id").unique().references(() => users.id),
    name: text("name").notNull(),
    role: expertRoleEnum("role").notNull(),
    headline: text("headline").notNull(),
    bio: text("bio").notNull(),
    city: text("city").notNull(),
    languages: text("languages").array().notNull().default([]),
    formats: formatEnum("formats").array().notNull().default([]),
    topics: text("topics").array().notNull().default([]),
    yearsExperience: integer("years_experience").notNull().default(0),
    plan: expertPlanEnum("plan").notNull().default("STARTER"),
    planRenewsAt: timestamp("plan_renews_at", { withTimezone: true }),
    status: profileStatusEnum("status").notNull().default("PENDING"),
    /** Profiles appear publicly only with the expert's consent. */
    consentToList: boolean("consent_to_list").notNull().default(false),
    consentAt: timestamp("consent_at", { withTimezone: true }),
    featuredUntil: timestamp("featured_until", { withTimezone: true }),
    rating: real("rating").notNull().default(0),
    reviewCount: integer("review_count").notNull().default(0),
    isSample: boolean("is_sample").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index("experts_listing_idx").on(t.status, t.consentToList)],
);

export const packages = pgTable("packages", {
  id: id(),
  expertId: text("expert_id").notNull().references(() => experts.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  priceMinor: integer("price_minor").notNull(),
  unit: text("unit").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const speakers = pgTable("speakers", {
  id: id(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  title: text("title").notNull(),
  tier: speakerTierEnum("tier").notNull(),
  topics: text("topics").array().notNull().default([]),
  feeFromMinor: integer("fee_from_minor"),
  consentToList: boolean("consent_to_list").notNull().default(false),
  isSample: boolean("is_sample").notNull().default(false),
  createdAt: createdAt(),
});

export const speakerRequests = pgTable("speaker_requests", {
  id: id(),
  speakerId: text("speaker_id").notNull().references(() => speakers.id),
  orgName: text("org_name").notNull(),
  email: text("email").notNull(),
  eventType: text("event_type").notNull(),
  audience: integer("audience").notNull(),
  eventDate: timestamp("event_date", { withTimezone: true }).notNull(),
  stage: stageEnum("stage").notNull().default("REQUESTED"),
  quoteMinor: integer("quote_minor"),
  createdAt: createdAt(),
});

export const workshops = pgTable(
  "workshops",
  {
    id: id(),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    expertId: text("expert_id").notNull().references(() => experts.id),
    format: formatEnum("format").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    duration: text("duration").notNull(),
    venue: text("venue").notNull(),
    priceMinor: integer("price_minor").notNull(),
    seats: integer("seats").notNull(),
    seatsSold: integer("seats_sold").notNull().default(0),
    status: workshopStatusEnum("status").notNull().default("PENDING_REVIEW"),
    createdAt: createdAt(),
  },
  (t) => [index("workshops_listing_idx").on(t.status, t.startsAt)],
);

export const orders = pgTable("orders", {
  id: id(),
  /** Public, unguessable reference sent to the payment gateway. */
  tranId: text("tran_id").notNull().unique(),
  kind: orderKindEnum("kind").notNull(),
  status: orderStatusEnum("status").notNull().default("PENDING"),
  amountMinor: integer("amount_minor").notNull(),
  currency: text("currency").notNull().default("BDT"),
  email: text("email").notNull(),
  userId: text("user_id").references(() => users.id),
  meta: jsonb("meta").$type<Record<string, unknown>>().notNull(),
  provider: text("provider").notNull(),
  providerRef: text("provider_ref"),
  failReason: text("fail_reason"),
  result: jsonb("result").$type<Record<string, unknown>>(),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  createdAt: createdAt(),
});

export const tickets = pgTable("tickets", {
  id: id(),
  code: text("code").notNull().unique(),
  workshopId: text("workshop_id").notNull().references(() => workshops.id),
  orderId: text("order_id").notNull().unique().references(() => orders.id),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  seats: integer("seats").notNull(),
  createdAt: createdAt(),
});

export const needs = pgTable(
  "training_needs",
  {
    id: id(),
    orgId: text("org_id").notNull().references(() => organizations.id),
    title: text("title").notNull(),
    detail: text("detail").notNull(),
    participants: integer("participants").notNull(),
    budgetMinor: integer("budget_minor").notNull(),
    format: formatEnum("format").notNull(),
    status: needStatusEnum("status").notNull().default("OPEN"),
    targetExpertId: text("target_expert_id").references(() => experts.id),
    createdAt: createdAt(),
  },
  (t) => [index("needs_status_idx").on(t.status)],
);

export const quotes = pgTable(
  "quotes",
  {
    id: id(),
    needId: text("need_id").notNull().references(() => needs.id),
    expertId: text("expert_id").notNull().references(() => experts.id),
    amountMinor: integer("amount_minor").notNull(),
    message: text("message").notNull(),
    status: quoteStatusEnum("status").notNull().default("SENT"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("quotes_need_expert_uq").on(t.needId, t.expertId)],
);

export const bookings = pgTable("bookings", {
  id: id(),
  needId: text("need_id").notNull().unique().references(() => needs.id),
  quoteId: text("quote_id").notNull().unique().references(() => quotes.id),
  orgId: text("org_id").notNull().references(() => organizations.id),
  expertId: text("expert_id").notNull().references(() => experts.id),
  amountMinor: integer("amount_minor").notNull(),
  status: bookingStatusEnum("status").notNull().default("CONFIRMED"),
  orderId: text("order_id").notNull().unique().references(() => orders.id),
  createdAt: createdAt(),
});

export const programRequests = pgTable("program_requests", {
  id: id(),
  orgName: text("org_name").notNull(),
  email: text("email").notNull(),
  package: aiPackageEnum("package").notNull(),
  leaders: integer("leaders").notNull(),
  stage: stageEnum("stage").notNull().default("REQUESTED"),
  createdAt: createdAt(),
});

export const certificates = pgTable("certificates", {
  id: id(),
  code: text("code").notNull().unique(),
  holderName: text("holder_name").notNull(),
  program: text("program").notNull(),
  orgName: text("org_name"),
  issuedById: text("issued_by_id").references(() => experts.id),
  issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().defaultNow(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  orderId: text("order_id").unique().references(() => orders.id),
});

export const sponsorships = pgTable("sponsorships", {
  id: id(),
  name: text("name").notNull(),
  priceMinor: integer("price_minor").notNull(),
  soldTo: text("sold_to"),
  soldAt: timestamp("sold_at", { withTimezone: true }),
});

export const ledger = pgTable(
  "ledger_entries",
  {
    id: id(),
    stream: streamEnum("stream").notNull(),
    description: text("description").notNull(),
    grossMinor: integer("gross_minor").notNull(),
    payoutMinor: integer("payout_minor").notNull(),
    platformMinor: integer("platform_minor").notNull(),
    operatorMinor: integer("operator_minor").notNull(),
    techPartnerMinor: integer("tech_partner_minor").notNull(),
    expertId: text("expert_id").references(() => experts.id),
    orgId: text("org_id").references(() => organizations.id),
    /** One ledger entry per paid order makes posting idempotent. */
    orderId: text("order_id").unique().references(() => orders.id),
    createdAt: createdAt(),
  },
  (t) => [index("ledger_stream_idx").on(t.stream, t.createdAt)],
);

export const payouts = pgTable("payouts", {
  id: id(),
  expertId: text("expert_id").notNull().references(() => experts.id),
  amountMinor: integer("amount_minor").notNull(),
  reference: text("reference"),
  paidAt: timestamp("paid_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Single-row platform settings (id = 1). */
export const settings = pgTable("settings", {
  id: integer("id").primaryKey().default(1),
  starterFeeMinor: integer("starter_fee_minor").notNull().default(0),
  professionalFeeMinor: integer("professional_fee_minor").notNull().default(150_000),
  premierFeeMinor: integer("premier_fee_minor").notNull().default(400_000),
  starterCommissionBps: integer("starter_commission_bps").notNull().default(2000),
  professionalCommissionBps: integer("professional_commission_bps").notNull().default(1500),
  premierCommissionBps: integer("premier_commission_bps").notNull().default(1000),
  workshopFeeBps: integer("workshop_fee_bps").notNull().default(1500),
  speakerFeeBps: integer("speaker_fee_bps").notNull().default(2000),
  aiFacilitatorBps: integer("ai_facilitator_bps").notNull().default(6000),
  certificateFeeMinor: integer("certificate_fee_minor").notNull().default(50_000),
  boostFeeMinor: integer("boost_fee_minor").notNull().default(200_000),
  partnerPlanFeeMinor: integer("partner_plan_fee_minor").notNull().default(15_000_000),
  enterprisePlanFeeMinor: integer("enterprise_plan_fee_minor").notNull().default(40_000_000),
  partnerDiscountBps: integer("partner_discount_bps").notNull().default(1000),
  aiBriefingPriceMinor: integer("ai_briefing_price_minor").notNull().default(8_000_000),
  aiOneDayPriceMinor: integer("ai_one_day_price_minor").notNull().default(25_000_000),
  techPartnerBps: integer("tech_partner_bps").notNull().default(3000),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Expert = typeof experts.$inferSelect;
export type Workshop = typeof workshops.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type SettingsRow = typeof settings.$inferSelect;
export type StreamName = (typeof streamEnum.enumValues)[number];
export type ExpertPlan = (typeof expertPlanEnum.enumValues)[number];
export type OrgPlan = (typeof orgPlanEnum.enumValues)[number];
