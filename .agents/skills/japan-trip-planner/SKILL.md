---
name: japan-trip-planner
description: >-
  Comprehensive guide to the Japan Trip Planner repository architecture, database schema,
  features, server actions, and coding conventions. Activate when navigating, modifying,
  adding features to, or debugging the Japan Trip Planner application.
---

# Japan Trip Planner — Developer & AI Agent Skill

This skill provides an authoritative, compact guide to developing, maintaining, and debugging the **Japan Trip Planner** codebase. It is designed to minimize context token consumption by providing direct architectural maps, data flows, and code references. All internal links use portable repository-relative paths.

---

## 1. System Overview & Technology Stack

The application is a full-featured travel planner built for Japan itineraries, featuring multi-day schedules, weather/contingency substitute plans, rail pass tracking, multi-currency budget wallets (JPY/THB), hotel date localization, and printable itinerary generation.

| Layer | Technology | Primary Files |
|---|---|---|
| **Framework** | Next.js 14 (App Router) | [src/app](../../../src/app) |
| **Language** | TypeScript 5.7 (Strict) | [tsconfig.json](../../../tsconfig.json) |
| **Database & ORM** | PostgreSQL (Vercel) + Prisma 5.22 | [prisma/schema.prisma](../../../prisma/schema.prisma), [src/lib/db.ts](../../../src/lib/db.ts) |
| **Authentication** | NextAuth.js 4.24 (Google OAuth) | [src/lib/auth.ts](../../../src/lib/auth.ts), [src/middleware.ts](../../../src/middleware.ts) |
| **Styling & UI** | Tailwind CSS + Lucide Icons + AOS | [tailwind.config.ts](../../../tailwind.config.ts), [src/components](../../../src/components) |
| **Localization** | Custom bilingual i18n (`en` / `th`) | [src/lib/i18n.ts](../../../src/lib/i18n.ts), [src/context/LanguageContext.tsx](../../../src/context/LanguageContext.tsx) |
| **Currency** | Multi-currency (JPY ⇄ THB) | [src/context/CurrencyContext.tsx](../../../src/context/CurrencyContext.tsx) |

---

## 2. Command Reference & Windows PowerShell Rules

> [!IMPORTANT]
> The environment runs Windows PowerShell with script execution disabled. Standard `npx` commands will fail.

- **Typecheck**:
  ```powershell
  node node_modules/typescript/bin/tsc --noEmit
  ```
- **Prisma Push**:
  ```powershell
  node node_modules/prisma/build/index.js db push
  ```
- **Prisma Client Generate**:
  ```powershell
  node node_modules/prisma/build/index.js generate
  ```
- **Dev Server**:
  ```powershell
  npm run dev
  ```

---

## 3. Directory & Route Architecture

```
src/
├── app/
│   ├── page.tsx                     # Redirects to /trips or /login
│   ├── login/page.tsx               # NextAuth login page
│   ├── trips/
│   │   ├── page.tsx                 # Trips dashboard (TripsListClient)
│   │   ├── new/page.tsx             # New trip creation form
│   │   └── [tripId]/
│   │       ├── page.tsx             # Trip dashboard overview (TripOverviewClient, DayCard)
│   │       ├── bookings/page.tsx    # Hotels, Passes, Flights, Budgets (BookingsClient)
│   │       ├── summary/page.tsx     # Cost breakdown, Excel matrix export (SummaryClient)
│   │       ├── export/page.tsx      # Printable & image itinerary view (ExportItineraryView)
│   │       └── days/[slug]/page.tsx # Day timeline view (DayTimeline)
├── components/
│   ├── DayTimeline.tsx              # Core day view: plans, activities, optimistic swap, batch add
│   ├── DayCard.tsx                  # Summary card for each day on overview page
│   ├── HotelModal.tsx               # Hotel booking creation and editing modal
│   ├── HotelTable.tsx               # Hotel table with localized dates and night count
│   ├── BatchActivityModal.tsx       # Rapid multi-activity input modal
│   ├── ExportItineraryView.tsx      # Clean export view (Main plan activities only)
│   └── skeletons/                   # Loading skeleton components
├── context/
│   ├── LanguageContext.tsx          # Bilingual state & useLanguage() hook
│   ├── CurrencyContext.tsx          # Currency toggle & useCurrency() hook
│   └── SessionProvider.tsx          # Client-side NextAuth session wrapper
└── lib/
    ├── actions.ts                   # All Server Actions and ownership verification
    ├── auth.ts                      # NextAuth configuration and Prisma adapter
    ├── db.ts                        # PrismaClient global singleton
    ├── hotelDates.ts                # Hotel date parsing, nights calculation, EN/TH formatting
    ├── i18n.ts                      # Bilingual dictionaries and t() interpolator
    └── utils.ts                     # cn() styling helper
```

---

## 4. Key Architectural Patterns & Conventions

### 1. Server Actions & `startTransition`
All mutations live in [src/lib/actions.ts](../../../src/lib/actions.ts). When calling a server action from a client component followed by `router.refresh()`, **always** wrap the refresh in `startTransition`:
```tsx
const [isPending, startTransition] = useTransition();

// Inside handler:
await someServerAction(...);
startTransition(() => {
  router.refresh();
});
```
*Why*: Next.js App Router will trigger the route's `loading.tsx` skeleton if `router.refresh()` is uncoordinated, causing visible layout flicker.

### 2. Substitute Plans System
- In [prisma/schema.prisma](../../../prisma/schema.prisma), `TripDay` has multiple `DayPlan` records.
- Exactly one plan has `isMain: true`.
- Up to 3 substitute plans (`isMain: false`) can exist per day (e.g. Rainy Day backup, Indoor backup, Chill backup).
- In [src/components/DayTimeline.tsx](../../../src/components/DayTimeline.tsx):
  - `localPlans` maintains optimistic plan state.
  - Plan swapping uses a full-screen loading portal overlay (`isSwapping`) with a spinner to provide smooth UX during server revalidation.
  - Dynamic elements in `DayTimeline` omit `data-aos` attributes to prevent animation replay flickering.
- **Export Filter**: In [src/components/ExportItineraryView.tsx](../../../src/components/ExportItineraryView.tsx), itineraries ONLY render the `isMain: true` plan.

### 3. Localization (i18n) Rules
- Both English (`en`) and Thai (`th`) must be supported for every user-facing string.
- Dictionaries are defined in [src/lib/i18n.ts](../../../src/lib/i18n.ts).
- Never write hardcoded inline checks like `{language === 'th' ? '...' : '...'}` inside UI components. Add keys to `translations.en` and `translations.th`.

### 4. Hotel Dates & Localization
- Use [src/lib/hotelDates.ts](../../../src/lib/hotelDates.ts) for any hotel date parsing or formatting.
- `formatHotelStay(hotel, language)` renders localized dates:
  - English: `21 - 23 Oct 2026 (2 nights)`
  - Thai: `21 - 23 ต.ค. 2569 (2 คืน)` (supports Thai Buddhist Era: AD + 543).

---

## 5. Detailed Reference Guides

For deeper technical documentation, consult the reference files:
- [Architecture & Data Flow](./references/architecture.md)
- [Database Schema & Server Actions Catalog](./references/server-actions-and-database.md)
- [Feature Details & Substitute Plans](./references/features-and-plans.md)
