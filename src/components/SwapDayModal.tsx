"use client";

import { useState, useEffect, useMemo, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { swapTripDays } from "@/lib/actions";
import { useLanguage } from "@/context/LanguageContext";
import { formatJPY } from "@/lib/utils";
import {
  X,
  ArrowLeftRight,
  ArrowRight,
  Calendar,
  Sparkles,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

export interface DaySummaryItem {
  id: string;
  dayNumber: number;
  date: Date | string;
  dayOfWeek: string;
  slug: string;
  title: string;
  activities: {
    id: string;
    cost: number;
    isIcCard: boolean;
  }[];
  plans?: Array<{
    id: string;
    isMain: boolean;
    activities: {
      id: string;
      cost: number;
      isIcCard: boolean;
    }[];
  }>;
}

interface SwapDayModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
  days: DaySummaryItem[];
  initialDayId?: string | null;
  onOptimisticSwap?: (dayIdA: string, dayIdB: string) => void;
}

export default function SwapDayModal({
  isOpen,
  onClose,
  tripId,
  days,
  initialDayId,
  onOptimisticSwap,
}: SwapDayModalProps) {
  const { t, language } = useLanguage();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isSwapping, setIsSwapping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Determine initial selection
  const sortedDays = useMemo(() => {
    return [...days].sort((a, b) => a.dayNumber - b.dayNumber);
  }, [days]);

  const [dayAId, setDayAId] = useState<string>("");
  const [dayBId, setDayBId] = useState<string>("");

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const orig = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = orig;
      };
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || sortedDays.length < 2) return;

    setError(null);
    let first = initialDayId && sortedDays.some((d) => d.id === initialDayId)
      ? initialDayId
      : sortedDays[0]?.id;

    const firstIndex = sortedDays.findIndex((d) => d.id === first);
    // Default second day to adjacent next day, or adjacent previous day if at the end
    let second = "";
    if (firstIndex >= 0 && firstIndex + 1 < sortedDays.length) {
      second = sortedDays[firstIndex + 1].id;
    } else if (firstIndex > 0) {
      second = sortedDays[firstIndex - 1].id;
    } else {
      second = sortedDays.find((d) => d.id !== first)?.id || "";
    }

    setDayAId(first);
    setDayBId(second);
  }, [isOpen, initialDayId, sortedDays]);

  const dateLocale = language === "th" ? "th-TH" : "en-GB";

  const getDayInfo = (dayId: string) => {
    const day = sortedDays.find((d) => d.id === dayId);
    if (!day) return null;

    const mainPlan = day.plans?.find((p) => p.isMain) || day.plans?.[0];
    const activeActivities = mainPlan ? mainPlan.activities : day.activities;
    const totalCost = activeActivities.reduce((sum, a) => sum + (a.cost || 0), 0);
    const dateObj = typeof day.date === "string" ? new Date(day.date) : day.date;
    const formattedDate = dateObj.toLocaleDateString(dateLocale, {
      day: "numeric",
      month: "short",
    });

    return {
      day,
      dateObj,
      formattedDate,
      stopCount: activeActivities.length,
      totalCost,
    };
  };

  const dayAInfo = getDayInfo(dayAId);
  const dayBInfo = getDayInfo(dayBId);

  function handleFlipSelection() {
    const temp = dayAId;
    setDayAId(dayBId);
    setDayBId(temp);
  }

  async function handleConfirmSwap() {
    if (!dayAId || !dayBId || dayAId === dayBId) {
      setError(t("cannotSwapSameDay"));
      return;
    }

    setError(null);
    setIsSwapping(true);

    try {
      // Instant Optimistic Update
      onOptimisticSwap?.(dayAId, dayBId);

      // Execute atomic server action
      await swapTripDays(tripId, dayAId, dayBId);

      // Close modal immediately and refresh without page reload
      onClose();
      startTransition(() => {
        router.refresh();
      });
    } catch (err: any) {
      console.error("Failed to swap days:", err);
      setError(err?.message || "Failed to swap days. Please try again.");
    } finally {
      setIsSwapping(false);
    }
  }

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-bg-card border border-border rounded-3xl p-6 sm:p-7 max-w-xl w-full shadow-2xl space-y-6 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border/60 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-accent/15 border border-accent/30 text-accent">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-text-primary tracking-tight">
                {t("swapDaysModalTitle")}
              </h3>
              <p className="text-xs text-text-muted mt-0.5">
                {t("swapDaysModalSubtitle")}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-bg-surface text-text-muted hover:text-text-primary transition-all cursor-pointer"
            title={t("cancel")}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Day Selectors Grid */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-11 gap-3 items-center">
            {/* Box A */}
            <div className="md:col-span-5 bg-bg-surface border border-border rounded-2xl p-4 space-y-3">
              <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted block">
                {t("selectFirstDay")}
              </label>
              <select
                value={dayAId}
                onChange={(e) => setDayAId(e.target.value)}
                className="w-full px-3 py-2 bg-bg-card border border-border rounded-xl text-xs font-bold text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
              >
                {sortedDays.map((d) => {
                  const dObj = typeof d.date === "string" ? new Date(d.date) : d.date;
                  const dStr = dObj.toLocaleDateString(dateLocale, {
                    day: "numeric",
                    month: "short",
                  });
                  return (
                    <option key={d.id} value={d.id}>
                      {t("day")} {d.dayNumber} · {dStr} — {d.title}
                    </option>
                  );
                })}
              </select>

              {dayAInfo && (
                <div className="pt-2 border-t border-border/40 flex items-center justify-between text-xs">
                  <div className="truncate mr-2">
                    <span className="font-extrabold text-accent text-xs">
                      {t("day")} {dayAInfo.day.dayNumber}
                    </span>
                    <span className="text-text-primary font-bold ml-1.5 truncate">
                      {dayAInfo.day.title}
                    </span>
                  </div>
                  <span className="text-[11px] text-text-muted font-mono shrink-0">
                    {dayAInfo.stopCount} {t("stops")}
                  </span>
                </div>
              )}
            </div>

            {/* Flip Arrow Button */}
            <div className="md:col-span-1 flex justify-center">
              <button
                type="button"
                onClick={handleFlipSelection}
                className="p-2.5 rounded-full bg-bg-card hover:bg-accent/15 border border-border hover:border-accent/40 text-text-muted hover:text-accent shadow-xs transition-all cursor-pointer flex items-center justify-center"
                title="Swap Selection"
              >
                <ArrowLeftRight className="w-4 h-4" />
              </button>
            </div>

            {/* Box B */}
            <div className="md:col-span-5 bg-bg-surface border border-border rounded-2xl p-4 space-y-3">
              <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted block">
                {t("selectSecondDay")}
              </label>
              <select
                value={dayBId}
                onChange={(e) => setDayBId(e.target.value)}
                className="w-full px-3 py-2 bg-bg-card border border-border rounded-xl text-xs font-bold text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
              >
                {sortedDays.map((d) => {
                  const dObj = typeof d.date === "string" ? new Date(d.date) : d.date;
                  const dStr = dObj.toLocaleDateString(dateLocale, {
                    day: "numeric",
                    month: "short",
                  });
                  return (
                    <option key={d.id} value={d.id}>
                      {t("day")} {d.dayNumber} · {dStr} — {d.title}
                    </option>
                  );
                })}
              </select>

              {dayBInfo && (
                <div className="pt-2 border-t border-border/40 flex items-center justify-between text-xs">
                  <div className="truncate mr-2">
                    <span className="font-extrabold text-accent text-xs">
                      {t("day")} {dayBInfo.day.dayNumber}
                    </span>
                    <span className="text-text-primary font-bold ml-1.5 truncate">
                      {dayBInfo.day.title}
                    </span>
                  </div>
                  <span className="text-[11px] text-text-muted font-mono shrink-0">
                    {dayBInfo.stopCount} {t("stops")}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Live Visual Comparison Box */}
        {dayAInfo && dayBInfo && dayAId !== dayBId && (
          <div className="rounded-2xl p-4 bg-gradient-to-br from-accent/5 via-bg-surface to-bg-surface border border-accent/20 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-accent">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t("swapPreviewTitle")}</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-bg-card border border-border/80">
                <div className="flex items-center gap-2 truncate">
                  <span className="px-2 py-0.5 rounded-md bg-accent/10 text-accent font-bold text-[11px] shrink-0">
                    {t("day")} {dayAInfo.day.dayNumber} ({dayAInfo.formattedDate})
                  </span>
                  <ArrowRight className="w-3 h-3 text-text-muted shrink-0" />
                  <span className="font-bold text-text-primary truncate">
                    {dayBInfo.day.title}
                  </span>
                </div>
                <span className="text-[11px] text-text-muted font-mono shrink-0 ml-2">
                  {dayBInfo.stopCount} {t("stops")} · {formatJPY(dayBInfo.totalCost)}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-bg-card border border-border/80">
                <div className="flex items-center gap-2 truncate">
                  <span className="px-2 py-0.5 rounded-md bg-accent/10 text-accent font-bold text-[11px] shrink-0">
                    {t("day")} {dayBInfo.day.dayNumber} ({dayBInfo.formattedDate})
                  </span>
                  <ArrowRight className="w-3 h-3 text-text-muted shrink-0" />
                  <span className="font-bold text-text-primary truncate">
                    {dayAInfo.day.title}
                  </span>
                </div>
                <span className="text-[11px] text-text-muted font-mono shrink-0 ml-2">
                  {dayAInfo.stopCount} {t("stops")} · {formatJPY(dayAInfo.totalCost)}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-text-muted leading-relaxed">
              💡 {t("calendarDatesPreservedNote")}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/60">
          <button
            type="button"
            onClick={onClose}
            disabled={isSwapping}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-text-muted hover:text-text-primary hover:bg-bg-surface transition-all cursor-pointer disabled:opacity-50"
          >
            {t("cancel")}
          </button>
          <button
            type="button"
            onClick={handleConfirmSwap}
            disabled={!dayAId || !dayBId || dayAId === dayBId || isSwapping}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold shadow-md shadow-accent/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSwapping ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t("swappingDays")}</span>
              </>
            ) : (
              <>
                <ArrowLeftRight className="w-4 h-4" />
                <span>{t("confirmSwapDays")}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
