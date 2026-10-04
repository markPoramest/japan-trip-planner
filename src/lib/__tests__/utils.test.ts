import { describe, it, expect } from "vitest";
import { formatJPY, formatTHB, formatNumber, cn } from "@/lib/utils";

describe("src/lib/utils", () => {
  describe("cn", () => {
    it("merges class names correctly", () => {
      expect(cn("px-2", "py-1")).toBe("px-2 py-1");
    });

    it("handles conditional classes and tailwind-merge overrides", () => {
      expect(cn("px-2 py-1", false && "hidden", "px-4")).toBe("py-1 px-4");
    });
  });

  describe("formatJPY", () => {
    it("formats positive integer amounts in Japanese Yen format", () => {
      const result = formatJPY(15000);
      expect(result).toMatch(/¥\s*15,000|￥15,000/);
    });

    it("handles zero amount", () => {
      const result = formatJPY(0);
      expect(result).toMatch(/¥\s*0|￥0/);
    });

    it("handles null, undefined, and NaN gracefully", () => {
      expect(formatJPY(null)).toBe("¥0");
      expect(formatJPY(undefined)).toBe("¥0");
      expect(formatJPY(NaN)).toBe("¥0");
    });
  });

  describe("formatTHB", () => {
    it("formats amount in Thai Baht format with 2 decimal places", () => {
      const result = formatTHB(3500);
      expect(result).toMatch(/฿\s*3,500\.00/);
    });

    it("handles zero amount", () => {
      const result = formatTHB(0);
      expect(result).toMatch(/฿\s*0\.00/);
    });

    it("handles null, undefined, and NaN gracefully", () => {
      expect(formatTHB(null)).toBe("฿0");
      expect(formatTHB(undefined)).toBe("฿0");
      expect(formatTHB(NaN)).toBe("฿0");
    });
  });

  describe("formatNumber", () => {
    it("formats numbers with comma separators", () => {
      expect(formatNumber(1234567)).toBe("1,234,567");
      expect(formatNumber(0)).toBe("0");
    });

    it("handles null and undefined", () => {
      expect(formatNumber(null)).toBe("0");
      expect(formatNumber(undefined)).toBe("0");
      expect(formatNumber(NaN)).toBe("0");
    });
  });
});
