"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";

// ─────────────────────────────────────────────
// TRIP CRUD
// ─────────────────────────────────────────────

export async function createTrip(data: {
  title: string;
  startDate: string;
  endDate: string;
  description?: string;
  currency?: string;
  baseCurrency?: string;
  exchangeRate?: number;
}) {
  const session = await getAuthSession();
  const userId = (session?.user as any)?.id || null;

  const trip = await db.trip.create({
    data: {
      userId,
      title: data.title,
      startDate: new Date(data.startDate + "T00:00:00"),
      endDate: new Date(data.endDate + "T00:00:00"),
      description: data.description || null,
      currency: data.currency || "JPY",
      baseCurrency: data.baseCurrency || "THB",
      exchangeRate: Number(data.exchangeRate) || 0.24,
    },
  });
  revalidatePath("/trips");
  return trip;
}

export async function createFullTrip(data: {
  title: string;
  startDate: string;
  endDate: string;
  description?: string;
  currency?: string;
  baseCurrency?: string;
  exchangeRate?: number;
  days?: {
    dayNumber: number;
    date: string;
    dayOfWeek: string;
    slug: string;
    title: string;
  }[];
  passes?: {
    name: string;
    costJpy?: number;
    validDays?: number;
    notes?: string;
  }[];
}) {
  const session = await getAuthSession();
  const userId = (session?.user as any)?.id || null;

  const trip = await db.trip.create({
    data: {
      userId,
      title: data.title,
      startDate: new Date(data.startDate + "T00:00:00"),
      endDate: new Date(data.endDate + "T00:00:00"),
      description: data.description || null,
      currency: data.currency || "JPY",
      baseCurrency: data.baseCurrency || "THB",
      exchangeRate: Number(data.exchangeRate) || 0.24,
      days: data.days && data.days.length > 0 ? {
        create: data.days.map((d) => ({
          dayNumber: d.dayNumber,
          date: new Date(d.date + "T00:00:00"),
          dayOfWeek: d.dayOfWeek,
          slug: d.slug,
          title: d.title,
        }))
      } : undefined,
      passes: data.passes && data.passes.length > 0 ? {
        create: data.passes.map((p) => ({
          name: p.name,
          costJpy: p.costJpy || null,
          validDays: p.validDays || null,
          notes: p.notes || null,
        }))
      } : undefined,
    },
  });

  revalidatePath("/trips");
  return trip;
}

export async function updateTrip(tripId: string, data: {
  title?: string;
  startDate?: string;
  endDate?: string;
  description?: string | null;
  currency?: string;
  baseCurrency?: string;
  exchangeRate?: number;
}) {
  const session = await getAuthSession();
  const userId = (session?.user as any)?.id;

  // Verify ownership if trip has a userId
  if (userId) {
    const existing = await db.trip.findUnique({ where: { id: tripId }, select: { userId: true } });
    if (existing?.userId && existing.userId !== userId) {
      throw new Error("Unauthorized");
    }
  }

  const updateData: any = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.startDate !== undefined) updateData.startDate = new Date(data.startDate);
  if (data.endDate !== undefined) updateData.endDate = new Date(data.endDate);
  if (data.description !== undefined) updateData.description = data.description || null;
  if (data.currency !== undefined) updateData.currency = data.currency;
  if (data.baseCurrency !== undefined) updateData.baseCurrency = data.baseCurrency;
  if (data.exchangeRate !== undefined) updateData.exchangeRate = Number(data.exchangeRate);

  const updated = await db.trip.update({
    where: { id: tripId },
    data: updateData,
    include: {
      days: {
        orderBy: { dayNumber: "asc" },
      },
    },
  });

  // If date range is updated, sync days by sequence (reschedule, expand, or trim)
  if (data.startDate && data.endDate) {
    const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const [sY, sM, sD] = data.startDate.split("-").map(Number);
    const [eY, eM, eD] = data.endDate.split("-").map(Number);
    const sDate = new Date(sY, sM - 1, sD);
    const eDate = new Date(eY, eM - 1, eD);

    if (!isNaN(sDate.getTime()) && !isNaN(eDate.getTime()) && eDate >= sDate) {
      // Generate expected sequence of dates (YYYY-MM-DD)
      const expectedDates: string[] = [];
      const cur = new Date(sDate);
      while (cur <= eDate) {
        const y = cur.getFullYear();
        const m = String(cur.getMonth() + 1).padStart(2, "0");
        const dayNum = String(cur.getDate()).padStart(2, "0");
        expectedDates.push(`${y}-${m}-${dayNum}`);
        cur.setDate(cur.getDate() + 1);
      }

      const existingDays = updated.days;
      const oldCount = existingDays.length;
      const newCount = expectedDates.length;

      // 1. Reschedule common days (Days 1..min(oldCount, newCount)) to their new dates, keeping activities intact!
      const commonCount = Math.min(oldCount, newCount);
      for (let i = 0; i < commonCount; i++) {
        const day = existingDays[i];
        const dateStr = expectedDates[i];
        const dayNumber = i + 1;
        const [y, m, d] = dateStr.split("-").map(Number);
        const dayDate = new Date(y, m - 1, d);
        const dow = DOW[dayDate.getDay()];
        const slug = `day-${dayNumber}-day`;

        await db.tripDay.update({
          where: { id: day.id },
          data: {
            dayNumber,
            date: new Date(dateStr + "T00:00:00"),
            dayOfWeek: dow,
            slug,
          },
        });
      }

      // 2. If range was extended (newCount > oldCount), add only the new days (e.g. 5 -> 9 adds Day 6..9)
      if (newCount > oldCount) {
        for (let i = oldCount; i < newCount; i++) {
          const dateStr = expectedDates[i];
          const dayNumber = i + 1;
          const [y, m, d] = dateStr.split("-").map(Number);
          const dayDate = new Date(y, m - 1, d);
          const dow = DOW[dayDate.getDay()];
          const slug = `day-${dayNumber}-day`;

          await db.tripDay.create({
            data: {
              tripId,
              dayNumber,
              date: new Date(dateStr + "T00:00:00"),
              dayOfWeek: dow,
              slug,
              title: `Day ${dayNumber}`,
            },
          });
        }
      }

      // 3. If range was reduced (newCount < oldCount), delete the trailing days (e.g. 5 -> 3 deletes Day 4 & 5)
      if (newCount < oldCount) {
        for (let i = newCount; i < oldCount; i++) {
          const dayToDelete = existingDays[i];
          // Delete all activities under this day first
          await db.dayActivity.deleteMany({
            where: { dayId: dayToDelete.id },
          });
          // Delete the trip day
          await db.tripDay.delete({
            where: { id: dayToDelete.id },
          });
        }
      }
    }
  }

  revalidatePath("/trips");
  revalidatePath(`/trips/${tripId}`);
  return updated;
}

export async function updateTripVisibility(tripId: string, isPublic: boolean) {
  const session = await getAuthSession();
  const userId = (session?.user as any)?.id;

  const trip = await db.trip.findUnique({ where: { id: tripId }, select: { userId: true } });
  if (!trip) throw new Error("Trip not found");
  if (trip.userId && userId && trip.userId !== userId) {
    throw new Error("Unauthorized");
  }

  const updated = await db.trip.update({
    where: { id: tripId },
    data: { isPublic },
  });

  revalidatePath(`/trips/${tripId}`);
  revalidatePath("/trips");
  return updated;
}

export async function updateTripDay(
  dayId: string,
  tripId: string,
  data: { title?: string; date?: string; dayNumber?: number }
) {
  const updateData: any = {};
  if (data.title !== undefined) {
    updateData.title = data.title;
    const clean = data.title.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, "-").substring(0, 30).replace(/-$/, "");
    if (data.dayNumber) {
      updateData.slug = `day-${data.dayNumber}-${clean || "day"}`;
    }
  }
  if (data.date !== undefined) {
    updateData.date = new Date(data.date + "T00:00:00");
  }
  if (data.dayNumber !== undefined) {
    updateData.dayNumber = data.dayNumber;
  }

  const updated = await db.tripDay.update({
    where: { id: dayId },
    data: updateData,
  });

  return updated;
}

export async function createPass(tripId: string, data: { name: string; costJpy?: number; validDays?: number; notes?: string }) {
  const pass = await db.passBooking.create({
    data: {
      tripId,
      name: data.name,
      costJpy: data.costJpy ? Number(data.costJpy) : null,
      validDays: data.validDays ? Number(data.validDays) : null,
      notes: data.notes || null,
    },
  });
  revalidatePath(`/trips/${tripId}`);
  revalidatePath("/trips");
  return pass;
}

export async function deletePass(id: string, tripId: string) {
  await db.passBooking.delete({ where: { id } });
  revalidatePath(`/trips/${tripId}`);
  revalidatePath("/trips");
}

export async function deleteTrip(tripId: string) {
  const session = await getAuthSession();
  const userId = (session?.user as any)?.id;

  if (userId) {
    const existing = await db.trip.findUnique({ where: { id: tripId }, select: { userId: true } });
    if (existing?.userId && existing.userId !== userId) {
      throw new Error("Unauthorized");
    }
  }

  await db.trip.delete({ where: { id: tripId } });
  revalidatePath("/trips");
  return { success: true };
}

// ─────────────────────────────────────────────
// TRIP DAY CRUD
// ─────────────────────────────────────────────

export async function createTripDay(data: {
  tripId: string;
  dayNumber: number;
  date: string;
  dayOfWeek: string;
  slug: string;
  title: string;
  notes?: string;
}) {
  const tripDay = await db.tripDay.create({
    data: {
      tripId: data.tripId,
      dayNumber: data.dayNumber,
      date: new Date(data.date),
      dayOfWeek: data.dayOfWeek,
      slug: data.slug,
      title: data.title,
      notes: data.notes || null,
    },
  });
  revalidatePath(`/trips/${data.tripId}`);
  return tripDay;
}

export async function deleteTripDay(id: string, tripId: string) {
  await db.tripDay.delete({ where: { id } });
  revalidatePath(`/trips/${tripId}`);
}

// ─────────────────────────────────────────────
// ACTIVITY CRUD
// ─────────────────────────────────────────────

export async function createActivity(dayId: string, data: {
  time: string;
  location: string;
  activity: string;
  cost: number;
  isIcCard: boolean;
  usingPass?: string;
  remark?: string;
}) {
  const count = await db.dayActivity.count({ where: { dayId } });
  const newActivity = await db.dayActivity.create({
    data: {
      dayId,
      time: data.time || "",
      location: data.location || "",
      activity: data.activity || "",
      cost: Number(data.cost) || 0,
      isIcCard: Boolean(data.isIcCard),
      usingPass: data.usingPass || null,
      remark: data.remark || null,
      sortOrder: count,
    },
    include: { day: true },
  });

  revalidatePath(`/trips/${newActivity.day.tripId}/days/${newActivity.day.slug}`);
  revalidatePath(`/trips/${newActivity.day.tripId}`);
  return newActivity;
}

export async function updateActivity(id: string, data: {
  time?: string;
  location?: string;
  activity?: string;
  cost?: number;
  isIcCard?: boolean;
  usingPass?: string | null;
  remark?: string | null;
}) {
  const updated = await db.dayActivity.update({
    where: { id },
    data: {
      ...(data.time !== undefined      && { time: data.time }),
      ...(data.location !== undefined  && { location: data.location }),
      ...(data.activity !== undefined  && { activity: data.activity }),
      ...(data.cost !== undefined      && { cost: Number(data.cost) || 0 }),
      ...(data.isIcCard !== undefined  && { isIcCard: Boolean(data.isIcCard) }),
      ...(data.usingPass !== undefined && { usingPass: data.usingPass }),
      ...(data.remark !== undefined    && { remark: data.remark }),
    },
    include: { day: true },
  });

  revalidatePath(`/trips/${updated.day.tripId}/days/${updated.day.slug}`);
  revalidatePath(`/trips/${updated.day.tripId}`);
  return updated;
}

export async function deleteActivity(id: string) {
  const activity = await db.dayActivity.findUnique({
    where: { id },
    include: { day: true },
  });
  if (!activity) return null;

  await db.dayActivity.delete({ where: { id } });
  revalidatePath(`/trips/${activity.day.tripId}/days/${activity.day.slug}`);
  revalidatePath(`/trips/${activity.day.tripId}`);
  return activity;
}

// ─────────────────────────────────────────────
// HOTEL / PASS / FLIGHT / BUDGET UPDATES
// ─────────────────────────────────────────────

export async function updateHotel(id: string, data: {
  name?: string; dateRange?: string; costThb?: number; costJpy?: number; notes?: string;
}) {
  const hotel = await db.hotelBooking.update({ where: { id }, data });
  revalidatePath(`/trips/${hotel.tripId}/bookings`);
  revalidatePath(`/trips/${hotel.tripId}`);
  return hotel;
}

export async function updatePass(id: string, data: {
  name?: string; costJpy?: number; costThb?: number; notes?: string;
}) {
  const pass = await db.passBooking.update({ where: { id }, data });
  revalidatePath(`/trips/${pass.tripId}/bookings`);
  revalidatePath(`/trips/${pass.tripId}`);
  return pass;
}

export async function updateBudget(id: string, data: {
  category?: string; amountJpy?: number; amountThb?: number; notes?: string;
}) {
  const budget = await db.budgetWallet.update({ where: { id }, data });
  revalidatePath(`/trips/${budget.tripId}/bookings`);
  revalidatePath(`/trips/${budget.tripId}`);
  return budget;
}

// ─────────────────────────────────────────────
// HOTEL / PASS / FLIGHT / BUDGET CREATE
// ─────────────────────────────────────────────

export async function createHotel(tripId: string, data: {
  name: string; dateRange: string; costThb?: number; costJpy?: number; notes?: string;
}) {
  const hotel = await db.hotelBooking.create({ data: { tripId, ...data } });
  revalidatePath(`/trips/${tripId}/bookings`);
  revalidatePath(`/trips/${tripId}`);
  return hotel;
}

export async function updateFlight(id: string, data: {
  flightNo?: string; route?: string; costThb?: number; costJpy?: number; notes?: string;
}) {
  const flight = await db.flightBooking.update({ where: { id }, data });
  revalidatePath(`/trips/${flight.tripId}/bookings`);
  revalidatePath(`/trips/${flight.tripId}`);
  return flight;
}

export async function deleteFlight(id: string, tripId: string) {
  await db.flightBooking.delete({ where: { id } });
  revalidatePath(`/trips/${tripId}/bookings`);
  revalidatePath(`/trips/${tripId}`);
}

export async function deleteHotel(id: string, tripId: string) {
  await db.hotelBooking.delete({ where: { id } });
  revalidatePath(`/trips/${tripId}/bookings`);
  revalidatePath(`/trips/${tripId}`);
}

export async function createFlight(tripId: string, data: {
  flightNo: string; route: string; costThb?: number; notes?: string;
}) {
  const flight = await db.flightBooking.create({ data: { tripId, ...data } });
  revalidatePath(`/trips/${tripId}/bookings`);
  revalidatePath(`/trips/${tripId}`);
  return flight;
}

export async function createBudgetWallet(tripId: string, data: {
  category: string; amountJpy: number; amountThb: number; notes?: string;
}) {
  const wallet = await db.budgetWallet.create({ data: { tripId, ...data } });
  revalidatePath(`/trips/${tripId}/bookings`);
  revalidatePath(`/trips/${tripId}`);
  return wallet;
}

export async function deleteBudgetWallet(id: string, tripId: string) {
  await db.budgetWallet.delete({ where: { id } });
  revalidatePath(`/trips/${tripId}/bookings`);
  revalidatePath(`/trips/${tripId}`);
}
