"use client";

import { Loader2 } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export default function BookingsSkeleton() {
  const { t } = useLanguage();

  return (
    <div className="space-y-8 relative">
      {/* Floating Active Loading Indicator Pill */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-bg-card/90 border border-accent/40 shadow-2xl backdrop-blur-md text-xs font-bold text-accent animate-in fade-in slide-in-from-bottom-3 duration-200">
        <Loader2 className="w-4 h-4 animate-spin text-accent" />
        <span>{t("loadingBookingsAndBudgets")}</span>
      </div>

      {/* Page Title Skeleton */}
      <div className="space-y-2">
        <div className="w-56 h-8 skeleton-shimmer rounded-xl" />
        <div className="w-80 h-4 skeleton-shimmer rounded" />
      </div>

      {/* Hotels Table Skeleton */}
      <div className="bg-bg-card border border-border rounded-3xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-2xl skeleton-shimmer" />
            <div className="space-y-1.5">
              <div className="w-32 h-5 skeleton-shimmer rounded" />
              <div className="w-48 h-3 skeleton-shimmer rounded" />
            </div>
          </div>
          <div className="w-24 h-8 skeleton-shimmer rounded-xl" />
        </div>
        <div className="space-y-3 pt-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 skeleton-shimmer rounded-xl" />
          ))}
        </div>
      </div>

      {/* Passes Skeleton */}
      <div className="bg-bg-card border border-border rounded-3xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-2xl skeleton-shimmer" />
            <div className="space-y-1.5">
              <div className="w-28 h-5 skeleton-shimmer rounded" />
              <div className="w-40 h-3 skeleton-shimmer rounded" />
            </div>
          </div>
          <div className="w-24 h-8 skeleton-shimmer rounded-xl" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="h-20 skeleton-shimmer rounded-2xl" />
          <div className="h-20 skeleton-shimmer rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
