/**
 * Revenue rules. Pure functions only — every split the platform posts to the
 * ledger is computed here, so the rules are tested in one place.
 */
import type { ExpertPlan, OrgPlan, SettingsRow, StreamName } from "@/db/schema";
import { assertMinor, bpsOf } from "./money";

export type Rates = Omit<SettingsRow, "id" | "updatedAt">;

export interface Split {
  grossMinor: number;
  /** Paid out to the expert, speaker or facilitator. */
  payoutMinor: number;
  /** Kept by the platform. */
  platformMinor: number;
  /** Platform share for the operating partner. */
  operatorMinor: number;
  /** Platform share for the technology partner. */
  techPartnerMinor: number;
}

function withPartnerSplit(grossMinor: number, payoutMinor: number, techPartnerBps: number): Split {
  const platformMinor = grossMinor - payoutMinor;
  const techPartnerMinor = bpsOf(platformMinor, techPartnerBps);
  return {
    grossMinor,
    payoutMinor,
    platformMinor,
    operatorMinor: platformMinor - techPartnerMinor,
    techPartnerMinor,
  };
}

/** The platform keeps `feeBps` of the gross; the rest is paid out. */
export function splitByPlatformFee(grossMinor: number, feeBps: number, techPartnerBps: number): Split {
  assertMinor(grossMinor);
  return withPartnerSplit(grossMinor, grossMinor - bpsOf(grossMinor, feeBps), techPartnerBps);
}

/** The payee receives `payoutBps` of the gross; the platform keeps the rest. */
export function splitByPayoutShare(grossMinor: number, payoutBps: number, techPartnerBps: number): Split {
  assertMinor(grossMinor);
  return withPartnerSplit(grossMinor, bpsOf(grossMinor, payoutBps), techPartnerBps);
}

/** Revenue the platform keeps in full (subscriptions, certificates, plans, sponsorship). */
export function platformRevenue(grossMinor: number, techPartnerBps: number): Split {
  assertMinor(grossMinor);
  return withPartnerSplit(grossMinor, 0, techPartnerBps);
}

export function commissionBps(plan: ExpertPlan, r: Rates): number {
  switch (plan) {
    case "STARTER":
      return r.starterCommissionBps;
    case "PROFESSIONAL":
      return r.professionalCommissionBps;
    case "PREMIER":
      return r.premierCommissionBps;
  }
}

export function expertPlanFee(plan: ExpertPlan, r: Rates): number {
  switch (plan) {
    case "STARTER":
      return r.starterFeeMinor;
    case "PROFESSIONAL":
      return r.professionalFeeMinor;
    case "PREMIER":
      return r.premierFeeMinor;
  }
}

export function orgPlanFee(plan: OrgPlan, r: Rates): number {
  switch (plan) {
    case "PAYG":
      return 0;
    case "PARTNER":
      return r.partnerPlanFeeMinor;
    case "ENTERPRISE":
      return r.enterprisePlanFeeMinor;
  }
}

/** Annual-plan organizations get a discount on bookings. */
export function orgBookingPrice(quoteMinor: number, plan: OrgPlan, r: Rates): number {
  assertMinor(quoteMinor);
  if (plan === "PAYG") return quoteMinor;
  return quoteMinor - bpsOf(quoteMinor, r.partnerDiscountBps);
}

export function aiPackagePrice(pkg: "EXECUTIVE_BRIEFING" | "ONE_DAY_INTENSIVE", r: Rates): number {
  return pkg === "EXECUTIVE_BRIEFING" ? r.aiBriefingPriceMinor : r.aiOneDayPriceMinor;
}

/** Plans that can sell workshops and issue certificates. */
export function canSellAndCertify(plan: ExpertPlan): boolean {
  return plan !== "STARTER";
}

export const STREAM_LABELS: Record<StreamName, string> = {
  BOOKING_COMMISSION: "Booking commission",
  WORKSHOP_TICKETS: "Workshop tickets",
  SPEAKER_FEES: "Speaker fees",
  AI_FOR_LEADERS: "AI for Leaders",
  CERTIFICATES: "Certificates",
  EXPERT_SUBSCRIPTIONS: "Expert subscriptions",
  FEATURED_LISTINGS: "Featured listings",
  ORGANIZATION_PLANS: "Organization plans",
  SPONSORSHIP: "Sponsorship",
};
