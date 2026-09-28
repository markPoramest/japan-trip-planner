"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X, Check, ArrowRight } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

interface DateRangePickerProps {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  onChange: (start: string, end: string) => void;
  minDate?: string;
  maxDate?: string;
  label?: string;
  mode?: "trip" | "hotel";
  startLabel?: string;
  endLabel?: string;
}

const MONTHS_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const MONTHS_TH = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
];

const DOW_EN = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const DOW_TH = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

function formatISODate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseISODate(s: string): Date | null {
  if (!s) return null;
  const parts = s.split("-").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

export default function DateRangePicker({
  startDate,
  endDate,
  onChange,
  minDate,
  maxDate,
  label,
  mode = "trip",
  startLabel,
  endLabel,
}: DateRangePickerProps) {
  const { language, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Internal draft selection states
  const [tempStart, setTempStart] = useState<string>(startDate);
  const [tempEnd, setTempEnd] = useState<string>(endDate);
  const [hoverDate, setHoverDate] = useState<string | null>(null);

  // Base calendar month to show (0-indexed month)
  const initialDate = parseISODate(startDate) || (minDate ? parseISODate(minDate) : null) || new Date();
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());

  useEffect(() => {
    setTempStart(startDate);
    setTempEnd(endDate);
    if (startDate) {
      const d = parseISODate(startDate);
      if (d) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    } else if (minDate) {
      const d = parseISODate(minDate);
      if (d) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
  }, [startDate, endDate, minDate, isOpen]);

  // Click outside to close (and apply if valid)
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        if (tempStart && tempEnd && (tempStart !== startDate || tempEnd !== endDate)) {
          onChange(tempStart, tempEnd);
        }
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, tempStart, tempEnd, startDate, endDate, onChange]);

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  function handleDateClick(dateStr: string) {
    if (!tempStart || (tempStart && tempEnd)) {
      // 1st click: choose start date
      setTempStart(dateStr);
      setTempEnd("");
      setHoverDate(null);
    } else if (tempStart && !tempEnd) {
      // 2nd click: choose end date
      if (dateStr < tempStart) {
        // Earlier than start: restart selection with new start
        setTempStart(dateStr);
        setTempEnd("");
        setHoverDate(null);
      } else {
        // Complete range: instant update & close (Google Flights flow)
        setTempEnd(dateStr);
        setHoverDate(null);
        onChange(tempStart, dateStr);
        setIsOpen(false);
      }
    }
  }

  function applyRange() {
    if (tempStart && tempEnd) {
      onChange(tempStart, tempEnd);
    } else if (tempStart && !tempEnd) {
      onChange(tempStart, tempStart);
    }
    setIsOpen(false);
  }

  function clearRange() {
    setTempStart("");
    setTempEnd("");
    setHoverDate(null);
    onChange("", "");
  }

  // Calculate durations
  const effectiveEnd = tempEnd || (tempStart && hoverDate && hoverDate >= tempStart ? hoverDate : "");
  const durationDays = tempStart && effectiveEnd && effectiveEnd >= tempStart
    ? Math.round(
        (new Date(effectiveEnd + "T00:00:00").getTime() - new Date(tempStart + "T00:00:00").getTime()) /
          (1000 * 60 * 60 * 24)
      ) + 1
    : tempStart
    ? 1
    : 0;

  const durationNights = Math.max(0, durationDays - 1);

  function renderMonth(year: number, month: number) {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthName = language === "th" ? MONTHS_TH[month] : MONTHS_EN[month];
    const displayYear = language === "th" ? year + 543 : year;

    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return (
      <div className="w-full select-none">
        {/* Month Header */}
        <div className="text-center font-bold text-xs sm:text-sm text-text-primary mb-2.5">
          {monthName} {displayYear}
        </div>

        {/* Day of Week Labels */}
        <div className="grid grid-cols-7 text-center text-[10px] sm:text-[11px] font-bold text-text-muted mb-1">
          {(language === "th" ? DOW_TH : DOW_EN).map((dow, idx) => (
            <div key={idx} className="py-0.5">
              {dow}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-y-1 text-xs">
          {days.map((dayNum, idx) => {
            if (dayNum === null) {
              return <div key={`empty-${idx}`} className="h-8 sm:h-8.5" />;
            }

            const currentD = new Date(year, month, dayNum);
            const dateStr = formatISODate(currentD);

            const isStart = dateStr === tempStart;
            const isEnd = dateStr === (tempEnd || (tempStart && !tempEnd && hoverDate === dateStr ? hoverDate : ""));

            // Range checks
            const rangeEnd = tempEnd || (hoverDate && hoverDate > tempStart ? hoverDate : "");
            const isInRange = tempStart && rangeEnd && dateStr > tempStart && dateStr < rangeEnd;
            const isHoverPreview = !tempEnd && tempStart && hoverDate && dateStr > tempStart && dateStr <= hoverDate;

            const isMinDisabled = minDate && dateStr < minDate;
            const isMaxDisabled = maxDate && dateStr > maxDate;
            const isDisabled = isMinDisabled || isMaxDisabled;

            return (
              <div
                key={dateStr}
                onMouseEnter={() => {
                  if (tempStart && !tempEnd) {
                    setHoverDate(dateStr);
                  }
                }}
                className={`h-8 sm:h-8.5 flex items-center justify-center relative cursor-pointer ${
                  isInRange || isHoverPreview ? "bg-accent/15" : ""
                } ${isStart && (tempEnd || (hoverDate && hoverDate > tempStart)) ? "rounded-l-full bg-accent/15" : ""} ${
                  isEnd && tempStart && (tempEnd || (hoverDate && hoverDate > tempStart)) ? "rounded-r-full bg-accent/15" : ""
                }`}
                onClick={() => !isDisabled && handleDateClick(dateStr)}
              >
                <div
                  className={`w-7 h-7 sm:w-7.5 sm:h-7.5 flex items-center justify-center text-[11px] sm:text-xs font-semibold transition-all relative z-10 ${
                    isDisabled
                      ? "text-text-faint/30 cursor-not-allowed"
                      : isStart || isEnd
                      ? "bg-accent text-white font-bold rounded-full shadow-accent scale-105"
                      : isInRange || isHoverPreview
                      ? "text-accent font-bold hover:bg-accent/20 rounded-full"
                      : "text-text-primary hover:bg-bg-surface hover:text-accent rounded-full"
                  }`}
                >
                  {dayNum}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Next month calculation for 2-month desktop view
  const nextViewMonth = viewMonth === 11 ? 0 : viewMonth + 1;
  const nextViewYear = viewMonth === 11 ? viewYear + 1 : viewYear;

  const dateLocale = language === "th" ? "th-TH" : "en-GB";

  const resolvedStartLabel =
    startLabel || (mode === "hotel" ? t("checkIn") : t("startDate"));
  const resolvedEndLabel =
    endLabel || (mode === "hotel" ? t("checkOut") : t("endDate"));

  const startFormatted = startDate
    ? new Date(startDate + "T00:00:00").toLocaleDateString(dateLocale, {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : t("selectDatePrefix", { label: resolvedStartLabel });

  const endFormatted = endDate
    ? new Date(endDate + "T00:00:00").toLocaleDateString(dateLocale, {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : t("selectDatePrefix", { label: resolvedEndLabel });

  return (
    <div className="relative w-full" ref={containerRef}>
      {label && (
        <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
          <CalendarIcon className="w-3.5 h-3.5 text-accent" />
          <span>{label}</span>
        </label>
      )}

      {/* Dual Input Trigger Bar */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full p-3 rounded-2xl bg-bg-base border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left shadow-sm cursor-pointer ${
          isOpen
            ? "border-accent ring-2 ring-accent/20 bg-bg-card"
            : "border-border hover:border-accent/60 hover:bg-bg-surface"
        }`}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-accent/10 border border-accent/20 text-accent flex items-center justify-center flex-shrink-0">
            <CalendarIcon className="w-4 h-4" />
          </div>

          <div className="flex items-center gap-2 flex-wrap min-w-0">
            {/* Start Pill */}
            <div className="px-3 py-1.5 rounded-xl bg-bg-surface border border-border/80 text-xs font-bold text-text-primary">
              <span className="text-[10px] text-text-muted block font-normal leading-none mb-0.5">
                {resolvedStartLabel}
              </span>
              <span>{startFormatted}</span>
            </div>

            <ArrowRight className="w-3.5 h-3.5 text-accent flex-shrink-0" />

            {/* End Pill */}
            <div className="px-3 py-1.5 rounded-xl bg-bg-surface border border-border/80 text-xs font-bold text-text-primary">
              <span className="text-[10px] text-text-muted block font-normal leading-none mb-0.5">
                {resolvedEndLabel}
              </span>
              <span>{endFormatted}</span>
            </div>
          </div>
        </div>

        {/* Live Duration Badge */}
        {startDate && endDate && (
          <div className="px-3 py-1 rounded-full bg-accent/15 border border-accent/30 text-accent text-xs font-bold self-start sm:self-auto flex items-center gap-1">
            {mode === "hotel" ? (
              <span>
                {durationNights > 1 ? t("nightsCount", { count: durationNights }) : t("nightCount", { count: durationNights })}
              </span>
            ) : (
              <>
                <span>
                  {durationDays} {t("days")}
                </span>
                {durationNights > 0 && <span className="text-accent/80 font-normal">({durationNights} {t("nights")})</span>}
              </>
            )}
          </div>
        )}
      </button>

      {/* Responsive Calendar Popover */}
      {isOpen && (
        <div className="absolute left-0 right-0 sm:left-0 sm:right-auto w-full sm:w-[540px] max-w-[calc(100vw-32px)] mt-2 rounded-3xl bg-bg-card border border-border p-4 sm:p-5 shadow-2xl z-[9999] animate-in fade-in zoom-in-95 duration-150 space-y-4">
          {/* Navigation Controls */}
          <div className="flex items-center justify-between pb-2 border-b border-border/60">
            <div className="flex items-center gap-2 text-xs font-bold text-text-primary">
              <CalendarIcon className="w-4 h-4 text-accent" />
              <span>{mode === "hotel" ? t("selectStayDates") : t("selectTravelDates")}</span>
              {tempStart && (
                <span className="text-accent font-mono text-xs">
                  {mode === "hotel" ? (
                    `(${durationNights > 1 ? t("nightsCount", { count: durationNights }) : t("nightCount", { count: durationNights })})`
                  ) : (
                    `(${durationDays} ${t("days")})`
                  )}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={prevMonth}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-bg-surface hover:bg-accent hover:text-white text-text-secondary flex items-center justify-center transition-all cursor-pointer border border-border/60 active:scale-95"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={nextMonth}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-bg-surface hover:bg-accent hover:text-white text-text-secondary flex items-center justify-center transition-all cursor-pointer border border-border/60 active:scale-95"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Calendars Grid: 1 Month on mobile/narrow, 2 Months on sm+ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            {renderMonth(viewYear, viewMonth)}
            <div className="hidden sm:block">
              {renderMonth(nextViewYear, nextViewMonth)}
            </div>
          </div>

          {/* Footer with Reset & Done actions */}
          <div className="pt-3 border-t border-border/60 flex items-center justify-between flex-wrap gap-3">
            <button
              type="button"
              onClick={clearRange}
              className="text-xs text-text-muted hover:text-text-primary font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>{t("reset")}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-text-muted hover:text-text-primary hover:bg-bg-surface transition-colors cursor-pointer"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                onClick={applyRange}
                className="px-4 py-1.5 rounded-xl bg-accent hover:bg-accent-light text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{t("saveChanges")}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
