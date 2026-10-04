import { describe, it, expect } from "vitest";
import { normalizeText, fuzzyMatch, getMatchedSegments } from "@/lib/fuzzy";

describe("src/lib/fuzzy", () => {
  describe("normalizeText", () => {
    it("converts to lowercase and trims whitespace", () => {
      expect(normalizeText("  TOKYO  ")).toBe("tokyo");
    });

    it("strips accents and diacritics", () => {
      expect(normalizeText("Tōkyō")).toBe("tokyo");
      expect(normalizeText("Kyōto")).toBe("kyoto");
      expect(normalizeText("Café")).toBe("cafe");
    });

    it("handles empty strings", () => {
      expect(normalizeText("")).toBe("");
    });
  });

  describe("fuzzyMatch", () => {
    it("returns matches true for empty pattern", () => {
      const res = fuzzyMatch("", "Asakusa");
      expect(res.matches).toBe(true);
      expect(res.indices).toEqual([]);
    });

    it("returns matches false for empty text with pattern", () => {
      const res = fuzzyMatch("Tokyo", "");
      expect(res.matches).toBe(false);
    });

    it("matches exact text with highest score", () => {
      const res = fuzzyMatch("Tokyo", "Tokyo");
      expect(res.matches).toBe(true);
      expect(res.score).toBe(1000);
      expect(res.indices).toEqual([0, 1, 2, 3, 4]);
    });

    it("matches exact text case-insensitively", () => {
      const res = fuzzyMatch("tokyo", "TOKYO");
      expect(res.matches).toBe(true);
      expect(res.score).toBe(1000);
      expect(res.indices).toEqual([0, 1, 2, 3, 4]);
    });

    it("matches substring at word start", () => {
      const res = fuzzyMatch("Sensoji", "Asakusa Sensoji Temple");
      expect(res.matches).toBe(true);
      expect(res.indices).toEqual([8, 9, 10, 11, 12, 13, 14]);
    });

    it("matches diacritics normalized pattern", () => {
      const res = fuzzyMatch("tokyo", "Tōkyō Station");
      expect(res.matches).toBe(true);
    });

    it("matches sequence fuzzy characters (e.g. shinjuku -> shk)", () => {
      const res = fuzzyMatch("shk", "Shinjuku");
      expect(res.matches).toBe(true);
      expect(res.indices.length).toBe(3);
    });

    it("returns false when characters do not match in sequence", () => {
      const res = fuzzyMatch("xyz", "Tokyo Tower");
      expect(res.matches).toBe(false);
    });

    it("matches Thai and Japanese script", () => {
      expect(fuzzyMatch("วัด", "วัดอาซากุสะ").matches).toBe(true);
      expect(fuzzyMatch("浅草", "浅草寺").matches).toBe(true);
    });
  });

  describe("getMatchedSegments", () => {
    it("returns single non-matched segment when indices are empty", () => {
      const segments = getMatchedSegments("Tokyo", []);
      expect(segments).toEqual([{ text: "Tokyo", match: false }]);
    });

    it("correctly splits matched and unmatched parts", () => {
      // "Tokyo Tower", matching "Tokyo" (indices 0, 1, 2, 3, 4)
      const segments = getMatchedSegments("Tokyo Tower", [0, 1, 2, 3, 4]);
      expect(segments).toEqual([
        { text: "Tokyo", match: true },
        { text: " Tower", match: false },
      ]);
    });

    it("preserves original character casing in segments", () => {
      const segments = getMatchedSegments("Shinjuku Gyoen", [0, 1, 2]);
      expect(segments).toEqual([
        { text: "Shi", match: true },
        { text: "njuku Gyoen", match: false },
      ]);
    });

    it("handles multiple separate matched blocks", () => {
      // indices 0 and 6: "T" and "T" in "Tokyo Tower"
      const segments = getMatchedSegments("Tokyo Tower", [0, 6]);
      expect(segments).toEqual([
        { text: "T", match: true },
        { text: "okyo ", match: false },
        { text: "T", match: true },
        { text: "ower", match: false },
      ]);
    });
  });
});
