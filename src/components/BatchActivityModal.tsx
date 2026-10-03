"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo, useRef, startTransition } from "react";
import { createPortal } from "react-dom";
import { createActivitiesBatch, saveActivitiesBatch } from "@/lib/actions";
import {
  X, Clock, MapPin, AlignLeft, CreditCard, Train, Ticket,
  Link as LinkIcon, CircleDollarSign, ArrowRightLeft, Loader2, Sparkles,
  ChevronDown, Plus, PlusCircle, Trash2, CheckCircle2, Edit3
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
  existingActivities?: Array<{
    id?: string;
    time?: string;
    location: string;
    activity: string;
    cost?: number;
    isIcCard?: boolean;
    usingPass?: string | null;
    remark?: string | null;
  }>;
  previousDayLastLocation?: string;
  planId?: string;
  initialMode?: "create" | "edit";
  initialInsertIndex?: number | null;
  onSuccess?: (msg?: string) => void;
}

interface BatchStopRow {
  id: string;
  activityId?: string;
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

function calculateIntermediateTime(
  prevRow?: BatchStopRow,
  nextRow?: BatchStopRow
): { hour: string; minute: string } {
  const parseTime = (row?: BatchStopRow) => {
    if (!row) return null;
    const h = parseInt(row.hour, 10);
    const m = parseInt(row.minute, 10);
    if (isNaN(h)) return null;
    return h * 60 + (isNaN(m) ? 0 : m);
  };

  const tPrev = parseTime(prevRow);
  const tNext = parseTime(nextRow);

  if (tPrev !== null && tNext !== null) {
    if (tNext > tPrev) {
      const diff = tNext - tPrev;
      if (diff > 10) {
        const rawMid = (tPrev + tNext) / 2;
        const midRounded = Math.round(rawMid / 5) * 5;
        if (midRounded > tPrev && midRounded < tNext) {
          const h = Math.min(23, Math.floor(midRounded / 60));
          const m = midRounded % 60;
          return {
            hour: String(h).padStart(2, "0"),
            minute: String(m).padStart(2, "0"),
          };
        }
      }
      const mid = Math.floor((tPrev + tNext) / 2);
      const h = Math.min(23, Math.floor(mid / 60));
      const m = mid % 60;
      return {
        hour: String(h).padStart(2, "0"),
        minute: String(m).padStart(2, "0"),
      };
    } else {
      const nextTime = Math.min(23 * 60 + 55, tPrev + 30);
      const h = Math.floor(nextTime / 60);
      const m = nextTime % 60;
      return {
        hour: String(h).padStart(2, "0"),
        minute: String(m).padStart(2, "0"),
      };
    }
  }

  if (tPrev !== null) {
    const nextTime = Math.min(23 * 60 + 55, tPrev + 120);
    const h = Math.floor(nextTime / 60);
    const m = nextTime % 60;
    return {
      hour: String(h).padStart(2, "0"),
      minute: String(m).padStart(2, "0"),
    };
  }

  if (tNext !== null) {
    const prevTime = Math.max(0, tNext - 60);
    const h = Math.floor(prevTime / 60);
    const m = prevTime % 60;
    return {
      hour: String(h).padStart(2, "0"),
      minute: String(m).padStart(2, "0"),
    };
  }

  return { hour: "09", minute: "00" };
}

function createEmptyRow(
  index: number,
  timeOrHour?: { hour: string; minute: string } | string
): BatchStopRow {
  let defaultHour = "09";
  let defaultMinute = "00";

  if (typeof timeOrHour === "object" && timeOrHour !== null) {
    defaultHour = timeOrHour.hour;
    defaultMinute = timeOrHour.minute;
  } else if (typeof timeOrHour === "string") {
    const h = parseInt(timeOrHour, 10);
    if (!isNaN(h)) {
      defaultHour = String(Math.min(23, h + 2)).padStart(2, "0");
    }
  } else if (index === 0) defaultHour = "09";
  else if (index === 1) defaultHour = "12";
  else if (index === 2) defaultHour = "15";

  return {
    id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    hour: defaultHour,
    minute: defaultMinute,
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
  planId,
  initialMode,
  initialInsertIndex = null,
  onSuccess,
}: BatchActivityModalProps) {
  const router = useRouter();
  const { t, language } = useLanguage();

  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">(initialMode || "create");
  const [rows, setRows] = useState<BatchStopRow[]>([]);
  const [deletedActivityIds, setDeletedActivityIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeDropdownRowId, setActiveDropdownRowId] = useState<string | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const suggestionsListRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  function buildRowsFromExisting(): BatchStopRow[] {
    if (!existingActivities || existingActivities.length === 0) {
      return [createEmptyRow(0), createEmptyRow(1, "09")];
    }
    return existingActivities.map((a, i) => {
      const parts = (a.time || "09:00").split(":");
      const h = parts[0] || "09";
      const m = parts[1] || "00";
      const isCustomPass =
        Boolean(a.usingPass && !availablePasses.includes(a.usingPass));
      return {
        id: a.id ? `row-${a.id}` : `row-${Date.now()}-${i}`,
        activityId: a.id,
        hour: h.padStart(2, "0"),
        minute: m.padStart(2, "0"),
        location: a.location || "",
        activity: a.activity || "",
        currency: "JPY",
        amount: a.cost ? String(a.cost) : "",
        isIcCard: Boolean(a.isIcCard),
        selectedPass: isCustomPass ? "__custom__" : a.usingPass || "",
        customPass: isCustomPass ? a.usingPass || "" : "",
        isCustomMode: Boolean(isCustomPass),
        remark: a.remark || "",
      };
    });
  }

  // Initialize rows on modal open based on mode
  useEffect(() => {
    if (isOpen) {
      const defaultMode =
        initialMode || (existingActivities.length > 0 ? "edit" : "create");
      setMode(defaultMode);
      setDeletedActivityIds([]);
      setActiveDropdownRowId(null);
      setHighlightedIndex(-1);

      if (defaultMode === "edit" && existingActivities.length > 0) {
        const baseRows = buildRowsFromExisting();
        if (
          typeof initialInsertIndex === "number" &&
          initialInsertIndex >= 0 &&
          initialInsertIndex <= baseRows.length
        ) {
          const prevRow = initialInsertIndex > 0 ? baseRows[initialInsertIndex - 1] : undefined;
          const nextRow = initialInsertIndex < baseRows.length ? baseRows[initialInsertIndex] : undefined;
          const time = calculateIntermediateTime(prevRow, nextRow);
          const newRow = createEmptyRow(initialInsertIndex, time);
          baseRows.splice(initialInsertIndex, 0, newRow);
          setTimeout(() => {
            const el = document.getElementById(`loc-input-${newRow.id}`);
            if (el) {
              el.scrollIntoView({ behavior: "smooth", block: "center" });
              el.focus();
            }
          }, 150);
        }
        setRows(baseRows);
      } else {
        setRows([createEmptyRow(0), createEmptyRow(1, "09")]);
      }
    }
  }, [isOpen, initialMode, initialInsertIndex]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [isOpen]);

  function handleSwitchMode(newMode: "create" | "edit") {
    setMode(newMode);
    setDeletedActivityIds([]);
    setActiveDropdownRowId(null);
    setHighlightedIndex(-1);

    if (newMode === "edit") {
      setRows(buildRowsFromExisting());
    } else {
      setRows([createEmptyRow(0), createEmptyRow(1, "09")]);
    }
  }

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

  const handleInsertRow = (targetIndex: number) => {
    let newRowId = "";
    setRows((prev) => {
      const prevRow = targetIndex > 0 ? prev[targetIndex - 1] : undefined;
      const nextRow = targetIndex < prev.length ? prev[targetIndex] : undefined;
      const time = calculateIntermediateTime(prevRow, nextRow);
      const newRow = createEmptyRow(targetIndex, time);
      newRowId = newRow.id;
      const nextRows = [...prev];
      nextRows.splice(targetIndex, 0, newRow);
      return nextRows;
    });

    setTimeout(() => {
      if (newRowId) {
        const el = document.getElementById(`loc-input-${newRowId}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.focus();
        }
      }
    }, 100);
  };

  const handleAddRow = () => {
    handleInsertRow(rows.length);
  };

  const handleRemoveRow = (id: string) => {
    if (mode === "create" && rows.length <= 1) return;
    const target = rows.find((r) => r.id === id);
    if (target?.activityId) {
      setDeletedActivityIds((prev) =>
        prev.includes(target.activityId!) ? prev : [...prev, target.activityId!]
      );
    }
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

    if (validRows.length === 0 && deletedActivityIds.length === 0) {
      alert(t("noStopsAdded"));
      return;
    }

    setLoading(true);
    try {
      const itemsToSave = validRows.map((r) => {
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
          id: r.activityId,
          time: `${h}:${m}`,
          location: r.location.trim(),
          activity: r.activity.trim() || r.location.trim(),
          cost: jpyVal || 0,
          isIcCard: r.isIcCard,
          usingPass: resolvedPass,
          remark: r.remark.trim() || undefined,
        };
      });

      if (
        mode === "edit" ||
        deletedActivityIds.length > 0 ||
        itemsToSave.some((it) => it.id)
      ) {
        await saveActivitiesBatch(dayId, {
          planId,
          items: itemsToSave,
          deletedIds: deletedActivityIds,
        });
      } else {
        await createActivitiesBatch(dayId, itemsToSave, planId);
      }

      startTransition(() => {
        router.refresh();
      });
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Failed to batch save activities");
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
        <div className="px-6 py-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-bg-surface/50">
          <div className="space-y-1.5">
            <h3 className="text-base font-bold text-text-primary flex items-center gap-2 flex-wrap">
              {mode === "edit" ? (
                <Edit3 className="w-5 h-5 text-accent" />
              ) : (
                <Plus className="w-5 h-5 text-accent" />
              )}
              <span>
                {mode === "edit" ? t("batchEditModalTitle") : t("addStopActivity")}
              </span>
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
            className="self-end sm:self-auto p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-surface transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Rows Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {rows.length > 0 && (
            <div className="flex justify-end -mb-1">
              <button
                type="button"
                onClick={() => handleInsertRow(0)}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold text-text-muted hover:text-accent hover:bg-accent/10 border border-border/50 hover:border-accent/30 transition-all flex items-center gap-1 cursor-pointer bg-bg-surface/60 shadow-xs"
                title={t("insertStopBeforeFirst")}
              >
                <Plus className="w-3 h-3 text-accent" />
                <span>{t("insertStopBeforeFirst")}</span>
              </button>
            </div>
          )}

          {rows.length === 0 ? (
            <div className="py-12 text-center text-text-muted flex flex-col items-center justify-center space-y-3 bg-bg-surface/50 border border-dashed border-border rounded-2xl">
              <p className="text-xs font-semibold text-text-secondary">{t("noStopsAdded")}</p>
              <button
                type="button"
                onClick={handleAddRow}
                className="px-4 py-2 rounded-xl bg-accent text-white text-xs font-bold hover:bg-accent-light transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t("addAnotherStop")}</span>
              </button>
            </div>
          ) : (
            rows.map((row, idx) => {
              const isDropdownOpen = activeDropdownRowId === row.id;

              return (
                <div key={row.id} className="space-y-4">
                  <div className="bg-bg-surface border border-border/80 rounded-2xl p-4 transition-all hover:border-accent/40 space-y-3 relative shadow-sm">
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

                        {/* Insert Stop After This Card Button */}
                        <button
                          type="button"
                          onClick={() => handleInsertRow(idx + 1)}
                          className="p-1.5 rounded-lg text-text-muted hover:text-accent hover:bg-accent/10 transition-colors cursor-pointer"
                          title={t("insertStopAfter")}
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Stop Button */}
                        <button
                          type="button"
                          disabled={mode === "create" && rows.length <= 1}
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
                            id={`loc-input-${row.id}`}
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

              {/* In-between Insert Divider Button */}
              {idx < rows.length - 1 && (
                <div className="relative flex items-center justify-center my-1 group/insert">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-dashed border-border/80 group-hover/insert:border-accent/60 transition-colors" />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleInsertRow(idx + 1)}
                    className="relative z-10 px-3.5 py-1.5 rounded-full bg-bg-surface hover:bg-accent text-text-muted hover:text-white border border-border/80 hover:border-accent text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs group-hover/insert:scale-105 cursor-pointer"
                    title={t("insertStopBetween")
                      .replace("{prev}", String(idx + 1))
                      .replace("{next}", String(idx + 2))}
                  >
                    <Plus className="w-3.5 h-3.5 text-accent group-hover/insert:text-white transition-colors" />
                    <span>
                      {t("insertStopBetween")
                        .replace("{prev}", String(idx + 1))
                        .replace("{next}", String(idx + 2))}
                    </span>
                  </button>
                </div>
              )}
            </div>
          );
        })
        )}

          {/* Add Another Stop Button */}
          {rows.length > 0 && (
            <button
              type="button"
              onClick={handleAddRow}
              className="w-full py-2.5 rounded-2xl border border-dashed border-accent/40 bg-accent/5 hover:bg-accent/10 text-accent text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer hover:border-accent"
            >
              <Plus className="w-4 h-4" />
              <span>{t("addAnotherStop")}</span>
            </button>
          )}
        </div>

        {/* Footer Summary & Actions */}
        <div className="px-6 py-4 border-t border-border bg-bg-surface/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-text-muted flex items-center gap-3 flex-wrap">
            <span>
              {t("totalEstimatedCost")}:{" "}
              <strong className="text-text-primary font-mono text-sm">
                {formatJPY(totalJpy)}
              </strong>{" "}
              <span className="text-[11px] text-text-faint">
                (≈ {formatTHB(totalThb)})
              </span>
            </span>

            {deletedActivityIds.length > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 text-[11px] font-bold flex items-center gap-1">
                <Trash2 className="w-3 h-3" />
                <span>
                  {t("deletedStopsCount").replace(
                    "{count}",
                    String(deletedActivityIds.length)
                  )}
                </span>
              </span>
            )}
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
                  ? t("savingAllEllipsis")
                  : mode === "edit"
                  ? t("saveAllChanges")
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
