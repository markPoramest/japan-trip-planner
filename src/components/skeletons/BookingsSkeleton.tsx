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
        <span>{t("loadingSplitBill")}</span>
      </div>

      {/* Page Title & Total Pill Header Skeleton */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-11 h-11 rounded-2xl skeleton-shimmer" />
          <div className="space-y-1.5">
            <div className="w-56 h-7 skeleton-shimmer rounded-xl" />
            <div className="w-72 h-3.5 skeleton-shimmer rounded" />
          </div>
        </div>
        <div className="w-56 h-14 rounded-2xl skeleton-shimmer" />
      </div>

      {/* Travel Members Card Skeleton */}
      <div className="bg-bg-card border border-border rounded-3xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="w-40 h-5 skeleton-shimmer rounded" />
          <div className="w-32 h-4 skeleton-shimmer rounded" />
        </div>
        <div className="flex items-center gap-2.5 pt-1">
          <div className="w-24 h-8 rounded-2xl skeleton-shimmer" />
          <div className="w-28 h-8 rounded-2xl skeleton-shimmer" />
        </div>
        <div className="pt-2 border-t border-border/60 flex items-center gap-3">
          <div className="flex-1 h-9 rounded-xl skeleton-shimmer" />
          <div className="w-24 h-9 rounded-xl skeleton-shimmer" />
        </div>
      </div>

      {/* Section 1: Choose Items to Split List Skeleton */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="w-64 h-6 skeleton-shimmer rounded-xl" />
          <div className="w-36 h-4 skeleton-shimmer rounded" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-bg-card border border-border rounded-3xl p-4 sm:p-5 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl skeleton-shimmer" />
                  <div className="space-y-1.5">
                    <div className="w-48 h-5 skeleton-shimmer rounded" />
                    <div className="w-32 h-3.5 skeleton-shimmer rounded" />
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-24 h-6 skeleton-shimmer rounded" />
                  <div className="w-11 h-6 rounded-full skeleton-shimmer" />
                </div>
              </div>
              <div className="pt-2 border-t border-border/60 flex items-center justify-between">
                <div className="w-44 h-6 skeleton-shimmer rounded-xl" />
                <div className="w-32 h-6 skeleton-shimmer rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 2: Per-Person Share Summary Grid Skeleton */}
      <div className="space-y-4 pt-4 border-t border-dashed border-border/60">
        <div className="w-56 h-6 skeleton-shimmer rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="bg-bg-card border border-border rounded-3xl p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl skeleton-shimmer" />
                  <div className="space-y-1">
                    <div className="w-24 h-4 skeleton-shimmer rounded" />
                    <div className="w-20 h-3 skeleton-shimmer rounded" />
                  </div>
                </div>
                <div className="w-12 h-6 rounded-full skeleton-shimmer" />
              </div>
              <div className="h-16 rounded-2xl skeleton-shimmer" />
              <div className="space-y-2 pt-1">
                <div className="w-24 h-3 skeleton-shimmer rounded" />
                <div className="h-8 rounded-xl skeleton-shimmer" />
                <div className="h-8 rounded-xl skeleton-shimmer" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
