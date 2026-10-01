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
  - Loading skeleton in [TripOverviewSkeleton.tsx](./src/components/skeletons/TripOverviewSkeleton.tsx) mirrors this exact 2-column structure.



