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

      {/* 4 Financial Stat Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="rounded-3xl bg-bg-card border border-border p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-20 h-4 skeleton-shimmer rounded" />
              <div className="w-8 h-8 rounded-xl skeleton-shimmer" />
            </div>
            <div className="space-y-1.5">
              <div className="w-28 h-7 skeleton-shimmer rounded-lg" />
              <div className="w-24 h-3.5 skeleton-shimmer rounded" />
            </div>
          </div>
        ))}
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
