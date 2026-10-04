import Navbar from "@/components/Navbar";
import SummaryClient from "@/components/SummaryClient";
import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

interface Props {
  params: { tripId: string };
}

export default async function SummaryPage({ params }: Props) {
  const session = await getAuthSession();
  const userId = (session?.user as any)?.id;

  if (!userId) redirect("/login");

  const trip = await db.trip.findUnique({
    where: { id: params.tripId },
    include: {
      days: {
        include: {
          activities: true,
          plans: { include: { activities: true } },
        },
        orderBy: { dayNumber: "asc" },
      },
      hotels: { orderBy: { createdAt: "asc" } },
      passes: true,
      flights: true,
      budgets: true,
    },
  });

  if (!trip) notFound();
  if (trip.userId && trip.userId !== userId) notFound();

  const dayRows = trip.days.map((day) => {
    const mainPlan = day.plans.find((p) => p.isMain) || day.plans[0];
    const activities = mainPlan ? mainPlan.activities : day.activities;
    const total = activities.reduce((s, a) => s + (a.cost || 0), 0);
    const ic = activities.filter((a) => a.isIcCard).reduce((s, a) => s + (a.cost || 0), 0);
    return { id: day.id, slug: day.slug, dayNumber: day.dayNumber, title: day.title, total, ic, nonIc: total - ic };
  });

  const sumTotal = dayRows.reduce((s, d) => s + d.total, 0);
  const sumIc = dayRows.reduce((s, d) => s + d.ic, 0);
  const sumNonIc = dayRows.reduce((s, d) => s + d.nonIc, 0);

  const totalHotelThb = trip.hotels.reduce((s, h) => s + (h.costThb || 0), 0);
  const totalPassJpy = trip.passes.reduce((s, p) => s + (p.costJpy || 0), 0);
  const totalFlightThb = trip.flights.reduce((s, f) => s + (f.costThb || 0), 0);
  const totalFixedBudgetThb = totalHotelThb + (totalPassJpy * trip.exchangeRate) + totalFlightThb;

  return (
    <div className="min-h-screen bg-bg-base pb-16">
      <Navbar tripId={trip.id} currentSection="summary" isOwner={true} />
      <SummaryClient
        trip={trip}
        dayRows={dayRows}
        sumTotal={sumTotal}
        sumIc={sumIc}
        sumNonIc={sumNonIc}
        totalHotelThb={totalHotelThb}
        totalPassJpy={totalPassJpy}
        totalFlightThb={totalFlightThb}
        totalFixedBudgetThb={totalFixedBudgetThb}
      />
    </div>
  );
}
