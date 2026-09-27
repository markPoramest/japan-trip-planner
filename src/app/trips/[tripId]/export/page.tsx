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
          plans: {
            orderBy: { sortOrder: "asc" },
            include: { activities: { orderBy: { sortOrder: "asc" } } },
          },
        },
        orderBy: { dayNumber: "asc" },
      },
    },
  });

  if (!trip) notFound();

  let isOwner = false;
  if (userId) {
    if (!trip.userId) {
      await db.trip.update({ where: { id: trip.id }, data: { userId } });
      isOwner = true;
    } else if (trip.userId === userId) {
      isOwner = true;
    }
  }

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
    days: trip.days.map((d) => {
      // Use only the main plan's activities for export
      const mainPlan = d.plans?.find((p) => p.isMain);
      const mainActivities = mainPlan
        ? mainPlan.activities
        : d.activities.filter((a) => {
            // Fallback: if no plans exist, use activities without planId or all
            if (d.plans && d.plans.length > 0) {
              const mainPlanId = d.plans.find((p) => p.isMain)?.id;
              return mainPlanId ? a.planId === mainPlanId : true;
            }
            return true;
          });

      return {
        id: d.id,
        dayNumber: d.dayNumber,
        date: d.date.toISOString(),
        dayOfWeek: d.dayOfWeek,
        title: d.title,
        activities: mainActivities.map((a) => ({
          id: a.id,
          time: a.time,
          location: a.location,
          activity: a.activity,
          usingPass: a.usingPass,
          remark: a.remark,
        })),
      };
    }),
  };

  return <ExportItineraryView trip={exportData} />;
}
