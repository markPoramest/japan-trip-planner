# Feature Deep Dives & Key Subsystems

This document explains the specialized subsystems of the **Japan Trip Planner**: the Substitute Plans system, the Hotel Dates engine, the Bilingual i18n system, and the Itinerary Export system. All internal links use portable relative paths.

---

## 1. Substitute Plans System

### Concept & Motivation
In Japan travel, weather (e.g. rain at Mt. Fuji or typhoons in autumn) or unexpected closures frequently require contingency planning. The application allows up to 4 plans per day:
- **1 Main Plan** (`isMain: true`): The current active schedule for the day.
- **Up to 3 Substitute Plans** (`isMain: false`): Alternative plans tagged as `rainy`, `indoor`, `chill`, `backup`, or `custom`.

### Plan Swapping Lifecycle
When the user switches a plan to become the new Main plan:
1. In [src/components/DayTimeline.tsx](../../../../src/components/DayTimeline.tsx), `handleConfirmSwapPlan(newPlanId)` is triggered.
2. **Optimistic UI**: `localPlans` state is updated immediately using `normalizePlanList()`, marking `newPlanId` as `isMain: true` and the old main as `isMain: false`.
3. **Portal Loading Overlay**: A full-screen portal modal (`isSwapping = true`) is displayed with an animated swap icon, spinner, and localized message (`swappingPlanLoadingTitle`).
4. **Server Action**: `swapMainPlan(dayId, newPlanId)` is executed in [src/lib/actions.ts](../../../../src/lib/actions.ts).
5. **Revalidation & Settle**: The server runs `revalidatePath()`, the client invokes `startTransition(() => router.refresh())`, and the overlay is dismissed after a 600ms buffer to ensure smooth rendering.

### Presentation Rules
- **Day Card on Overview ([src/components/DayCard.tsx](../../../../src/components/DayCard.tsx))**: Shows the active day itinerary. Stop count badge (`activeActivities.length`), IC card cost, and cash/card cost strictly reflect the active Main Plan (`isMain: true`), never combining substitute plan counts.
- **Trip Overview Page ([src/app/trips/page.tsx](../../../../src/app/trips/page.tsx))**: Pre-filters days to main plans when computing total activities and trip cost.
- **Export View ([src/components/ExportItineraryView.tsx](../../../../src/components/ExportItineraryView.tsx))**: Strictly filters out substitute plans and displays ONLY activities from `isMain: true` plans.

---

## 2. Hotel Dates Engine (`src/lib/hotelDates.ts`)

Hotel bookings store check-in/out timestamps and must format stay durations accurately in both English and Thai.

### Utility API:
- `parseHotelDates(hotel, trip)`:
  - Extracts valid `checkIn` and `checkOut` `Date` objects.
  - Falls back to parsing legacy `dateRange` strings (e.g. `"21-23 Oct"`, `"21 - 23 Oct 2026"`) if `DateTime` fields are null.
  - Accurately computes `nightsCount = differenceInCalendarDays(checkOut, checkIn)`.
- `formatHotelStay(hotel, language)`:
  - Formats the stay into a human-readable range with night count.
  - **English Format**: `21 - 23 Oct 2026 (2 nights)`
  - **Thai Format**: `21 - 23 ต.ค. 2569 (2 คืน)` (converts Gregorian year to Thai Buddhist Era: `Year + 543`).

### Important Rule:
Never manually calculate nights or format hotel date strings in components. Always import and use `formatHotelStay` from [src/lib/hotelDates.ts](../../../../src/lib/hotelDates.ts).

---

## 3. Bilingual i18n System (`src/lib/i18n.ts`)

The application supports English (`en`) and Thai (`th`) throughout all components and export views.

### Structure:
```ts
export const translations = {
  en: {
    appTitle: "Japan Trip Planner",
    // ...
  },
  th: {
    appTitle: "แผนเที่ยวญี่ปุ่น",
    // ...
  }
};
```

### Accessing Translations:
```tsx
import { useLanguage } from "@/context/LanguageContext";

export function MyComponent() {
  const { t, language } = useLanguage();
  return <h2>{t.myKey}</h2>;
}
```

### Best Practices:
1. **Always add keys to BOTH `en` and `th`**.
2. **Do not use inline language conditionals**:
   - ❌ `{language === "th" ? "วันที่เข้าพัก" : "Stay Dates"}`
   - ✅ `{t.stayDates}`
3. **Dynamic interpolation**: Use template replacement in `t()` or formatted helper functions.

---

## 4. Export & Itinerary Generation

Located at [src/app/trips/[tripId]/export/page.tsx](../../../../src/app/trips/[tripId]/export/page.tsx) and [src/components/ExportItineraryView.tsx](../../../../src/components/ExportItineraryView.tsx):
- Allows users to export their complete trip itinerary as a high-resolution PNG image (using `html-to-image`) or print to PDF.
- Includes a dedicated language toggle directly on the export toolbar so users can export in Thai or English independently of their profile setting.
- Renders hotel stays using localized `formatHotelStay(hotel, exportLanguage)`.
- Renders only the Main Plan activities for every day.

---

## 5. Share & Instagram Story Generator (`ShareTripModal.tsx`)

Located at [src/components/ShareTripModal.tsx](../../../../src/components/ShareTripModal.tsx):
- Generates 9:16 Instagram Story summary cards with full financial estimates and daily route cards.
- Day cards on the story canvas require `dayCostJpy` and activity costs to render non-zero daily totals.
- Both [TripOverviewClient.tsx](../../../../src/components/TripOverviewClient.tsx) and [TripsListClient.tsx](../../../../src/components/TripsListClient.tsx) must pass `dayCostJpy` and active Main Plan activities (`cost` included) when opening the modal.
