import { describe, it, expect } from "vitest";
import { parseHotelDates, formatHotelStay } from "@/lib/hotelDates";

describe("src/lib/hotelDates", () => {
  describe("parseHotelDates", () => {
    it("returns null for null or undefined input", () => {
      expect(parseHotelDates(null)).toBeNull();
      expect(parseHotelDates(undefined)).toBeNull();
      expect(parseHotelDates("")).toBeNull();
    });

    it("parses direct checkIn and checkOut Date objects", () => {
      const checkIn = new Date("2026-10-21T00:00:00.000Z");
      const checkOut = new Date("2026-10-24T00:00:00.000Z");
      const result = parseHotelDates({ checkIn, checkOut });

      expect(result).not.toBeNull();
      expect(result?.startDate).toBe("2026-10-21");
      expect(result?.endDate).toBe("2026-10-24");
      expect(result?.nights).toBe(3);
    });

    it("parses direct checkIn and checkOut string dates", () => {
      const result = parseHotelDates({
        checkIn: "2026-10-21",
        checkOut: "2026-10-23",
      });

      expect(result).not.toBeNull();
      expect(result?.startDate).toBe("2026-10-21");
      expect(result?.endDate).toBe("2026-10-23");
      expect(result?.nights).toBe(2);
    });

    it("parses ISO range from dateRange string", () => {
      const result = parseHotelDates("2026-10-21 - 2026-10-25");
      expect(result).not.toBeNull();
      expect(result?.startDate).toBe("2026-10-21");
      expect(result?.endDate).toBe("2026-10-25");
      expect(result?.nights).toBe(4);
    });

    it("parses Pattern A: '21-24 Oct 2026'", () => {
      const result = parseHotelDates("21-24 Oct 2026");
      expect(result).not.toBeNull();
      expect(result?.startDate).toBe("2026-10-21");
      expect(result?.endDate).toBe("2026-10-24");
      expect(result?.nights).toBe(3);
    });

    it("parses Pattern A with Thai month: '21-24 ต.ค. 2569'", () => {
      const result = parseHotelDates("21-24 ต.ค. 2569");
      expect(result).not.toBeNull();
      expect(result?.startDate).toBe("2026-10-21");
      expect(result?.endDate).toBe("2026-10-24");
      expect(result?.nights).toBe(3);
    });

    it("parses Pattern B: '21 Oct 2026 - 23 Oct 2026'", () => {
      const result = parseHotelDates("21 Oct 2026 - 23 Oct 2026");
      expect(result).not.toBeNull();
      expect(result?.startDate).toBe("2026-10-21");
      expect(result?.endDate).toBe("2026-10-23");
      expect(result?.nights).toBe(2);
    });

    it("parses across month boundaries: '28 Oct 2026 - 2 Nov 2026'", () => {
      const result = parseHotelDates("28 Oct 2026 - 2 Nov 2026");
      expect(result).not.toBeNull();
      expect(result?.startDate).toBe("2026-10-28");
      expect(result?.endDate).toBe("2026-11-02");
      expect(result?.nights).toBe(5);
    });
  });

  describe("formatHotelStay", () => {
    it("formats hotel stay in English with nights count", () => {
      const formatted = formatHotelStay(
        { checkIn: "2026-10-21", checkOut: "2026-10-23" },
        "en"
      );
      expect(formatted).toMatch(/21 Oct.*23 Oct.*2026.*\(2 nights\)/i);
    });

    it("formats hotel stay in Thai with Buddhist Era year and (X คืน)", () => {
      const formatted = formatHotelStay(
        { checkIn: "2026-10-21", checkOut: "2026-10-24" },
        "th"
      );
      expect(formatted).toContain("2569");
      expect(formatted).toContain("(3 คืน)");
    });

    it("formats hotel stay without nights label when includeNights is false", () => {
      const formatted = formatHotelStay(
        { checkIn: "2026-10-21", checkOut: "2026-10-23" },
        "en",
        { includeNights: false }
      );
      expect(formatted).not.toContain("nights");
      expect(formatted).toMatch(/21 Oct.*23 Oct.*2026/i);
    });

    it("gracefully falls back to raw dateRange string if unparseable", () => {
      expect(formatHotelStay("Custom Date Text", "en")).toBe("Custom Date Text");
    });
  });
});
