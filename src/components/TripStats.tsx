"use client";

import { formatJPY, formatTHB } from "@/lib/utils";
import { Wallet, Plane, Hotel, CircleDollarSign, Ticket } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

interface TripStatsProps {
  totalActivitiesCostJpy: number;
  totalIcSpendJpy: number;
  totalNonIcSpendJpy: number;
  totalHotelThb: number;
  totalHotelJpy: number;
  totalPassJpy: number;
  totalFlightThb: number;
  exchangeRate: number;
}

export default function TripStats({
  totalActivitiesCostJpy,
  totalIcSpendJpy,
  totalNonIcSpendJpy,
  totalHotelThb,
  totalHotelJpy,
  totalPassJpy,
  totalFlightThb,
  exchangeRate = 0.24,
}: TripStatsProps) {
  const { t } = useLanguage();

  const rate = exchangeRate > 0 ? exchangeRate : 0.24;
  const hotelJpy = totalHotelJpy > 0 ? totalHotelJpy : totalHotelThb / rate;
  const flightJpy = totalFlightThb / rate;
  const fixedExpensesThb = totalHotelThb + totalFlightThb + totalPassJpy * rate;
  const totalTripEstimatedThb = totalActivitiesCostJpy * rate + fixedExpensesThb;
  const totalTripEstimatedJpy = totalActivitiesCostJpy + hotelJpy + totalPassJpy + flightJpy;

  const flightPercent = totalTripEstimatedThb > 0 ? Math.round((totalFlightThb / totalTripEstimatedThb) * 100) : 0;
  const hotelPercent = totalTripEstimatedThb > 0 ? Math.round((totalHotelThb / totalTripEstimatedThb) * 100) : 0;
  const passPercent = totalTripEstimatedThb > 0 ? Math.round(((totalPassJpy * rate) / totalTripEstimatedThb) * 100) : 0;
  const everydayPercent = totalTripEstimatedThb > 0 ? Math.round(((totalActivitiesCostJpy * rate) / totalTripEstimatedThb) * 100) : 0;

  const subCards = [
    // 1. Flight
    {
      label: t("flights"),
      value: formatTHB(totalFlightThb),
      sub: `≈ ${formatJPY(flightJpy)}`,
      icon: Plane,
      iconBg: "bg-sage-subtle border-sage-muted text-sage",
      percent: flightPercent,
      badgeClass: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20",
      barGradient: "bg-gradient-to-r from-teal-400 to-teal-500",
    },
    // 2. Hotel
    {
      label: t("hotels"),
      value: formatTHB(totalHotelThb),
      sub: `≈ ${formatJPY(hotelJpy)}`,
      icon: Hotel,
      iconBg: "bg-sand-subtle border-sand-muted text-sand",
      percent: hotelPercent,
      badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
      barGradient: "bg-gradient-to-r from-amber-400 to-amber-500",
    },
    // 3. Passes, Rentals & Tickets
    {
      label: t("railPasses"),
      value: formatJPY(totalPassJpy),
      sub: `≈ ${formatTHB(totalPassJpy * rate)}`,
      icon: Ticket,
      iconBg: "bg-olive-subtle border-olive-muted text-olive",
      percent: passPercent,
      badgeClass: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20",
      barGradient: "bg-gradient-to-r from-indigo-400 to-indigo-500",
    },
    // 4. Total Cost Everyday (Activities)
    {
      label: t("totalCostEveryday"),
      value: formatJPY(totalActivitiesCostJpy),
      sub: `≈ ${formatTHB(totalActivitiesCostJpy * rate)}`,
      icon: CircleDollarSign,
      iconBg: "bg-accent/10 border-accent/20 text-accent",
      percent: everydayPercent,
      badgeClass: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20",
      barGradient: "bg-gradient-to-r from-orange-400 to-orange-500",
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
      {/* Col 1: Grand Total Estimated (Main Priority) */}
      <div
        data-aos="fade-up"
        data-aos-delay="0"
        className="lg:col-span-4 rounded-3xl p-5 sm:p-6 shadow-card flex flex-col justify-between transition-all hover:shadow-earth bg-gradient-to-br from-accent/10 via-bg-card to-bg-card border-2 border-accent shadow-accent/20"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-accent">
              {t("grandTotalEstimated")}
            </span>
            <p className="text-[11px] text-text-muted mt-0.5">
              {t("fixedPlusDaily")}
            </p>
          </div>
          <div className="p-2.5 rounded-2xl border bg-accent/15 border-accent/30 text-accent shrink-0">
            <Wallet className="w-5 h-5" />
          </div>
        </div>

        <div className="mt-4 sm:mt-5">
          <div className="text-2xl sm:text-3xl font-extrabold tracking-tight font-mono text-accent">
            {formatTHB(totalTripEstimatedThb)}
          </div>
          <div className="text-xs sm:text-sm text-text-muted mt-1 font-mono">
            ≈ {formatJPY(totalTripEstimatedJpy)}
          </div>
        </div>
      </div>

      {/* Col 2: Sub-categories row (Flights, Hotels, Passes, Everyday) */}
      <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3 md:gap-4">
        {subCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              data-aos="fade-up"
              data-aos-delay={(idx + 1) * 80}
              className="rounded-3xl p-4 sm:p-5 shadow-card flex flex-col justify-between transition-all hover:shadow-earth bg-bg-card border border-border hover:border-border"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-text-secondary leading-snug">
                  {card.label}
                </span>
                <div className={`p-2 rounded-xl border shrink-0 ${card.iconBg}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              <div className="mt-3 sm:mt-4">
                <div className="text-lg sm:text-xl font-extrabold tracking-tight font-mono text-text-primary">
                  {card.value}
                </div>
                <div className="text-xs text-text-muted mt-1 font-mono">
                  {card.sub}
                </div>

                {/* Spend Progress Bar & Percentage Pill */}
                <div className="flex items-center gap-2 pt-2.5 mt-2.5 border-t border-border/40">
                  <span className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded-md ${card.badgeClass}`}>
                    {card.percent}%
                  </span>
                  <div className="flex-1 h-1.5 rounded-full bg-border/40 dark:bg-bg-surface overflow-hidden">
                    <div
                      className={`h-full rounded-full ${card.barGradient} transition-all duration-500`}
                      style={{ width: `${Math.min(100, Math.max(0, card.percent))}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
