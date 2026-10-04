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
- **Streamlined Header & Tabs Bar ([src/components/DayTimeline.tsx](../../../../src/components/DayTimeline.tsx))**: The redundant "Active Main Plan" (`กำลังใช้งานแผนนี้เป็นหลักอยู่`) banner has been eliminated. The "Edit Plan Name" button is integrated directly into the plan tabs toolbar alongside `{substituteCount} / 3`, significantly trimming vertical header thickness and removing dead space.

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
- Allows users to export their complete trip itinerary as a high-resolution PNG image or print to PDF.
- **Dedicated Loading Skeleton**: [ExportItinerarySkeleton.tsx](../../../../src/components/skeletons/ExportItinerarySkeleton.tsx) configured in [src/app/trips/[tripId]/export/loading.tsx](../../../../src/app/trips/[tripId]/export/loading.tsx) so loading matches the A4 document layout instead of the overview dashboard.
- Includes a dedicated language toggle directly on the export toolbar so users can export in Thai or English independently of their profile setting.
- Renders hotel stays using localized `formatHotelStay(hotel, exportLanguage)`.
- Renders only the Main Plan activities for every day.
- **Remarks & Links**: Detects URLs in activity remarks (`act.remark.match(/https?:\/\/[^\s]+/)`) and renders active clickable links (`🔗 {remark}`) without stripping URLs.
- **Print & PDF Export**: Natural page margins are preserved for clean multi-page pagination. Browser URLs and page numbers can be hidden by unchecking "Headers and footers" in the browser print dialog. Floating action bar includes a helpful tip banner.

---

## 5. Share & Instagram Story Generator (`ShareTripModal.tsx`)

Located at [src/components/ShareTripModal.tsx](../../../../src/components/ShareTripModal.tsx):
- **Single-View Collapsible Architecture (Default = Folded)**:
  - Replaced the tab switcher with a single modal view containing independent collapsible accordion rows that **default to folded/collapsed** upon opening (`linkExpanded: false`, `storyExpanded: false`), allowing easy addition of future sharing options (e.g., export formats, other social platforms) as new rows.
  - **Row 1: Share via Link & Privacy**: Collapsible card with Globe/Lock icon, public/private badge, clean on/off switch (**On** = `Can share`, **Off** = `Can't share`), standard `h-6 w-11` toggle track, copyable link, and native device share button.
  - **Row 2: Instagram Story (9:16) Generator**: Collapsible card with Instagram icon, 9:16 badge, theme switcher, canvas preview, photo upload slot controls, and PNG download.
- Generates 9:16 Instagram Story summary cards with full financial estimates and daily route cards.
- **Top Panel Layout**:
  - Row 1: App logo & branding (`Japan Trip Planner` / `แพลนทริปญี่ปุ่น`) with subtitle on the left; Duration badge (`{durationDays} DAYS` / `{durationDays} วัน`) and decorative Autumn Maple Leaf on the right, eliminating awkward top-right empty space.
  - Row 2: Trip title (prominent with full horizontal breathing room) and localized date range pill (`startStr – endStr`).
- **Two-Column Split Layout**:
  - **Left Side**: Displays up to 2 user-uploadable travel photos in tilted Polaroid frames with washi tape, custom captions, and Japanese travel calligraphy (`また、日本の旅を。` with localized subtitle). If no photo is uploaded, falls back to CORS-safe default Japanese scenery vector illustrations.
  - **Right Side**: Displays a vertical connected Daily Route timeline (Day 1 - Day N) with orange node dots, day badge (`Day X` / `วันที่ X`), destination titles, and individual day costs (sleek and minimal without misleading landmark icons).
- **Full Bilingual Localization (EN/TH)**:
  - All labels across the 9:16 story canvas (app title, subtitle, duration badge, dates in Thai Buddhist Era / Western Gregorian, estimated cost header, 4 category chips, timeline title, day badges, collapsible section headers) dynamically adapt to Thai (`th`) and English (`en`) via [src/lib/i18n.ts](../../../../src/lib/i18n.ts).
- **Clean Footer Brand Stamp**: Minimal footer displaying Japanese travel stamp `🚄 日本旅行` and brand signature `MARK NO NIHON TABI`.
- Day cards on the story canvas require `dayCostJpy` and activity costs to render non-zero daily totals.
- Both [TripOverviewClient.tsx](../../../../src/components/TripOverviewClient.tsx) and [TripsListClient.tsx](../../../../src/components/TripsListClient.tsx) pass `dayCostJpy` and active Main Plan activities (`cost` included) when opening the modal.

---

## 6. Financial Summary & Overview Stats Layout (`TripStats.tsx`)

Located at [src/components/TripStats.tsx](../../../../src/components/TripStats.tsx) and matched in [TripOverviewSkeleton.tsx](../../../../src/components/skeletons/TripOverviewSkeleton.tsx):
- **Two-Column 40% / 60% Single-Row Financial Hierarchy**:
  - **Column 1 (`Grand Total Estimated`, 40% width / `lg:w-2/5`)**: Occupies 40% width on desktop. Features warm peach styling (`bg-[#FFF9F5] border-2 border-accent`), wallet icon badge, `tripAndPocketBudget` subtitle, large bold THB total, JPY approx, and fully visible 6-bar vertical sparkline chart with explicit pixel heights.
  - **Column 2 (`Flights`, `Hotels`, `Passes`, `Total Everyday`, 60% width / `lg:w-3/5`)**: Arranged in the **same single row** (`grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-2`) taking 60% of the row, each with category icons, dual-currency values, spend percentage pill, and gradient progress bar.
  - Breakdown expand/collapse toggle removed; both columns are permanently visible with identical card height and zero empty space.
- **Responsive Stacking**:
  - Mobile (<640px): Grand Total card on top, 4 sub-category cards in a 2x2 grid underneath.
  - Tablet (640px - 1023px): Grand Total card on top, 4 sub-category cards in a single row underneath.
  - Desktop (>=1024px): 40% Grand Total on the left + 60% 4 sub-categories in the same row on the right.
- **Zero Layout Shift**: [TripOverviewSkeleton.tsx](../../../../src/components/skeletons/TripOverviewSkeleton.tsx) mirrors the exact 40/60 single-row layout and DayCard 2-column cost box during page transitions.

---

## 7. Day Itinerary Swapping Engine (`SwapDayModal.tsx` & `swapTripDays`)

Located at [src/components/SwapDayModal.tsx](../../../../src/components/SwapDayModal.tsx) and [src/lib/actions.ts](../../../../src/lib/actions.ts):
- **Purpose**: Allows users to exchange the itineraries, stops, and activities of two different days (e.g. Day 2 and Day 3) when weather, closures, or travel preferences change.
- **Calendar-Safe Invariant**:
  - The calendar date sequence and chronological day numbers remain intact (Day 1 is Oct 21, Day 2 is Oct 22, Day 3 is Oct 23).
  - The two `TripDay` records atomically exchange `dayNumber`, `date`, `dayOfWeek`, and `slug` inside a Prisma transaction (`db.$transaction`).
  - All existing `DayPlan` records and `DayActivity` records stay safely associated with their original `TripDay` without reassigning hundreds of foreign keys.
- **Optimistic UI Execution**:
  - [TripOverviewClient.tsx](../../../../src/components/TripOverviewClient.tsx) maintains `localDays` in state and immediately swaps their positions upon user confirmation for instantaneous 0ms visual feedback.
  - Client component invokes `startTransition(() => router.refresh())` to seamlessly reconcile with the revalidated server paths.
- **Entry Points**:
  - Header Button: `⇄ Swap Days` / `⇄ สลับวันเดินทาง` positioned in the Daily Schedule section header.
  - Day Cards: Individual [DayCard.tsx](../../../../src/components/DayCard.tsx) headers maintain a clean presentation with only the stop count badge (`X stops` / `X จุดแวะ`), without swap or add buttons.

---

## 8. In-between Stop & Activity Insertion Engine

Located at [src/components/BatchActivityModal.tsx](../../../../src/components/BatchActivityModal.tsx) and [src/components/DayTimeline.tsx](../../../../src/components/DayTimeline.tsx):
- **Purpose**: Enables users to insert a new stop/activity at any position in the day schedule (e.g. between Stop 3 and Stop 4, before Stop 1, or after any stop).
- **Smart Midpoint Time Interpolation**:
  - `calculateIntermediateTime(prevRow, nextRow)` extracts the time from surrounding stops (e.g. 10:20 and 13:00) and computes the exact intermediate time (e.g. 11:40), rounded to 5-minute increments.
  - Automatically scrolls the newly created card smoothly into view and focuses its location input.
- **Entry Points**:
  - **In-between Dividers in Modal**: Interactive dashed divider button (`+ แทรกจุดแวะระหว่าง #{prev} กับ #{next}` / `+ Insert stop between #{prev} and #{next}`) positioned between every stop card.
  - **Card Header Action**: `+` icon button next to the delete button in each card header to insert immediately after that card.
  - **Top of Day Action**: `+ แทรกจุดแวะแรกของวัน` / `+ Insert stop at beginning of day` button to prepend a morning stop before Stop #1.
  - **Timeline View Action**: In-between insert divider buttons on [DayTimeline.tsx](../../../../src/components/DayTimeline.tsx) open the batch editor with `initialInsertIndex` pre-selected.

---

## 9. Unified "Manage Stops" Button & Modal UX Architecture

Located at [src/components/DayTimeline.tsx](../../../../src/components/DayTimeline.tsx) and [src/components/BatchActivityModal.tsx](../../../../src/components/BatchActivityModal.tsx):
- **Purpose**: Consolidates separate "Edit Stops" and "Add Stop / Activity" buttons into a single smart entry point with an upgraded, compact editing workflow.
- **Header Button State**:
  - When activities exist: displays `✏️ Manage Stops · {count}` (`✏️ จัดการจุดแวะ · {count}`) with an embedded stop count badge, opening the modal in `edit` mode.
  - When no activities exist: displays `+ Add Stop / Activity` (`+ เพิ่มสถานที่ / กิจกรรม`) with an animated pulsing ping indicator.
- **Sleek Compact Header**:
  - Compact single-line banner (`from-bg-surface via-bg-surface/95 to-accent/15`) with title, Day badge, Stops count pill (`📍 {count} stops`), and Time range pill (`🕒 {timeRange}`).
  - Subtitle and duplicate header total cost removed for an ultra-clean, minimal header profile.
- **Unified Add Stop Component Standard ("Add Another Stop" Principle)**:
  - Both top (`+ Add first stop to start the day` / `+ แทรกจุดแวะแรกของวัน`) and bottom (`+ Add Another Stop` / `+ เพิ่มสถานที่ถัดไป`) buttons share the exact same full-width card-aligned component styling (`pl-11 sm:pl-14`, rounded-2xl dashed border `border-accent/40 bg-accent/5 hover:bg-accent/10 text-accent font-bold`, `Plus` icon), creating clean visual symmetry at both ends of the schedule across both [BatchActivityModal.tsx](../../../../src/components/BatchActivityModal.tsx) and [DayTimeline.tsx](../../../../src/components/DayTimeline.tsx).
- **Vertical Timeline Track & Symmetrical 3-Row Stop Cards**:
  - **Left Timeline Track**: Vertical dashed connecting lines with solid accent circle badges (`1`, `2`, `3`...) and scheduled times (`06:30`, `08:09`) directly underneath each node.
  - **Right Stop Card**:
    - Row 1: `Location / Place name *` (with fuzzy dropdown suggestions), `Activity / Details *`, and Time pill (`Clock` icon + `HH:MM` inputs) + Delete button (`Trash2`).
    - Row 2: `Cost` (currency dropdown, amount, IC card checkbox) & `Rail Pass Used` (dropdown + custom input).
    - Row 3: `Remarks / Links (URL)` full-width input.
  - All fields are always visible without nested collapsibles or image columns.
- **In-between Dividers**:
  - Horizontal dashed divider between adjacent stop cards with centered `+ Add stop between #X and #Y` button.
- **Docked Footer**:
  - Left: `Clear All Stops` (`ล้างจุดแวะทั้งหมด`) with a dedicated in-app confirmation modal (no default browser `window.confirm` popups).
  - Center: Total estimated cost in JPY & THB.
  - Right: `Cancel` and `Save All Changes` buttons.
- **Required Field Validation & In-App Error Handling**:
  - Submitting with missing required fields (`Location` or `Activity`) blocks saving without disruptive browser alerts; it immediately highlights invalid inputs with red borders (`* Required`) and automatically focuses and scrolls the viewport to the first missing field. Empty stop rows are never silently discarded.
  - Zero native browser `alert()` or `confirm()` dialogs: clearing all stops triggers a polished in-app confirmation modal with Day title context, and batch save errors render an inline dismissible banner.
- **Chronological Time Auto-sorting on Save**:
  - Stops are automatically sorted in chronological order by scheduled time upon saving (e.g. Stop at 18:00 automatically moves before Stop at 18:30) with stable tie-breaking for identical times, ensuring daily timelines always stay properly sequenced across overview, export, and day timeline views.

---

## 10. Revamped Day Cost Stats Banner & Financial Breakdown

Located at [src/components/DayTimeline.tsx](../../../../src/components/DayTimeline.tsx):
- **Purpose**: Displays the active day/plan's financial expenditure overview in a unified, modern horizontal landscape card matching the app's aesthetic.
- **Card Styling**:
  - Warm beige background container: `bg-[#FAF3EA] dark:bg-bg-surface/50 border border-sand/30 dark:border-border rounded-3xl p-4 sm:p-5 shadow-xs`.
  - Responsive flex arrangement: stacks cleanly on mobile (`flex-col`) and unfolds into horizontal alignment on desktop (`lg:flex-row lg:items-center justify-between`).
- **Left KPI Summary**:
  - Double-ring circular coin container: `w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#FCE8D3] ring-8 ring-[#FCE8D3]/50` housing a prominent Lucide `Coins` SVG.
  - Plan-specific title label: `Total Day Cost`.
  - Prominent bold font-mono JPY display (`text-2xl sm:text-3xl font-black font-mono text-text-primary`) with localized THB approximation underneath, with generous space and no squishing toggle buttons.
- **Right Sub-category Cards (Stacked 2 Rows in Same Column)**:
  - Both cards are stacked vertically as two rows within a single column on the right (`flex flex-col gap-2.5 w-full md:w-auto md:min-w-[300px] lg:min-w-[340px]`):
  - **Row 1 (IC Card Spent)**: Styled in green emerald palette with `CreditCard` icon in `bg-emerald-500/10 text-emerald-600`, bold JPY, THB equivalent, percentage badge (`50%`), and a smooth gradient progress bar fill.
  - **Row 2 (Cash & Credit Card)**: Styled in warm orange palette with `Wallet` icon in `bg-orange-500/10 text-orange-600`, bold JPY, THB equivalent, percentage badge (`50%`), and a smooth gradient progress bar fill.
  - Built strictly using pure CSS/Tailwind and SVG vector icons without external bitmap image assets, permanently visible.

