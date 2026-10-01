"use client";

import { Loader2 } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export default function ExportItinerarySkeleton() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-bg-base text-text-primary">
      {/* Floating Active Loading Indicator Pill */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-bg-card/90 border border-accent/40 shadow-2xl backdrop-blur-md text-xs font-bold text-accent animate-in fade-in slide-in-from-bottom-3 duration-200">
        <Loader2 className="w-4 h-4 animate-spin text-accent" />
        <span>{t("loadingExportItinerary")}</span>
      </div>

      {/* Floating Action Bar Skeleton */}
      <div className="sticky top-0 z-50 bg-bg-card/95 backdrop-blur border-b border-border shadow-md">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="w-28 h-8 skeleton-shimmer rounded-xl" />
          <div className="flex items-center gap-3">
            <div className="w-20 h-8 skeleton-shimmer rounded-xl" />
            <div className="w-36 h-8 skeleton-shimmer rounded-xl" />
          </div>
        </div>
      </div>

      {/* Printable Sheet Skeleton (A4 Document Format) */}
      <main className="max-w-4xl mx-auto my-8 p-8 sm:p-12 bg-white rounded-3xl shadow-xl border border-border/50 space-y-6">
        {/* Document Header Skeleton */}
        <div className="border-b-2 border-gray-200 pb-4 flex items-start justify-between gap-4">
          <div className="space-y-2 flex-1">
            <div className="w-48 h-3 skeleton-shimmer rounded" />
            <div className="w-72 h-8 skeleton-shimmer rounded-lg" />
            <div className="w-96 h-4 skeleton-shimmer rounded" />
          </div>
          <div className="space-y-2 text-right">
            <div className="w-32 h-4 skeleton-shimmer rounded ml-auto" />
            <div className="w-20 h-3 skeleton-shimmer rounded ml-auto" />
          </div>
        </div>

        {/* 2-Column Overview Cards (Flights & Hotels) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50 space-y-3">
            <div className="w-36 h-4 skeleton-shimmer rounded" />
            <div className="space-y-2">
              <div className="w-full h-4 skeleton-shimmer rounded" />
              <div className="w-3/4 h-4 skeleton-shimmer rounded" />
            </div>
          </div>
          <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50 space-y-3">
            <div className="w-40 h-4 skeleton-shimmer rounded" />
            <div className="space-y-2">
              <div className="w-full h-4 skeleton-shimmer rounded" />
              <div className="w-3/4 h-4 skeleton-shimmer rounded" />
            </div>
          </div>
        </div>

        {/* Transit Passes Bar Skeleton */}
        <div className="border border-gray-200 rounded-lg px-3 py-2.5 bg-gray-50/30 flex items-center gap-2">
          <div className="w-24 h-4 skeleton-shimmer rounded" />
          <div className="w-32 h-5 skeleton-shimmer rounded" />
          <div className="w-28 h-5 skeleton-shimmer rounded" />
        </div>

        {/* Day-by-Day Schedule Section Skeleton */}
        <div className="space-y-4 pt-2">
          <div className="w-64 h-5 skeleton-shimmer rounded pb-1" />

          {/* Daily Schedule Tables Skeleton */}
          {[1, 2].map((i) => (
            <div key={i} className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-gray-100 px-3.5 py-2.5 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-16 h-5 skeleton-shimmer rounded" />
                  <div className="w-36 h-4 skeleton-shimmer rounded" />
                </div>
                <div className="w-28 h-4 skeleton-shimmer rounded" />
              </div>
              <div className="p-3 space-y-2.5">
                {[1, 2, 3, 4].map((j) => (
                  <div key={j} className="flex items-center justify-between gap-4 py-1.5 border-b border-gray-100 last:border-0">
                    <div className="w-12 h-3.5 skeleton-shimmer rounded flex-shrink-0" />
                    <div className="w-40 h-3.5 skeleton-shimmer rounded flex-shrink-0" />
                    <div className="flex-1 h-3.5 skeleton-shimmer rounded" />
                    <div className="w-28 h-3.5 skeleton-shimmer rounded flex-shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
