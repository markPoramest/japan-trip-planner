import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import ExportItineraryView from "@/components/ExportItineraryView";
import { getAuthSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

interface Props {
  params: { tripId: string };
}

export default async function ExportPage({ params }: Props) {
  const session = await getAuthSession();
  const userId = (session?.user as any)?.id;

  const trip = await db.trip.findUnique({
    where: { id: params.tripId },
    include: {
      flights: true,
      hotels: { orderBy: { createdAt: "asc" } },
      passes: true,
      days: {
        include: {
          activities: { orderBy: { sortOrder: "asc" } },
        },
        orderBy: { dayNumber: "asc" },
      },
    },
  });

  if (!trip) notFound();

  const isOwner = !trip.userId || (userId && trip.userId === userId);
  if (!trip.isPublic && !isOwner) {
    if (!userId) redirect(`/login?callbackUrl=/trips/${params.tripId}/export`);
    notFound();
  }

  const exportData = {
    id: trip.id,
    title: trip.title,
    description: trip.description,
    startDate: trip.startDate.toISOString(),
    endDate: trip.endDate.toISOString(),
    flights: trip.flights.map((f) => ({
      id: f.id,
      flightNo: f.flightNo,
      route: f.route,
      notes: f.notes,
    })),
    hotels: trip.hotels.map((h) => ({
      id: h.id,
      name: h.name,
      dateRange: h.dateRange,
      notes: h.notes,
    })),
    passes: trip.passes.map((p) => ({
      id: p.id,
      name: p.name,
      validDays: p.validDays,
      notes: p.notes,
    })),
    days: trip.days.map((d) => ({
      id: d.id,
      dayNumber: d.dayNumber,
      date: d.date.toISOString(),
      dayOfWeek: d.dayOfWeek,
      title: d.title,
      activities: d.activities.map((a) => ({
        id: a.id,
        time: a.time,
        location: a.location,
        activity: a.activity,
        usingPass: a.usingPass,
        remark: a.remark,
      })),
    })),
  };

  return <ExportItineraryView trip={exportData} />;
}
