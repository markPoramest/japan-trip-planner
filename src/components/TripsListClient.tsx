"use client";

import { useState } from "react";
import Link from "next/link";
import { formatTHB, formatJPY } from "@/lib/utils";
import {
  Calendar,
  PlusCircle,
  ArrowRight,
  Compass,
  History,
  PlaneTakeoff,
  Loader2,
  Share2,
} from "lucide-react";
import SettingsKebab from "@/components/SettingsKebab";
import ShareTripModal from "@/components/ShareTripModal";
import { useLanguage } from "@/context/LanguageContext";

interface TripItem {
  id: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  exchangeRate: number;
  isPublic?: boolean;
  totalActivitiesJpy: number;
  totalPassJpy: number;
  totalHotelThb: number;
  totalHotelJpy?: number;
  totalFlightThb: number;
  grandTotalThb: number;
  daysCount: number;
  activitiesCount: number;
  days?: {
    id: string;
    dayNumber: number;
    title: string;
    dayCostJpy?: number;
    activities: { id: string; location: string; activity: string; cost?: number }[];
  }[];
  hotels?: any[];
  passes?: any[];
  flights?: any[];
}

export default function TripsListClient({ trips }: { trips: TripItem[] }) {
  const { t, language } = useLanguage();
  const [navigatingTripId, setNavigatingTripId] = useState<string | null>(null);
  const [sharingTrip, setSharingTrip] = useState<TripItem | null>(null);
  const dateLocale = language === "th" ? "th-TH" : "en-GB";

  // Calculate today at start of day
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTime = today.getTime();

  // Incoming plans: trip endDate is today or in future
  const incomingTrips = trips
    .filter((trip) => new Date(trip.endDate).getTime() >= todayTime)
    .sort(
      (a, b) =>
        new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
    );

  // Previous plans: trip endDate has passed
  const previousTrips = trips
    .filter((trip) => new Date(trip.endDate).getTime() < todayTime)
    .sort(
      (a, b) =>
        new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
    );

  const renderTripCard = (trip: TripItem, isPast: boolean, index: number = 0) => {
    const start = new Date(trip.startDate).toLocaleDateString(dateLocale, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    const end = new Date(trip.endDate).toLocaleDateString(dateLocale, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    const durationDays =
      trip.daysCount > 0
        ? trip.daysCount
        : Math.round(
            (new Date(trip.endDate).getTime() -
              new Date(trip.startDate).getTime()) /
              (1000 * 60 * 60 * 24)
          ) + 1;

    const totalJpy = trip.grandTotalThb / trip.exchangeRate;
    const flightJpy = trip.totalFlightThb / trip.exchangeRate;
    const hotelJpy = trip.totalHotelThb / trip.exchangeRate;

    return (
      <Link
        key={trip.id}
        href={`/trips/${trip.id}`}
        onClick={() => setNavigatingTripId(trip.id)}
        data-aos="fade-up"
        data-aos-delay={(index % 4) * 100}
        className={`bg-bg-card border border-border rounded-3xl p-6 shadow-card hover:border-accent hover:shadow-earth transition-all group flex flex-col justify-between cursor-pointer block select-none ${
          isPast ? "opacity-95 hover:opacity-100" : ""
        }`}
      >
        <div>
          {/* Badges & title */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                {isPast ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-bg-surface border border-border text-text-muted text-xs font-semibold">
                    <History className="w-3 h-3" /> {t("completedBadge")}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sage-subtle border border-sage-muted text-sage text-xs font-bold">
                    <PlaneTakeoff className="w-3 h-3" /> {t("upcomingBadge")}
                  </span>
                )}

                {/* Share Button on Badge Bar */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSharingTrip(trip);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-accent/10 hover:bg-accent text-accent hover:text-white border border-accent/30 text-xs font-bold transition-all active:scale-95 shadow-xs cursor-pointer z-10"
                  title={t("shareTrip")}
                >
                  <Share2 className="w-3 h-3" />
                  <span>{t("shareTrip")}</span>
                </button>
              </div>
              <h3 className="text-xl font-extrabold text-text-primary group-hover:text-accent transition-colors leading-tight">
                {trip.title}
              </h3>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="Logo"
              className="w-11 h-11 object-contain flex-shrink-0 group-hover:scale-105 transition-transform drop-shadow-sm"
            />
          </div>

          {trip.description && (
            <p className="text-sm text-text-muted mt-2 line-clamp-2">
              {trip.description}
            </p>
          )}

          {/* Date range */}
          <div className="mt-3 flex items-center gap-2 text-xs text-text-secondary">
            <Calendar className="w-4 h-4 text-accent/70" />
            <span>
              {start} — {end}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-bg-surface border border-border text-text-muted font-semibold">
              {durationDays} {t("days")}
            </span>
          </div>
        </div>

        {/* Cost snapshot with Dual Display */}
        <div className="mt-5 pt-4 border-t border-border/60">
          <div className="grid grid-cols-3 gap-2 text-xs mb-4">
            <div className="bg-bg-surface rounded-xl p-2.5 border border-border/60">
              <div className="text-text-muted mb-0.5">{t("totalCost")}</div>
              <div className="font-bold text-text-primary font-mono">
                {formatTHB(trip.grandTotalThb)}
              </div>
              <div className="text-[10px] text-text-muted font-mono">
                ≈ {formatJPY(totalJpy)}
              </div>
            </div>
            <div className="bg-bg-surface rounded-xl p-2.5 border border-border/60">
              <div className="text-text-muted mb-0.5">{t("flights")}</div>
              <div className="font-bold text-sage font-mono">
                {trip.totalFlightThb ? formatTHB(trip.totalFlightThb) : "—"}
              </div>
              <div className="text-[10px] text-text-muted font-mono">
                {trip.totalFlightThb ? `≈ ${formatJPY(flightJpy)}` : ""}
              </div>
            </div>
            <div className="bg-bg-surface rounded-xl p-2.5 border border-border/60">
              <div className="text-text-muted mb-0.5">{t("hotels")}</div>
              <div className="font-bold text-sand font-mono">
                {trip.totalHotelThb ? formatTHB(trip.totalHotelThb) : "—"}
              </div>
              <div className="text-[10px] text-text-muted font-mono">
                {trip.totalHotelThb ? `≈ ${formatJPY(hotelJpy)}` : ""}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-xs text-text-muted">
              {trip.daysCount} {t("days")} · {trip.activitiesCount}{" "}
              {t("activities")}
            </div>

            <div className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-bg-surface border border-border text-text-secondary group-hover:bg-accent group-hover:border-accent group-hover:text-white text-xs font-bold transition-all shadow-sm">
              {navigatingTripId === trip.id ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-accent group-hover:text-white" />
                  <span>
                    {language === "th" ? "กำลังเปิด..." : "Opening..."}
                  </span>
                </>
              ) : (
                <>
                  <span>{t("openTrip")}</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </div>
          </div>
        </div>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-bg-base pb-20">
      {/* Top Bar */}
      <header className="border-b border-border bg-bg-surface/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="Japan Trip Planner"
              className="w-10 h-10 object-contain drop-shadow-sm"
            />
            <div>
              <span className="text-base font-bold text-text-primary">
                {t("appTitle")}
              </span>
              <span className="ml-2 text-xs text-text-muted">
                {t("appSubtitle")}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              href="/trips/new"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-white text-xs font-bold shadow-accent hover:bg-accent-light transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{t("planNewTrip")}</span>
            </Link>

            <SettingsKebab />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 space-y-10">
        {/* Banner with Japanese Vibe */}
        <div
          data-aos="fade-down"
          className="relative overflow-hidden rounded-3xl bg-card-gradient border border-border p-8 sm:p-10 shadow-earth flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
        >
          <div className="relative z-10 max-w-xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-bold uppercase tracking-wider">
              🗾 {t("japanTripPlanner")}
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-text-primary tracking-tight leading-tight">
              {t("heroTitle")}
            </h1>
            <p className="text-text-secondary leading-relaxed text-sm sm:text-base">
              {t("heroSubtitle")}
            </p>
          </div>

          <div className="relative z-10 flex flex-col items-center gap-3 w-full md:w-auto">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="Japan Trip Planner Logo"
              className="w-32 h-32 sm:w-40 sm:h-40 object-contain drop-shadow-lg flex-shrink-0 self-center md:self-auto hover:scale-105 transition-transform"
            />
          </div>
        </div>

        {/* Global Empty State */}
        {trips.length === 0 && (
          <div
            data-aos="fade-up"
            className="bg-bg-card border border-border rounded-3xl p-16 text-center shadow-card"
          >
            <Compass className="w-12 h-12 text-text-faint mx-auto mb-4" />
            <h2 className="text-xl font-bold text-text-primary mb-2">
              {t("noTripsTitle")}
            </h2>
            <p className="text-text-muted mb-6">{t("noTripsSubtitle")}</p>
            <Link
              href="/trips/new"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-accent text-white font-bold shadow-accent hover:bg-accent-light transition-all cursor-pointer"
            >
              <PlusCircle className="w-5 h-5" />
              {t("planFirstTrip")}
            </Link>
          </div>
        )}

        {/* 1. Incoming Plans Section */}
        {trips.length > 0 && (
          <section className="space-y-5" data-aos="fade-up">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-accent/10 text-accent border border-accent/20 flex items-center justify-center">
                  <PlaneTakeoff className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-text-primary tracking-tight">
                    {t("incomingPlans")}
                  </h2>
                </div>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/30">
                  {incomingTrips.length}
                </span>
              </div>
              <Link
                href="/trips/new"
                className="text-xs text-accent hover:text-accent-light font-semibold flex items-center gap-1 cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" /> {t("addAnotherTrip")}
              </Link>
            </div>

            {incomingTrips.length === 0 ? (
              <div className="bg-bg-card border border-dashed border-border rounded-2xl p-8 text-center text-text-muted">
                <p className="text-sm font-medium">{t("noIncomingTrips")}</p>
                <Link
                  href="/trips/new"
                  className="mt-3 inline-flex items-center gap-1.5 text-xs text-accent hover:underline font-bold"
                >
                  <PlusCircle className="w-3.5 h-3.5" /> {t("planNewTrip")}
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {incomingTrips.map((trip, idx) =>
                  renderTripCard(trip, false, idx)
                )}
              </div>
            )}
          </section>
        )}

        {/* 2. Previous Plans Section */}
        {previousTrips.length > 0 && (
          <section className="space-y-5 pt-4" data-aos="fade-up">
            <div className="flex items-center gap-3 border-b border-border/60 pb-3">
              <div className="w-8 h-8 rounded-xl bg-bg-surface text-text-muted border border-border flex items-center justify-center">
                <History className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-text-primary tracking-tight">
                  {t("previousPlans")}
                </h2>
              </div>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-bg-surface text-text-muted border border-border">
                {previousTrips.length}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {previousTrips.map((trip, idx) =>
                renderTripCard(trip, true, idx)
              )}
            </div>
          </section>
        )}
      </main>

      {/* Share Trip Modal from /trips dashboard */}
      {sharingTrip && (
        <ShareTripModal
          isOpen={!!sharingTrip}
          onClose={() => setSharingTrip(null)}
          trip={{
            id: sharingTrip.id,
            title: sharingTrip.title,
            description: sharingTrip.description,
            startDate: sharingTrip.startDate,
            endDate: sharingTrip.endDate,
            exchangeRate: sharingTrip.exchangeRate,
            totalActivitiesCostJpy: sharingTrip.totalActivitiesJpy,
            totalHotelThb: sharingTrip.totalHotelThb,
            totalHotelJpy: sharingTrip.totalHotelJpy,
            totalPassJpy: sharingTrip.totalPassJpy,
            totalFlightThb: sharingTrip.totalFlightThb,
            isPublic: sharingTrip.isPublic !== false,
            days: sharingTrip.days || [],
            hotels: sharingTrip.hotels,
            passes: sharingTrip.passes,
            flights: sharingTrip.flights,
          }}
          isOwner={true}
        />
      )}
    </div>
  );
}
