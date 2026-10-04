"use client";

import { Loader2 } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export default function TripListSkeleton() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-bg-base pb-20 relative">
      {/* Floating Active Loading Indicator Pill */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-bg-card/90 border border-accent/40 shadow-2xl backdrop-blur-md text-xs font-bold text-accent animate-in fade-in slide-in-from-bottom-3 duration-200">
        <Loader2 className="w-4 h-4 animate-spin text-accent" />
        <span>{t("loadingTrips")}</span>
      </div>

      {/* Header Skeleton */}
      <header className="border-b border-border bg-bg-surface/80 h-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl skeleton-shimmer" />
            <div className="space-y-1.5">
              <div className="w-32 h-4 skeleton-shimmer rounded" />
              <div className="w-20 h-2.5 skeleton-shimmer rounded" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-28 h-9 rounded-xl skeleton-shimmer" />
            <div className="w-9 h-9 rounded-xl skeleton-shimmer" />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 space-y-10">
        {/* Hero Banner Skeleton */}
        <div className="rounded-3xl bg-bg-card border border-border p-8 sm:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3.5 max-w-xl w-full">
            <div className="w-32 h-5 skeleton-shimmer rounded-full" />
            <div className="w-3/4 max-w-md h-8 skeleton-shimmer rounded-xl" />
            <div className="w-full max-w-lg h-4 skeleton-shimmer rounded" />
            <div className="w-2/3 max-w-md h-4 skeleton-shimmer rounded" />
          </div>
          <div className="w-32 h-32 sm:w-40 sm:h-40 skeleton-shimmer rounded-2xl flex-shrink-0" />
        </div>

        {/* 1. Incoming Plans Section Skeleton */}
        <div className="space-y-5">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl skeleton-shimmer" />
              <div className="w-36 h-6 skeleton-shimmer rounded-lg" />
              <div className="w-7 h-5 skeleton-shimmer rounded-full" />
            </div>
            <div className="w-28 h-4 skeleton-shimmer rounded" />
          </div>

          {/* Cards Grid (2 cards) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="bg-bg-card border border-border rounded-3xl p-6 flex flex-col justify-between space-y-5"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-5 skeleton-shimmer rounded-full" />
                        <div className="w-20 h-5 skeleton-shimmer rounded-full" />
                      </div>
                      <div className="w-52 h-6 skeleton-shimmer rounded-lg" />
                    </div>
                  </div>
                  <div className="w-3/4 max-w-xs h-3.5 skeleton-shimmer rounded mt-3" />
                  <div className="w-48 h-4 skeleton-shimmer rounded mt-3" />
                </div>

                <div className="pt-4 border-t border-border/60 space-y-4">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="h-14 skeleton-shimmer rounded-xl" />
                    <div className="h-14 skeleton-shimmer rounded-xl" />
                    <div className="h-14 skeleton-shimmer rounded-xl" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="w-28 h-4 skeleton-shimmer rounded" />
                    <div className="w-24 h-8 skeleton-shimmer rounded-xl" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 2. Previous Plans Section Skeleton */}
        <div className="space-y-5 pt-4">
          <div className="flex items-center gap-3 border-b border-border/60 pb-3">
            <div className="w-8 h-8 rounded-xl skeleton-shimmer" />
            <div className="w-36 h-6 skeleton-shimmer rounded-lg" />
            <div className="w-7 h-5 skeleton-shimmer rounded-full" />
          </div>

          {/* Previous Trips Cards Grid (2 cards) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[3, 4].map((i) => (
              <div
                key={i}
                className="bg-bg-card border border-border rounded-3xl p-6 flex flex-col justify-between space-y-5"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-5 skeleton-shimmer rounded-full" />
                        <div className="w-20 h-5 skeleton-shimmer rounded-full" />
                      </div>
                      <div className="w-44 h-6 skeleton-shimmer rounded-lg" />
                    </div>
                  </div>
                  <div className="w-3/4 max-w-xs h-3.5 skeleton-shimmer rounded mt-3" />
                  <div className="w-48 h-4 skeleton-shimmer rounded mt-3" />
                </div>

                <div className="pt-4 border-t border-border/60 space-y-4">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="h-14 skeleton-shimmer rounded-xl" />
                    <div className="h-14 skeleton-shimmer rounded-xl" />
                    <div className="h-14 skeleton-shimmer rounded-xl" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="w-28 h-4 skeleton-shimmer rounded" />
                    <div className="w-24 h-8 skeleton-shimmer rounded-xl" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
