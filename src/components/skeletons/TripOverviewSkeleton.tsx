"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export default function TripOverviewSkeleton() {
  const { t } = useLanguage();

  return (
    <div className="space-y-8 relative">
      {/* Floating Active Loading Indicator Pill */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-bg-card/90 border border-accent/40 shadow-2xl backdrop-blur-md text-xs font-bold text-accent animate-in fade-in slide-in-from-bottom-3 duration-200">
        <Loader2 className="w-4 h-4 animate-spin text-accent" />
        <span>{t("loadingTripDetails")}</span>
      </div>

      {/* Hero Banner Skeleton */}
      <div className="rounded-3xl bg-bg-card border border-border p-6 sm:p-8 flex flex-col justify-between h-48 relative overflow-hidden">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-24 h-5 skeleton-shimmer rounded-full" />
            <div className="w-16 h-5 skeleton-shimmer rounded-full" />
          </div>
          <div className="w-3/4 max-w-md h-8 skeleton-shimmer rounded-xl" />
          <div className="w-1/2 max-w-sm h-4 skeleton-shimmer rounded" />
        </div>
        <div className="flex items-center gap-4 pt-4 border-t border-border/40">
          <div className="w-36 h-4 skeleton-shimmer rounded" />
          <div className="w-28 h-4 skeleton-shimmer rounded" />
        </div>
      </div>

      {/* Financial Stat Cards Skeleton: 40% Grand Total + 60% 4 Sub-cards in same row */}
      <div className="flex flex-col lg:flex-row items-stretch gap-3">
        {/* Card 1: Grand Total Priority Skeleton (40%) */}
        <div className="lg:w-2/5 rounded-3xl bg-bg-card border-2 border-accent/30 p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl skeleton-shimmer shrink-0" />
            <div className="space-y-1">
              <div className="w-28 h-4 skeleton-shimmer rounded" />
              <div className="w-36 h-3 skeleton-shimmer rounded" />
            </div>
          </div>
          <div className="mt-4 flex items-end justify-between gap-3">
            <div className="space-y-1.5">
              <div className="w-32 h-7 skeleton-shimmer rounded-lg" />
              <div className="w-24 h-3.5 skeleton-shimmer rounded" />
            </div>
            <div className="flex items-end gap-1.5 h-9 pb-0.5">
              {[14, 22, 30, 25, 36, 18].map((h, idx) => (
                <div key={idx} className="w-1.5 sm:w-2 skeleton-shimmer rounded-full" style={{ height: `${h}px` }} />
              ))}
            </div>
          </div>
        </div>

        {/* Cards 2-5: 4 Sub Cards on the same row (60%) */}
        <div className="lg:w-3/5 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-2 items-stretch">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-3xl bg-bg-card border border-border p-3 sm:p-3.5 flex flex-col justify-between min-w-0">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-lg skeleton-shimmer shrink-0" />
                <div className="w-12 h-3.5 skeleton-shimmer rounded" />
              </div>
              <div className="space-y-1.5 mt-2.5">
                <div className="w-16 h-5 skeleton-shimmer rounded-lg" />
                <div className="w-12 h-2.5 skeleton-shimmer rounded" />
                <div className="flex items-center gap-1.5 pt-1.5 border-t border-border/40">
                  <div className="w-5 h-3 skeleton-shimmer rounded" />
                  <div className="flex-1 h-1.5 skeleton-shimmer rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Itinerary Days Grid Skeleton */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="w-36 h-6 skeleton-shimmer rounded-lg" />
          <div className="w-24 h-4 skeleton-shimmer rounded" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-bg-card border border-border rounded-3xl p-5 space-y-4 min-h-[220px] flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="w-16 h-5 skeleton-shimmer rounded-lg" />
                  <div className="w-20 h-4 skeleton-shimmer rounded-full" />
                </div>
                <div className="w-40 h-5 skeleton-shimmer rounded-lg" />
              </div>
              <div className="space-y-3 pt-2 border-t border-border/40">
                <div className="grid grid-cols-2 gap-2 p-2 rounded-2xl bg-bg-surface/50">
                  <div className="w-20 h-6 skeleton-shimmer rounded" />
                  <div className="w-20 h-6 skeleton-shimmer rounded" />
                </div>
                <div className="flex items-center justify-between pt-1">
                  <div className="w-20 h-5 skeleton-shimmer rounded" />
                  <div className="w-24 h-7 skeleton-shimmer rounded-xl" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
