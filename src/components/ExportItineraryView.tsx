"use client";

import { useLanguage } from "@/context/LanguageContext";
import { Plane, Hotel, Train, Calendar, MapPin, Printer, ArrowLeft, Globe } from "lucide-react";
import Link from "next/link";
import { formatHotelStay } from "@/lib/hotelDates";

interface Activity {
  id: string;
  time: string;
  location: string;
  activity: string;
  cost?: number;
  isIcCard?: boolean;
  usingPass?: string | null;
  remark?: string | null;
  sortOrder?: number;
}

interface TripDay {
  id: string;
  dayNumber: number;
  date: Date | string;
  dayOfWeek: string;
  title: string;
  activities: Activity[];
  plans?: Array<{
    id: string;
    title: string;
    tag: string | null;
    isMain: boolean;
    sortOrder: number;
    notes: string | null;
    activities: Activity[];
  }>;
}

interface ExportItineraryProps {
  trip: {
    id: string;
    title: string;
    description: string | null;
    startDate: Date | string;
    endDate: Date | string;
    flights: { id: string; flightNo: string; route: string; notes?: string | null }[];
    hotels: { id: string; name: string; dateRange: string; checkIn?: Date | string | null; checkOut?: Date | string | null; notes?: string | null }[];
    passes: { id: string; name: string; validDays?: number | null }[];
    days: TripDay[];
  };
}

export default function ExportItineraryView({ trip }: ExportItineraryProps) {
  const { t, language, setLanguage } = useLanguage();

  const dateLocale = language === "th" ? "th-TH" : "en-GB";
  const startStr = new Date(trip.startDate).toLocaleDateString(dateLocale, { day: "numeric", month: "short", year: "numeric" });
  const endStr = new Date(trip.endDate).toLocaleDateString(dateLocale, { day: "numeric", month: "short", year: "numeric" });
  const durationDays = trip.days && trip.days.length > 0
    ? trip.days.length
    : Math.round((new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-bg-base text-text-primary print:bg-white print:text-black">
      {/* ─────────────────────────────────────────────
          1. FLOATING ACTION BAR (HIDDEN IN PRINT)
      ───────────────────────────────────────────── */}
      <div className="sticky top-0 z-50 bg-bg-card/95 backdrop-blur border-b border-border shadow-md print:hidden">
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Link
              href={`/trips/${trip.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-bg-surface border border-border text-text-secondary hover:text-text-primary text-xs font-semibold transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{t("backToTrip")}</span>
            </Link>

            <span className="hidden md:inline-flex items-center gap-1.5 text-[11px] text-text-muted bg-bg-surface/90 border border-border/80 px-3 py-1.5 rounded-xl">
              <span>💡</span>
              <span>{t("printHeaderFooterTip")}</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Language Toggle */}
            <div className="flex items-center bg-bg-surface border border-border rounded-xl p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setLanguage("en")}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  language === "en"
                    ? "bg-accent text-white font-bold shadow-sm"
                    : "text-text-muted hover:text-text-primary"
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLanguage("th")}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  language === "th"
                    ? "bg-accent text-white font-bold shadow-sm"
                    : "text-text-muted hover:text-text-primary"
                }`}
              >
                TH
              </button>
            </div>

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-accent hover:bg-accent-light text-white text-xs font-bold shadow-accent transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>{t("printOrSavePdf")}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Embedded Print Optimization Styles */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              body {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .print-overview-section {
                break-inside: avoid !important;
                page-break-inside: avoid !important;
              }
              /* Day 1 starts directly on Page 1 after Trip Overview */
              .print-day-card:first-of-type {
                break-inside: auto !important;
                page-break-inside: auto !important;
              }
              /* Every subsequent day (Day 2, Day 3...) starts on its own page */
              .print-day-card + .print-day-card {
                break-before: page !important;
                page-break-before: always !important;
                break-inside: avoid !important;
                page-break-inside: avoid !important;
              }
              table {
                border-collapse: collapse !important;
                width: 100% !important;
              }
              thead {
                display: table-header-group !important;
              }
              thead tr {
                border-top: 2px solid #4b5563 !important;
                border-bottom: 1.5px solid #4b5563 !important;
                background-color: #f3f4f6 !important;
              }
              thead th {
                border-top: 2px solid #4b5563 !important;
                border-bottom: 1.5px solid #4b5563 !important;
              }
              tr {
                break-inside: avoid !important;
                page-break-inside: avoid !important;
              }
            }
          `,
        }}
      />

      {/* ─────────────────────────────────────────────
          2. PRINTABLE ITINERARY SHEET (A4 FORMAT)
      ───────────────────────────────────────────── */}
      <main className="max-w-4xl mx-auto my-8 p-8 sm:p-12 bg-white text-black rounded-3xl shadow-xl border border-border/50 print:m-0 print:p-0 print:border-none print:shadow-none print:max-w-full">
        {/* Document Header */}
        <header className="border-b-2 border-black pb-4 mb-6 print:pb-2 print:mb-2.5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[10px] tracking-widest font-extrabold uppercase text-gray-500 mb-0.5">
                {t("immigrationItineraryTitle")}
              </div>
              <h1 className="text-2xl font-black tracking-tight text-black uppercase print:text-xl">
                {trip.title}
              </h1>
              {trip.description && (
                <p className="text-xs text-gray-600 mt-1 max-w-2xl leading-relaxed print:text-[11px] print:mt-0.5">
                  {trip.description}
                </p>
              )}
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-xs font-bold text-gray-800">
                {startStr} – {endStr}
              </div>
              <div className="text-[11px] text-gray-500 font-medium">
                {durationDays} {durationDays === 1 ? t("dayUnit") : t("daysUnit")}
              </div>
            </div>
          </div>
        </header>

        <div className="space-y-6 text-xs print:space-y-2.5">
          {/* Section: Flights & Accommodations Overview */}
          <div className="print-overview-section space-y-4 print:space-y-2.5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2 print:gap-2.5">
              {/* Flights */}
              {trip.flights.length > 0 && (
                <div className="border border-gray-300 rounded-xl p-3 bg-gray-50/50 print:bg-white print:p-2 print:rounded-lg print:break-inside-avoid">
                  <div className="font-bold text-gray-900 flex items-center gap-1.5 mb-2 pb-1.5 border-b border-gray-200 print:mb-1 print:pb-1">
                    <Plane className="w-3.5 h-3.5 text-gray-700" />
                    <span>{t("flightInformation")}</span>
                  </div>
                  <div className="space-y-1.5 print:space-y-0.5">
                    {trip.flights.map((f) => (
                      <div key={f.id} className="flex justify-between items-start text-[11px] print:text-[10px]">
                        <div>
                          <span className="font-bold text-black">{f.flightNo}</span>
                          <span className="text-gray-600 ml-1.5">({f.route})</span>
                        </div>
                        {f.notes && <span className="text-gray-500 text-[10px] text-right">{f.notes}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Accommodations */}
              {trip.hotels.length > 0 && (
                <div className="border border-gray-300 rounded-xl p-3 bg-gray-50/50 print:bg-white print:p-2 print:rounded-lg print:break-inside-avoid">
                  <div className="font-bold text-gray-900 flex items-center gap-1.5 mb-2 pb-1.5 border-b border-gray-200 print:mb-1 print:pb-1">
                    <Hotel className="w-3.5 h-3.5 text-gray-700" />
                    <span>{t("accommodationList")}</span>
                  </div>
                  <div className="space-y-1.5 print:space-y-0.5">
                    {trip.hotels.map((h) => (
                      <div key={h.id} className="flex justify-between items-start text-[11px] print:text-[10px]">
                        <span className="font-semibold text-black">{h.name}</span>
                        <span className="text-gray-600 font-mono text-[10px] ml-2 flex-shrink-0">{formatHotelStay(h, language)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Transit Passes (if any) */}
            {trip.passes.length > 0 && (
              <div className="border border-gray-200 rounded-lg px-3 py-2 bg-gray-50/30 print:bg-white print:py-1 print:px-2.5 print:break-inside-avoid flex items-center gap-2 flex-wrap text-[11px] print:text-[10px]">
                <span className="font-bold text-gray-700 flex items-center gap-1">
                  <Train className="w-3 h-3 text-gray-600" /> {t("transitPassTitle")}:
                </span>
                {trip.passes.map((p) => (
                  <span key={p.id} className="px-2 py-0.5 rounded bg-gray-200/80 font-medium text-gray-800">
                    {p.name} {p.validDays ? `(${p.validDays} ${p.validDays === 1 ? t("dayUnit") : t("daysUnit")})` : ""}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Section: Day-by-Day Schedule Table */}
          <div className="space-y-4 pt-2 print:space-y-2 print:pt-0">
            <h2
              className="text-sm font-black uppercase tracking-wider text-black border-b border-gray-400 pb-1 flex items-center gap-1.5 print:text-xs print:pb-1 print:break-after-avoid"
              style={{ breakAfter: "avoid", pageBreakAfter: "avoid" }}
            >
              <Calendar className="w-4 h-4 text-gray-800" />
              <span>{t("scheduleAndTransit")}</span>
            </h2>

            <div className="space-y-4 print:space-y-0">
              {trip.days.map((day) => {
                const dayDate = new Date(day.date).toLocaleDateString(dateLocale, {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                });
                const dayOfWeekLocalized = new Date(day.date).toLocaleDateString(dateLocale, { weekday: "short" });

                const mainPlan = day.plans?.find((p) => p.isMain) || day.plans?.[0];
                const activeActivities = mainPlan ? mainPlan.activities : day.activities;
                const substitutePlans = day.plans ? day.plans.filter((p) => !p.isMain) : [];

                return (
                  <div
                    key={day.id}
                    className="print-day-card border border-gray-300 rounded-xl overflow-hidden print:border print:border-gray-400 print:rounded-lg print:break-inside-avoid"
                    style={{ breakInside: "avoid", pageBreakInside: "avoid" }}
                  >
                    {/* Day Banner */}
                    <div
                      className="bg-gray-100 px-3.5 py-1.5 border-b border-gray-300 flex items-center justify-between font-bold text-xs print:py-1.5 print:px-2.5 print:border-b-2 print:border-gray-400 print:break-after-avoid"
                      style={{ breakAfter: "avoid", pageBreakAfter: "avoid" }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="bg-black text-white px-2 py-0.5 rounded font-black text-[10px] uppercase">
                          {t("day")} {day.dayNumber}
                        </span>
                        <span className="text-gray-900">{day.title}</span>
                        {mainPlan && (
                          <span className="text-[10px] text-gray-500 font-normal">
                            ({mainPlan.title})
                          </span>
                        )}
                      </div>
                      <span className="text-gray-600 font-medium text-[11px] print:text-[10px]">
                        {dayDate} ({dayOfWeekLocalized})
                      </span>
                    </div>

                    {/* Activities Table */}
                    {activeActivities.length === 0 ? (
                      <div className="p-3 text-gray-400 text-center italic text-[11px] print:p-2 print:text-[10px]">
                        {t("noScheduledActivities")}
                      </div>
                    ) : (
                      <table className="w-full text-left border-collapse text-[11px] print:text-[10px] print:border-t-2 print:border-gray-500">
                        <thead className="print:table-header-group">
                          <tr
                            className="border-t-2 border-b border-gray-300 bg-gray-50/70 text-[10px] text-gray-600 font-bold uppercase print:bg-gray-100 print:border-t-2 print:border-b print:border-gray-500 print:break-inside-avoid"
                            style={{ breakInside: "avoid", pageBreakInside: "avoid" }}
                          >
                            <th className="py-1.5 px-3 w-16 print:py-1 print:px-2 border-t-2 border-b border-gray-300 print:border-t-2 print:border-b print:border-gray-500">{t("timeCol")}</th>
                            <th className="py-1.5 px-3 w-48 print:py-1 print:px-2 border-t-2 border-b border-gray-300 print:border-t-2 print:border-b print:border-gray-500">{t("locationCol")}</th>
                            <th className="py-1.5 px-3 print:py-1 print:px-2 border-t-2 border-b border-gray-300 print:border-t-2 print:border-b print:border-gray-500">{t("activityCol")}</th>
                            <th className="py-1.5 px-3 w-48 text-right print:py-1 print:px-2 border-t-2 border-b border-gray-300 print:border-t-2 print:border-b print:border-gray-500">{t("passCol")}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {activeActivities.map((act) => (
                            <tr
                              key={act.id}
                              className="hover:bg-gray-50/50 print:break-inside-avoid"
                              style={{ breakInside: "avoid", pageBreakInside: "avoid" }}
                            >
                              <td className="py-1.5 px-3 font-mono font-bold text-gray-700 whitespace-nowrap align-top print:py-1 print:px-2">
                                {act.time || "—"}
                              </td>
                              <td className="py-1.5 px-3 font-semibold text-black align-top print:py-1 print:px-2">
                                <div className="flex items-start gap-1">
                                  <MapPin className="w-3 h-3 text-gray-500 mt-0.5 flex-shrink-0" />
                                  <span>{act.location}</span>
                                </div>
                              </td>
                              <td className="py-1.5 px-3 text-gray-800 align-top whitespace-pre-line leading-relaxed print:py-1 print:px-2">
                                {act.activity}
                              </td>
                              <td className="py-1.5 px-3 text-right align-top text-gray-600 text-[10px] print:py-1 print:px-2">
                                {act.usingPass && (
                                  <span className="font-semibold text-gray-900 block mb-0.5">
                                    🚆 {act.usingPass}
                                  </span>
                                )}
                                {act.remark && (() => {
                                  const urlMatch = act.remark.match(/https?:\/\/[^\s]+/);
                                  const linkUrl = urlMatch ? urlMatch[0] : null;

                                  if (linkUrl) {
                                    return (
                                      <a
                                        href={linkUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:text-blue-800 underline block break-all text-[10px] font-medium print:text-blue-700"
                                        title={linkUrl}
                                      >
                                        🔗 {act.remark}
                                      </a>
                                    );
                                  }

                                  return (
                                    <span className="text-gray-500 block italic text-[10px] break-words">
                                      {act.remark}
                                    </span>
                                  );
                                })()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}

                    {/* Contingency / Substitute Plans Appendix */}
                    {substitutePlans.length > 0 && (
                      <div
                        className="p-2.5 bg-gray-50 border-t border-gray-200 text-xs space-y-1.5 print:bg-white print:border-gray-300 print:p-2 print:break-inside-avoid"
                        style={{ breakInside: "avoid", pageBreakInside: "avoid" }}
                      >
                        <div className="font-bold text-gray-700 flex items-center gap-1.5 text-[10px] uppercase tracking-wider">
                          <span>🔄</span>
                          <span>{t("contingencyPlansTitle")}</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 print:gap-1.5">
                          {substitutePlans.map((sub) => (
                            <div key={sub.id} className="p-2 rounded-lg bg-white border border-gray-200 text-[11px] space-y-0.5 print:p-1.5 print:text-[10px]">
                              <div className="font-bold text-gray-900 flex items-center justify-between">
                                <span>{sub.title}</span>
                                {sub.notes && <span className="text-gray-500 font-normal italic text-[10px]">({sub.notes})</span>}
                              </div>
                              <div className="text-gray-600 text-[10px] leading-tight">
                                {sub.activities.length > 0
                                  ? sub.activities.map((a) => `${a.time} ${a.location}`).join(" ➔ ")
                                  : t("noActivitiesScheduled")}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
