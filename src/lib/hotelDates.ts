export interface HotelDateSource {
  dateRange?: string | null;
  checkIn?: string | Date | null;
  checkOut?: string | Date | null;
}

const MONTH_MAP: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
  // Thai short
  "ม.ค.": 1,
  "ก.พ.": 2,
  "มี.ค.": 3,
  "เม.ย.": 4,
  "พ.ค.": 5,
  "มิ.ย.": 6,
  "ก.ค.": 7,
  "ส.ค.": 8,
  "ก.ย.": 9,
  "ต.ค.": 10,
  "พ.ย.": 11,
  "ธ.ค.": 12,
  "ม.ค": 1,
  "ก.พ": 2,
  "มี.ค": 3,
  "เม.ย": 4,
  "พ.ค": 5,
  "มิ.ย": 6,
  "ก.ค": 7,
  "ส.ค": 8,
  "ก.ย": 9,
  "ต.ค": 10,
  "พ.ย": 11,
  "ธ.ค": 12,
  // Thai full
  มกราคม: 1,
  กุมภาพันธ์: 2,
  มีนาคม: 3,
  เมษายน: 4,
  พฤษภาคม: 5,
  มิถุนายน: 6,
  กรกฎาคม: 7,
  สิงหาคม: 8,
  กันยายน: 9,
  ตุลาคม: 10,
  พฤศจิกายน: 11,
  ธันวาคม: 12,
};

function resolveMonth(str: string): number | null {
  const clean = str.trim().toLowerCase();
  if (MONTH_MAP[clean]) return MONTH_MAP[clean];
  const prefix = clean.slice(0, 3);
  if (MONTH_MAP[prefix]) return MONTH_MAP[prefix];
  return null;
}

/**
 * Parses hotel stay dates from checkIn/checkOut fields or legacy dateRange strings.
 * Returns ISO date strings (YYYY-MM-DD) and calculated night count.
 */
export function parseHotelDates(
  hotel: HotelDateSource | string | null | undefined,
  defaultYear?: number
): { startDate: string; endDate: string; nights: number } | null {
  if (!hotel) return null;

  const fallbackYear = defaultYear || new Date().getFullYear();

  // 1. Direct checkIn and checkOut dates if available
  if (typeof hotel === "object") {
    if (hotel.checkIn && hotel.checkOut) {
      try {
        const sStr = typeof hotel.checkIn === "string" ? hotel.checkIn : hotel.checkIn.toISOString();
        const eStr = typeof hotel.checkOut === "string" ? hotel.checkOut : hotel.checkOut.toISOString();
        const s = sStr.split("T")[0];
        const e = eStr.split("T")[0];
        if (s && e) {
          const sDate = new Date(s + "T00:00:00");
          const eDate = new Date(e + "T00:00:00");
          if (!isNaN(sDate.getTime()) && !isNaN(eDate.getTime())) {
            const nights = Math.max(1, Math.round((eDate.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24)));
            return { startDate: s, endDate: e, nights };
          }
        }
      } catch {
        // Fall through to dateRange parsing
      }
    }
  }

  // 2. Parse from dateRange string
  const raw = (typeof hotel === "string" ? hotel : hotel.dateRange || "")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  if (!raw) return null;

  // 2a. Check for standard ISO dates YYYY-MM-DD
  const isoMatches = raw.match(/\d{4}-\d{2}-\d{2}/g);
  if (isoMatches && isoMatches.length >= 2) {
    const s = isoMatches[0];
    const e = isoMatches[1];
    const sDate = new Date(s + "T00:00:00");
    const eDate = new Date(e + "T00:00:00");
    const nights = Math.max(1, Math.round((eDate.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24)));
    return { startDate: s, endDate: e, nights };
  }

  const clean = raw.replace(/\(.*\)/g, "").trim();

  // 2b. Pattern A: Day-Day Month Year (e.g. '23-25 Oct 2026', '7-9 May 2026', '14-18 Feb 2026')
  const matchA = clean.match(/^(\d{1,2})\s*-\s*(\d{1,2})\s+([A-Za-zก-๙.]+)(?:\s+(\d{4}))?/i);
  if (matchA) {
    const sDay = matchA[1].padStart(2, "0");
    const eDay = matchA[2].padStart(2, "0");
    const mNum = resolveMonth(matchA[3]);
    if (mNum) {
      const rawYear = matchA[4] ? parseInt(matchA[4], 10) : fallbackYear;
      const year = rawYear > 2400 ? rawYear - 543 : rawYear;
      const mPadded = String(mNum).padStart(2, "0");
      const s = `${year}-${mPadded}-${sDay}`;
      const e = `${year}-${mPadded}-${eDay}`;
      const sDate = new Date(s + "T00:00:00");
      const eDate = new Date(e + "T00:00:00");
      const nights = Math.max(1, Math.round((eDate.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24)));
      return { startDate: s, endDate: e, nights };
    }
  }

  // 2c. Pattern B: Day Month (Year) - Day Month (Year) (e.g. '21 Oct - 23 Oct (2 nights)', '21 ต.ค. - 23 ต.ค.')
  const matchB = clean.match(
    /^(\d{1,2})\s+([A-Za-zก-๙.]+)(?:\s+(\d{4}))?\s*-\s*(\d{1,2})\s+([A-Za-zก-๙.]+)(?:\s+(\d{4}))?/i
  );
  if (matchB) {
    const sDay = matchB[1].padStart(2, "0");
    const sMonth = resolveMonth(matchB[2]);
    const eDay = matchB[4].padStart(2, "0");
    const eMonth = resolveMonth(matchB[5]);

    if (sMonth && eMonth) {
      const rawEndYear = matchB[6]
        ? parseInt(matchB[6], 10)
        : matchB[3]
        ? parseInt(matchB[3], 10)
        : fallbackYear;
      const endYear = rawEndYear > 2400 ? rawEndYear - 543 : rawEndYear;
      const rawStartYear = matchB[3] ? parseInt(matchB[3], 10) : endYear;
      const startYear = rawStartYear > 2400 ? rawStartYear - 543 : rawStartYear;

      const s = `${startYear}-${String(sMonth).padStart(2, "0")}-${sDay}`;
      const e = `${endYear}-${String(eMonth).padStart(2, "0")}-${eDay}`;
      const sDate = new Date(s + "T00:00:00");
      const eDate = new Date(e + "T00:00:00");
      const nights = Math.max(1, Math.round((eDate.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24)));
      return { startDate: s, endDate: e, nights };
    }
  }

  return null;
}

/**
 * Formats a hotel stay for localized UI display.
 * Example outputs:
 * - Thai: "21 ต.ค. – 23 ต.ค. 2569 (2 คืน)"
 * - English: "21 Oct – 23 Oct 2026 (2 nights)"
 */
export function formatHotelStay(
  hotel: HotelDateSource | string | null | undefined,
  language: string = "th",
  options?: { defaultYear?: number; includeNights?: boolean }
): string {
  const parsed = parseHotelDates(hotel, options?.defaultYear);
  if (!parsed) {
    return (typeof hotel === "string" ? hotel : hotel?.dateRange) || "";
  }

  const { startDate, endDate, nights } = parsed;
  const s = new Date(startDate + "T00:00:00");
  const e = new Date(endDate + "T00:00:00");
  const dateLocale = language === "th" ? "th-TH" : "en-GB";

  const nightsLabel =
    language === "th"
      ? `(${nights} คืน)`
      : `(${nights} ${nights > 1 ? "nights" : "night"})`;

  const isSameYear = s.getFullYear() === e.getFullYear();
  const startPart = isSameYear
    ? s.toLocaleDateString(dateLocale, { day: "numeric", month: "short" })
    : s.toLocaleDateString(dateLocale, { day: "numeric", month: "short", year: "numeric" });
  const endPart = e.toLocaleDateString(dateLocale, { day: "numeric", month: "short", year: "numeric" });

  const dateSpan = `${startPart} – ${endPart}`;
  return options?.includeNights === false ? dateSpan : `${dateSpan} ${nightsLabel}`;
}
