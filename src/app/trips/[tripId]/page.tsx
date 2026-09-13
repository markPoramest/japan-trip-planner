import Navbar from "@/components/Navbar";
import TripOverviewClient from "@/components/TripOverviewClient";
import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

interface Props {
  params: { tripId: string };
}

export default async function TripOverviewPage({ params }: Props) {
  const session = await getAuthSession();
  const userId = (session?.user as any)?.id;

  const trip = await db.trip.findUnique({
    where: { id: params.tripId },
    include: {
      days: {
        include: { activities: { orderBy: { sortOrder: "asc" } } },
        orderBy: { dayNumber: "asc" },
      },
      hotels: { orderBy: { createdAt: "asc" } },
      passes: true,
      flights: true,
      budgets: true,
    },
  });

  if (!trip) notFound();

  const isOwner = !trip.userId || (userId && trip.userId === userId);
  if (!trip.isPublic && !isOwner) {
    if (!userId) {
      redirect(`/login?callbackUrl=/trips/${params.tripId}`);
    }
    notFound();
  }

  const allActivities = trip.days.flatMap((d) => d.activities);
  const totalActivitiesCostJpy = allActivities.reduce((s, a) => s + (a.cost || 0), 0);
  const totalIcSpendJpy = allActivities.filter((a) => a.isIcCard).reduce((s, a) => s + (a.cost || 0), 0);
  const totalNonIcSpendJpy = totalActivitiesCostJpy - totalIcSpendJpy;

  const totalHotelThb = trip.hotels.reduce((s, h) => s + (h.costThb || 0), 0);
  const totalHotelJpy = trip.hotels.reduce((s, h) => s + (h.costJpy || (h.costThb ? h.costThb / trip.exchangeRate : 0)), 0);
  const totalPassJpy = trip.passes.reduce((s, p) => s + (p.costJpy || 0), 0);
  const totalFlightThb = trip.flights.reduce((s, f) => s + (f.costThb || 0), 0);

  const tripData = {
    id: trip.id,
    title: trip.title,
    description: trip.description,
    startDate: trip.startDate.toISOString(),
    endDate: trip.endDate.toISOString(),
    exchangeRate: trip.exchangeRate,
    isPublic: trip.isPublic,
    isOwner: !!isOwner,
    totalActivitiesCostJpy,
    totalIcSpendJpy,
    totalNonIcSpendJpy,
    totalHotelThb,
    totalHotelJpy,
    totalPassJpy,
    totalFlightThb,
    days: trip.days,
    hotels: trip.hotels,
    passes: trip.passes,
    flights: trip.flights,
    budgets: trip.budgets,
  };

  return (
    <div className="min-h-screen bg-bg-base pb-16">
      <Navbar tripId={trip.id} currentSection="overview" />
      <TripOverviewClient trip={tripData} isOwner={!!isOwner} />
    </div>
  );
}
