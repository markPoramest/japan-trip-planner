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
- **Shell Commands**: NEVER propose or run `cd`. Always supply the working directory to tool calls.
- **Tech Stack**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Prisma ORM 5.22, PostgreSQL (Vercel Postgres/Neon), NextAuth 4.24, Lucide React, AOS.

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
│   │   ├── DayTimeline.tsx   # Day timeline, plan tabs (Main/Substitutes), optimistic plan swapping
│   │   ├── DayCard.tsx       # Day overview card on trip dashboard
│   │   ├── TripStats.tsx     # Financial summary cards (Col 1 Grand Total priority + Col 2 sub-category row)
│   │   ├── HotelModal.tsx    # Hotel booking create/edit modal
│   │   ├── HotelTable.tsx    # Hotel bookings list with localized stay formatting
│   │   ├── BatchActivityModal.tsx # Rapid batch entry for activities
│   │   ├── ExportItineraryView.tsx # Export view (MAIN plan only)
│   │   ├── ShareTripModal.tsx # 9:16 Instagram Story generator & share link modal
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

### E. Instagram Story Generator ([ShareTripModal.tsx](./src/components/ShareTripModal.tsx))
- **9:16 Canvas Layout**:
  - Balanced Top Bar: App brand & subtitle on the left; Duration badge (`{durationDays} DAYS` / `{durationDays} วัน`) and decorative maple leaf on the right (eliminating top-right void).
  - Main Title & Date: Full-width trip title with localized date pill (`startStr – endStr`).
  - Two-Column Body: Up to 2 user photos with captions on the left; vertical daily route timeline on the right with day badges and costs (sleek and minimal without misleading landmark icons).
  - Full Bilingual Localization: Every label (brand, costs, chips, timeline, badges, footer) uses [src/lib/i18n.ts](./src/lib/i18n.ts) without inline language conditionals.

### F. Export Itinerary & Print Configuration ([ExportItineraryView.tsx](./src/components/ExportItineraryView.tsx))
- **Dedicated Loading Skeleton**: [ExportItinerarySkeleton.tsx](./src/components/skeletons/ExportItinerarySkeleton.tsx) used in `src/app/trips/[tripId]/export/loading.tsx` to match the A4 sheet format during transitions.
- **Activity Remarks & URLs**: If an activity remark contains a URL, it is rendered as a clickable link (`🔗 {remark}`) without stripping URLs.
- **Print Margins & Browser URL**: Preserves natural page margins for clean multi-page printouts. Browser URL and page numbers are removed by unchecking "Headers and footers" in the browser print dialog (guidance tip displayed on floating toolbar).

### G. Financial Summary & Overview Stats Layout ([TripStats.tsx](./src/components/TripStats.tsx))
- **Two-Column Priority Structure**:
  - **Column 1 (Left - Priority/Main KPI)**: `Grand Total Estimated` occupies `lg:col-span-4` with prominent accent styling, wallet icon, large bold THB total, JPY approx, and `fixedPlusDaily` ("Fixed + All Daily Budgets") subtitle.
  - **Column 2 (Right - Sub-categories Row)**: The 4 breakdown components (`Flights`, `Hotels`, `Passes, Tickets & Rentals`, `Total Cost Everyday`) are placed in `lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3 md:gap-4` as a neat horizontal row across from Grand Total.
- **Matched Loading Skeleton**: [TripOverviewSkeleton.tsx](./src/components/skeletons/TripOverviewSkeleton.tsx) exactly mirrors the 2-column (Col 1 Grand Total + Col 2 4-card sub row) layout to guarantee zero layout shift on route transitions.

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

For deep architectural reference and runbooks, activate the workspace skill:
[japan-trip-planner](./.agents/skills/japan-trip-planner/SKILL.md).
