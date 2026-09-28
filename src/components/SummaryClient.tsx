"use client";

import Link from "next/link";
import { formatJPY, formatTHB } from "@/lib/utils";
import { Layers } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { formatHotelStay } from "@/lib/hotelDates";

interface DayRow {
  id: string;
  slug: string;
  dayNumber: number;
  title: string;
  total: number;
  ic: number;
  nonIc: number;
}

interface SummaryClientProps {
  trip: {
    id: string;
    title: string;
    exchangeRate: number;
    hotels: any[];
    passes: any[];
    flights: any[];
    budgets: any[];
  };
  dayRows: DayRow[];
  sumTotal: number;
  sumIc: number;
  sumNonIc: number;
  totalHotelThb: number;
  totalPassJpy: number;
  totalFlightThb: number;
  totalFixedBudgetThb: number;
}

export default function SummaryClient({
  trip,
  dayRows,
  sumTotal,
  sumIc,
  sumNonIc,
  totalHotelThb,
  totalPassJpy,
  totalFlightThb,
  totalFixedBudgetThb,
}: SummaryClientProps) {
  const { t, language } = useLanguage();

  const thClass = "pb-3 text-xs font-bold uppercase tracking-wider text-text-muted";
  const tdClass = "py-3.5 px-4";

  const totalPassThb = totalPassJpy * trip.exchangeRate;
  const totalFlightJpy = trip.exchangeRate > 0 ? totalFlightThb / trip.exchangeRate : 0;

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
      <div data-aos="fade-down">
        <div className="inline-flex items-center gap-1.5 text-xs text-accent font-bold uppercase tracking-wider mb-1">
          <Layers className="w-4 h-4" /> {t("spreadsheetView")}
        </div>
        <h1 className="text-3xl font-extrabold text-text-primary">{t("excelSummaryMatrix")}</h1>
        <p className="text-sm text-text-muted mt-1">{t("liveFormulaSheet")} {trip.title}</p>
      </div>

      {/* 1. Daily Activity Table */}
      <div data-aos="fade-up" className="bg-bg-card border border-border rounded-3xl p-6 shadow-card space-y-4">
        <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
          {t("dailyExpensesJpy")}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-border bg-bg-surface">
                <th className={`${thClass} px-4 rounded-l-xl`}>{t("dayOrSheet")}</th>
                <th className={`${thClass} px-4 text-right`}>{t("cashAndCredit")}</th>
                <th className={`${thClass} px-4 text-right`}>{t("icCardOnly")}</th>
                <th className={`${thClass} px-4 text-right rounded-r-xl`}>{t("totalDayCost")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {dayRows.map((row) => (
                <tr key={row.id} className="hover:bg-bg-surface/50 transition-colors">
                  <td className={`${tdClass} font-medium text-text-primary`}>
                    <Link href={`/trips/${trip.id}/days/${row.slug}`} className="hover:text-accent flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-bg-surface text-xs font-bold text-text-secondary border border-border">
                        {t("day")} {row.dayNumber}
                      </span>
                      {row.title}
                    </Link>
                  </td>
                  <td className={`${tdClass} text-right font-mono text-sand`}>{formatJPY(row.nonIc)}</td>
                  <td className={`${tdClass} text-right font-mono text-sage`}>{formatJPY(row.ic)}</td>
                  <td className={`${tdClass} text-right font-mono font-bold text-text-primary`}>{formatJPY(row.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border bg-bg-elevated font-bold text-sm">
                <td className="py-3.5 px-4 text-text-primary uppercase tracking-wider rounded-l-xl">{t("total")}</td>
                <td className="py-3.5 px-4 text-right font-mono text-sand">{formatJPY(sumNonIc)}</td>
                <td className="py-3.5 px-4 text-right font-mono text-sage">{formatJPY(sumIc)}</td>
                <td className="py-3.5 px-4 text-right font-mono text-lg text-text-primary rounded-r-xl">{formatJPY(sumTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 2. Hotels Table */}
      {trip.hotels.length > 0 && (
        <div data-aos="fade-up" data-aos-delay="100" className="bg-bg-card border border-border rounded-3xl p-6 shadow-card space-y-4">
          <h3 className="text-base font-bold text-text-primary">{t("hotelStays")}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border text-text-muted uppercase">
                  <th className="pb-2">{t("hotelStay")}</th>
                  <th className="pb-2 text-right">THB</th>
                  <th className="pb-2 text-right">JPY (≈)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {trip.hotels.map((h) => {
                  const hJpy = trip.exchangeRate > 0 && h.costThb ? h.costThb / trip.exchangeRate : 0;
                  return (
                    <tr key={h.id}>
                      <td className="py-2.5 text-text-secondary">{formatHotelStay(h, language)} — {h.name}</td>
                      <td className="py-2.5 text-right font-mono text-text-primary">{h.costThb ? formatTHB(h.costThb) : "—"}</td>
                      <td className="py-2.5 text-right font-mono text-text-muted">{hJpy > 0 ? formatJPY(hJpy) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-border font-bold">
                  <td className="pt-2.5 text-text-primary">{t("totalHotel")}</td>
                  <td className="pt-2.5 text-right font-mono text-olive">{formatTHB(totalHotelThb)}</td>
                  <td className="pt-2.5 text-right font-mono text-text-muted">
                    {trip.exchangeRate > 0 && totalHotelThb > 0 ? formatJPY(totalHotelThb / trip.exchangeRate) : "—"}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* 3 & 4. Separate Flights and Passes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 3. Flights Table */}
        <div data-aos="fade-up" data-aos-delay="150" className="bg-bg-card border border-border rounded-3xl p-6 shadow-card space-y-4">
          <h3 className="text-base font-bold text-text-primary">{t("flightsSection")}</h3>
          {trip.flights.length === 0 ? (
            <p className="text-xs text-text-muted">{t("noFlightsPlanned")}</p>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border text-text-muted uppercase">
                  <th className="pb-2">{t("flightItem")}</th>
                  <th className="pb-2 text-right">THB</th>
                  <th className="pb-2 text-right">JPY (≈)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {trip.flights.map((f) => {
                  const fJpy = trip.exchangeRate > 0 && f.costThb ? f.costThb / trip.exchangeRate : 0;
                  return (
                    <tr key={f.id}>
                      <td className="py-2.5 text-text-secondary">
                        <span className="font-semibold text-text-primary">{f.flightNo}</span>
                        {f.route && <span className="ml-1.5 text-text-muted">({f.route})</span>}
                      </td>
                      <td className="py-2.5 text-right font-mono text-text-primary">{f.costThb ? formatTHB(f.costThb) : "—"}</td>
                      <td className="py-2.5 text-right font-mono text-text-muted">{fJpy > 0 ? formatJPY(fJpy) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-border font-bold">
                  <td className="pt-2.5 text-text-primary">{t("totalFlights")}</td>
                  <td className="pt-2.5 text-right font-mono text-olive">{formatTHB(totalFlightThb)}</td>
                  <td className="pt-2.5 text-right font-mono text-text-muted">{totalFlightJpy > 0 ? formatJPY(totalFlightJpy) : "—"}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        {/* 4. Rail & Regional Passes Table */}
        <div data-aos="fade-up" data-aos-delay="200" className="bg-bg-card border border-border rounded-3xl p-6 shadow-card space-y-4">
          <h3 className="text-base font-bold text-text-primary">{t("passesSection")}</h3>
          {trip.passes.length === 0 ? (
            <p className="text-xs text-text-muted">{t("noPassesPlanned")}</p>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border text-text-muted uppercase">
                  <th className="pb-2">{t("passName")}</th>
                  <th className="pb-2 text-right">JPY</th>
                  <th className="pb-2 text-right">THB (≈)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {trip.passes.map((p) => (
                  <tr key={p.id}>
                    <td className="py-2.5 text-text-secondary font-medium">{p.name}</td>
                    <td className="py-2.5 text-right font-mono text-text-primary">{p.costJpy ? formatJPY(p.costJpy) : "—"}</td>
                    <td className="py-2.5 text-right font-mono text-text-muted">{p.costJpy ? formatTHB(p.costJpy * trip.exchangeRate) : "—"}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border font-bold">
                  <td className="pt-2.5 text-text-primary">{t("totalPasses")}</td>
                  <td className="pt-2.5 text-right font-mono text-olive">{formatJPY(totalPassJpy)}</td>
                  <td className="pt-2.5 text-right font-mono text-text-muted">{totalPassThb > 0 ? formatTHB(totalPassThb) : "—"}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>

      {/* 5. Budget Wallets */}
      {trip.budgets.length > 0 && (
        <div data-aos="fade-up" data-aos-delay="250" className="bg-bg-card border border-border rounded-3xl p-6 shadow-card space-y-4">
          <h3 className="text-base font-bold text-text-primary">{t("pocketBudgetAllocation")}</h3>
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border text-text-muted uppercase">
                <th className="pb-2">{t("walletCategory")}</th>
                <th className="pb-2 text-right">JPY</th>
                <th className="pb-2 text-right">THB</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {trip.budgets.map((b) => (
                <tr key={b.id}>
                  <td className="py-2.5 text-text-secondary">{b.category}</td>
                  <td className="py-2.5 text-right font-mono text-text-primary">{formatJPY(b.amountJpy)}</td>
                  <td className="py-2.5 text-right font-mono text-text-muted">{formatTHB(b.amountThb)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border font-bold text-sm">
                <td className="pt-3 text-text-primary">{t("total")}</td>
                <td className="pt-3 text-right font-mono text-text-primary">{formatJPY(trip.budgets.reduce((s, b) => s + b.amountJpy, 0))}</td>
                <td className="pt-3 text-right font-mono text-olive">{formatTHB(trip.budgets.reduce((s, b) => s + b.amountThb, 0))}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </main>
  );
}
