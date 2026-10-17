import { describe, expect, it } from "vitest";
import { bpsOf, formatBps, formatTaka, toMinor } from "@/lib/money";
import {
  commissionBps,
  orgBookingPrice,
  platformRevenue,
  splitByPayoutShare,
  splitByPlatformFee,
  type Rates,
} from "@/lib/revenue";

const rates = {
  starterFeeMinor: 0, professionalFeeMinor: 150_000, premierFeeMinor: 400_000,
  starterCommissionBps: 2000, professionalCommissionBps: 1500, premierCommissionBps: 1000,
  workshopFeeBps: 1500, speakerFeeBps: 2000, aiFacilitatorBps: 6000,
  certificateFeeMinor: 50_000, boostFeeMinor: 200_000,
  partnerPlanFeeMinor: 15_000_000, enterprisePlanFeeMinor: 40_000_000, partnerDiscountBps: 1000,
  aiBriefingPriceMinor: 8_000_000, aiOneDayPriceMinor: 25_000_000, techPartnerBps: 3000,
} satisfies Rates;

describe("money", () => {
  it("formats taka with lakh grouping", () => {
    expect(formatTaka(toMinor(150_000))).toBe("৳1,50,000");
    expect(formatTaka(12_345)).toBe("৳123.45");
  });
  it("rounds basis-point shares to the nearest poisha", () => {
    expect(bpsOf(333, 1500)).toBe(50);
    expect(() => bpsOf(-1, 100)).toThrow();
    expect(() => bpsOf(100, 10_001)).toThrow();
  });
  it("formats rates", () => {
    expect(formatBps(1500)).toBe("15%");
    expect(formatBps(1250)).toBe("12.5%");
  });
});

describe("splits", () => {
  it("booking commission depends on the expert plan", () => {
    const gross = toMinor(380_000);
    const s = splitByPlatformFee(gross, commissionBps("PROFESSIONAL", rates), rates.techPartnerBps);
    expect(s.platformMinor).toBe(toMinor(57_000));
    expect(s.payoutMinor).toBe(toMinor(323_000));
    expect(s.techPartnerMinor).toBe(toMinor(17_100));
    expect(s.operatorMinor).toBe(toMinor(39_900));
  });

  it("every split adds up exactly, including odd amounts", () => {
    for (const gross of [1, 7, 99, 333, 1_234_567, 99_999_999]) {
      for (const bps of [0, 1, 1000, 1500, 3333, 10_000]) {
        const s = splitByPlatformFee(gross, bps, 3000);
        expect(s.payoutMinor + s.platformMinor).toBe(gross);
        expect(s.operatorMinor + s.techPartnerMinor).toBe(s.platformMinor);
        expect(s.payoutMinor).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("AI for Leaders pays the facilitator a share", () => {
    const s = splitByPayoutShare(rates.aiOneDayPriceMinor, rates.aiFacilitatorBps, rates.techPartnerBps);
    expect(s.payoutMinor).toBe(toMinor(150_000));
    expect(s.platformMinor).toBe(toMinor(100_000));
  });

  it("subscriptions are platform revenue only", () => {
    const s = platformRevenue(rates.premierFeeMinor, rates.techPartnerBps);
    expect(s.payoutMinor).toBe(0);
    expect(s.platformMinor).toBe(rates.premierFeeMinor);
  });

  it("annual-plan organizations get the booking discount", () => {
    expect(orgBookingPrice(toMinor(100_000), "PAYG", rates)).toBe(toMinor(100_000));
    expect(orgBookingPrice(toMinor(100_000), "PARTNER", rates)).toBe(toMinor(90_000));
  });
});
