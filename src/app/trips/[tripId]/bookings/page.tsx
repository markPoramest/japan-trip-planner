import Navbar from "@/components/Navbar";
import BookingsClient from "@/components/BookingsClient";
import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

interface Props {
  params: { tripId: string };
}

export default async function BookingsPage({ params }: Props) {
  const session = await getAuthSession();
  const userId = (session?.user as any)?.id;

  const trip = await db.trip.findUnique({
    where: { id: params.tripId },
    include: {
      hotels: { orderBy: { createdAt: "asc" } },
      passes: true,
      flights: true,
      budgets: true,
      days: { include: { activities: true } },
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

  // Split bill is strictly private to the trip owner and must NEVER be shared with the public.
  if (!isOwner) {
    if (trip.isPublic) {
      redirect(`/trips/${params.tripId}`);
    }
    if (!userId) {
      redirect(`/login?callbackUrl=/trips/${params.tripId}`);
    }
    notFound();
  }

  const allActivities = trip.days.flatMap((d) => d.activities);
  const totalIcSpendJpy = allActivities.filter((a) => a.isIcCard).reduce((s, a) => s + (a.cost || 0), 0);
  const totalNonIcSpendJpy = allActivities.reduce((s, a) => s + (a.cost || 0), 0) - totalIcSpendJpy;

  return (
    <div className="min-h-screen bg-bg-base pb-16">
      <Navbar tripId={trip.id} currentSection="bookings" />
      <BookingsClient
        trip={{
          ...trip,
          id: isOwner ? trip.id : "",
        }}
        isOwner={isOwner}
      />
    </div>
  );
}
