"use client";

import HotelTable from "@/components/HotelTable";
import PassCard from "@/components/PassCard";
import BudgetBreakdown from "@/components/BudgetBreakdown";
import { useLanguage } from "@/context/LanguageContext";
import { Globe } from "lucide-react";

interface BookingsClientProps {
  trip: {
    id: string;
    startDate?: string | Date;
    endDate?: string | Date;
    exchangeRate: number;
    hotels: any[];
    passes: any[];
    flights: any[];
    budgets: any[];
  };
  isOwner?: boolean;
  totalIcSpendJpy: number;
  totalNonIcSpendJpy: number;
}

export default function BookingsClient({ trip, isOwner = false, totalIcSpendJpy, totalNonIcSpendJpy }: BookingsClientProps) {
  const { t, language } = useLanguage();

  const startStr = trip.startDate ? (typeof trip.startDate === "string" ? trip.startDate : trip.startDate.toISOString()) : undefined;
  const endStr = trip.endDate ? (typeof trip.endDate === "string" ? trip.endDate : trip.endDate.toISOString()) : undefined;
  const activeTripId = isOwner && trip.id ? trip.id : undefined;

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
      <div data-aos="fade-down" className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-extrabold text-text-primary">{t("hotelsPassesBudgets")}</h1>
          <p className="text-sm text-text-muted mt-1">{t("bookingsSubtitle")}</p>
        </div>

        {!isOwner && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-bg-surface border border-border text-xs font-semibold text-text-muted">
            <Globe className="w-3.5 h-3.5 text-emerald-400" />
            <span>{language === "th" ? "โหมดอ่านอย่างเดียว" : "View Only"}</span>
          </span>
        )}
      </div>

      <div data-aos="fade-up">
        <HotelTable
          tripId={activeTripId}
          hotels={trip.hotels}
          exchangeRate={trip.exchangeRate}
          tripStartDate={startStr}
          tripEndDate={endStr}
        />
      </div>

      <div data-aos="fade-up" data-aos-delay="100">
        <PassCard tripId={activeTripId} passes={trip.passes} flights={trip.flights} exchangeRate={trip.exchangeRate} />
      </div>

      <div data-aos="fade-up" data-aos-delay="200">
        <BudgetBreakdown
          tripId={activeTripId}
          budgets={trip.budgets}
          totalIcSpentJpy={totalIcSpendJpy}
          totalNonIcSpentJpy={totalNonIcSpendJpy}
          exchangeRate={trip.exchangeRate}
        />
      </div>
    </main>
  );
}
