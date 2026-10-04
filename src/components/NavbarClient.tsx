"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { Compass, Calendar, Building2, Layers, ArrowLeft, Printer, ChevronLeft, ChevronRight, Users2 } from "lucide-react";
import SettingsKebab from "@/components/SettingsKebab";
import { useLanguage } from "@/context/LanguageContext";

interface NavbarClientProps {
  tripId: string;
  tripTitle: string;
  startDate: string;
  endDate: string;
  days: {
    id: string;
    dayNumber: number;
    title: string;
    slug: string;
  }[];
  currentSlug?: string;
  currentSection?: "overview" | "bookings" | "summary" | "export";
  isOwner?: boolean;
}

export default function NavbarClient({
  tripId,
  tripTitle,
  startDate,
  endDate,
  days,
  currentSlug,
  currentSection,
  isOwner = true,
}: NavbarClientProps) {
  const { t, language } = useLanguage();
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLAnchorElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Drag to scroll state
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const hasMovedRef = useRef(false);

  const navItems = [
    {
      href: `/trips/${tripId}`,
      label: t("overview"),
      icon: Compass,
      section: "overview" as const,
    },
    ...(isOwner
      ? [
          {
            href: `/trips/${tripId}/bookings`,
            label: t("hotelsAndPasses"),
            icon: Users2,
            section: "bookings" as const,
          },
          {
            href: `/trips/${tripId}/summary`,
            label: t("excelMatrix"),
            icon: Layers,
            section: "summary" as const,
          },
        ]
      : []),
  ];

  const dateLocale = language === "th" ? "th-TH" : "en-GB";
  const formattedStart = new Date(startDate).toLocaleDateString(dateLocale, { day: "numeric", month: "short", year: "numeric" });
  const formattedEnd = new Date(endDate).toLocaleDateString(dateLocale, { day: "numeric", month: "short", year: "numeric" });

  // Update scroll indicators
  const checkScrollability = () => {
    const el = scrollRef.current;
    if (el) {
      const { scrollLeft, scrollWidth, clientWidth } = el;
      setCanScrollLeft(scrollLeft > 5);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 5);
    }
  };

  useEffect(() => {
    checkScrollability();
    window.addEventListener("resize", checkScrollability);
    return () => window.removeEventListener("resize", checkScrollability);
  }, [days]);

  // Lock vertical page scroll and convert wheel to horizontal scrolling
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (el.scrollWidth > el.clientWidth) {
        // Prevent parent page vertical scroll while wheeling over days
        e.preventDefault();
        e.stopPropagation();
        el.scrollLeft += e.deltaY !== 0 ? e.deltaY : e.deltaX;
        checkScrollability();
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // Auto-scroll active day tab into view on page load
  useEffect(() => {
    if (activeTabRef.current && scrollRef.current) {
      activeTabRef.current.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    }
    checkScrollability();
  }, [currentSlug]);

  const handleScroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const offset = direction === "left" ? -280 : 280;
      scrollRef.current.scrollBy({ left: offset, behavior: "smooth" });
      setTimeout(checkScrollability, 300);
    }
  };

  // Mouse drag-to-scroll handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    const el = scrollRef.current;
    if (!el) return;
    isDraggingRef.current = true;
    hasMovedRef.current = false;
    startXRef.current = e.pageX - el.offsetLeft;
    scrollLeftRef.current = el.scrollLeft;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startXRef.current) * 1.5;
    if (Math.abs(walk) > 4) {
      hasMovedRef.current = true;
    }
    scrollRef.current.scrollLeft = scrollLeftRef.current - walk;
    checkScrollability();
  };

  const handleMouseUpOrLeave = () => {
    isDraggingRef.current = false;
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-bg-surface/90 backdrop-blur-md shadow-earth">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-16 gap-4">
          {/* Back to all trips */}
          <Link
            href="/trips"
            className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors bg-bg-card px-2.5 py-1.5 rounded-lg border border-border/60 flex-shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t("allTrips")}</span>
          </Link>

          {/* Brand logo & trip title */}
          <Link href={`/trips/${tripId}`} className="flex items-center space-x-2.5 group flex-1 min-w-0">
            <img
              src="/logo.png"
              alt="Japan Trip Planner"
              className="w-10 h-10 object-contain group-hover:scale-105 transition-transform flex-shrink-0 drop-shadow-sm"
            />
            <div className="min-w-0">
              <div className="text-sm font-bold text-text-primary group-hover:text-accent transition-colors truncate">
                {tripTitle}
              </div>
              <div className="text-[10px] text-text-muted">
                {formattedStart} – {formattedEnd}
              </div>
            </div>
          </Link>

          {/* Nav Links & Kebab Menu */}
          <div className="flex items-center space-x-2 flex-shrink-0">
            <nav className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentSection === item.section && !currentSlug;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                      isActive
                        ? "bg-accent/15 text-accent border border-accent/30"
                        : "text-text-muted hover:text-text-primary hover:bg-bg-card"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}

              {/* Export PDF direct link */}
              <Link
                href={`/trips/${tripId}/export`}
                title={t("exportPdf")}
                className="px-3 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 text-text-muted hover:text-accent hover:bg-bg-card transition-all"
              >
                <Printer className="w-3.5 h-3.5 text-accent" />
                <span>{t("exportPdf")}</span>
              </Link>
            </nav>

            {/* Kebab with Light/Dark Mode & Language selector */}
            <SettingsKebab />
          </div>
        </div>

        {/* Day tabs with Smooth Slider & Controls */}
        {days.length > 0 && (
          <div className="relative flex items-center border-t border-border/40 py-2">
            {/* Scroll Left Button */}
            {canScrollLeft && (
              <button
                type="button"
                onClick={() => handleScroll("left")}
                title="Scroll left"
                className="absolute left-0 z-10 p-1.5 rounded-full bg-bg-card/95 hover:bg-accent hover:text-white text-text-secondary shadow-md border border-border transition-all active:scale-95 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}

            {/* Scrollable Container with Mouse Drag & Non-passive Wheel Lock */}
            <div
              ref={scrollRef}
              onScroll={checkScrollability}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUpOrLeave}
              onMouseLeave={handleMouseUpOrLeave}
              style={{ overscrollBehavior: "contain" }}
              className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth py-0.5 px-1 text-xs w-full cursor-grab active:cursor-grabbing select-none"
            >
              <span className="text-text-faint font-semibold uppercase tracking-wider text-[10px] pl-1 pr-2 flex items-center flex-shrink-0">
                <Calendar className="w-3 h-3 mr-1 text-accent" /> {t("days")}:
              </span>
              {days.map((day) => {
                const isActive = currentSlug === day.slug;
                return (
                  <Link
                    key={day.id}
                    ref={isActive ? activeTabRef : undefined}
                    href={`/trips/${tripId}/days/${day.slug}`}
                    onClick={(e) => {
                      // Prevent click if user was dragging
                      if (hasMovedRef.current) {
                        e.preventDefault();
                      }
                    }}
                    className={`px-3.5 py-1.5 rounded-full whitespace-nowrap font-semibold transition-all flex-shrink-0 text-xs ${
                      isActive
                        ? "bg-accent text-white shadow-accent ring-2 ring-accent/30"
                        : "bg-bg-card text-text-muted border border-border hover:text-text-primary hover:border-accent/50 hover:bg-bg-surface"
                    }`}
                  >
                    {t("day")} {day.dayNumber}: {day.title}
                  </Link>
                );
              })}
            </div>

            {/* Scroll Right Button */}
            {canScrollRight && (
              <button
                type="button"
                onClick={() => handleScroll("right")}
                title="Scroll right"
                className="absolute right-0 z-10 p-1.5 rounded-full bg-bg-card/95 hover:bg-accent hover:text-white text-text-secondary shadow-md border border-border transition-all active:scale-95 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
