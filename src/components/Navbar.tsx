import { db } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import NavbarClient from "./NavbarClient";

interface NavbarProps {
  tripId: string;
  currentSlug?: string;
  currentSection?: "overview" | "bookings" | "summary";
  isOwner?: boolean;
}

export default async function Navbar({ tripId, currentSlug, currentSection, isOwner }: NavbarProps) {
  const trip = await db.trip.findUnique({
    where: { id: tripId },
    include: {
      days: { orderBy: { dayNumber: "asc" } },
    },
  });

  if (!trip) return null;

  let resolvedIsOwner = isOwner;
  if (resolvedIsOwner === undefined) {
    const session = await getAuthSession();
    const userId = (session?.user as any)?.id;
    resolvedIsOwner = !!(userId && (!trip.userId || trip.userId === userId));
  }

  return (
    <NavbarClient
      tripId={trip.id}
      tripTitle={trip.title}
      startDate={trip.startDate.toISOString()}
      endDate={trip.endDate.toISOString()}
      days={trip.days.map((d) => ({
        id: d.id,
        dayNumber: d.dayNumber,
        title: d.title,
        slug: d.slug,
      }))}
      currentSlug={currentSlug}
      currentSection={currentSection}
      isOwner={resolvedIsOwner}
    />
  );
}
