"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { createActivitiesBatch } from "@/lib/actions";
import {
  X, Clock, MapPin, AlignLeft, CreditCard, Train, Ticket,
  Link as LinkIcon, CircleDollarSign, ArrowRightLeft, Loader2, Sparkles,
  ChevronDown, Plus, Trash2, CheckCircle2
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { formatJPY, formatTHB } from "@/lib/utils";
import { fuzzyMatch, getMatchedSegments } from "@/lib/fuzzy";

interface BatchActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  dayId: string;
  dayNumber?: number;
  dayTitle?: string;
  exchangeRate?: number;
  availablePasses?: string[];
  previousLocations?: { name: string; count?: number }[] | string[];
  existingActivities?: Array<{ location?: string | null; activity?: string | null }>;
  previousDayLastLocation?: string;
}

interface BatchStopRow {
  id: string;
  hour: string;
  minute: string;
  location: string;
  activity: string;
  currency: "JPY" | "THB";
  amount: string;
  isIcCard: boolean;
  selectedPass: string;
  customPass: string;
  isCustomMode: boolean;
  remark: string;
}

function createEmptyRow(index: number, prevHour?: string): BatchStopRow {
  let defaultHour = "09";
  if (prevHour !== undefined) {
    const h = parseInt(prevHour, 10);
    if (!isNaN(h)) {
      defaultHour = String(Math.min(23, h + 2)).padStart(2, "0");
    }
  } else if (index === 0) defaultHour = "09";
  else if (index === 1) defaultHour = "12";
  else if (index === 2) defaultHour = "15";

  return {
    id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    hour: defaultHour,
    minute: "00",
    location: "",
    activity: "",
    currency: "JPY",
    amount: "",
    isIcCard: false,
    selectedPass: "",
    customPass: "",
    isCustomMode: false,
    remark: "",
  };
}

export default function BatchActivityModal({
  isOpen,
  onClose,
  dayId,
  dayNumber,
  dayTitle,
  exchangeRate = 0.24,
  availablePasses = [],
  previousLocations = [],
  existingActivities = [],
  previousDayLastLocation,
}: BatchActivityModalProps) {
  const router = useRouter();
  const { t, language } = useLanguage();

  const [mounted, setMounted] = useState(false);
  const [rows, setRows] = useState<BatchStopRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeDropdownRowId, setActiveDropdownRowId] = useState<string | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const suggestionsListRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Initialize with 2 empty rows on open
  useEffect(() => {
    if (isOpen) {
      setRows([createEmptyRow(0), createEmptyRow(1, "09")]);
      setActiveDropdownRowId(null);
      setHighlightedIndex(-1);
    }
  }, [isOpen]);

  // Click outside listener to dismiss location dropdown when clicking other zones
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (!activeDropdownRowId) return;
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // If clicked inside the currently open dropdown wrapper, don't dismiss
      const wrapper = target.closest(
        `[data-location-dropdown-wrapper="${activeDropdownRowId}"]`
      );
      if (wrapper) {
        return;
      }
      setActiveDropdownRowId(null);
    }

    if (activeDropdownRowId) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [activeDropdownRowId]);

  // Normalized available trip locations from DB
  const availableLocations = useMemo(() => {
    const map = new Map<string, { name: string; count: number }>();
    if (previousLocations && Array.isArray(previousLocations)) {
      for (const item of previousLocations) {
        if (typeof item === "string") {
          const trimmed = item.trim();
          if (trimmed && trimmed.toLowerCase() !== "location") {
            const key = trimmed.toLowerCase();
            const existing = map.get(key);
            map.set(key, {
              name: existing?.name || trimmed,
              count: (existing?.count || 0) + 1,
            });
          }
        } else if (item && typeof item.name === "string") {
          const trimmed = item.name.trim();
          if (trimmed && trimmed.toLowerCase() !== "location") {
            const key = trimmed.toLowerCase();
            const existing = map.get(key);
            map.set(key, {
              name: existing?.name || trimmed,
              count: (existing?.count || 0) + (item.count || 1),
            });
          }
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [previousLocations]);

  const activeRowIndex = rows.findIndex((r) => r.id === activeDropdownRowId);

  // Dynamic available locations for the active row, including above places in this batch & previous stops
  const activeLocationsList = useMemo(() => {
    if (activeRowIndex < 0) return [];

    const map = new Map<
      string,
      {
        name: string;
        count?: number;
        isAbove?: boolean;
        isImmediateAbove?: boolean;
      }
    >();

    // 1. Immediately above stop in this batch (rows[activeRowIndex - 1])
    if (activeRowIndex > 0) {
      const prevStop = rows[activeRowIndex - 1];
      const prevLoc = prevStop?.location?.trim();
      if (prevLoc && prevLoc.toLowerCase() !== "location") {
        const key = prevLoc.toLowerCase();
        map.set(key, {
          name: prevLoc,
          isAbove: true,
          isImmediateAbove: true,
        });
      }

      // Other stops above in this batch (rows[0 ... activeRowIndex - 2])
      for (let i = activeRowIndex - 2; i >= 0; i--) {
        const loc = rows[i]?.location?.trim();
        if (loc && loc.toLowerCase() !== "location") {
          const key = loc.toLowerCase();
          if (!map.has(key)) {
            map.set(key, {
              name: loc,
              isAbove: true,
              isImmediateAbove: false,
            });
          }
        }
      }
    }

    // 2. Existing activities already in this day (from DB)
    if (existingActivities && existingActivities.length > 0) {
      for (let i = existingActivities.length - 1; i >= 0; i--) {
        const loc = existingActivities[i]?.location?.trim();
        if (loc && loc.toLowerCase() !== "location") {
          const key = loc.toLowerCase();
          if (!map.has(key)) {
            const isImmediate = activeRowIndex === 0 && i === existingActivities.length - 1;
            map.set(key, {
              name: loc,
              isAbove: true,
              isImmediateAbove: isImmediate,
            });
          }
        }
      }
    }

    // 3. Previous day's last location (if first row of this day and no existing activities)
    if (
      activeRowIndex === 0 &&
      (!existingActivities || existingActivities.length === 0) &&
      previousDayLastLocation &&
      previousDayLastLocation.trim()
    ) {
      const pLoc = previousDayLastLocation.trim();
      const key = pLoc.toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          name: pLoc,
          isAbove: true,
          isImmediateAbove: true,
        });
      }
    }

    // 4. All other previous trip & hotel locations
    for (const item of availableLocations) {
      const key = item.name.toLowerCase();
      const existing = map.get(key);
      if (existing) {
        existing.count = item.count;
      } else {
        map.set(key, {
          name: item.name,
          count: item.count,
        });
      }
    }

    return Array.from(map.values());
  }, [
    activeRowIndex,
    rows,
    existingActivities,
    previousDayLastLocation,
    availableLocations,
    t,
  ]);

  // Active row's query and filtered locations
  const activeRow = rows.find((r) => r.id === activeDropdownRowId);
  const filteredLocations = useMemo(() => {
    if (!activeRow || !activeLocationsList.length) return [];
    const query = activeRow.location.trim();
    if (!query) {
      return activeLocationsList
        .map((item) => ({
          ...item,
          score: item.isImmediateAbove
            ? 100000
            : item.isAbove
            ? 50000
            : (item.count || 1),
          indices: [] as number[],
        }))
        .sort((a, b) => b.score - a.score);
    }

    return activeLocationsList
      .map((item) => {
        const res = fuzzyMatch(query, item.name);
        const bonus = item.isImmediateAbove ? 400 : item.isAbove ? 200 : 0;
        return {
          ...item,
          matches: res.matches,
          score: res.score + bonus,
          indices: res.indices,
        };
      })
      .filter((item) => item.matches)
      .sort((a, b) => b.score - a.score);
  }, [activeRow, activeLocationsList]);

  if (!isOpen || !mounted) return null;

  const updateRow = (id: string, updates: Partial<BatchStopRow>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  };

  const handleAddRow = () => {
    const lastRow = rows[rows.length - 1];
    setRows((prev) => [...prev, createEmptyRow(prev.length, lastRow?.hour)]);
  };

  const handleRemoveRow = (id: string) => {
    if (rows.length <= 1) return;
    setRows((prev) => prev.filter((r) => r.id !== id));
    if (activeDropdownRowId === id) {
      setActiveDropdownRowId(null);
    }
  };

  const handleSelectLocation = (rowId: string, locName: string) => {
    updateRow(rowId, { location: locName });
    setActiveDropdownRowId(null);
    setHighlightedIndex(-1);
  };

  // Keyboard navigation for location suggestions in active row
  const handleLocationKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    rowId: string
  ) => {
    if (activeDropdownRowId !== rowId || filteredLocations.length === 0) {
      if (e.key === "ArrowDown" && activeLocationsList.length > 0) {
        e.preventDefault();
        setActiveDropdownRowId(rowId);
        setHighlightedIndex(0);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % filteredLocations.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex(
        (prev) => (prev - 1 + filteredLocations.length) % filteredLocations.length
      );
    } else if (e.key === "Enter") {
      if (highlightedIndex >= 0 && highlightedIndex < filteredLocations.length) {
        e.preventDefault();
        e.stopPropagation();
        handleSelectLocation(rowId, filteredLocations[highlightedIndex].name);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      setActiveDropdownRowId(null);
    } else if (e.key === "Tab") {
      setActiveDropdownRowId(null);
    }
  };

  // Compute total estimated costs
  const totalJpy = rows.reduce((sum, r) => {
    const val = parseFloat(r.amount) || 0;
    if (r.currency === "JPY") return sum + val;
    return sum + (exchangeRate > 0 ? Math.round(val / exchangeRate) : 0);
  }, 0);

  const totalThb = Math.round(totalJpy * exchangeRate);

  const handleHourChange = (rowId: string, val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 2);
    const num = parseInt(digits, 10);
    if (digits === "" || (!isNaN(num) && num >= 0 && num <= 23)) {
      updateRow(rowId, { hour: digits });
    }
  };

  const handleHourBlur = (rowId: string, val: string) => {
    if (!val) {
      updateRow(rowId, { hour: "09" });
    } else {
      updateRow(rowId, { hour: val.padStart(2, "0") });
    }
  };

  const handleMinuteChange = (rowId: string, val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 2);
    const num = parseInt(digits, 10);
    if (digits === "" || (!isNaN(num) && num >= 0 && num <= 59)) {
      updateRow(rowId, { minute: digits });
    }
  };

  const handleMinuteBlur = (rowId: string, val: string) => {
    if (!val) {
      updateRow(rowId, { minute: "00" });
    } else {
      updateRow(rowId, { minute: val.padStart(2, "0") });
    }
  };

  // Submit all rows
  async function handleSubmitAll(e: React.FormEvent) {
    e.preventDefault();
    const validRows = rows.filter(
      (r) => r.location.trim() !== "" || r.activity.trim() !== ""
    );

    if (validRows.length === 0) {
      alert(t("noStopsAdded"));
      return;
    }

    setLoading(true);
    try {
      const itemsToCreate = validRows.map((r) => {
        const numVal = parseFloat(r.amount) || 0;
        const jpyVal =
          r.currency === "JPY"
            ? numVal
            : exchangeRate > 0
            ? Math.round(numVal / exchangeRate)
            : 0;

        const resolvedPass = r.isCustomMode
          ? r.customPass.trim() || undefined
          : r.selectedPass || undefined;

        const h = (r.hour || "09").padStart(2, "0");
        const m = (r.minute || "00").padStart(2, "0");

        return {
          time: `${h}:${m}`,
          location: r.location.trim(),
          activity: r.activity.trim() || r.location.trim(),
          cost: jpyVal || 0,
          isIcCard: r.isIcCard,
          usingPass: resolvedPass,
          remark: r.remark.trim() || undefined,
        };
      });

      await createActivitiesBatch(dayId, itemsToCreate);
      router.refresh();
      onClose();
    } catch (err) {
      console.error(err);
      alert("Failed to batch save activities");
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full px-3 py-2 bg-bg-base border border-border rounded-xl text-text-primary text-xs placeholder:text-text-faint focus:outline-none focus:border-accent transition-colors";
  const labelClass =
    "text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1 flex items-center gap-1";

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md overflow-y-auto">
      <div
        className="bg-bg-card border border-border rounded-3xl w-full max-w-3xl shadow-2xl my-auto animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh] overflow-hidden relative"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-bg-surface/50">
          <div>
            <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
              <Plus className="w-5 h-5 text-accent" />
              <span>{t("addStopActivity")}</span>
              {dayNumber !== undefined && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-accent/10 border border-accent/20 text-accent font-bold">
                  {t("day")} {dayNumber} {dayTitle ? `· ${dayTitle}` : ""}
                </span>
              )}
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            type="button"
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-surface transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Rows Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {rows.map((row, idx) => {
            const isDropdownOpen = activeDropdownRowId === row.id;

            return (
              <div
                key={row.id}
                className="bg-bg-surface border border-border/80 rounded-2xl p-4 transition-all hover:border-accent/40 space-y-3 relative shadow-sm"
              >
                {/* Row Header: Number + Quick Time + Delete */}
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-border/50">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-lg bg-accent text-white text-xs font-bold font-mono">
                      #{idx + 1}
                    </span>
                    <span className="text-xs font-bold text-text-secondary">
                      {t("stopNumber")} {idx + 1}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Direct Typed Hour : Minute Inputs */}
                    <div className="flex items-center gap-1 bg-bg-base border border-border rounded-xl px-2.5 py-1 focus-within:border-accent">
                      <Clock className="w-3.5 h-3.5 text-accent/70 mr-0.5" />
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={2}
                        value={row.hour}
                        onChange={(e) => handleHourChange(row.id, e.target.value)}
                        onBlur={(e) => handleHourBlur(row.id, e.target.value)}
                        placeholder="09"
                        className="w-6 text-center bg-transparent text-xs font-mono font-bold text-text-primary focus:outline-none"
                      />
                      <span className="font-bold text-text-muted font-mono text-xs">:</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={2}
                        value={row.minute}
                        onChange={(e) => handleMinuteChange(row.id, e.target.value)}
                        onBlur={(e) => handleMinuteBlur(row.id, e.target.value)}
                        placeholder="00"
                        className="w-6 text-center bg-transparent text-xs font-mono font-bold text-text-primary focus:outline-none"
                      />
                    </div>

                    {/* Delete Stop Button */}
                    <button
                      type="button"
                      disabled={rows.length <= 1}
                      onClick={() => handleRemoveRow(row.id)}
                      className="p-1.5 rounded-lg text-text-muted hover:text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-30 cursor-pointer"
                      title={t("removeStop")}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Primary Inputs: Location & Activity */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Location with Fuzzy Search Dropdown */}
                  <div>
                    <label className={labelClass}>
                      <MapPin className="w-3 h-3 text-accent" /> {t("locationPlace")} *
                    </label>
                    <div className="relative" data-location-dropdown-wrapper={row.id}>
                      <input
                        type="text"
                        value={row.location}
                        onChange={(e) => {
                          updateRow(row.id, { location: e.target.value });
                          setActiveDropdownRowId(row.id);
                          setHighlightedIndex(-1);
                        }}
                        onFocus={() => {
                          if (activeLocationsList.length > 0) {
                            setActiveDropdownRowId(row.id);
                          }
                        }}
                        onKeyDown={(e) => handleLocationKeyDown(e, row.id)}
                        placeholder="e.g. Asakusa Sensoji Temple"
                        className={`${inputClass} pr-8`}
                        autoComplete="off"
                      />
                      {activeLocationsList.length > 0 && (
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => {
                            setActiveDropdownRowId(
                              isDropdownOpen ? null : row.id
                            );
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-text-muted hover:text-accent transition-colors"
                        >
                          <ChevronDown
                            className={`w-3.5 h-3.5 transition-transform ${
                              isDropdownOpen ? "rotate-180 text-accent" : ""
                            }`}
                          />
                        </button>
                      )}

                      {/* Fuzzy Suggestions Dropdown */}
                      {isDropdownOpen && activeLocationsList.length > 0 && (
                        <div className="absolute left-0 right-0 top-full mt-1.5 bg-bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 max-h-48 overflow-y-auto">
                          <div className="px-2.5 py-1.5 bg-bg-surface border-b border-border/70 flex items-center justify-between text-[10px] text-text-muted font-bold">
                            <span className="flex items-center gap-1">
                              <Sparkles className="w-2.5 h-2.5 text-accent" />
                              {t("tripLocationsTitle")} ({filteredLocations.length})
                            </span>
                            <span className="text-text-faint hidden sm:inline">
                              {t("fuzzySearchTip")}
                            </span>
                          </div>
                          <ul
                            ref={suggestionsListRef}
                            className="divide-y divide-border/40 py-1"
                            role="listbox"
                          >
                            {filteredLocations.length > 0 ? (
                              filteredLocations.map((locItem, lIdx) => {
                                const isHighlighted = lIdx === highlightedIndex;
                                const segments = getMatchedSegments(
                                  locItem.name,
                                  locItem.indices
                                );
                                return (
                                  <li
                                    key={`${locItem.name}-${lIdx}`}
                                    role="option"
                                    aria-selected={isHighlighted}
                                    onMouseEnter={() => setHighlightedIndex(lIdx)}
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() =>
                                      handleSelectLocation(row.id, locItem.name)
                                    }
                                    className={`px-2.5 py-1.5 text-xs flex items-center justify-between cursor-pointer transition-colors ${
                                      isHighlighted
                                        ? "bg-accent/15 text-text-primary"
                                        : "hover:bg-bg-surface text-text-secondary hover:text-text-primary"
                                    }`}
                                  >
                                    <div className="flex items-center gap-1.5 min-w-0 flex-1 pr-2">
                                      <MapPin
                                        className={`w-3 h-3 flex-shrink-0 ${
                                          isHighlighted ? "text-accent" : "text-text-faint"
                                        }`}
                                      />
                                      <span className="truncate">
                                        {segments.map((seg, sIdx) =>
                                          seg.match ? (
                                            <span
                                              key={sIdx}
                                              className="text-accent font-extrabold underline decoration-accent/60"
                                            >
                                              {seg.text}
                                            </span>
                                          ) : (
                                            <span key={sIdx}>{seg.text}</span>
                                          )
                                        )}
                                      </span>
                                    </div>
                                    {locItem.count && locItem.count > 1 ? (
                                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent font-semibold border border-accent/20 flex-shrink-0">
                                        {locItem.count}x
                                      </span>
                                    ) : null}
                                  </li>
                                );
                              })
                            ) : (
                              <li className="px-2.5 py-2 text-[11px] text-text-muted text-center italic">
                                {t("noMatchingLocations")}
                              </li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Activity Description */}
                  <div>
                    <label className={labelClass}>
                      <AlignLeft className="w-3 h-3 text-text-faint" /> {t("activityDetails")} *
                    </label>
                    <input
                      type="text"
                      value={row.activity}
                      onChange={(e) => updateRow(row.id, { activity: e.target.value })}
                      placeholder="e.g. Walk Nakamise street, eat melon pan..."
                      className={inputClass}
                    />
                  </div>
                </div>

                {/* Secondary Inputs: Cost & Options */}
                <div className="flex items-center gap-3 pt-1 flex-wrap">
                  {/* Currency & Cost */}
                  <div className="flex items-center gap-2">
                    <select
                      value={row.currency}
                      onChange={(e) =>
                        updateRow(row.id, { currency: e.target.value as "JPY" | "THB" })
                      }
                      className="px-2 py-1.5 bg-bg-base border border-border rounded-lg text-xs font-bold text-accent focus:outline-none focus:border-accent cursor-pointer"
                    >
                      <option value="JPY">¥ JPY</option>
                      <option value="THB">฿ THB</option>
                    </select>

                    <input
                      type="number"
                      value={row.amount}
                      onChange={(e) => updateRow(row.id, { amount: e.target.value })}
                      placeholder="0"
                      className="w-28 px-2.5 py-1.5 bg-bg-base border border-border rounded-lg text-xs font-mono font-bold text-text-primary focus:outline-none focus:border-accent"
                    />

                    {/* IC Card Checkbox */}
                    <label className="flex items-center gap-1.5 text-xs text-text-secondary cursor-pointer select-none ml-2">
                      <input
                        type="checkbox"
                        checked={row.isIcCard}
                        onChange={(e) => updateRow(row.id, { isIcCard: e.target.checked })}
                        className="rounded border-border text-accent focus:ring-accent"
                      />
                      <CreditCard className="w-3.5 h-3.5 text-accent" />
                      <span>IC Card</span>
                    </label>
                  </div>
                </div>

                {/* Pass & Remark / Notes (Always Expanded) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2.5 border-t border-border/50">
                  <div>
                    <label className={labelClass}>
                      <Train className="w-3 h-3 text-accent" /> {t("railPassUsed")}
                    </label>
                    <select
                      value={row.selectedPass}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateRow(row.id, {
                          selectedPass: val,
                          isCustomMode: val === "__custom__",
                        });
                      }}
                      className={inputClass}
                    >
                      <option value="">{t("noPassUsed")}</option>
                      {availablePasses.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                      <option value="__custom__">{t("otherCustomPass")}</option>
                    </select>
                    {row.isCustomMode && (
                      <input
                        type="text"
                        value={row.customPass}
                        onChange={(e) => updateRow(row.id, { customPass: e.target.value })}
                        placeholder={t("enterCustomPass")}
                        className={`${inputClass} mt-1.5`}
                      />
                    )}
                  </div>

                  <div>
                    <label className={labelClass}>
                      <LinkIcon className="w-3 h-3 text-text-faint" /> {t("remarksLinks")}
                    </label>
                    <input
                      type="text"
                      value={row.remark}
                      onChange={(e) => updateRow(row.id, { remark: e.target.value })}
                      placeholder="e.g. URL link or notes"
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>
            );
          })}

          {/* Add Another Stop Button */}
          <button
            type="button"
            onClick={handleAddRow}
            className="w-full py-2.5 rounded-2xl border border-dashed border-accent/40 bg-accent/5 hover:bg-accent/10 text-accent text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer hover:border-accent"
          >
            <Plus className="w-4 h-4" />
            <span>{t("addAnotherStop")}</span>
          </button>
        </div>

        {/* Footer Summary & Actions */}
        <div className="px-6 py-4 border-t border-border bg-bg-surface/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-text-muted flex items-center gap-3">
            <span>
              {t("totalEstimatedCost")}:{" "}
              <strong className="text-text-primary font-mono text-sm">
                {formatJPY(totalJpy)}
              </strong>{" "}
              <span className="text-[11px] text-text-faint">
                (≈ {formatTHB(totalThb)})
              </span>
            </span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-text-muted hover:text-text-primary hover:bg-bg-surface transition-colors disabled:opacity-50 cursor-pointer"
            >
              {t("cancel")}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={handleSubmitAll}
              className="px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-light text-white text-xs font-bold shadow-accent transition-all hover:scale-105 disabled:opacity-60 flex items-center gap-1.5 cursor-pointer"
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              <span>
                {loading
                  ? language === "th"
                    ? "กำลังบันทึกทั้งหมด..."
                    : "Saving all..."
                  : `${t("saveAllStops")} (${rows.filter((r) => r.location.trim() || r.activity.trim()).length})`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
