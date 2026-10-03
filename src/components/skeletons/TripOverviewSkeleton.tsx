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

      {/* Financial Stat Cards Skeleton: Col 1 (Grand Total) + Col 2 (4 Sub-category cards row) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Col 1: Grand Total Priority Skeleton */}
        <div className="lg:col-span-4 rounded-3xl bg-bg-card border-2 border-accent/30 p-5 sm:p-6 flex flex-col justify-between h-full min-h-[140px]">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1.5">
              <div className="w-32 h-4 skeleton-shimmer rounded" />
              <div className="w-24 h-3 skeleton-shimmer rounded" />
            </div>
            <div className="w-10 h-10 rounded-2xl skeleton-shimmer shrink-0" />
          </div>
          <div className="space-y-2 mt-4 sm:mt-5">
            <div className="w-36 h-8 skeleton-shimmer rounded-lg" />
            <div className="w-24 h-4 skeleton-shimmer rounded" />
          </div>
        </div>

        {/* Col 2: 4 Sub Cards Skeleton Row */}
        <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3 md:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-3xl bg-bg-card border border-border p-4 sm:p-5 flex flex-col justify-between space-y-4 min-h-[140px]">
              <div className="flex items-start justify-between gap-2">
                <div className="w-16 h-3.5 skeleton-shimmer rounded" />
                <div className="w-8 h-8 rounded-xl skeleton-shimmer shrink-0" />
              </div>
              <div className="space-y-1.5 mt-3">
                <div className="w-20 h-6 skeleton-shimmer rounded-lg" />
                <div className="w-16 h-3 skeleton-shimmer rounded" />
                <div className="flex items-center gap-2 pt-2 border-t border-border/40">
                  <div className="w-7 h-3.5 skeleton-shimmer rounded-md" />
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
            <div key={i} className="bg-bg-card border border-border rounded-2xl p-5 space-y-4 h-56 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="w-16 h-5 skeleton-shimmer rounded-lg" />
                  <div className="w-20 h-4 skeleton-shimmer rounded" />
                </div>
                <div className="w-40 h-5 skeleton-shimmer rounded" />
                <div className="flex gap-1 pt-1">
                  <div className="w-16 h-4 skeleton-shimmer rounded-md" />
                  <div className="w-16 h-4 skeleton-shimmer rounded-md" />
                </div>
              </div>
              <div className="pt-3 border-t border-border/60 flex items-center justify-between">
                <div className="w-20 h-5 skeleton-shimmer rounded" />
                <div className="w-24 h-7 skeleton-shimmer rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
