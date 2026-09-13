"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import TripStats from "@/components/TripStats";
import DayCard from "@/components/DayCard";
import HotelTable from "@/components/HotelTable";
import PassCard from "@/components/PassCard";
import BudgetBreakdown from "@/components/BudgetBreakdown";
import EditTripModal from "@/components/EditTripModal";
import ShareTripModal from "@/components/ShareTripModal";
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
  const [deleting, setDeleting] = useState(false);
  const dateLocale = language === "th" ? "th-TH" : "en-GB";

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

      {/* Hero banner with AOS */}
      <div
        data-aos="fade-down"
        className="relative overflow-hidden rounded-3xl bg-card-gradient border border-border p-6 sm:p-10 shadow-earth"
      >
        <div className="relative z-10 max-w-3xl">
          <div className="flex items-center gap-2.5 mb-4 flex-wrap">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/30 text-accent text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" /> {t("japanTripPlanner")}
            </div>

            {/* Share / Instagram Story Button */}
            <button
              type="button"
              onClick={() => setShareModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-accent hover:bg-accent-light text-white text-xs font-bold transition-all shadow-accent hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{t("shareTrip")}</span>
              <span
                className={`w-2 h-2 rounded-full ${
                  trip.isPublic !== false ? "bg-emerald-300 animate-pulse" : "bg-white/40"
                }`}
                title={trip.isPublic !== false ? "Public" : "Private"}
              />
            </button>

            {isOwner && (
              <button
                onClick={() => setEditModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-bg-surface hover:bg-accent hover:text-white border border-border text-text-secondary text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{t("editTrip")}</span>
              </button>
            )}

            <Link
              href={`/trips/${trip.id}/export`}
              className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-accent/15 hover:bg-accent text-accent hover:text-white border border-accent/30 text-xs font-bold transition-all shadow-sm active:scale-95"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{t("exportPdf")}</span>
            </Link>

            {/* Delete Trip Button (Owner only) */}
            {isOwner && (
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-bg-surface hover:bg-red-950/40 text-text-muted hover:text-red-400 border border-border hover:border-red-500/30 text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
                title={t("deleteTrip")}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t("deleteTrip")}</span>
              </button>
            )}

            {!isOwner && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-bg-surface border border-border text-[11px] font-semibold text-text-muted">
                <Globe className="w-3 h-3 text-emerald-400" />
                <span>{language === "th" ? "ทริปสาธารณะ (โหมดอ่านอย่างเดียว)" : "Public Trip (View Only)"}</span>
              </span>
            )}
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-text-primary tracking-tight leading-tight">
            {trip.title}
          </h1>
          {trip.description && (
            <p className="text-text-secondary mt-2 leading-relaxed text-sm sm:text-base">
              {trip.description}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3 mt-5 text-xs text-text-muted">
            <span className="flex items-center gap-1.5 bg-bg-surface px-3 py-1.5 rounded-xl border border-border">
              <Calendar className="w-4 h-4 text-accent/70" /> {startStr} – {endStr}
            </span>
            <span className="flex items-center gap-1.5 bg-bg-surface px-3 py-1.5 rounded-xl border border-border">
              <MapPin className="w-4 h-4 text-accent/70" /> {trip.days.length} {t("daysPlanned")}
            </span>
          </div>
        </div>

        {/* Decorative background logo */}
        <div className="absolute -right-6 -bottom-10 opacity-10 pointer-events-none select-none">
          <img src="/logo.png" alt="Logo Watermark" className="w-72 h-72 object-contain" />
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

      {/* Daily Itinerary Grid with AOS */}
      <section className="space-y-6" data-aos="fade-up">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-text-primary tracking-tight">
              {t("dailySchedule")}
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              {trip.days.length} {t("daysPlanned")}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trip.days.map((day, idx) => (
            <DayCard
              key={day.id}
              day={{
                ...day,
                date: typeof day.date === "string" ? new Date(day.date) : day.date,
              }}
              tripId={trip.id}
              index={idx}
            />
          ))}
        </div>
      </section>

      {/* Budget Allocations with AOS */}
      <div data-aos="fade-up">
        <BudgetBreakdown
          tripId={isOwner ? trip.id : undefined}
          budgets={trip.budgets}
          totalIcSpentJpy={trip.totalIcSpendJpy}
          totalNonIcSpentJpy={trip.totalNonIcSpendJpy}
          exchangeRate={trip.exchangeRate}
        />
      </div>

      {/* Hotels, Passes & Flights with AOS */}
      <section className="space-y-6" data-aos="fade-up">
        <HotelTable
          tripId={isOwner ? trip.id : undefined}
          hotels={trip.hotels}
          exchangeRate={trip.exchangeRate}
          tripStartDate={trip.startDate}
          tripEndDate={trip.endDate}
        />
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
          days: trip.days.map((d) => ({
            id: d.id,
            dayNumber: d.dayNumber,
            title: d.title,
            activities: d.activities.map((a) => ({
              id: a.id,
              location: a.location,
              activity: a.activity,
            })),
          })),
          hotels: trip.hotels,
          passes: trip.passes,
          flights: trip.flights,
        }}
        isOwner={isOwner}
      />
    </main>
  );
}
