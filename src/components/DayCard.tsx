"use client";

import { useState } from "react";
import Link from "next/link";
import { formatJPY } from "@/lib/utils";
import { Calendar, CreditCard, Banknote, ArrowRight, Loader2, Edit2, Check, X, Plus } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { updateTripDay } from "@/lib/actions";
import BatchActivityModal from "./BatchActivityModal";

interface DayCardProps {
  tripId: string;
  isOwner?: boolean;
  index?: number;
  exchangeRate?: number;
  availablePasses?: string[];
  previousLocations?: { name: string; count?: number }[] | string[];
  previousDayLastLocation?: string;
  day: {
    id: string;
    dayNumber: number;
    date: Date;
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
    plans?: Array<{
      id: string;
      title: string;
      tag: string | null;
      isMain: boolean;
      sortOrder: number;
      notes: string | null;
      activities: {
        id: string;
        time: string;
        location: string;
        activity: string;
        cost: number;
        isIcCard: boolean;
        usingPass: string | null;
      }[];
    }>;
  };
}

function getPlanIcon(tag: string | null | undefined, isMain: boolean) {
  if (isMain) return "⭐";
  if (!tag) return "📋";
  const lower = tag.toLowerCase();
  if (lower.includes("rain") || lower.includes("weather")) return "🌧️";
  if (lower.includes("indoor") || lower.includes("museum") || lower.includes("mall") || lower.includes("shopping")) return "🏛️";
  if (lower.includes("chill") || lower.includes("relax") || lower.includes("cafe")) return "☕";
  if (lower.includes("backup") || lower.includes("route") || lower.includes("detour")) return "⚡";
  if (lower.includes("food") || lower.includes("eat")) return "🍱";
  return "📋";
}

export default function DayCard({
  day,
  tripId,
  isOwner = false,
  index = 0,
  exchangeRate = 0.24,
  availablePasses = [],
  previousLocations = [],
  previousDayLastLocation,
}: DayCardProps) {
  const { t, language } = useLanguage();
  const [navigating, setNavigating] = useState(false);
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [dayTitle, setDayTitle] = useState(day.title);
  const [inputTitle, setInputTitle] = useState(day.title);
  const [currentSlug, setCurrentSlug] = useState(day.slug);

  const mainPlan = day.plans?.find((p) => p.isMain) || day.plans?.[0];
  const activeActivities = mainPlan ? mainPlan.activities : day.activities;
  const substitutePlans = day.plans ? day.plans.filter((p) => !p.isMain) : [];

  const totalCost = activeActivities.reduce((sum, a) => sum + (a.cost || 0), 0);
  const icCost = activeActivities.filter((a) => a.isIcCard).reduce((sum, a) => sum + (a.cost || 0), 0);
  const nonIcCost = totalCost - icCost;

  const dateLocale = language === "th" ? "th-TH" : "en-GB";
  const formattedDate = new Date(day.date).toLocaleDateString(dateLocale, {
    day: "numeric",
    month: "short",
  });

  function handleSaveTitle(e: React.MouseEvent | React.KeyboardEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!isOwner) return;
    const newTitle = inputTitle.trim();
    if (!newTitle) return;

    if (newTitle === dayTitle) {
      setIsEditingTitle(false);
      return;
    }

    const previousTitle = dayTitle;
    const previousSlug = currentSlug;

    // Instant Optimistic Update (0ms UI latency)
    setDayTitle(newTitle);
    setIsEditingTitle(false);

    // Background server update
    updateTripDay(day.id, tripId, {
      title: newTitle,
      dayNumber: day.dayNumber,
    })
      .then((updated) => {
        if (updated?.slug) {
          setCurrentSlug(updated.slug);
        }
      })
      .catch((err) => {
        console.error(err);
        // Rollback on failure
        setDayTitle(previousTitle);
        setInputTitle(previousTitle);
        setCurrentSlug(previousSlug);
        alert("Failed to update day title.");
      });
  }

  function handleCancelEdit(e: React.MouseEvent | React.KeyboardEvent) {
    e.preventDefault();
    e.stopPropagation();
    setInputTitle(dayTitle);
    setIsEditingTitle(false);
  }

  return (
    <>
      <Link
        href={`/trips/${tripId}/days/${currentSlug}`}
        onClick={(e) => {
          if (isEditingTitle) {
            e.preventDefault();
            return;
          }
          setNavigating(true);
        }}
        data-aos="fade-up"
        data-aos-delay={(index % 6) * 80}
        className="bg-bg-card border border-border rounded-3xl p-5 hover:border-accent hover:shadow-earth transition-all flex flex-col justify-between group shadow-card cursor-pointer block select-none"
      >
        <div>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-1 rounded-lg bg-accent/10 text-accent border border-accent/20 text-xs font-bold uppercase tracking-wider">
                {t("day")} {day.dayNumber}
              </span>
              <span className="text-xs text-text-muted flex items-center">
                <Calendar className="w-3.5 h-3.5 mr-1 text-accent/70" />
                {formattedDate} ({new Date(day.date).toLocaleDateString(dateLocale, { weekday: "short" })})
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-text-faint bg-bg-surface px-2 py-0.5 rounded-full border border-border/60">
                {day.activities.length} {t("stops")}
              </span>
              {isOwner && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setBatchModalOpen(true);
                  }}
                  className="p-1 rounded-lg bg-bg-surface hover:bg-accent/15 border border-border/80 hover:border-accent/40 text-text-muted hover:text-accent transition-all cursor-pointer flex items-center justify-center shadow-xs"
                  title={t("batchAddActivities")}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Title / Inline Title Editor with Optimistic Update */}
          {isEditingTitle ? (
            <div
              className="mt-3 flex items-center gap-1.5"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              <input
                type="text"
                autoFocus
                value={inputTitle}
                onChange={(e) => setInputTitle(e.target.value)}
                placeholder={`Day ${day.dayNumber} destination...`}
                className="flex-1 px-3 py-1.5 bg-bg-base border border-accent rounded-xl text-sm font-bold text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSaveTitle(e);
                  } else if (e.key === "Escape") {
                    handleCancelEdit(e);
                  }
                }}
              />
              <button
                type="button"
                onClick={handleSaveTitle}
                className="p-2 rounded-xl bg-accent hover:bg-accent-hover text-white transition-all cursor-pointer"
                title={t("saveChanges")}
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="p-2 rounded-xl bg-bg-surface text-text-muted hover:text-text-primary transition-all cursor-pointer"
                title={t("cancel")}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="mt-3 flex items-center gap-2 group/title">
              <h3 className="text-lg font-bold text-text-primary group-hover:text-accent transition-colors leading-snug truncate">
                {dayTitle}
              </h3>
              {isOwner && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setInputTitle(dayTitle);
                    setIsEditingTitle(true);
                  }}
                  className="p-1 rounded-lg text-text-muted hover:text-accent hover:bg-bg-surface transition-all cursor-pointer opacity-70 group-hover:opacity-100 flex-shrink-0"
                  title={t("editDayTitle")}
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Substitute Plans Indicator Pills */}
          {substitutePlans.length > 0 && (
            <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] uppercase font-bold tracking-wider text-text-faint">
                {t("substitutePlans")}:
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-accent/15 text-accent font-bold border border-accent/25 flex items-center gap-1">
                <span>⭐</span>
                <span className="truncate max-w-[130px]">{mainPlan ? mainPlan.title : "Main"}</span>
              </span>
              {substitutePlans.map((sub) => (
                <span
                  key={sub.id}
                  className="text-[10px] px-2 py-0.5 rounded-md bg-bg-surface text-text-muted font-medium border border-border flex items-center gap-1"
                  title={sub.notes || sub.title}
                >
                  <span>{getPlanIcon(sub.tag, false)}</span>
                  <span className="truncate max-w-[120px]">{sub.title}</span>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Cost Summary */}
        <div className="mt-5 pt-4 border-t border-border/60">
          <div className="grid grid-cols-2 gap-2 text-xs mb-3">
            <div className="p-2 rounded-xl bg-sage-subtle border border-sage-muted">
              <div className="text-text-muted flex items-center gap-1 text-[11px]">
                <CreditCard className="w-3 h-3 text-sage" /> {t("icCardOnly")}
              </div>
              <div className="font-semibold text-sage mt-0.5 font-mono">{formatJPY(icCost)}</div>
            </div>
            <div className="p-2 rounded-xl bg-sand-subtle border border-sand-muted">
              <div className="text-text-muted flex items-center gap-1 text-[11px]">
                <Banknote className="w-3 h-3 text-sand" /> {t("cashAndCredit")}
              </div>
              <div className="font-semibold text-sand mt-0.5 font-mono">{formatJPY(nonIcCost)}</div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border/60">
            <div>
              <div className="text-[10px] uppercase font-semibold text-text-faint">{t("total")}</div>
              <div className="text-base font-bold text-text-primary font-mono">{formatJPY(totalCost)}</div>
            </div>

            <div className="px-3 py-1.5 rounded-xl bg-bg-surface border border-border text-text-secondary group-hover:bg-accent group-hover:border-accent group-hover:text-white text-xs font-bold flex items-center space-x-1.5 transition-all shadow-sm">
              {navigating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-accent group-hover:text-white" />
                  <span>{language === "th" ? "กำลังโหลด..." : "Loading..."}</span>
                </>
              ) : (
                <>
                  <span>{t("viewTimeline")}</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </div>
          </div>
        </div>
      </Link>

      {isOwner && (
        <BatchActivityModal
          isOpen={batchModalOpen}
          onClose={() => setBatchModalOpen(false)}
          dayId={day.id}
          dayNumber={day.dayNumber}
          dayTitle={dayTitle}
          exchangeRate={exchangeRate}
          availablePasses={availablePasses}
          previousLocations={previousLocations}
          existingActivities={activeActivities}
          previousDayLastLocation={previousDayLastLocation}
          planId={mainPlan?.id}
        />
      )}
    </>
  );
}
