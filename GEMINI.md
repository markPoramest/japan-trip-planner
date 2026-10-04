# Japan Trip Planner — Project Rules & Guidelines

> See [AGENTS.md](./AGENTS.md) and the workspace skill [japan-trip-planner](./.agents/skills/japan-trip-planner/SKILL.md) for full architecture and feature guides. All internal documentation links use portable relative paths.

## 🚨 MANDATORY INSTRUCTION: ALWAYS UPDATE DOCUMENTATION ON CODE CHANGES
Whenever you fix bugs, refactor code, modify components, alter database schemas, add new server actions, or make any code changes:
1. **You MUST update [AGENTS.md](./AGENTS.md) and [GEMINI.md](./GEMINI.md)** in the same turn to reflect any changes in components, server actions, data schema, routes, or behavior.
2. If the change impacts deep subsystems (e.g., substitute plans, hotel dates, i18n, export, or server actions), **you MUST also update the corresponding file in [.agents/skills/japan-trip-planner/references/](./.agents/skills/japan-trip-planner/references/)**.
3. **MANDATORY UNIT TESTING**: Every time code is changed or a new function/component is added, **you MUST add or update corresponding unit tests and verify by running `node node_modules/vitest/vitest.mjs run`**. Never complete a turn with failing tests.
4. NEVER finish a task after modifying code without verifying that the documentation markdown files are updated and in sync with the codebase.
5. **Portability Rule**: ALWAYS use relative paths (e.g., `./src/...` or `../../...`) in documentation so links remain valid across different PCs, operating systems, and environments. Never hardcode machine-specific absolute paths.

## Essential Constraints & Rules
- **PowerShell Execution**: Script execution is disabled on this system.
  - Run typecheck with: `node node_modules/typescript/bin/tsc --noEmit` (NEVER `npx tsc`).
  - Run Prisma CLI with: `node node_modules/prisma/build/index.js <command>` (NEVER `npx prisma`).
  - Run Unit Tests with: `node node_modules/vitest/vitest.mjs run` (or `cmd /c "npm test"`).
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
- **Instagram Story Generator & Share Modal ([ShareTripModal.tsx](./src/components/ShareTripModal.tsx))**:
  - Modal container stays consistently sized at standard `max-w-2xl` width.
  - Replaced tab switcher with a single unified view with independent collapsible rows (`Share via Link` row + `Instagram Story (9:16)` row) that **default to folded** on modal open. Future share channels can easily be added as new rows.
  - Share via Link row features a clean on/off switch (**On** = `Can share`, **Off** = `Can't share`) with standard `h-6 w-11` track + `h-5 w-5` thumb (`translate-x-5`) preventing knob overflow, public/private status, copyable link, and native device share.
  - Instagram Story row features 9:16 preview canvas, theme toggle, stacked photo upload controls with full-width captions, and PNG download.
  - All labels adapt to active language via [src/lib/i18n.ts](./src/lib/i18n.ts) without inline JSX conditionals.
- **Export Itinerary & Print Configuration ([ExportItineraryView.tsx](./src/components/ExportItineraryView.tsx))**:
  - Dedicated loading skeleton [ExportItinerarySkeleton.tsx](./src/components/skeletons/ExportItinerarySkeleton.tsx) at `src/app/trips/[tripId]/export/loading.tsx`.
  - Remarks with URLs render clickable links (`🔗 {remark}`) without stripping.
  - Print margins are preserved for natural multi-page spacing; browser URLs are removed by unchecking "Headers and footers" in the print dialog.
  - **Day 1 on Page 1 & Page Breaks for Subsequent Days**:
    - **Day 1 Starts on Page 1 After Trip Overview**: Compact print styling on the Trip Overview (flights, hotels, passes) frees up vertical space on Page 1, enabling Day 1 to start immediately beneath the section banner on Page 1 without forcing an awkward page break or leaving empty space. Day 1 uses `break-inside: auto` on its container to guarantee it is never kicked to Page 2.
    - **Page Break for Every Subsequent Day (Day 2+)**: Configured `.print-day-card + .print-day-card` with `break-before: page; page-break-before: always; break-inside: avoid;`, ensuring Day 2, Day 3, Day 4, etc. each start on their own dedicated sheet.
    - **Crisp Header Top Border**: Explicit `border-top: 2px solid #4b5563` on `thead tr`, `thead th`, and `table` (both in Tailwind and `@media print` CSS) guarantees the top border line above table column headers (`เวลา`, `สถานที่ / จุดหมาย`...) is permanently sharp, prominent, and never missing.
    - **Protected Table Rows**: Individual activity rows maintain `break-inside: avoid` so text is never sliced across page breaks.
- **Financial Summary & Overview Stats Layout ([TripStats.tsx](./src/components/TripStats.tsx) & [TripOverviewClient.tsx](./src/components/TripOverviewClient.tsx))**:
  - Two-column 40% / 60% single-row layout: Grand Total Estimated card occupies 40% on the left (`lg:w-2/5`) with warm peach styling, wallet badge, subtitle, and fully visible 6-bar vertical sparkline chart.
  - Sub-categories (Flights, Hotels, Passes, Everyday) placed on the same single row taking 60% on the right (`lg:w-3/5`, `grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-2`), each featuring category icons, dual-currency amounts, spend progress bar, and percentage pill (`%` of `totalTripEstimatedThb`).
  - Breakdown toggle removed for a clean, permanent side-by-side presentation with equal card heights and zero empty space.
  - Budget wallets in [BudgetBreakdown.tsx](./src/components/BudgetBreakdown.tsx) rendered in a balanced 3-column grid without chevron arrows, with the `Edit Budget` button positioned at the top-right of the card header alongside a refined `Total Pocket Budget` badge.
  - Main banner in [TripsListClient.tsx](./src/components/TripsListClient.tsx) displays your logo (`/logo.png`) alongside "All Japan Trips — Plan, organize, and track your Japan adventures...". On individual trip cards, the logo is removed, and `JapanHeroArtwork` ([JapanHeroArtwork.tsx](./src/components/JapanHeroArtwork.tsx)) is enlarged as a transparent background (`w-72 sm:w-96 md:w-[420px]`, `opacity-30` to `opacity-45`) positioned higher (`top-2 sm:top-0`) so Mt. Fuji, the rising sun, and the landscape rise clearly above the hotel and cost cards without being obscured.
  - `JapanHeroArtwork` automatically renders 4 distinct seasonal choices based on the trip's start month:
    - **Winter (Dec–Feb)**: Silver winter sun, heavy snowpack halfway down Mt. Fuji, snow drifts across hills, snow on Torii & all 5 Pagoda eaves, snow-dusted Japanese pine trees (*Matsu*), intricate floating snowflakes (*Yuki no Kessho*), and classic blue Shinkansen livery.
    - **Spring (Mar–May)**: Sakura coral-pink sunrise, indigo Mt. Fuji, blooming pink hills with extra sakura knoll, elegant cherry blossom branch with detailed flowers/buds, swirling Sakura petals, and Komachi pink Shinkansen livery.
    - **Summer/Hot (Jun–Aug)**: Blazing golden sun with flaring rays, emerald green hills, green-indigo Mt. Fuji with thawed crevasses, Japanese bamboo stalk grove (*Take*), floating firefly/sunlight sparkles, and Hayabusa emerald Shinkansen livery.
    - **Autumn (Sep–Nov)**: Sunset red Momiji sun, golden ochre foothills, crisp first snowcap, overhanging Momiji maple branch with fiery leaves, dancing autumn leaves, and Hokuriku gold Shinkansen livery.
  - Trip overview hero banner action buttons are responsive: desktop displays the 3 icon buttons (`Share2`, `Edit3`, `Trash2`), while mobile screens render a single sleek kebab button (`MoreVertical`) with dropdown and right-padding (`pr-12 sm:pr-0`), preventing buttons from overlapping or hiding the trip title.
  - Section action buttons (`Edit Budget` in BudgetBreakdown, `+ Add Hotel` in HotelTable, `+ Add Pass` and `+ Add Flight` in PassCard) positioned at the top-right of headers. `+ Add Pass / Rental / Ticket` shortened to `Add Pass` (`เพิ่มพาส/ตั๋ว`), and header totals (`Total Hotel`, `Total Pocket Budget`) enclosed in clean pill badges.
  - DayCard features 2-column cost breakdown box (`IC Card` + `Cash & Cards`), total cost, and timeline link.
  - Loading skeleton in [TripOverviewSkeleton.tsx](./src/components/skeletons/TripOverviewSkeleton.tsx) mirrors the 40/60 layout (left 40% Grand Total + right 60% single-row subcards) and DayCard 2-column box.
  - Loading skeleton in [TripListSkeleton.tsx](./src/components/skeletons/TripListSkeleton.tsx) mirrors both the Incoming Plans section and Previous Plans section with action footers, eliminating large empty spaces at the bottom on initial load.
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
- **Reusable Currency & Cost Input Component ([CurrencyCostInput.tsx](./src/components/CurrencyCostInput.tsx))**:
  - Reusable unified UI component used across all modals: [HotelModal.tsx](./src/components/HotelModal.tsx), [FlightModal.tsx](./src/components/FlightModal.tsx), [PassModal.tsx](./src/components/PassModal.tsx), and [ActivityFormModal.tsx](./src/components/ActivityFormModal.tsx).
  - Consistent layout: Top header row with label & currency selector dropdown (`THB` / `JPY`), full-width number input, live dual-currency preview (`Equivalent to: ¥ X ≈ ฿ Y`), and support for modal-specific extensions (like the IC Card checkbox).
  - Toggling between `JPY` and `THB` dynamically recalculates the amount using `exchangeRate`.
  - Both `costJpy` and `costThb` are stored in sync when creating/updating transit passes in `PassModal`.
- **Travel Group Split Bill Calculator ([BookingsClient.tsx](./src/components/BookingsClient.tsx) & [splitBill.ts](./src/lib/splitBill.ts))**:
  - Replaced redundant Cost Management view with a dedicated Split Bill engine for travel groups at `/trips/[tripId]/bookings`.
  - **Strict Privacy Invariant**: Split bill is strictly private to the trip owner and is **NEVER shared with the public**.
  - When a trip is shared via public link (`isPublic: true`), public/anonymous viewers and non-owners cannot access `/trips/[tripId]/bookings`; navigating directly there redirects them back to the public trip overview `/trips/[tripId]`.
  - The Split Bill (`hotelsAndPasses`) and Cost Matrix (`summary`) navigation tabs in [NavbarClient.tsx](./src/components/NavbarClient.tsx) are completely hidden for non-owners (`isOwner: false`), showing only the public overview and daily itinerary schedule.
  - Automatically compiles pre-booked expenses (Hotels, Flights, and Transit Passes/Tickets) from trip data.
  - Defaults to 1 member (`Me`). Users can add/remove companions with color-coded avatar badges and quick-add preset suggestions.
  - Supports choosing only specific items to split via interactive toggle switches; unselected items are completely excluded from the bill split.
  - Unified linear flow: Section 1 (Select Items & Companions to Split) on top, followed immediately by Section 2 (Per-Person Share Summary) with live recalculation in THB and JPY (no awkward tabs).





