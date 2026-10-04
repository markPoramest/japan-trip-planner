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
      iconBg: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-800/40",
      percent: flightPercent,
      badgeClass: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200/60",
      barGradient: "bg-emerald-500",
    },
    // 2. Hotel
    {
      label: t("hotels"),
      value: formatTHB(totalHotelThb),
      sub: `≈ ${formatJPY(hotelJpy)}`,
      icon: Hotel,
      iconBg: "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200/60 dark:border-amber-800/40",
      percent: hotelPercent,
      badgeClass: "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200/60",
      barGradient: "bg-amber-500",
    },
    // 3. Passes, Rentals & Tickets
    {
      label: t("railPasses"),
      value: formatJPY(totalPassJpy),
      sub: `≈ ${formatTHB(totalPassJpy * rate)}`,
      icon: Ticket,
      iconBg: "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-200/60 dark:border-indigo-800/40",
      percent: passPercent,
      badgeClass: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400 border border-indigo-200/60",
      barGradient: "bg-indigo-500",
    },
    // 4. Daily Expenses (Activities)
    {
      label: t("totalCostEveryday"),
      value: formatJPY(totalActivitiesCostJpy),
      sub: `≈ ${formatTHB(totalActivitiesCostJpy * rate)}`,
      icon: CircleDollarSign,
      iconBg: "bg-rose-50 dark:bg-rose-950/40 text-rose-500 dark:text-rose-400 border-rose-200/60 dark:border-rose-800/40",
      percent: everydayPercent,
      badgeClass: "bg-rose-50 text-rose-500 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200/60",
      barGradient: "bg-rose-500",
    },
  ];

  return (
    <div
      className="flex flex-col lg:flex-row items-stretch gap-3"
      data-aos="fade-up"
    >
      {/* Column 1: Grand Total Estimated (40% width on desktop) */}
      <div
        className="lg:w-2/5 rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col justify-between transition-all hover:shadow-earth bg-[#FFF9F5] dark:bg-bg-card border-2 border-accent shadow-accent/10"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-xl border bg-accent/15 border-accent/30 text-accent shrink-0">
            <Wallet className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-xs sm:text-sm font-bold text-accent block truncate">
              {t("grandTotalEstimated")}
            </span>
            <p className="text-[10px] sm:text-[11px] text-text-muted truncate">
              {t("tripAndPocketBudget")}
            </p>
          </div>
        </div>

        <div className="mt-3.5 sm:mt-4 flex items-end justify-between gap-3">
          <div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight font-mono text-accent">
              {formatTHB(totalTripEstimatedThb)}
            </div>
            <div className="text-xs text-text-muted mt-0.5 font-mono">
              ≈ {formatJPY(totalTripEstimatedJpy)}
            </div>
          </div>

          {/* Sparkline 6-bar vertical chart illustration - fully visible with explicit heights */}
          <div className="flex items-end gap-1.5 h-9 pb-0.5 shrink-0">
            <div
              className="w-1.5 sm:w-2 rounded-full bg-accent/35 transition-all"
              style={{ height: "14px" }}
              title="Spend distribution"
            />
            <div
              className="w-1.5 sm:w-2 rounded-full bg-accent/50 transition-all"
              style={{ height: "22px" }}
            />
            <div
              className="w-1.5 sm:w-2 rounded-full bg-accent/75 transition-all"
              style={{ height: "30px" }}
            />
            <div
              className="w-1.5 sm:w-2 rounded-full bg-accent/60 transition-all"
              style={{ height: "25px" }}
            />
            <div
              className="w-1.5 sm:w-2 rounded-full bg-accent transition-all"
              style={{ height: "36px" }}
            />
            <div
              className="w-1.5 sm:w-2 rounded-full bg-accent/40 transition-all"
              style={{ height: "18px" }}
            />
          </div>
        </div>
      </div>

      {/* Column 2: Flights, Hotels, Passes, Total Cost on the same row (60% width on desktop) */}
      <div className="lg:w-3/5 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-2 items-stretch">
        {subCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              data-aos="fade-up"
              data-aos-delay={(idx + 1) * 40}
              className="rounded-3xl p-3 sm:p-3.5 shadow-xs flex flex-col justify-between transition-all hover:shadow-earth bg-bg-card border border-border/80 hover:border-border min-w-0"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <div className={`p-1.5 rounded-lg border shrink-0 ${card.iconBg}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <span className="text-[11px] font-bold text-text-secondary leading-tight truncate">
                  {card.label}
                </span>
              </div>

              <div className="mt-2.5">
                <div className="text-sm sm:text-base font-extrabold tracking-tight font-mono text-text-primary truncate">
                  {card.value}
                </div>
                <div className="text-[10px] text-text-muted mt-0.5 font-mono truncate">
                  {card.sub}
                </div>

                {/* Spend Progress Bar & Percentage Pill */}
                <div className="flex items-center gap-1.5 pt-1.5 mt-1.5 border-t border-border/40">
                  <span className={`text-[9px] font-bold font-mono px-1 py-0.5 rounded ${card.badgeClass}`}>
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
