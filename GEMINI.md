# Japan Trip Planner — Project Rules & Guidelines

> See [AGENTS.md](./AGENTS.md) and the workspace skill [japan-trip-planner](./.agents/skills/japan-trip-planner/SKILL.md) for full architecture and feature guides. All internal documentation links use portable relative paths.

## 🚨 MANDATORY INSTRUCTION: ALWAYS UPDATE DOCUMENTATION ON CODE CHANGES
Whenever you fix bugs, refactor code, modify components, alter database schemas, add new server actions, or make any code changes:
1. **You MUST update [AGENTS.md](./AGENTS.md) and [GEMINI.md](./GEMINI.md)** in the same turn to reflect any changes in components, server actions, data schema, routes, or behavior.
2. If the change impacts deep subsystems (e.g., substitute plans, hotel dates, i18n, export, or server actions), **you MUST also update the corresponding file in [.agents/skills/japan-trip-planner/references/](./.agents/skills/japan-trip-planner/references/)**.
3. NEVER finish a task after modifying code without verifying that the documentation markdown files are updated and in sync with the codebase.
4. **Portability Rule**: ALWAYS use relative paths (e.g., `./src/...` or `../../...`) in documentation so links remain valid across different PCs, operating systems, and environments. Never hardcode machine-specific absolute paths.

## Essential Constraints & Rules
- **PowerShell Execution**: Script execution is disabled on this system.
  - Run typecheck with: `node node_modules/typescript/bin/tsc --noEmit` (NEVER `npx tsc`).
  - Run Prisma CLI with: `node node_modules/prisma/build/index.js <command>` (NEVER `npx prisma`).
  - NEVER execute `cd` commands; supply working directory directly.
- **Server Actions & Transitions**:
  - All database mutations live in [src/lib/actions.ts](./src/lib/actions.ts) with user authorization checks.
  - Always wrap `router.refresh()` in `startTransition(() => router.refresh())` in client components to prevent `loading.tsx` flashing.
- **Substitute Plans**:
  - Exactly one `DayPlan` per `TripDay` has `isMain: true`.
  - Swapping updates optimistic state first and displays a full-screen loading portal in [DayTimeline.tsx](./src/components/DayTimeline.tsx).
  - Export, summary, overview views, and Instagram Story generator (including DayCard stop counts and trip totals) must only present and aggregate `isMain: true` plans.
  - Do not apply `data-aos` to dynamic list items in `DayTimeline.tsx`.
  - The redundant "Active Main Plan" (`กำลังใช้งานแผนนี้เป็นหลักอยู่`) banner is removed; "Edit Plan Name" is placed in the plan tabs toolbar alongside the substitute count to keep the header sleek and compact.
- **Localization (i18n)**:
  - Add all user-facing copy to both `en` and `th` in [src/lib/i18n.ts](./src/lib/i18n.ts).
  - Do not use inline `language === "th"` ternaries in JSX components.
- **Hotel Dates**:
  - Always use [src/lib/hotelDates.ts](./src/lib/hotelDates.ts) (`formatHotelStay`, `parseHotelDates`) for stay formatting and night calculations in English and Thai (Buddhist Era).
- **Instagram Story Generator ([ShareTripModal.tsx](./src/components/ShareTripModal.tsx))**:
  - Top header is balanced end-to-end (brand on left, duration badge + maple leaf on right).
  - Daily route timeline presents minimal day badges (`Day X` / `วันที่ X`) and day costs without landmark icons (`getDayIcon` removed).
  - All labels on the 9:16 card adapt to the active language via [src/lib/i18n.ts](./src/lib/i18n.ts).
- **Export Itinerary & Print Configuration ([ExportItineraryView.tsx](./src/components/ExportItineraryView.tsx))**:
  - Dedicated loading skeleton [ExportItinerarySkeleton.tsx](./src/components/skeletons/ExportItinerarySkeleton.tsx) at `src/app/trips/[tripId]/export/loading.tsx`.
  - Remarks with URLs render clickable links (`🔗 {remark}`) without stripping.
  - Print margins are preserved for natural multi-page spacing; browser URLs are removed by unchecking "Headers and footers" in the print dialog.
- **Financial Summary & Overview Stats Layout ([TripStats.tsx](./src/components/TripStats.tsx))**:
  - Two-column layout prioritizing Grand Total Estimated in Col 1 (`lg:col-span-4`) with prominent styling and helper subtitle.
  - Sub-categories (Flights, Hotels, Passes, Everyday) arranged as a horizontal row in Col 2 (`lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4`).
  - Proportional spend progress bars and percentage pills on all 4 sub-category cards (`%` of `totalTripEstimatedThb`), matching the progress bar aesthetic in `DayTimeline.tsx`.
  - Loading skeleton in [TripOverviewSkeleton.tsx](./src/components/skeletons/TripOverviewSkeleton.tsx) mirrors this exact 2-column structure with progress bar placeholders.
- **Day Itinerary Swapping ([SwapDayModal.tsx](./src/components/SwapDayModal.tsx) & `swapTripDays` in [src/lib/actions.ts](./src/lib/actions.ts))**:
  - Swapping day plans and activities preserves the chronological date sequence by atomically swapping `dayNumber`, `date`, `dayOfWeek`, and `slug` between the two `TripDay` records.
  - Client performs instant optimistic updates in `localDays` in [TripOverviewClient.tsx](./src/components/TripOverviewClient.tsx), paired with `startTransition(() => router.refresh())`.
  - Triggered via the `⇄ Swap Days` (`⇄ สลับวันเดินทาง`) button in the Daily Schedule section header.
  - `DayCard` header maintains a clean UI showing only the stop count badge (`X stops` / `X จุดแวะ`), without swap or add buttons.
- **Modal Scroll Locking**:
  - Every modal must lock `document.body.style.overflow = "hidden"` on open and restore on cleanup to prevent background mouse wheel scrolling.
- **In-between Stop Insertion ([BatchActivityModal.tsx](./src/components/BatchActivityModal.tsx) & [DayTimeline.tsx](./src/components/DayTimeline.tsx))**:
  - Supports inserting new stops at any point (e.g. between Stop 3 and Stop 4, before Stop 1, or after any stop).
  - Automatically calculates smart intermediate times via `calculateIntermediateTime` with 5-minute rounding and auto-focuses the new stop's location input.
  - Interactive dividers and buttons available both inside `BatchActivityModal` and on `DayTimeline`.
- **Unified "Manage Stops" Modal & Vertical Timeline UX ([DayTimeline.tsx](./src/components/DayTimeline.tsx) & [BatchActivityModal.tsx](./src/components/BatchActivityModal.tsx))**:
  - The two separate buttons ("Edit Stops" and "Add Stop / Activity") are merged into a single unified button in the day timeline header.
  - When activities exist: displays `✏️ Manage Stops · {count}` (`✏️ จัดการจุดแวะ · {count}`) with an embedded stop count pill badge, opening BatchActivityModal in edit mode.
  - Modal features a sleek compact single-line header (title, day badge, stops count, time span `06:30 → 20:30`, with subtitle and header cost removed for maximum vertical space).
  - Vertical timeline track on the left (solid circular badges `#1`, `#2`... and scheduled time underneath) with connecting dashed lines.
  - Clean symmetrical 3-row stop cards without image column (Row 1: Location & Activity & Time/Delete; Row 2: Cost & Rail Pass; Row 3: Remarks / Links), with in-between dashed divider buttons (`+ Add stop between #X and #Y`).
  - Unified Add Stop Component Principle: Both top ("Add first stop to start the day") and bottom ("Add another stop") buttons adopt the shared full-width card-aligned dashed component (`pl-11 sm:pl-14`, rounded-2xl dashed border `border-accent/40 bg-accent/5 hover:bg-accent/10 text-accent font-bold`) across both `BatchActivityModal` and `DayTimeline`.
  - Docked footer with Clear All Stops (`ล้างจุดแวะทั้งหมด`) via custom in-app confirmation modal, total estimated cost, Cancel, and Save All Changes buttons.
  - Submitting with blank required fields (`Location` or `Activity`) blocks saving, highlights invalid inputs with red borders, and focuses the missing input without dropping rows. Zero browser alert or confirm popups.
  - Automatically sorts stops chronologically by time upon saving (e.g. Card with 18:00 automatically moves before Card with 18:30) with stable tie-breaking for identical times.
- **Revamped Day Cost Stats Banner & Financial Breakdown ([DayTimeline.tsx](./src/components/DayTimeline.tsx))**:
  - Horizontal warm beige card (`bg-[#FAF3EA] dark:bg-bg-surface/50 border border-sand/30 dark:border-border rounded-3xl p-4 sm:p-5 shadow-xs`).
  - Left: Circular double-ring coin icon (`Coins`), plan cost title, bold font-mono JPY (`¥ 11,940`), and THB approx subtitle, with zero cramped elements.
  - Right: Two-row stacked sub-category breakdown in the same right column (`IC Card Spent` in green with `CreditCard`, percentage pill `50%`, and progress bar; `Cash & Credit Card` in orange with `Wallet`, percentage pill `50%`, and progress bar). Always visible with pure CSS/Tailwind + SVG icons without external image assets.


