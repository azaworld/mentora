import { describe, expect, it } from "vitest";
import { certificateCode, normalizeCertificateCode, slugify, tranId } from "@/lib/codes";

describe("codes", () => {
  it("certificate codes round-trip through normalization", () => {
    for (let i = 0; i < 200; i++) {
      const code = certificateCode(2026);
      expect(normalizeCertificateCode(code.toLowerCase())).toBe(code);
    }
  });
  it("rejects malformed certificate codes", () => {
    expect(normalizeCertificateCode("MN-2026-1234")).toBeNull();
    expect(normalizeCertificateCode("QC-2026-ABCDEFGH")).toBeNull();
    expect(normalizeCertificateCode("MN-2026-ABCDEFGI")).toBeNull();
  });
  it("transaction ids are unique", () => {
    const ids = new Set(Array.from({ length: 1000 }, () => tranId()));
    expect(ids.size).toBe(1000);
  });
  it("slugifies names", () => {
    expect(slugify("Quazi M. Ahmed")).toBe("quazi-m-ahmed");
  });
});
