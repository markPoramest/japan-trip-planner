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

// ─────────────────────────────────────────────
// AUTH & OWNERSHIP HELPERS
// ─────────────────────────────────────────────

async function getAuthenticatedUser(): Promise<string> {
  const session = await getAuthSession();
  const userId = (session?.user as any)?.id;
  if (!userId) {
    throw new Error("Unauthorized: Please sign in to edit this trip");
  }
  return userId;
}

async function verifyTripOwnership(tripId: string): Promise<void> {
  const userId = await getAuthenticatedUser();
  const trip = await db.trip.findUnique({
    where: { id: tripId },
    select: { id: true, userId: true },
  });
  if (!trip) throw new Error("Trip not found");
  if (!trip.userId) {
    await db.trip.update({ where: { id: tripId }, data: { userId } });
    return;
  }
  if (trip.userId !== userId) {
    throw new Error("Forbidden: You are not authorized to edit this trip");
  }
}

async function verifyDayOwnership(dayId: string, expectedTripId?: string): Promise<string> {
  const day = await db.tripDay.findUnique({
    where: { id: dayId },
    select: { tripId: true },
  });
  if (!day) throw new Error("Day not found");
  if (expectedTripId && day.tripId !== expectedTripId) {
    throw new Error("Invalid trip day");
  }
  await verifyTripOwnership(day.tripId);
  return day.tripId;
}

async function verifyActivityOwnership(activityId: string): Promise<string> {
  const activity = await db.dayActivity.findUnique({
    where: { id: activityId },
    select: { day: { select: { tripId: true } } },
  });
  if (!activity) throw new Error("Activity not found");
  await verifyTripOwnership(activity.day.tripId);
  return activity.day.tripId;
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
  await verifyTripOwnership(tripId);

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
  await verifyTripOwnership(tripId);

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
  await verifyDayOwnership(dayId, tripId);

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

  if (data.title) {
    await db.dayPlan.updateMany({
      where: { dayId, isMain: true },
      data: { title: data.title },
    });
  }

  return updated;
}

export async function createPass(tripId: string, data: { name: string; costJpy?: number; validDays?: number; notes?: string }) {
  await verifyTripOwnership(tripId);

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
  await verifyTripOwnership(tripId);
  await db.passBooking.delete({ where: { id } });
  revalidatePath(`/trips/${tripId}`);
  revalidatePath("/trips");
}

export async function deleteTrip(tripId: string) {
  await verifyTripOwnership(tripId);

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
  await verifyTripOwnership(data.tripId);

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
  await verifyTripOwnership(tripId);
  await db.tripDay.delete({ where: { id } });
  revalidatePath(`/trips/${tripId}`);
}

// ─────────────────────────────────────────────
// DAY PLAN CRUD (MAIN & SUBSTITUTE PLANS)
// ─────────────────────────────────────────────

export async function createSubstitutePlan(
  dayId: string,
  data: {
    title?: string;
    tag?: string;
    notes?: string;
    copyFromPlanId?: string;
  }
) {
  const tripId = await verifyDayOwnership(dayId);
  const day = await db.tripDay.findUnique({
    where: { id: dayId },
    include: {
      plans: {
        include: { activities: { orderBy: { sortOrder: "asc" } } },
      },
    },
  });
  if (!day) throw new Error("Day not found");

  const substitutePlans = day.plans.filter((p) => !p.isMain);
  if (substitutePlans.length >= 3) {
    throw new Error("Maximum of 3 substitute plans reached for this day");
  }

  // Derive next letter code: B, C, D
  const letters = ["B", "C", "D"];
  const existingTitles = day.plans.map((p) => p.title.toLowerCase());
  let nextLetter = letters[substitutePlans.length] || "B";
  for (const l of letters) {
    if (!existingTitles.some((t) => t.includes(`plan ${l.toLowerCase()}`))) {
      nextLetter = l;
      break;
    }
  }

  const defaultTitle = data.title?.trim() || `Plan ${nextLetter}`;
  const nextSortOrder = (day.plans.reduce((max, p) => Math.max(max, p.sortOrder), 0) || 0) + 1;

  const newPlan = await db.dayPlan.create({
    data: {
      dayId,
      title: defaultTitle,
      tag: data.tag || "backup",
      notes: data.notes || null,
      isMain: false,
      sortOrder: nextSortOrder,
    },
  });

  // By default, clone activities from the current Main Plan if available
  let sourcePlanId = data.copyFromPlanId;
  if (sourcePlanId === undefined) {
    const mainPlan = day.plans.find((p) => p.isMain);
    if (mainPlan) sourcePlanId = mainPlan.id;
  }

  if (sourcePlanId) {
    const sourcePlan = day.plans.find((p) => p.id === sourcePlanId);
    if (sourcePlan && sourcePlan.activities.length > 0) {
      await db.dayActivity.createMany({
        data: sourcePlan.activities.map((a, idx) => ({
          dayId,
          planId: newPlan.id,
          time: a.time,
          location: a.location,
          activity: a.activity,
          cost: a.cost,
          isIcCard: a.isIcCard,
          usingPass: a.usingPass,
          remark: a.remark,
          sortOrder: idx,
        })),
      });
    }
  }

  revalidatePath(`/trips/${tripId}`);
  revalidatePath(`/trips/${tripId}/days/${day.slug}`);
  return newPlan;
}

export async function swapMainPlan(
  dayId: string,
  substitutePlanId: string,
  newDayTitle?: string
) {
  const tripId = await verifyDayOwnership(dayId);
  const day = await db.tripDay.findUnique({
    where: { id: dayId },
    include: { plans: true },
  });
  if (!day) throw new Error("Day not found");

  const targetPlan = day.plans.find((p) => p.id === substitutePlanId);
  if (!targetPlan) throw new Error("Substitute plan not found");
  if (targetPlan.isMain) return { targetPlan, slug: day.slug, dayTitle: day.title };

  const currentMain = day.plans.find((p) => p.isMain);

  let newSlug = day.slug;
  let finalDayTitle = (newDayTitle?.trim() || targetPlan.title).trim();

  await db.$transaction(async (tx) => {
    if (currentMain) {
      await tx.dayPlan.update({
        where: { id: currentMain.id },
        data: { isMain: false },
      });
    }
    await tx.dayPlan.update({
      where: { id: targetPlan.id },
      data: { isMain: true, title: finalDayTitle },
    });

    if (finalDayTitle && finalDayTitle !== day.title) {
      await tx.tripDay.update({
        where: { id: dayId },
        data: {
          title: finalDayTitle,
        },
      });
    }
  });

  revalidatePath(`/trips/${tripId}`);
  revalidatePath(`/trips/${tripId}/days/${day.slug}`);
  return { targetPlan, slug: day.slug, dayTitle: finalDayTitle };
}

export async function updateDayPlan(
  planId: string,
  data: { title?: string; tag?: string; notes?: string }
) {
  const plan = await db.dayPlan.findUnique({
    where: { id: planId },
    include: { day: true },
  });
  if (!plan) throw new Error("Plan not found");
  await verifyTripOwnership(plan.day.tripId);

  const updated = await db.dayPlan.update({
    where: { id: planId },
    data: {
      title: data.title !== undefined ? data.title.trim() : undefined,
      tag: data.tag !== undefined ? data.tag : undefined,
      notes: data.notes !== undefined ? data.notes : undefined,
    },
  });

  revalidatePath(`/trips/${plan.day.tripId}`);
  revalidatePath(`/trips/${plan.day.tripId}/days/${plan.day.slug}`);
  return updated;
}

export async function deleteSubstitutePlan(planId: string) {
  const plan = await db.dayPlan.findUnique({
    where: { id: planId },
    include: { day: true },
  });
  if (!plan) throw new Error("Plan not found");
  if (plan.isMain) {
    throw new Error("Cannot delete the active Main Plan");
  }
  await verifyTripOwnership(plan.day.tripId);

  await db.$transaction([
    db.dayActivity.deleteMany({ where: { planId } }),
    db.dayPlan.delete({ where: { id: planId } }),
  ]);

  revalidatePath(`/trips/${plan.day.tripId}`);
  revalidatePath(`/trips/${plan.day.tripId}/days/${plan.day.slug}`);
  return { success: true };
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
  planId?: string;
}) {
  await verifyDayOwnership(dayId);

  let targetPlanId = data.planId;
  if (!targetPlanId) {
    const mainPlan = await db.dayPlan.findFirst({
      where: { dayId, isMain: true },
      select: { id: true },
    });
    if (mainPlan) {
      targetPlanId = mainPlan.id;
    } else {
      const day = await db.tripDay.findUnique({
        where: { id: dayId },
        select: { title: true },
      });
      const fallbackPlan = await db.dayPlan.create({
        data: {
          dayId,
          title: day?.title || "Main Plan",
          tag: "main",
          isMain: true,
          sortOrder: 0,
        },
      });
      targetPlanId = fallbackPlan.id;
    }
  }

  const count = await db.dayActivity.count({
    where: targetPlanId ? { planId: targetPlanId } : { dayId },
  });

  const newActivity = await db.dayActivity.create({
    data: {
      dayId,
      planId: targetPlanId || null,
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

export async function createActivitiesBatch(
  dayId: string,
  items: Array<{
    time: string;
    location: string;
    activity: string;
    cost: number;
    isIcCard: boolean;
    usingPass?: string;
    remark?: string;
  }>,
  planId?: string
) {
  await verifyDayOwnership(dayId);
  if (!items || items.length === 0) return { success: true, count: 0 };

  const day = await db.tripDay.findUnique({
    where: { id: dayId },
    select: { slug: true, tripId: true, title: true },
  });

  let targetPlanId = planId;
  if (!targetPlanId) {
    const mainPlan = await db.dayPlan.findFirst({
      where: { dayId, isMain: true },
      select: { id: true },
    });
    if (mainPlan) {
      targetPlanId = mainPlan.id;
    } else {
      const fallbackPlan = await db.dayPlan.create({
        data: {
          dayId,
          title: day?.title || "Main Plan",
          tag: "main",
          isMain: true,
          sortOrder: 0,
        },
      });
      targetPlanId = fallbackPlan.id;
    }
  }

  const existingCount = await db.dayActivity.count({
    where: targetPlanId ? { planId: targetPlanId } : { dayId },
  });

  const activitiesData = items.map((item, index) => ({
    dayId,
    planId: targetPlanId || null,
    time: item.time || "09:00",
    location: item.location || "",
    activity: item.activity || "",
    cost: Number(item.cost) || 0,
    isIcCard: Boolean(item.isIcCard),
    usingPass: item.usingPass || null,
    remark: item.remark || null,
    sortOrder: existingCount + index,
  }));

  await db.dayActivity.createMany({
    data: activitiesData,
  });

  if (day) {
    revalidatePath(`/trips/${day.tripId}/days/${day.slug}`);
    revalidatePath(`/trips/${day.tripId}`);
  }
  return { success: true, count: items.length };
}

export async function saveActivitiesBatch(
  dayId: string,
  data: {
    planId?: string;
    items: Array<{
      id?: string;
      time: string;
      location: string;
      activity: string;
      cost: number;
      isIcCard: boolean;
      usingPass?: string | null;
      remark?: string | null;
    }>;
    deletedIds?: string[];
  }
) {
  await verifyDayOwnership(dayId);

  const day = await db.tripDay.findUnique({
    where: { id: dayId },
    select: { slug: true, tripId: true, title: true },
  });
  if (!day) throw new Error("Day not found");

  let targetPlanId = data.planId;
  if (!targetPlanId) {
    const mainPlan = await db.dayPlan.findFirst({
      where: { dayId, isMain: true },
      select: { id: true },
    });
    if (mainPlan) {
      targetPlanId = mainPlan.id;
    } else {
      const fallbackPlan = await db.dayPlan.create({
        data: {
          dayId,
          title: day.title || "Main Plan",
          tag: "main",
          isMain: true,
          sortOrder: 0,
        },
      });
      targetPlanId = fallbackPlan.id;
    }
  }

  await db.$transaction(async (tx) => {
    // 1. Delete removed activities
    if (data.deletedIds && data.deletedIds.length > 0) {
      await tx.dayActivity.deleteMany({
        where: {
          id: { in: data.deletedIds },
          dayId,
        },
      });
    }

    // 2. Process items (update existing or create new)
    for (let i = 0; i < data.items.length; i++) {
      const item = data.items[i];
      if (item.id && !item.id.startsWith("row-")) {
        // Update existing activity
        await tx.dayActivity.update({
          where: { id: item.id },
          data: {
            time: item.time || "09:00",
            location: item.location || "",
            activity: item.activity || "",
            cost: Number(item.cost) || 0,
            isIcCard: Boolean(item.isIcCard),
            usingPass: item.usingPass || null,
            remark: item.remark || null,
            sortOrder: i,
          },
        });
      } else {
        // Create new activity
        await tx.dayActivity.create({
          data: {
            dayId,
            planId: targetPlanId || null,
            time: item.time || "09:00",
            location: item.location || "",
            activity: item.activity || "",
            cost: Number(item.cost) || 0,
            isIcCard: Boolean(item.isIcCard),
            usingPass: item.usingPass || null,
            remark: item.remark || null,
            sortOrder: i,
          },
        });
      }
    }
  });

  revalidatePath(`/trips/${day.tripId}/days/${day.slug}`);
  revalidatePath(`/trips/${day.tripId}`);
  return { success: true };
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
  await verifyActivityOwnership(id);

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
  await verifyActivityOwnership(id);

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
  name?: string;
  dateRange?: string;
  checkIn?: string | Date | null;
  checkOut?: string | Date | null;
  costThb?: number;
  costJpy?: number;
  notes?: string;
}) {
  const existing = await db.hotelBooking.findUnique({ where: { id }, select: { tripId: true } });
  if (!existing) throw new Error("Hotel not found");
  await verifyTripOwnership(existing.tripId);

  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.dateRange !== undefined) updateData.dateRange = data.dateRange;
  if (data.checkIn !== undefined) updateData.checkIn = data.checkIn ? new Date(data.checkIn) : null;
  if (data.checkOut !== undefined) updateData.checkOut = data.checkOut ? new Date(data.checkOut) : null;
  if (data.costThb !== undefined) updateData.costThb = data.costThb;
  if (data.costJpy !== undefined) updateData.costJpy = data.costJpy;
  if (data.notes !== undefined) updateData.notes = data.notes;

  const hotel = await db.hotelBooking.update({ where: { id }, data: updateData });
  revalidatePath(`/trips/${hotel.tripId}/bookings`);
  revalidatePath(`/trips/${hotel.tripId}`);
  return hotel;
}

export async function updatePass(id: string, data: {
  name?: string; costJpy?: number; costThb?: number; notes?: string;
}) {
  const existing = await db.passBooking.findUnique({ where: { id }, select: { tripId: true } });
  if (!existing) throw new Error("Pass not found");
  await verifyTripOwnership(existing.tripId);

  const pass = await db.passBooking.update({ where: { id }, data });
  revalidatePath(`/trips/${pass.tripId}/bookings`);
  revalidatePath(`/trips/${pass.tripId}`);
  return pass;
}

export async function updateBudget(id: string, data: {
  category?: string; amountJpy?: number; amountThb?: number; notes?: string;
}) {
  const existing = await db.budgetWallet.findUnique({ where: { id }, select: { tripId: true } });
  if (!existing) throw new Error("Budget not found");
  await verifyTripOwnership(existing.tripId);

  const budget = await db.budgetWallet.update({ where: { id }, data });
  revalidatePath(`/trips/${budget.tripId}/bookings`);
  revalidatePath(`/trips/${budget.tripId}`);
  return budget;
}

// ─────────────────────────────────────────────
// HOTEL / PASS / FLIGHT / BUDGET CREATE
// ─────────────────────────────────────────────

export async function createHotel(tripId: string, data: {
  name: string;
  dateRange: string;
  checkIn?: string | Date | null;
  checkOut?: string | Date | null;
  costThb?: number;
  costJpy?: number;
  notes?: string;
}) {
  await verifyTripOwnership(tripId);

  const hotel = await db.hotelBooking.create({
    data: {
      tripId,
      name: data.name,
      dateRange: data.dateRange,
      checkIn: data.checkIn ? new Date(data.checkIn) : null,
      checkOut: data.checkOut ? new Date(data.checkOut) : null,
      costThb: data.costThb,
      costJpy: data.costJpy,
      notes: data.notes,
    },
  });
  revalidatePath(`/trips/${tripId}/bookings`);
  revalidatePath(`/trips/${tripId}`);
  return hotel;
}

export async function updateFlight(id: string, data: {
  flightNo?: string; route?: string; costThb?: number; costJpy?: number; notes?: string;
}) {
  const existing = await db.flightBooking.findUnique({ where: { id }, select: { tripId: true } });
  if (!existing) throw new Error("Flight not found");
  await verifyTripOwnership(existing.tripId);

  const flight = await db.flightBooking.update({ where: { id }, data });
  revalidatePath(`/trips/${flight.tripId}/bookings`);
  revalidatePath(`/trips/${flight.tripId}`);
  return flight;
}

export async function deleteFlight(id: string, tripId: string) {
  await verifyTripOwnership(tripId);
  await db.flightBooking.delete({ where: { id } });
  revalidatePath(`/trips/${tripId}/bookings`);
  revalidatePath(`/trips/${tripId}`);
}

export async function deleteHotel(id: string, tripId: string) {
  await verifyTripOwnership(tripId);
  await db.hotelBooking.delete({ where: { id } });
  revalidatePath(`/trips/${tripId}/bookings`);
  revalidatePath(`/trips/${tripId}`);
}

export async function createFlight(tripId: string, data: {
  flightNo: string; route: string; costThb?: number; notes?: string;
}) {
  await verifyTripOwnership(tripId);

  const flight = await db.flightBooking.create({ data: { tripId, ...data } });
  revalidatePath(`/trips/${tripId}/bookings`);
  revalidatePath(`/trips/${tripId}`);
  return flight;
}

export async function createBudgetWallet(tripId: string, data: {
  category: string; amountJpy: number; amountThb: number; notes?: string;
}) {
  await verifyTripOwnership(tripId);

  const wallet = await db.budgetWallet.create({ data: { tripId, ...data } });
  revalidatePath(`/trips/${tripId}/bookings`);
  revalidatePath(`/trips/${tripId}`);
  return wallet;
}

export async function deleteBudgetWallet(id: string, tripId: string) {
  await verifyTripOwnership(tripId);
  await db.budgetWallet.delete({ where: { id } });
  revalidatePath(`/trips/${tripId}/bookings`);
  revalidatePath(`/trips/${tripId}`);
}

export async function getTripLocations(tripId: string): Promise<{ name: string; count: number }[]> {
  if (!tripId) return [];

  const days = await db.tripDay.findMany({
    where: { tripId },
    include: {
      activities: {
        select: { location: true },
      },
    },
  });

  const hotels = await db.hotelBooking.findMany({
    where: { tripId },
    select: { name: true },
  });

  const locationCounts = new Map<string, number>();

  for (const d of days) {
    for (const a of d.activities) {
      const loc = a.location?.trim();
      if (loc && loc.toLowerCase() !== "location") {
        locationCounts.set(loc, (locationCounts.get(loc) || 0) + 1);
      }
    }
  }

  for (const h of hotels) {
    const hName = h.name?.trim();
    if (hName && !locationCounts.has(hName)) {
      locationCounts.set(hName, 1);
    }
  }

  return Array.from(locationCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));
}

