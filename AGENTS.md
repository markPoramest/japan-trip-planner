# Japan Trip Planner — Agent Guidelines & Architecture Map

> This file is loaded by AI agents (Antigravity, Claude, Copilot, etc.) to understand the codebase structure, patterns, constraints, and features without scanning the entire repository. Keep this file updated when introducing architectural changes. All links use portable repository-relative paths.

---

## 🚨 MANDATORY INSTRUCTION: ALWAYS UPDATE DOCUMENTATION ON CODE CHANGES
Whenever you fix bugs, refactor code, modify components, alter database schemas, add new server actions, or make any code changes:
1. **You MUST update [AGENTS.md](./AGENTS.md) and [GEMINI.md](./GEMINI.md)** in the same turn to reflect any changes in components, server actions, data schema, routes, or behavior.
2. If the change impacts deep subsystems (e.g., substitute plans, hotel dates, i18n, export, or server actions), **you MUST also update the corresponding file in [.agents/skills/japan-trip-planner/references/](./.agents/skills/japan-trip-planner/references/)**.
3. NEVER finish a task after modifying code without verifying that the documentation markdown files are updated and in sync with the codebase.
4. **Portability Rule**: ALWAYS use relative paths (e.g., `./src/...` or `../../...`) in markdown documentation so links remain valid across different PCs, operating systems, and environments. Never hardcode machine-specific absolute paths.

---

## 1. Quick Reference & Critical Environment Rules

- **Platform**: Windows / PowerShell (Script execution is disabled by policy).
- **TypeScript Check**: 
  - ❌ NEVER run `npx tsc` (fails due to Windows PowerShell script restriction).
  - ✅ ALWAYS run: `node node_modules/typescript/bin/tsc --noEmit`
- **Prisma CLI**:
  - ❌ NEVER run `npx prisma ...`
  - ✅ Run via: `node node_modules/prisma/build/index.js <command>` (or `npm run db:push`)
- **Testing (Vitest)**:
  - ✅ Run unit tests: `node node_modules/vitest/vitest.mjs run` (or `cmd /c "npm test"`)
- **Tech Stack**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Prisma ORM 5.22, PostgreSQL (Vercel Postgres/Neon), NextAuth 4.24, Vitest 2.1, React Testing Library, Lucide React, AOS.

---

## 2. Directory & File Map

```
japan-trip/
├── prisma/
│   └── schema.prisma         # PostgreSQL schema (Trip, TripDay, DayPlan, DayActivity, HotelBooking, etc.)
├── src/
│   ├── app/                  # Next.js 14 App Router routes
│   │   ├── page.tsx          # Root redirect (/trips if logged in, /login if not)
│   │   ├── login/            # Authentication UI
│   │   ├── trips/            # Trips list & management
│   │   │   ├── page.tsx      # All trips overview (TripsListClient)
│   │   │   ├── new/          # Create new trip wizard
│   │   │   └── [tripId]/     # Trip details
│   │   │       ├── page.tsx  # Trip overview dashboard (TripOverviewClient, DayCard list)
│   │   │       ├── bookings/ # Hotels, Passes, Flights, Budget Wallets (BookingsClient)
│   │   │       ├── summary/  # Cost breakdown & Excel matrix export (SummaryClient)
│   │   │       ├── export/   # Print & PNG itinerary view (ExportItineraryView)
│   │   │       └── days/[slug]/ # Detailed day itinerary & timeline (DayTimeline)
│   ├── components/           # Reusable UI components
│   │   ├── DayTimeline.tsx   # Day timeline, plan tabs (Main/Substitutes), unified "Manage Stops" button, optimistic plan swapping
│   │   ├── DayCard.tsx       # Day overview card on trip dashboard
│   │   ├── TripStats.tsx     # Financial summary cards (Col 1 Grand Total priority + Col 2 sub-category row)
│   │   ├── HotelModal.tsx    # Hotel booking create/edit modal
│   │   ├── HotelTable.tsx    # Hotel bookings list with localized stay formatting
│   │   ├── BatchActivityModal.tsx # Rapid batch entry for activities
│   │   ├── ExportItineraryView.tsx # Export view (MAIN plan only)
│   │   ├── ShareTripModal.tsx # 9:16 Instagram Story generator & share link modal
│   │   ├── SwapDayModal.tsx  # Modal to swap itinerary plans between two days
│   │   └── skeletons/        # Skeleton loaders for instant route transitions
│   ├── context/
│   │   ├── LanguageContext.tsx # Bilingual context (en / th)
│   │   ├── CurrencyContext.tsx # Multi-currency context (JPY / THB)
│   │   └── SessionProvider.tsx # NextAuth session provider
│   └── lib/
│       ├── actions.ts        # Next.js Server Actions (all mutations + ownership checks)
│       ├── auth.ts           # NextAuth options & Prisma adapter
│       ├── db.ts             # PrismaClient singleton instance
│       ├── hotelDates.ts     # Hotel stay parser, nights calculator, EN/TH Buddhist year formatter
│       ├── i18n.ts           # Central EN & TH translation dictionaries
│       └── utils.ts          # Tailwind cn() helper
└── .agents/
    └── skills/
        └── japan-trip-planner/ # Antigravity skill with deep reference documentation
```

---

## 3. Core Architectural Patterns

### A. Next.js Server Actions & Router Transitions
- All mutations reside in [src/lib/actions.ts](./src/lib/actions.ts) as `"use server"` functions.
- Every mutating action verifies ownership with `verifyTripOwnership`, `verifyDayOwnership`, or `verifyActivityOwnership`.
- **Crucial Pattern**: In client components, ALWAYS wrap `router.refresh()` inside `startTransition`:
  ```tsx
  startTransition(() => {
    router.refresh();
  });
  ```
  Without `startTransition`, Next.js drops into the route's `loading.tsx` skeleton and causes page flashing.

### B. Substitute Plans Architecture
- A `TripDay` has one Main plan (`isMain: true`) and up to 3 Substitute plans (`isMain: false`).
- Activities link to a specific `DayPlan` via `planId`.
- **Plan Swapping**: `swapMainPlan(dayId, newMainPlanId)` demotes the old main plan and promotes the selected plan.
- **Optimistic UI in [DayTimeline.tsx](./src/components/DayTimeline.tsx)**:
  - `localPlans` state is updated immediately on swap, delete, or rename.
  - An animated full-screen portal loading overlay (`isSwapping`) covers the screen during server processing to prevent visual glitches.
  - Dynamic elements in DayTimeline do NOT have `data-aos` attributes to avoid repeated re-animation artifacts.
  - **Streamlined Header & Tabs Bar**: The redundant "Active Main Plan" (`กำลังใช้งานแผนนี้เป็นหลักอยู่`) banner has been eliminated. The "Edit Plan Name" action is integrated directly into the plan tabs toolbar alongside `{substituteCount} / 3`, cutting unnecessary vertical space.
- **Export, Overview & Summary Views**: Only `isMain: true` plans must be shown on the export page ([ExportItineraryView.tsx](./src/components/ExportItineraryView.tsx)), summary pages, overview cards ([DayCard.tsx](./src/components/DayCard.tsx) stop count badge and costs), and the Instagram Story generator ([ShareTripModal.tsx](./src/components/ShareTripModal.tsx)). Never aggregate substitute plan activities into trip or day totals.

### C. Bilingual i18n (English & Thai)
- Dictionary located in [src/lib/i18n.ts](./src/lib/i18n.ts).
- Access via `const { t, language } = useLanguage();`.
- **Rule**: NEVER use inline language ternaries `{language === "th" ? "..." : "..."}` in component JSX. Always create keys in both `translations.en` and `translations.th`.

### D. Hotel Date Handling & Localization
- Model has `checkIn` and `checkOut` as `DateTime?` fields and `dateRange` as a legacy string.
- ALWAYS use [src/lib/hotelDates.ts](./src/lib/hotelDates.ts):
  - `parseHotelDates(hotel, trip)`: Extract valid check-in/out dates and night counts.
  - `formatHotelStay(hotel, language)`: Returns formatted stay string with nights count, using Thai Buddhist Era (พ.ศ. = AD + 543) for Thai and Gregorian year for English.

### E. Instagram Story Generator & Share Modal ([ShareTripModal.tsx](./src/components/ShareTripModal.tsx))
- **Consistent Modal Container**: Stays at standard `max-w-2xl` width without jarring size jumps.
- **Single Unified View with Collapsible Rows (Default = Folded)**:
  - Replaced the tab switcher (`[Instagram Story] [Share Link]`) with a single-tab view containing independent collapsible accordion rows that **default to folded/collapsed** (`linkExpanded: false`, `storyExpanded: false`) upon opening, keeping the modal neat and compact. Future sharing options can simply be added as new rows.
  - **Row 1: Share via Link & Privacy (`linkExpanded`)**:
    - Header: Globe/Lock icon, status badge, public URL / private label, and expand/collapse chevron toggle.
    - Content: Clean single switch toggle (**On** = `Can share` / `แชร์ได้ (เปิด)`, **Off** = `Can't share` / `แชร์ไม่ได้ (ปิด)`), shareable link with one-click copy, and native device share button. Standard Tailwind `h-6 w-11` track + `h-5 w-5` thumb (`translate-x-5`) prevents knob overflow.
  - **Row 2: Instagram Story (9:16) Generator (`storyExpanded`)**:
    - Header: Instagram icon, 9:16 badge, theme switcher (`light`/`dark`), and expand/collapse chevron toggle.
    - Content: Full 9:16 canvas preview, photo upload slot cards with stacked header buttons and full-width captions, and PNG download button.
- **9:16 Canvas Layout**:
  - Balanced Top Bar: App brand & subtitle on the left; Duration badge (`{durationDays} DAYS` / `{durationDays} วัน`) and decorative maple leaf on the right (eliminating top-right void).
  - Main Title & Date: Full-width trip title with localized date pill (`startStr – endStr`).
  - Two-Column Body: Up to 2 user photos with captions on the left; vertical daily route timeline on the right with day badges and costs (sleek and minimal without misleading landmark icons).
  - Photo Upload Controls: Stacked slot cards with compact `Upload` / `Change` button and delete icon in the slot header, with full-width caption inputs underneath so buttons never overflow column borders.
- **Full Bilingual Localization**: Every label (brand, costs, chips, timeline, badges, footer, privacy statuses, collapsible headers) uses [src/lib/i18n.ts](./src/lib/i18n.ts) without inline language conditionals.

### F. Export Itinerary & Print Configuration ([ExportItineraryView.tsx](./src/components/ExportItineraryView.tsx))
- **Dedicated Loading Skeleton**: [ExportItinerarySkeleton.tsx](./src/components/skeletons/ExportItinerarySkeleton.tsx) used in `src/app/trips/[tripId]/export/loading.tsx` to match the A4 sheet format during transitions.
- **Activity Remarks & URLs**: If an activity remark contains a URL, it is rendered as a clickable link (`🔗 {remark}`) without stripping URLs.
- **Print Margins & Browser URL**: Preserves natural page margins for clean multi-page printouts. Browser URL and page numbers are removed by unchecking "Headers and footers" in the browser print dialog (guidance tip displayed on floating toolbar).

### G. Financial Summary & Overview Stats Layout ([TripStats.tsx](./src/components/TripStats.tsx) & [TripOverviewClient.tsx](./src/components/TripOverviewClient.tsx))
- **Two-Column 40% / 60% Single-Row Financial Structure**:
  - **Column 1 (Left 40% / `lg:w-2/5`)**: `Grand Total Estimated` occupies 40% width on desktop. Features warm peach styling (`bg-[#FFF9F5] border-2 border-accent`), wallet icon badge, `t("tripAndPocketBudget")` subtitle, bold font-mono THB total, JPY approx, and a fully rendered 6-bar vertical sparkline chart with explicit pixel heights.
  - **Column 2 (Right 60% / `lg:w-3/5`)**: `Flights` (emerald/mint), `Hotels` (amber), `Passes, Tickets & Rentals` (indigo), and `Total Cost Everyday` (rose) are placed on the **same single row** (`grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-2`) taking 60% of the row, each featuring a category icon, dual-currency amounts, spend percentage pill, and progress bar.
  - Matches the height of Grand Total with zero awkward empty vertical void. Expand/collapse toggle removed for a permanent clean side-by-side presentation.
- **Trip Overview & Trips List Polishing**:
  - **Authentic Japanese Landscape Artwork with 4 Seasonal Variants & Logo Placement**: In the All Trips list page ([TripsListClient.tsx](./src/components/TripsListClient.tsx)), the user's logo (`/logo.png`) is presented strictly inside the main hero banner alongside the title and subtitle ("All Japan Trips — Plan, organize, and track your Japan adventures..."). On individual trip cards, the logo is removed from the header, while `JapanHeroArtwork` ([JapanHeroArtwork.tsx](./src/components/JapanHeroArtwork.tsx)) is rendered as an enlarged transparent landscape background (`w-72 sm:w-96 md:w-[420px]`, `h-48 sm:h-64`, `opacity-30` to `opacity-45`) positioned prominently across the upper-right card body (`top-2 sm:top-0 -right-4`) so Mt. Fuji, the rising sun, torii gate, and pagoda rise completely above the hotel and cost cards without being obscured. Automatically dynamically switches between 4 authentic, highly distinct seasonal styles based on the trip's start month:
    - **❄️ Winter (Dec–Feb)**: Deep snowpack reaching halfway down Mt. Fuji, silver-blue winter sun, snowbanks across the foothills, snow accumulation blankets on the Torii roof and all 5 Pagoda eaves, snow-dusted Japanese pine trees (*Matsu*), and intricate floating snowflakes (*Yuki no Kessho*). Classic Tokaido blue Shinkansen stripe.
    - **🌸 Spring (Mar–May)**: Soft Sakura coral-pink sunrise, indigo Mt. Fuji with morning glow, blossoming pink foothills with extra sakura knoll, an elegant arching cherry blossom branch with detailed flowers and buds in the corner, and swirling Sakura petals. Akita/Tohoku Komachi pink Shinkansen stripe.
    - **☀️ Summer / Hot (Jun–Aug)**: Blazing golden sun with radiant flaring sunbeams, lush deep summer green-indigo Mt. Fuji with light summer snow crevasses, vibrant emerald green foothills, Japanese bamboo stalk grove (*Take*) on the left, and dancing golden sunlight sparkles/fireflies. Hayabusa emerald green Shinkansen stripe.
    - **🍁 Autumn (Sep–Nov)**: Crimson sunset red harvest sun, golden ochre foothills, crisp first snowcap (*Hatsuyukikesho*), overhanging Momiji maple branch with fiery foliage, and dancing autumn leaves. E7 Hokuriku gold Shinkansen stripe.
  - Uses dynamic SVG gradient `idPrefix` to ensure crisp rendering across multiple concurrent cards. Location string pills removed for a clean date and duration badge presentation.
  - **Responsive Hero Banner Action Controls**: On desktop (`sm:`), hosts clean icon action buttons (`Share2`, `Edit3`, `Trash2`). On mobile screens, automatically collapses into a single sleek kebab button (`MoreVertical`) with a dropdown menu and adds right padding to the title (`pr-12 sm:pr-0`), preventing action buttons from covering or obscuring the trip name on smaller mobile devices.
  - **3-Column Budget Allocations**: [BudgetBreakdown.tsx](./src/components/BudgetBreakdown.tsx) organizes wallets in a balanced 3-column grid (`grid-cols-1 md:grid-cols-3 gap-4`) without chevron arrows, with the `Edit Budget` button positioned neatly at the top-right of the card header alongside a refined `Total Pocket Budget` pill badge.
  - **Top-Right Header Action Buttons & Section Badges**: Primary action buttons across dashboard sections (`Edit Budget` in BudgetBreakdown, `+ Add Hotel` in HotelTable, `+ Add Pass` and `+ Add Flight` in PassCard) are consistently aligned to the top-right corner of their respective section or card headers for clean visual balance. `+ Add Pass / Rental / Ticket` is simplified to `Add Pass` (`เพิ่มพาส/ตั๋ว`). `Total Hotel` and `Total Pocket Budget` display within sleek, enclosed header pills.
  - **DayCard Refinement**: Structured 2-column cost box inside each day card displaying `IC Card` (green) and `Cash & Cards` (amber) side-by-side with localized labels, total day cost, and `t("viewTimeline")` action.
  - **Clean Section Headers & Two-Tier Trip Lists**: The `/trips` list displays both **Incoming Plans** (`ทริปที่กำลังจะมาถึง`) and **Previous Plans** (`ทริปที่ผ่านมาแล้ว`). When no trips exist in a category, a dashed empty card displays (`t("noPreviousTrips")` / `ยังไม่มีประวัติทริปที่ผ่านมา`), ensuring the page layout is structured, balanced, and consistent with loading skeletons.
- **Matched Loading Skeletons**:
  - [TripOverviewSkeleton.tsx](./src/components/skeletons/TripOverviewSkeleton.tsx) mirrors the 40/60 layout (left 40% Grand Total + right 60% single-row 4 sub-cards) and DayCard 2-column cost box with shimmer placeholders to guarantee zero layout shift.
  - [TripListSkeleton.tsx](./src/components/skeletons/TripListSkeleton.tsx) mirrors the full All Trips list page, including the hero banner, Incoming Plans section (2 cards with cost breakdown and action footer), and Previous Plans section to eliminate awkward empty space on initial page load.

### H. Day Itinerary Swapping ([SwapDayModal.tsx](./src/components/SwapDayModal.tsx) & `swapTripDays` in [src/lib/actions.ts](./src/lib/actions.ts))
- **Calendar-Safe Swapping**: Allows users to exchange itineraries and activities between any two days (e.g. Day 2 and Day 3) while keeping calendar dates and day numbers strictly sequential.
- **Atomic Mutation**: `swapTripDays(tripId, dayIdA, dayIdB)` updates `dayNumber`, `date`, `dayOfWeek`, and `slug` atomically in a Prisma transaction without altering nested plan or activity foreign keys.
- **Optimistic UI in [TripOverviewClient.tsx](./src/components/TripOverviewClient.tsx)**: Local state `localDays` swaps instantly on confirm with 0ms visual latency, followed by non-blocking `startTransition(() => router.refresh())`.
- **Trigger Points**: Accessible via the `⇄ Swap Days` (`⇄ สลับวันเดินทาง`) button in the Daily Schedule section header. Individual `DayCard` headers maintain a clean presentation with only the stop count badge (no cluttered action buttons).

### I. Modal Body Scroll Locking Invariant
- Every modal and full-screen dialog ([SwapDayModal.tsx](./src/components/SwapDayModal.tsx), [BatchActivityModal.tsx](./src/components/BatchActivityModal.tsx), [ShareTripModal.tsx](./src/components/ShareTripModal.tsx), [EditTripModal.tsx](./src/components/EditTripModal.tsx), [HotelModal.tsx](./src/components/HotelModal.tsx), [PassModal.tsx](./src/components/PassModal.tsx), [FlightModal.tsx](./src/components/FlightModal.tsx), [EditBudgetModal.tsx](./src/components/EditBudgetModal.tsx), [ActivityFormModal.tsx](./src/components/ActivityFormModal.tsx), and deletion modals) MUST lock `document.body.style.overflow = "hidden"` on open and restore on cleanup to prevent background mouse wheel scrolling.

### J. In-between Stop & Activity Insertion ([BatchActivityModal.tsx](./src/components/BatchActivityModal.tsx) & [DayTimeline.tsx](./src/components/DayTimeline.tsx))
- **Arbitrary Insertion**: Users can insert a new stop at any position in the day schedule (e.g. between Stop 3 and Stop 4, before Stop 1, or after any stop).
- **Smart Midpoint Time Calculation**: `calculateIntermediateTime(prevRow, nextRow)` calculates the intermediate time between two adjacent stops (e.g. 10:20 and 13:00 -> 11:40) with 5-minute rounding and auto-scrolls/focuses the new stop's location input.
- **Entry Points**:
  - Inside [BatchActivityModal.tsx](./src/components/BatchActivityModal.tsx): In-between dashed divider buttons (`+ แทรกจุดแวะระหว่าง #{prev} กับ #{next}` / `+ Insert stop between #{prev} and #{next}`), card header `+` action, top-of-day insert button, and bottom append button.
  - On [DayTimeline.tsx](./src/components/DayTimeline.tsx): In-between insert divider buttons directly on the timeline view open the modal with `initialInsertIndex` pre-configured.

### K. Unified "Manage Stops" Modal & Vertical Timeline UX ([DayTimeline.tsx](./src/components/DayTimeline.tsx) & [BatchActivityModal.tsx](./src/components/BatchActivityModal.tsx))
- **Single Entry Point**: The two separate buttons ("Edit Stops" and "Add Stop / Activity") are merged into one unified button in the day timeline header:
  - When activities exist: displays as `✏️ Manage Stops · {count}` (`✏️ จัดการจุดแวะ · {count}`) with an embedded stop count pill badge, opening BatchActivityModal in **edit** mode.
  - When no activities exist: displays as `+ Add Stop / Activity` (`+ เพิ่มสถานที่ / กิจกรรม`) with an animated pulsing indicator dot.
- **Sleek Compact Header**:
  - Compact single-line banner (`from-bg-surface via-bg-surface/95 to-accent/15`) with title, Day badge, Stops count pill (`📍 {count} stops`), and Time range pill (`🕒 {timeRange}`).
  - Subtitle and duplicate header total cost removed for an ultra-clean, minimal header profile.
- **Unified Add Stop Component Standard ("Add Another Stop" Principle)**:
  - Both top (`+ Add first stop to start the day` / `+ แทรกจุดแวะแรกของวัน`) and bottom (`+ Add Another Stop` / `+ เพิ่มสถานที่ถัดไป`) buttons share the exact same full-width card-aligned component styling (`pl-11 sm:pl-14`, rounded-2xl dashed border `border-accent/40 bg-accent/5 hover:bg-accent/10 text-accent font-bold`, `Plus` icon), creating clean visual symmetry at both ends of the schedule across both [BatchActivityModal.tsx](./src/components/BatchActivityModal.tsx) and [DayTimeline.tsx](./src/components/DayTimeline.tsx).
- **Vertical Timeline Track & Clean 3-Row Stop Cards**:
  - **Left Timeline Track**: Vertical dashed connecting lines with solid accent circle badges (`1`, `2`, `3`...) and scheduled times (`06:30`, `08:09`) directly underneath each node.
  - **Right Stop Card**:
    - Row 1: `Location / Place name *` (with fuzzy dropdown suggestions), `Activity / Details *`, and Time pill (`Clock` icon + `HH:MM` inputs) + Delete button (`Trash2`).
    - Row 2: `Cost` (currency dropdown, amount, IC card checkbox) & `Rail Pass Used` (dropdown + custom input).
    - Row 3: `Remarks / Links (URL)` full-width input.
  - All fields are always visible without nested collapsibles or image columns.
- **In-between Dividers**:
  - Horizontal dashed divider between adjacent stop cards with centered `+ Add stop between #X and #Y` button.
- **Docked Footer**:
  - Left: `Clear All Stops` (`ล้างจุดแวะทั้งหมด`) with a custom in-app confirmation modal (no default browser `window.confirm` popups).
  - Center: Total estimated cost in JPY & THB.
  - Right: `Cancel` and `Save All Changes` buttons.
- **Strict Required Field Validation & In-App Alerts**:
  - Submitting with blank required fields (`Location` or `Activity`) blocks saving without disruptive browser alert popups; instead it immediately highlights invalid inputs with red borders (`* Required`) and smoothly scrolls and auto-focuses on the missing field. No stop rows are silently dropped.
  - Zero browser `alert()` or `window.confirm()` dialogs: clearing all stops uses a dedicated in-app confirmation dialog, and server save errors render an inline dismissible error banner.
- **Chronological Time Auto-sorting on Save**: Stops are automatically sorted chronologically by scheduled time upon saving (e.g. a stop at 18:00 moves before a stop at 18:30) with stable tie-breaking for identical times in `saveActivitiesBatch`, `createActivitiesBatch`, `createActivity`, and `updateActivity`.

### L. Reusable Currency & Cost Input Component ([CurrencyCostInput.tsx](./src/components/CurrencyCostInput.tsx))
- **Standardized UI Across All Modals**: `CurrencyCostInput` is the unified component for entering prices/costs across all modals ([HotelModal.tsx](./src/components/HotelModal.tsx), [FlightModal.tsx](./src/components/FlightModal.tsx), [PassModal.tsx](./src/components/PassModal.tsx), and [ActivityFormModal.tsx](./src/components/ActivityFormModal.tsx)).
- **Unified Layout**:
  - Top header row: Label (with optional icon) on the left, Currency dropdown selector (`THB` / `JPY`) on the right.
  - Middle row: Full-width bold font-mono number input.
  - Bottom row: Live dual-currency equivalence preview (`Equivalent to: ¥ X ≈ ฿ Y`) when `amount > 0`.
  - Children slot: For modal-specific add-ons (such as the IC card checkbox in `ActivityFormModal`).
- **Dynamic Conversion on Switch**: Toggling between `JPY` and `THB` dynamically recalculates the input amount via `exchangeRate`.
- **Pass Dual-Currency Persistence**: When creating or updating a pass in `PassModal`, both `costJpy` and `costThb` are stored in sync using `exchangeRate`. `PassCard.tsx` guards against legacy 1:1 data mismatch.

### M. Revamped Day Cost Stats Banner & Financial Breakdown ([DayTimeline.tsx](./src/components/DayTimeline.tsx))
- **Horizontal Landscape Card Layout**:
  - Encased in a warm beige/surface card (`bg-[#FAF3EA] dark:bg-bg-surface/50 border border-sand/30 dark:border-border rounded-3xl p-4 sm:p-5 shadow-xs`).
  - **Left Section (Total Day Cost)**: Circular double-ring coin badge with `Coins` icon (`w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#FCE8D3] ring-8 ring-[#FCE8D3]/50`), plan cost title (`Total Day Cost`), large bold font-mono JPY (`¥ 11,940`), and THB approx subtitle (`≈ ฿2,507.00`), with full breathing room and zero cramped elements.
  - **Right Column (Two-Row Stacked Sub-categories)**: Both cost breakdown metrics are stacked in two rows within the same right column, permanently visible without toggle obstructions:
    - **Row 1 (IC Card Spent)**: Green theme, `CreditCard` icon in `bg-emerald-500/10 text-emerald-600`, localized THB approx, percentage badge (`50%`), bold font-mono JPY (`¥ 5,940`), and horizontal gradient progress bar.
    - **Row 2 (Cash & Credit Card)**: Orange theme, `Wallet` icon in `bg-orange-500/10 text-orange-600`, localized THB approx, percentage badge (`50%`), bold font-mono JPY (`¥ 6,000`), and horizontal gradient progress bar.
  - Pure CSS/Tailwind + SVG Lucide icons without external image dependencies ("without image using").

---

## 4. Key Workflows & Common Tasks

1. **Adding a new feature or modal**:
   - Add translation keys to [src/lib/i18n.ts](./src/lib/i18n.ts) (both `en` and `th`).
   - Create server actions in [src/lib/actions.ts](./src/lib/actions.ts) with user/trip ownership verification.
   - Use optimistic UI where appropriate and wrap `router.refresh()` in `startTransition`.
2. **Schema changes**:
   - Edit [prisma/schema.prisma](./prisma/schema.prisma).
   - Push to database: `node node_modules/prisma/build/index.js db push`.
   - Re-generate client: `node node_modules/prisma/build/index.js generate`.
3. **Verification**:
   - Run typecheck: `node node_modules/typescript/bin/tsc --noEmit`.
   - Run unit tests: `node node_modules/vitest/vitest.mjs run`.

For deep architectural reference and runbooks, activate the workspace skill:
[japan-trip-planner](./.agents/skills/japan-trip-planner/SKILL.md).
