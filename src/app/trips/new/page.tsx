"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createFullTrip } from "@/lib/actions";
import { ArrowLeft, PlusCircle, Trash2, Calendar, Globe, MapPin, Train, Ticket, Sparkles, AlertCircle, RefreshCw, JapaneseYen, Loader2, PlaneTakeoff, CheckCircle2, Info } from "lucide-react";
import Link from "next/link";
import SettingsKebab from "@/components/SettingsKebab";
import DateRangePicker from "@/components/DateRangePicker";
import { useLanguage } from "@/context/LanguageContext";

interface DayEntry {
  date: string;
  title: string;
}

interface PassEntry {
  name: string;
  costJpy: string;
  validDays: string;
}

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatLocalDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseLocalDate(s: string): Date | null {
  if (!s) return null;
  const parts = s.split("-").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function getDaysInRange(start: string, end: string): string[] {
  if (!start || !end) return [];
  const s = parseLocalDate(start);
  const e = parseLocalDate(end);
  if (!s || !e || isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) return [];

  const dates: string[] = [];
  const cur = new Date(s.getFullYear(), s.getMonth(), s.getDate());
  while (cur <= e) {
    dates.push(formatLocalDate(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

export default function NewTripPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState<"init" | "saving" | "redirecting">("init");
  const { t, language } = useLanguage();

  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [description, setDescription] = useState("");
  const [exchangeRate, setExchangeRate] = useState("0.24");
  const currency = "JPY";
  const baseCurrency = "THB";
  const [days, setDays] = useState<DayEntry[]>([]);
  const [passes, setPasses] = useState<PassEntry[]>([]);

  // Automatically sync days whenever startDate or endDate changes
  useEffect(() => {
    if (startDate && endDate && endDate >= startDate) {
      const dates = getDaysInRange(startDate, endDate);
      setDays((prev) => {
        const existingMap = new Map(prev.map((d) => [d.date, d.title]));
        return dates.map((dateStr, idx) => ({
          date: dateStr,
          title: existingMap.get(dateStr) || (prev[idx] && prev[idx].date === dateStr ? prev[idx].title : ""),
        }));
      });
    } else if (!startDate && !endDate) {
      setDays([]);
    }
  }, [startDate, endDate]);

  // Calculate duration in days & nights
  const isValidRange = startDate && endDate && endDate >= startDate;
  const sDateObj = parseLocalDate(startDate);
  const eDateObj = parseLocalDate(endDate);
  const durationDays = isValidRange && sDateObj && eDateObj
    ? Math.round((eDateObj.getTime() - sDateObj.getTime()) / (1000 * 60 * 60 * 24)) + 1
    : 0;
  const durationNights = Math.max(0, durationDays - 1);

  function updateDayTitle(i: number, value: string) {
    setDays((prev) => prev.map((d, idx) => (idx === i ? { ...d, title: value } : d)));
  }

  function addPass() {
    setPasses((prev) => [...prev, { name: "", costJpy: "", validDays: "" }]);
  }

  function removePass(i: number) {
    setPasses((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updatePass(i: number, field: keyof PassEntry, value: string) {
    setPasses((prev) => prev.map((p, idx) => (idx === i ? { ...p, [field]: value } : p)));
  }

  function buildSlug(dayNumber: number, title: string) {
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, "-")
      .substring(0, 30)
      .replace(/-$/, "");
    return `day-${dayNumber}-${slug || "day"}`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !startDate || !endDate) return;

    if (endDate < startDate) {
      alert(t("dateRangeError"));
      return;
    }

    setLoading(true);
    setLoadingStage("saving");

    try {
      // Prepare days payload - auto fallback to "Day X" if title is empty
      const validDays = days.length > 0 ? days : getDaysInRange(startDate, endDate).map((dateStr) => ({ date: dateStr, title: "" }));
      const daysPayload = validDays.map((d, i) => {
        const dateObj = parseLocalDate(d.date) || new Date();
        const dayTitle = d.title?.trim() || `${t("day")} ${i + 1}`;
        return {
          dayNumber: i + 1,
          date: d.date,
          dayOfWeek: DOW[dateObj.getDay()],
          slug: buildSlug(i + 1, dayTitle),
          title: dayTitle,
        };
      });

      // Prepare passes payload
      const validPasses = passes.filter((p) => p.name.trim());
      const passesPayload = validPasses.map((p) => ({
        name: p.name.trim(),
        costJpy: parseFloat(p.costJpy) || 0,
        validDays: parseInt(p.validDays) || undefined,
      }));

      // Fast atomic single query
      const trip = await createFullTrip({
        title,
        startDate,
        endDate,
        description,
        currency,
        baseCurrency,
        exchangeRate: parseFloat(exchangeRate) || 0.24,
        days: daysPayload,
        passes: passesPayload,
      });

      setLoadingStage("redirecting");
      router.push(`/trips/${trip.id}`);
    } catch (err) {
      console.error(err);
      alert("Failed to create trip. Please try again.");
      setLoading(false);
    }
  }

  const labelClass = "block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5";
  const inputClass =
    "w-full px-3.5 py-2.5 bg-bg-base border border-border rounded-xl text-text-primary text-sm placeholder-text-faint focus:outline-none focus:border-accent transition-colors";

  return (
    <div className="min-h-screen bg-bg-base pb-20 relative">
      {/* Full-Screen Loading & Transition Modal */}
      {loading && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-bg-card border-2 border-accent/40 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl space-y-6 relative overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="absolute -top-16 -left-16 w-32 h-32 bg-accent/20 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-16 -right-16 w-32 h-32 bg-accent/20 rounded-full blur-2xl pointer-events-none" />

            {/* Icon animation */}
            <div className="relative w-20 h-20 mx-auto">
              <div className="absolute inset-0 rounded-full border-4 border-accent/20 border-t-accent animate-spin" />
              <div className="w-full h-full flex items-center justify-center">
                <img
                  src="/logo.png"
                  alt="Japan Trip Planner"
                  className="w-14 h-14 object-contain animate-pulse"
                />
              </div>
            </div>

            {/* Title & Stage Details */}
            <div className="space-y-2">
              <h3 className="text-lg font-extrabold text-text-primary">
                {loadingStage === "redirecting"
                  ? t("tripReadyOpening")
                  : t("creatingYourTripPlan")}
              </h3>
              <p className="text-xs text-text-muted leading-relaxed">
                {loadingStage === "redirecting"
                  ? t("readyForDeparture")
                  : t("savingDailySchedules")}
              </p>
            </div>

            {/* Animated Progress Bar */}
            <div className="w-full bg-bg-surface h-2 rounded-full overflow-hidden border border-border/60">
              <div
                className={`h-full bg-accent-gradient transition-all duration-700 ease-out ${
                  loadingStage === "redirecting" ? "w-full" : "w-3/4 animate-pulse"
                }`}
              />
            </div>

            {/* Checklist */}
            <div className="text-[11px] text-text-muted space-y-1.5 text-left bg-bg-surface/80 p-3 rounded-2xl border border-border/60">
              <div className="flex items-center gap-2 text-text-primary">
                <CheckCircle2 className="w-3.5 h-3.5 text-sage" />
                <span>{title || "Trip Title"}</span>
              </div>
              <div className="flex items-center gap-2 text-text-primary">
                <CheckCircle2 className="w-3.5 h-3.5 text-sage" />
                <span>
                  {startDate} ➔ {endDate} ({durationDays} {t("days")})
                </span>
              </div>
              <div className="flex items-center gap-2 text-text-muted">
                {loadingStage === "redirecting" ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-sage" />
                ) : (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-accent" />
                )}
                <span>
                  {durationDays} {t("dailySchedule")}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-border bg-bg-surface/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            href="/trips"
            className="flex items-center gap-2 text-text-muted hover:text-text-primary text-sm font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("allTrips")}
          </Link>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <img
                src="/logo.png"
                alt="Japan Trip Planner"
                className="w-9 h-9 object-contain drop-shadow-sm"
              />
              <span className="text-sm font-bold text-text-primary">{t("planNewTrip")}</span>
            </div>
            <SettingsKebab />
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-10">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/30 text-accent text-xs font-bold uppercase tracking-wider mb-3">
            <Globe className="w-3.5 h-3.5" /> {t("newTripBadge")}
          </div>
          <h1 className="text-3xl font-extrabold text-text-primary tracking-tight">{t("planNewTrip")}</h1>
          <p className="text-text-secondary text-sm mt-1">{t("newTripSubtitle")}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Trip Info Card */}
          <div className="bg-bg-card border border-border rounded-3xl p-6 shadow-card space-y-5">
            <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
              <MapPin className="w-4 h-4 text-accent" /> {t("tripDetails")}
            </h2>

            <div>
              <label className={labelClass}>{t("tripTitleRequired")}</label>
              <input
                required
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Kyoto & Osaka Autumn 2026"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>{t("description")}</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A short summary of your trip theme, regions, or goals..."
                className={inputClass + " resize-none"}
              />
            </div>

            {/* Google Flights Style Interactive Date Range Picker */}
            <div className="pt-2">
              <DateRangePicker
                label={t("dateRangeSelected")}
                startDate={startDate}
                endDate={endDate}
                onChange={(start, end) => {
                  setStartDate(start);
                  setEndDate(end);
                }}
              />
            </div>
          </div>

          {/* Fixed Currency & Exchange Rate */}
          <div className="bg-bg-card border border-border rounded-3xl p-6 shadow-card space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
                <JapaneseYen className="w-4 h-4 text-sand" /> {t("currencySettings")}
              </h2>
              <span className="text-[11px] font-semibold text-text-muted bg-bg-surface px-2.5 py-0.5 rounded-full border border-border/60">
                Fixed JPY (¥) ⇄ THB (฿)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Fixed Trip Currency (JPY) */}
              <div className="p-3.5 bg-bg-surface rounded-2xl border border-border/80 space-y-1">
                <span className="block text-[10px] font-bold text-text-muted uppercase tracking-wider">
                  {t("tripCurrency")}
                </span>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🇯🇵</span>
                    <span className="font-extrabold text-sm text-text-primary">JPY (¥)</span>
                  </div>
                  <span className="text-[10px] text-text-faint font-semibold bg-bg-base px-2 py-0.5 rounded-md border border-border/60">
                    Japan
                  </span>
                </div>
              </div>

              {/* Fixed Base Currency (THB) */}
              <div className="p-3.5 bg-bg-surface rounded-2xl border border-border/80 space-y-1">
                <span className="block text-[10px] font-bold text-text-muted uppercase tracking-wider">
                  {t("baseCurrency")}
                </span>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🇹🇭</span>
                    <span className="font-extrabold text-sm text-text-primary">THB (฿)</span>
                  </div>
                  <span className="text-[10px] text-text-faint font-semibold bg-bg-base px-2 py-0.5 rounded-md border border-border/60">
                    Thai Baht
                  </span>
                </div>
              </div>

              {/* Editable Exchange Rate */}
              <div>
                <label className={labelClass}>{t("exchangeRate")} (1 JPY ➔ THB)</label>
                <input
                  type="number"
                  step="0.001"
                  value={exchangeRate}
                  onChange={(e) => setExchangeRate(e.target.value)}
                  placeholder="0.24"
                  className={inputClass}
                />
                <p className="text-[10px] text-text-muted mt-1 font-mono">
                  10,000 JPY ≈ {Math.round(10000 * (parseFloat(exchangeRate) || 0.24)).toLocaleString()} THB
                </p>
              </div>
            </div>
          </div>

          {/* Rail Passes */}
          <div className="bg-bg-card border border-border rounded-3xl p-6 shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
                <Ticket className="w-4 h-4 text-olive" /> {t("railPassesSetup")}
              </h2>
              <span className="text-xs text-text-muted">{t("optional")}</span>
            </div>

            <div className="space-y-3">
              {passes.map((pass, i) => (
                <div key={i} className="flex items-center gap-3 bg-bg-surface rounded-2xl p-3 border border-border/60">
                  <input
                    type="text"
                    value={pass.name}
                    onChange={(e) => updatePass(i, "name", e.target.value)}
                    placeholder={t("passNamePlaceholder")}
                    className="flex-1 px-3 py-2 bg-bg-base border border-border rounded-xl text-text-primary text-xs focus:outline-none focus:border-accent"
                  />
                  <input
                    type="number"
                    value={pass.costJpy}
                    onChange={(e) => updatePass(i, "costJpy", e.target.value)}
                    placeholder={t("passCostJpy")}
                    className="w-28 px-3 py-2 bg-bg-base border border-border rounded-xl text-text-primary text-xs focus:outline-none focus:border-accent"
                  />
                  <input
                    type="number"
                    value={pass.validDays}
                    onChange={(e) => updatePass(i, "validDays", e.target.value)}
                    placeholder={t("validDays")}
                    className="w-20 px-3 py-2 bg-bg-base border border-border rounded-xl text-text-primary text-xs focus:outline-none focus:border-accent"
                  />
                  <button
                    type="button"
                    onClick={() => removePass(i)}
                    className="p-1.5 rounded-lg text-text-faint hover:text-red-400 hover:bg-red-950/30 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addPass}
              className="w-full py-2.5 rounded-2xl border border-dashed border-border text-text-muted hover:border-olive hover:text-olive text-sm font-medium flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" /> {t("addPass")}
            </button>
          </div>

          {/* Daily Schedule - Strictly Auto-Generated from Date Range */}
          <div className="bg-bg-card border border-border rounded-3xl p-6 shadow-card space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
                <Calendar className="w-4 h-4 text-accent" /> {t("dailySchedule")}
              </h2>
              <span className="text-xs font-bold text-accent bg-accent/10 px-2.5 py-0.5 rounded-full border border-accent/20">
                {days.length} {t("days")}
              </span>
            </div>

            {/* Helper Banner to expand days */}
            <div className="p-3.5 bg-bg-surface rounded-2xl border border-border/80 text-xs text-text-muted flex items-center gap-2.5">
              <Info className="w-4 h-4 text-accent flex-shrink-0" />
              <span>{t("expandRangeToAddDays")}</span>
            </div>

            {days.length === 0 ? (
              <div className="p-6 text-center text-xs text-text-muted bg-bg-surface/50 rounded-2xl border border-dashed border-border">
                {t("selectTripDatesToGenerateDays")}
              </div>
            ) : (
              <div className="space-y-3">
                {days.map((day, i) => {
                  const dayDateObj = day.date ? parseLocalDate(day.date) : null;
                  const dowStr = dayDateObj && !isNaN(dayDateObj.getTime()) ? DOW[dayDateObj.getDay()] : "";
                  const formattedDate = dayDateObj
                    ? dayDateObj.toLocaleDateString(language === "th" ? "th-TH" : "en-US", {
                        day: "numeric",
                        month: "short",
                      })
                    : day.date;

                  return (
                    <div key={day.date || i} className="flex items-center gap-3 bg-bg-surface rounded-2xl p-3 border border-border/60 flex-wrap sm:flex-nowrap">
                      <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 text-accent text-xs font-bold flex items-center justify-center flex-shrink-0">
                        {i + 1}
                      </div>

                      {/* Date & Weekday Display */}
                      <div className="flex items-center gap-1.5 px-3 py-2 bg-bg-base border border-border rounded-xl text-xs font-bold text-text-primary min-w-[120px] justify-between flex-shrink-0">
                        <span>{formattedDate}</span>
                        {dowStr && (
                          <span className="text-[10px] text-accent font-semibold">
                            {dowStr}
                          </span>
                        )}
                      </div>

                      {/* Optional Day Title (default placeholder) */}
                      <input
                        type="text"
                        value={day.title}
                        onChange={(e) => updateDayTitle(i, e.target.value)}
                        placeholder={t("dayDestinationPlaceholder", { num: i + 1 })}
                        className="flex-1 min-w-[160px] px-3.5 py-2 bg-bg-base border border-border rounded-xl text-text-primary text-xs focus:outline-none focus:border-accent placeholder-text-faint"
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Link
              href="/trips"
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-text-muted hover:text-text-primary hover:bg-bg-card transition-colors"
            >
              {t("cancel")}
            </Link>
            <button
              type="submit"
              disabled={loading || !isValidRange}
              className="px-7 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-sm font-bold shadow-accent transition-all hover:scale-105 flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{t("creating")}</span>
                </>
              ) : (
                t("createTrip")
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
