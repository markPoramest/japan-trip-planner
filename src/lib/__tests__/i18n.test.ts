import { describe, it, expect } from "vitest";
import { translations } from "@/lib/i18n";

describe("src/lib/i18n", () => {
  it("has matching keys between English and Thai dictionaries", () => {
    const enKeys = Object.keys(translations.en).sort();
    const thKeys = Object.keys(translations.th).sort();

    const missingInTh = enKeys.filter((k) => !(k in translations.th));
    const missingInEn = thKeys.filter((k) => !(k in translations.en));

    expect(missingInTh).toEqual([]);
    expect(missingInEn).toEqual([]);
  });

  it("contains essential currency keys in both languages", () => {
    expect(translations.en.currencyAndCost).toBe("Currency & Cost");
    expect(translations.th.currencyAndCost).toBe("สกุลเงิน & ค่าใช้จ่าย");

    expect(translations.en.currencyAndHotelCost).toBe("Currency & Hotel Cost");
    expect(translations.th.currencyAndHotelCost).toBe("สกุลเงิน & ค่าโรงแรม");

    expect(translations.en.currencyAndAirfare).toBe("Currency & Airfare Cost");
    expect(translations.th.currencyAndAirfare).toBe("สกุลเงิน & ค่าตั๋วเครื่องบิน");

    expect(translations.en.currencyAndPassCost).toBe("Currency & Pass Cost");
    expect(translations.th.currencyAndPassCost).toBe("สกุลเงิน & ค่าพาส");
  });

  it("contains plan swapping and itinerary keys in both languages", () => {
    expect(translations.en.swappingPlanLoadingTitle).toBeDefined();
    expect(translations.th.swappingPlanLoadingTitle).toBeDefined();

    expect(translations.en.batchEditStops).toBeDefined();
    expect(translations.th.batchEditStops).toBeDefined();
  });
});
