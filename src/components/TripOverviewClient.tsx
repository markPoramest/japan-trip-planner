"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import TripStats from "@/components/TripStats";
import DayCard from "@/components/DayCard";
import HotelTable from "@/components/HotelTable";
import PassCard from "@/components/PassCard";
import BudgetBreakdown from "@/components/BudgetBreakdown";
import EditTripModal from "@/components/EditTripModal";
import ShareTripModal from "@/components/ShareTripModal";
import SwapDayModal from "@/components/SwapDayModal";
import JapanHeroArtwork from "@/components/JapanHeroArtwork";
import { deleteTrip } from "@/lib/actions";
import {
  Sparkles,
  Calendar,
  MapPin,
  Edit3,
  Printer,
  Trash2,
  AlertTriangle,
  Loader2,
  X,
  Share2,
  Globe,
  Lock,
  Instagram,
  ArrowLeftRight,
  MoreVertical,
  ClipboardList,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

interface TripData {
  id: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  exchangeRate: number;
  isPublic?: boolean;
  totalActivitiesCostJpy: number;
  totalIcSpendJpy: number;
  totalNonIcSpendJpy: number;
  totalHotelThb: number;
  totalHotelJpy: number;
  totalPassJpy: number;
  totalFlightThb: number;
  days: {
    id: string;
    dayNumber: number;
    date: Date | string;
    dayOfWeek: string;
    slug: string;
    title: string;
    activities: {
      id: string;
      time: string;
      location: string;
      activity: string;
      cost: number;
      isIcCard: boolean;
      usingPass: string | null;
    }[];
    plans?: any[];
  }[];
  hotels: any[];
  passes: any[];
  flights: any[];
  budgets: any[];
}

export default function TripOverviewClient({
  trip,
  isOwner = true,
}: {
  trip: TripData;
  isOwner?: boolean;
}) {
  const router = useRouter();
  const { t, language } = useLanguage();
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [swapModalOpen, setSwapModalOpen] = useState(false);
  const [swapInitialDayId, setSwapInitialDayId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [localDays, setLocalDays] = useState(trip.days);
  const [mobileKebabOpen, setMobileKebabOpen] = useState(false);
  const mobileKebabRef = useRef<HTMLDivElement>(null);
  const dateLocale = language === "th" ? "th-TH" : "en-GB";

  useEffect(() => {
    setLocalDays(trip.days);
  }, [trip.days]);

  // Handle outside click for mobile kebab menu
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (mobileKebabRef.current && !mobileKebabRef.current.contains(e.target as Node)) {
        setMobileKebabOpen(false);
      }
    }
    if (mobileKebabOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [mobileKebabOpen]);

  // Lock body scroll when delete confirmation modal is open
  useEffect(() => {
    if (showDeleteModal) {
      const orig = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = orig;
      };
    }
  }, [showDeleteModal]);

  function handleOptimisticSwap(dayIdA: string, dayIdB: string) {
    setLocalDays((prevDays) => {
      const idxA = prevDays.findIndex((d) => d.id === dayIdA);
      const idxB = prevDays.findIndex((d) => d.id === dayIdB);
      if (idxA === -1 || idxB === -1) return prevDays;

      const dayA = prevDays[idxA];
      const dayB = prevDays[idxB];

      const cleanA = dayA.title.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, "-").substring(0, 30).replace(/-$/, "");
      const cleanB = dayB.title.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, "-").substring(0, 30).replace(/-$/, "");
      const newSlugA = dayA.slug.match(/^day-\d+/)
        ? dayA.slug.replace(/^day-\d+/, `day-${dayB.dayNumber}`)
        : `day-${dayB.dayNumber}-${cleanA || "day"}`;
      const newSlugB = dayB.slug.match(/^day-\d+/)
        ? dayB.slug.replace(/^day-\d+/, `day-${dayA.dayNumber}`)
        : `day-${dayA.dayNumber}-${cleanB || "day"}`;

      const updatedA = {
        ...dayA,
        dayNumber: dayB.dayNumber,
        date: dayB.date,
        dayOfWeek: dayB.dayOfWeek,
        slug: newSlugA,
      };
      const updatedB = {
        ...dayB,
        dayNumber: dayA.dayNumber,
        date: dayA.date,
        dayOfWeek: dayA.dayOfWeek,
        slug: newSlugB,
      };

      const newDays = [...prevDays];
      newDays[idxA] = updatedB;
      newDays[idxB] = updatedA;
      newDays.sort((a, b) => a.dayNumber - b.dayNumber);
      return newDays;
    });
  }

  const durationDays = localDays.length;
  const durationNights = Math.max(0, durationDays - 1);

  const startStr = new Date(trip.startDate).toLocaleDateString(dateLocale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const endStr = new Date(trip.endDate).toLocaleDateString(dateLocale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  async function handleDeleteTrip() {
    setDeleting(true);
    try {
      await deleteTrip(trip.id);
      setShowDeleteModal(false);
      router.push("/trips");
    } catch (err) {
      console.error(err);
      alert("Failed to delete trip.");
      setDeleting(false);
    }
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-10 relative">
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-bg-card border border-border rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
                <AlertTriangle className="w-4 h-4" />
                <span>{t("deleteTripConfirmTitle")}</span>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="p-1 rounded-lg text-text-muted hover:text-text-primary transition-colors cursor-pointer disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-red-950/20 border border-red-500/20 space-y-2">
              <p className="text-xs text-text-muted leading-relaxed">
                {t("deleteTripConfirmText")}
              </p>
              <p className="text-sm font-bold text-text-primary">
                &quot;{trip.title}&quot;
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-text-muted hover:text-text-primary hover:bg-bg-surface transition-colors cursor-pointer"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                onClick={handleDeleteTrip}
                disabled={deleting}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{t("deleting")}</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t("deleteTrip")}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          HERO BANNER — Warm peach/coral gradient with scenic illustration
      ═══════════════════════════════════════════════════════════════ */}
      <div
        data-aos="fade-down"
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#FFF8F2] via-[#FFEDD5] to-[#FED7AA] dark:from-bg-card dark:via-bg-card dark:to-accent/10 border border-orange-200/60 dark:border-border p-6 sm:p-10 shadow-earth"
      >
        {/* Top-Right Action Icons */}
        <div className="absolute top-4 sm:top-6 right-4 sm:right-6 z-20 flex items-center gap-2">
          {/* ═══ MOBILE ONLY: Sleek Kebab Dropdown (MoreVertical) ═══ */}
          <div className="relative sm:hidden" ref={mobileKebabRef}>
            <button
              type="button"
              onClick={() => setMobileKebabOpen((prev) => !prev)}
              className="p-2 rounded-2xl bg-white/90 dark:bg-bg-surface/90 hover:bg-white dark:hover:bg-bg-surface border border-orange-200/70 dark:border-border text-text-primary shadow-xs active:scale-95 transition-all cursor-pointer flex items-center justify-center relative"
              aria-label="Trip actions"
              aria-expanded={mobileKebabOpen}
            >
              <MoreVertical className="w-4 h-4 text-text-secondary" />
              {/* Privacy indicator dot */}
              <span
                className={`absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full ${
                  trip.isPublic !== false ? "bg-emerald-400" : "bg-neutral-300"
                }`}
              />
            </button>

            {/* Mobile Dropdown Menu */}
            {mobileKebabOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 rounded-2xl bg-white/95 dark:bg-bg-card/95 backdrop-blur-md border border-orange-200/70 dark:border-border shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                {/* Share Option */}
                <button
                  type="button"
                  onClick={() => {
                    setMobileKebabOpen(false);
                    setShareModalOpen(true);
                  }}
                  className="w-full px-3.5 py-2.5 text-left text-xs font-semibold text-text-primary hover:bg-orange-50 dark:hover:bg-bg-surface flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <Share2 className="w-4 h-4 text-accent" />
                  <span className="flex-1">{t("shareTrip")}</span>
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      trip.isPublic !== false ? "bg-emerald-400" : "bg-neutral-300"
                    }`}
                  />
                </button>

                {isOwner && (
                  <>
                    {/* Edit Option */}
                    <button
                      type="button"
                      onClick={() => {
                        setMobileKebabOpen(false);
                        setEditModalOpen(true);
                      }}
                      className="w-full px-3.5 py-2.5 text-left text-xs font-semibold text-text-primary hover:bg-orange-50 dark:hover:bg-bg-surface flex items-center gap-2.5 transition-colors cursor-pointer border-t border-border/40"
                    >
                      <Edit3 className="w-4 h-4 text-text-secondary" />
                      <span>{t("editTrip")}</span>
                    </button>

                    {/* Delete Option */}
                    <button
                      type="button"
                      onClick={() => {
                        setMobileKebabOpen(false);
                        setShowDeleteModal(true);
                      }}
                      className="w-full px-3.5 py-2.5 text-left text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 flex items-center gap-2.5 transition-colors cursor-pointer border-t border-border/40"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                      <span>{t("deleteTrip")}</span>
                    </button>
                  </>
                )}

                {!isOwner && (
                  <div className="px-3.5 py-2 text-[11px] text-text-muted flex items-center gap-2 border-t border-border/40">
                    <Globe className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{t("publicTripViewOnly")}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ═══ DESKTOP ONLY: Full Action Icons (sm:flex) ═══ */}
          <div className="hidden sm:flex items-center gap-2">
            {/* Share / Instagram Story */}
            <button
              type="button"
              onClick={() => setShareModalOpen(true)}
              className="p-2 sm:p-2.5 rounded-2xl bg-white/80 dark:bg-bg-surface/80 hover:bg-accent hover:text-white border border-orange-200/60 dark:border-border text-text-secondary shadow-xs hover:shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer relative"
              title={t("shareTrip")}
            >
              <Share2 className="w-4 h-4" />
              <span
                className={`absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full ${
                  trip.isPublic !== false ? "bg-emerald-400" : "bg-neutral-300"
                }`}
              />
            </button>

            {isOwner && (
              <>
                {/* Edit Trip */}
                <button
                  type="button"
                  onClick={() => setEditModalOpen(true)}
                  className="p-2 sm:p-2.5 rounded-2xl bg-white/80 dark:bg-bg-surface/80 hover:bg-accent hover:text-white border border-orange-200/60 dark:border-border text-text-secondary shadow-xs hover:shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer"
                  title={t("editTrip")}
                >
                  <Edit3 className="w-4 h-4" />
                </button>

                {/* Delete Trip */}
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(true)}
                  className="p-2 sm:p-2.5 rounded-2xl bg-white/80 dark:bg-bg-surface/80 hover:bg-red-500 hover:text-white hover:border-red-500 border border-orange-200/60 dark:border-border text-text-secondary shadow-xs hover:shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer"
                  title={t("deleteTrip")}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}

            {!isOwner && (
              <span
                className="p-2 sm:p-2.5 rounded-2xl bg-white/80 dark:bg-bg-surface/80 border border-orange-200/60 dark:border-border text-text-muted inline-flex items-center justify-center"
                title={t("publicTripViewOnly")}
              >
                <Globe className="w-4 h-4 text-emerald-400" />
              </span>
            )}
          </div>
        </div>

        <div className="relative z-10 max-w-3xl pr-12 sm:pr-0">
          <h1 className="text-2xl sm:text-4xl font-extrabold text-text-primary tracking-tight leading-tight">
            {trip.title}
          </h1>
          {trip.description && (
            <p className="text-text-secondary mt-2 leading-relaxed text-sm sm:text-base">
              {trip.description}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3 mt-5 text-xs text-text-muted">
            <span className="flex items-center gap-1.5 bg-white/70 dark:bg-bg-surface px-3 py-1.5 rounded-xl border border-orange-200/50 dark:border-border">
              <Calendar className="w-4 h-4 text-accent/70" /> {startStr} – {endStr}
            </span>
            <span className="flex items-center gap-1.5 bg-white/70 dark:bg-bg-surface px-3 py-1.5 rounded-xl border border-orange-200/50 dark:border-border">
              <MapPin className="w-4 h-4 text-accent/70" /> {durationDays} {t("daysCountSuffix")} {durationNights} {t("nightsCountSuffix")}
            </span>
          </div>
        </div>

        {/* Decorative Japanese landscape artwork on the right with seasonal theme */}
        <div className="absolute right-0 bottom-0 w-64 sm:w-80 md:w-96 h-40 sm:h-52 md:h-56 pointer-events-none select-none opacity-90 dark:opacity-40">
          <JapanHeroArtwork
            date={trip.startDate}
            className="w-full h-full object-contain object-right-bottom drop-shadow-sm"
          />
        </div>
      </div>

      {/* 5 Financial Summary Stat Cards */}
      <TripStats
        totalActivitiesCostJpy={trip.totalActivitiesCostJpy}
        totalIcSpendJpy={trip.totalIcSpendJpy}
        totalNonIcSpendJpy={trip.totalNonIcSpendJpy}
        totalHotelThb={trip.totalHotelThb}
        totalHotelJpy={trip.totalHotelJpy}
        totalPassJpy={trip.totalPassJpy}
        totalFlightThb={trip.totalFlightThb}
        exchangeRate={trip.exchangeRate}
      />

      {/* ════════════ Section Separator ════════════ */}
      <div className="border-t border-dashed border-border/60" />

      {/* Daily Itinerary Grid */}
      <section className="space-y-6" data-aos="fade-up">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-accent/10 text-accent border border-accent/20">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-text-primary tracking-tight">
                {t("dailySchedule")}
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                {localDays.length} {t("daysPlanned")} · {t("clickToViewDetails")}
              </p>
            </div>
          </div>

          {isOwner && localDays.length > 1 && (
            <button
              type="button"
              onClick={() => {
                setSwapInitialDayId(null);
                setSwapModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-bg-card hover:bg-accent/10 border border-border hover:border-accent/40 text-text-secondary hover:text-accent text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-accent" />
              <span>{t("swapDays")}</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {localDays.map((day, idx) => (
            <DayCard
              key={`${day.id}-${day.dayNumber}`}
              day={{
                ...day,
                date: typeof day.date === "string" ? new Date(day.date) : day.date,
              }}
              tripId={trip.id}
              isOwner={isOwner}
              index={idx}
            />
          ))}
        </div>
      </section>

      {/* ════════════ Section Separator ════════════ */}
      <div className="border-t border-dashed border-border/60" />

      {/* Budget Allocations */}
      <div data-aos="fade-up">
        <BudgetBreakdown
          tripId={isOwner ? trip.id : undefined}
          budgets={trip.budgets}
          totalIcSpentJpy={trip.totalIcSpendJpy}
          totalNonIcSpentJpy={trip.totalNonIcSpendJpy}
          exchangeRate={trip.exchangeRate}
        />
      </div>

      {/* ════════════ Section Separator ════════════ */}
      <div className="border-t border-dashed border-border/60" />

      {/* Hotels, Passes & Flights */}
      <section className="space-y-6" data-aos="fade-up">
        <HotelTable
          tripId={isOwner ? trip.id : undefined}
          hotels={trip.hotels}
          exchangeRate={trip.exchangeRate}
          tripStartDate={trip.startDate}
          tripEndDate={trip.endDate}
        />

        {/* ════════════ Section Separator ════════════ */}
        <div className="border-t border-dashed border-border/60" />

        <PassCard
          tripId={isOwner ? trip.id : undefined}
          passes={trip.passes}
          flights={trip.flights}
          exchangeRate={trip.exchangeRate}
        />
      </section>

      {/* Edit Trip Modal (Owner only) */}
      {isOwner && (
        <EditTripModal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          trip={{
            id: trip.id,
            title: trip.title,
            description: trip.description,
            startDate: trip.startDate,
            endDate: trip.endDate,
            exchangeRate: trip.exchangeRate,
          }}
        />
      )}

      {/* Share & Instagram Story Modal */}
      <ShareTripModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        isOwner={isOwner}
        trip={{
          id: trip.id,
          title: trip.title,
          description: trip.description,
          startDate: trip.startDate,
          endDate: trip.endDate,
          exchangeRate: trip.exchangeRate,
          totalActivitiesCostJpy: trip.totalActivitiesCostJpy,
          totalHotelThb: trip.totalHotelThb,
          totalHotelJpy: trip.totalHotelJpy,
          totalPassJpy: trip.totalPassJpy,
          totalFlightThb: trip.totalFlightThb,
          isPublic: trip.isPublic !== false,
          days: trip.days.map((d) => {
            const mainPlan = d.plans?.find((p: any) => p.isMain) || d.plans?.[0];
            const activeActivities = mainPlan ? mainPlan.activities : d.activities;
            const dayCostJpy = activeActivities.reduce((s: number, a: any) => s + (a.cost || 0), 0);
            return {
              id: d.id,
              dayNumber: d.dayNumber,
              title: d.title,
              dayCostJpy,
              activities: activeActivities.map((a: any) => ({
                id: a.id,
                location: a.location,
                activity: a.activity,
                cost: a.cost,
              })),
            };
          }),
          hotels: trip.hotels,
          passes: trip.passes,
          flights: trip.flights,
        }}
      />

      {/* Swap Day Itinerary Modal */}
      {swapModalOpen && (
        <SwapDayModal
          isOpen={swapModalOpen}
          onClose={() => setSwapModalOpen(false)}
          tripId={trip.id}
          days={localDays}
          initialDayId={swapInitialDayId}
          onOptimisticSwap={handleOptimisticSwap}
        />
      )}
    </main>
  );
}
