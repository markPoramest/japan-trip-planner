import { notFound, redirect } from "next/navigation";
import Navbar from "@/components/Navbar";
import DayTimeline from "@/components/DayTimeline";
import { db } from "@/lib/db";
import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { getAuthSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

interface Props {
  params: { tripId: string; slug: string };
}

export default async function DayPage({ params }: Props) {
  const session = await getAuthSession();
  const userId = (session?.user as any)?.id;

  const day = await db.tripDay.findFirst({
    where: { slug: params.slug, tripId: params.tripId },
    include: {
      activities: { orderBy: { sortOrder: "asc" } },
      trip: {
        include: {
          days: { orderBy: { dayNumber: "asc" } },
          passes: true,
        },
      },
    },
  });

  if (!day) notFound();

  const isOwner = !day.trip.userId || (userId && day.trip.userId === userId);
  if (!day.trip.isPublic && !isOwner) {
    if (!userId) redirect(`/login?callbackUrl=/trips/${params.tripId}/days/${params.slug}`);
    notFound();
  }

  const allDays = day.trip.days;
  const currentIndex = allDays.findIndex((d) => d.id === day.id);
  const prevDay = currentIndex > 0 ? allDays[currentIndex - 1] : null;
  const nextDay = currentIndex < allDays.length - 1 ? allDays[currentIndex + 1] : null;
  const availablePasses = day.trip.passes.map((p) => p.name);

  return (
    <div className="min-h-screen bg-bg-base pb-16">
      <Navbar tripId={params.tripId} currentSlug={day.slug} />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Back & Prev/Next */}
        <div className="flex items-center justify-between text-xs text-text-muted">
          <Link
            href={`/trips/${params.tripId}`}
            className="flex items-center gap-1.5 hover:text-text-primary transition-colors bg-bg-card px-3 py-1.5 rounded-lg border border-border"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Overview
          </Link>
          <div className="flex items-center gap-2">
            {prevDay && (
              <Link
                href={`/trips/${params.tripId}/days/${prevDay.slug}`}
                className="flex items-center gap-1 hover:text-text-primary bg-bg-card px-2.5 py-1.5 rounded-lg border border-border transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Day {prevDay.dayNumber}
              </Link>
            )}
            {nextDay && (
              <Link
                href={`/trips/${params.tripId}/days/${nextDay.slug}`}
                className="flex items-center gap-1 hover:text-text-primary bg-bg-card px-2.5 py-1.5 rounded-lg border border-border transition-colors"
              >
                Day {nextDay.dayNumber} <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>

        <DayTimeline
          tripId={isOwner ? params.tripId : ""}
          dayId={day.id}
          dayNumber={day.dayNumber}
          dayTitle={day.title}
          date={day.date}
          dayOfWeek={day.dayOfWeek}
          activities={day.activities}
          availablePasses={availablePasses}
          exchangeRate={day.trip.exchangeRate}
        />
      </main>
    </div>
  );
}
