"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo, useRef, startTransition } from "react";
import { createPortal } from "react-dom";
import { createActivitiesBatch, saveActivitiesBatch } from "@/lib/actions";
import {
  X, Clock, MapPin, AlignLeft, CreditCard, Train, Ticket,
  Link as LinkIcon, CircleDollarSign, ArrowRightLeft, Loader2, Sparkles,
  ChevronDown, Plus, Trash2, CheckCircle2, Edit3
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
  const [hasSubmittedAttempt, setHasSubmittedAttempt] = useState(false);
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
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
      setHasSubmittedAttempt(false);
      setShowClearConfirmModal(false);
      setSaveError(null);

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
    setHasSubmittedAttempt(false);

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

  // Dynamic available locations for active row
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

    // 1. Immediately above stop in this batch
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

      // Other stops above in this batch
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

    // 3. Previous day's last location
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

  const handleClearAllStops = () => {
    if (rows.length === 0) return;
    setShowClearConfirmModal(true);
  };

  const handleConfirmClearAll = () => {
    const existingIds = rows
      .map((r) => r.activityId)
      .filter((id): id is string => Boolean(id));
    setDeletedActivityIds((prev) => Array.from(new Set([...prev, ...existingIds])));
    setRows([]);
    setHasSubmittedAttempt(false);
    setActiveDropdownRowId(null);
    setShowClearConfirmModal(false);
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

  // Calculate earliest and latest stop times for summary strip (plain calculation without hook)
  const timeMinutes = rows
    .map((r) => {
      const h = parseInt(r.hour, 10);
      const m = parseInt(r.minute, 10);
      if (isNaN(h) || isNaN(m)) return null;
      return {
        total: h * 60 + m,
        formatted: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
      };
    })
    .filter((t): t is { total: number; formatted: string } => t !== null);

  const timeRange =
    timeMinutes.length > 0
      ? (() => {
          const sorted = [...timeMinutes].sort((a, b) => a.total - b.total);
          const earliest = sorted[0].formatted;
          const latest = sorted[sorted.length - 1].formatted;
          return earliest === latest ? earliest : `${earliest} → ${latest}`;
        })()
      : null;

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
    setSaveError(null);

    if (rows.length === 0 && deletedActivityIds.length === 0) {
      onClose();
      return;
    }

    // Validate that every stop has required fields (Location and Activity)
    const firstInvalidIdx = rows.findIndex(
      (r) => !r.location.trim() || !r.activity.trim()
    );

    if (firstInvalidIdx !== -1) {
      setHasSubmittedAttempt(true);
      const invalidRow = rows[firstInvalidIdx];

      const missingInputId = !invalidRow.location.trim()
        ? `loc-input-${invalidRow.id}`
        : `act-input-${invalidRow.id}`;

      setTimeout(() => {
        const el = document.getElementById(missingInputId);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.focus();
        }
      }, 50);
      return;
    }

    setLoading(true);
    try {
      const itemsToSave = rows.map((r) => {
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

      // Sort items chronologically by time (e.g. Card with 18:00 moves before Card with 18:30)
      const parseTimeToMinutes = (t: string) => {
        const [h, m] = t.split(":").map((v) => parseInt(v, 10));
        if (isNaN(h)) return 24 * 60;
        return h * 60 + (isNaN(m) ? 0 : m);
      };

      const sortedItemsToSave = [...itemsToSave]
        .map((item, originalIndex) => ({ item, originalIndex }))
        .sort((a, b) => {
          const diff = parseTimeToMinutes(a.item.time) - parseTimeToMinutes(b.item.time);
          if (diff !== 0) return diff;
          return a.originalIndex - b.originalIndex;
        })
        .map((x) => x.item);

      if (
        mode === "edit" ||
        deletedActivityIds.length > 0 ||
        sortedItemsToSave.some((it) => it.id)
      ) {
        await saveActivitiesBatch(dayId, {
          planId,
          items: sortedItemsToSave,
          deletedIds: deletedActivityIds,
        });
      } else {
        await createActivitiesBatch(dayId, sortedItemsToSave, planId);
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
      setSaveError(err?.message || "Failed to batch save activities");
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full px-3 py-2 bg-bg-base border border-border rounded-xl text-text-primary text-xs placeholder:text-text-faint focus:outline-none focus:border-accent transition-colors";
  const labelClass =
    "text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1 flex items-center gap-1";

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/75 backdrop-blur-md overflow-y-auto">
      <div
        className="bg-bg-card border border-border/80 dark:border-border rounded-3xl w-full max-w-4xl lg:max-w-5xl shadow-2xl my-auto animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh] overflow-hidden relative"
      >
        {/* Sleek Compact Header */}
        <div className="relative px-5 sm:px-6 py-3.5 border-b border-border/80 bg-gradient-to-r from-bg-surface via-bg-surface/95 to-accent/15 dark:to-accent/20 flex-shrink-0 z-20 overflow-hidden">
          {/* Subtle decorative background glow */}
          <div className="absolute right-0 top-0 w-72 h-full bg-gradient-to-l from-accent/10 to-transparent pointer-events-none" />

          <div className="relative z-10 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <div className="w-7 h-7 rounded-lg bg-accent/15 text-accent flex items-center justify-center flex-shrink-0 shadow-2xs">
                <Edit3 className="w-3.5 h-3.5" />
              </div>
              <h2 className="text-base sm:text-lg font-black text-text-primary tracking-tight">
                {mode === "edit" ? t("manageStops") : t("addStopActivity")}
              </h2>
              {dayNumber !== undefined && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-accent/10 border border-accent/20 text-accent font-bold">
                  {t("day")} {dayNumber} {dayTitle ? `· ${dayTitle}` : ""}
                </span>
              )}
              {rows.length > 0 && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-bg-surface/90 border border-border/80 text-text-muted font-bold flex items-center gap-1 shadow-2xs">
                  <MapPin className="w-3 h-3 text-accent" />
                  <span>
                    {rows.length} {t("stops")}
                  </span>
                </span>
              )}
              {timeRange && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-bg-surface/90 border border-border/80 text-text-secondary font-mono font-bold flex items-center gap-1 shadow-2xs">
                  <Clock className="w-3 h-3 text-accent" />
                  <span>{timeRange}</span>
                </span>
              )}
            </div>

            <button
              onClick={onClose}
              disabled={loading}
              type="button"
              className="p-1.5 rounded-xl text-text-muted hover:text-text-primary hover:bg-bg-surface/80 border border-border/40 transition-colors cursor-pointer disabled:opacity-50 flex-shrink-0"
              title={t("cancel")}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Timeline & Stop Cards Container */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Top Insert Button (Add first stop to start the day) */}
          {rows.length > 0 && (
            <div className="pl-11 sm:pl-14 pb-1">
              <button
                type="button"
                onClick={() => handleInsertRow(0)}
                className="w-full py-3 rounded-2xl border border-dashed border-accent/40 bg-accent/5 hover:bg-accent/10 text-accent text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer hover:border-accent shadow-2xs"
                title={t("insertStopBeforeFirst")}
              >
                <Plus className="w-4 h-4" />
                <span>{t("insertStopBeforeFirst")}</span>
              </button>
            </div>
          )}

          {rows.length === 0 ? (
            <div className="py-16 text-center text-text-muted flex flex-col items-center justify-center space-y-3 bg-bg-surface/50 border border-dashed border-border rounded-3xl">
              <div className="w-12 h-12 rounded-2xl bg-accent/10 text-accent flex items-center justify-center">
                <MapPin className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-text-secondary">
                {t("noStopsAdded")}
              </p>
              <button
                type="button"
                onClick={handleAddRow}
                className="px-5 py-2.5 rounded-xl bg-accent text-white text-xs font-bold hover:bg-accent-light transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{t("insertStopBeforeFirst")}</span>
              </button>
            </div>
          ) : (
            <div className="relative">
              {/* Continuous vertical dashed line down the entire timeline */}
              <div className="absolute left-[21px] sm:left-[27px] top-6 bottom-6 w-0 border-l-2 border-dashed border-border/80 pointer-events-none z-0" />

              {rows.map((row, idx) => {
                const isDropdownOpen = activeDropdownRowId === row.id;

                return (
                  <div key={row.id} className="relative">
                    {/* Stop Row with Left Timeline Track & Right Card */}
                    <div className="flex items-start gap-3 sm:gap-4 relative">
                      {/* Timeline Track (Left Column) */}
                      <div className="flex flex-col items-center flex-shrink-0 w-11 sm:w-14 pt-3.5 relative select-none">
                        {/* Number Badge */}
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-accent text-white font-black text-xs sm:text-sm flex items-center justify-center shadow-md relative z-10 ring-4 ring-bg-card">
                          {idx + 1}
                        </div>

                        {/* Scheduled Time under Circle */}
                        <span className="text-[11px] sm:text-xs font-mono font-bold text-text-secondary mt-1.5 tracking-tight text-center relative z-10 bg-bg-card px-1 rounded">
                          {(row.hour || "09").padStart(2, "0")}:{(row.minute || "00").padStart(2, "0")}
                        </span>
                      </div>

                      {/* Stop Card (Right Column) */}
                      <div className="flex-1 min-w-0 bg-bg-surface border border-border/80 dark:border-border hover:border-accent/40 rounded-2xl p-4 sm:p-5 shadow-xs transition-all space-y-3.5 relative">
                        {/* Row 1: Location & Activity & Time/Delete Controls */}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                          {/* Location with Fuzzy Search Dropdown */}
                          <div className="md:col-span-5">
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
                                placeholder="e.g. Rembrandt Inn Aomori"
                                className={`${inputClass} pr-8 ${
                                  hasSubmittedAttempt && !row.location.trim()
                                    ? "border-red-500 bg-red-500/5 focus:border-red-500"
                                    : ""
                                }`}
                                autoComplete="off"
                              />
                              {hasSubmittedAttempt && !row.location.trim() && (
                                <p className="text-[10px] text-red-500 font-semibold mt-1">
                                  * {t("fieldRequired")}
                                </p>
                              )}
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

                          {/* Activity / Details */}
                          <div className="md:col-span-4">
                            <label className={labelClass}>
                              <AlignLeft className="w-3 h-3 text-text-faint" /> {t("activityDetails")} *
                            </label>
                            <input
                              id={`act-input-${row.id}`}
                              type="text"
                              value={row.activity}
                              onChange={(e) => updateRow(row.id, { activity: e.target.value })}
                              placeholder="e.g. Wake up / Walk street..."
                              className={`${inputClass} ${
                                hasSubmittedAttempt && !row.activity.trim()
                                  ? "border-red-500 bg-red-500/5 focus:border-red-500"
                                  : ""
                              }`}
                            />
                            {hasSubmittedAttempt && !row.activity.trim() && (
                              <p className="text-[10px] text-red-500 font-semibold mt-1">
                                * {t("fieldRequired")}
                              </p>
                            )}
                          </div>

                          {/* Time Input Pill & Delete Button */}
                          <div className="md:col-span-3 flex items-center justify-between md:justify-end gap-2 pt-0 md:pt-5">
                            {/* Typed Hour : Minute Pill */}
                            <div className="flex items-center gap-1 bg-bg-base border border-border rounded-xl px-2.5 py-1.5 focus-within:border-accent shadow-2xs">
                              <Clock className="w-3.5 h-3.5 text-accent/80 mr-0.5 flex-shrink-0" />
                              <input
                                type="text"
                                inputMode="numeric"
                                maxLength={2}
                                value={row.hour}
                                onChange={(e) => handleHourChange(row.id, e.target.value)}
                                onBlur={(e) => handleHourBlur(row.id, e.target.value)}
                                placeholder="09"
                                className="w-5 text-center bg-transparent text-xs font-mono font-bold text-text-primary focus:outline-none"
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
                                className="w-5 text-center bg-transparent text-xs font-mono font-bold text-text-primary focus:outline-none"
                              />
                            </div>

                            {/* Delete Stop Button */}
                            <button
                              type="button"
                              disabled={mode === "create" && rows.length <= 1}
                              onClick={() => handleRemoveRow(row.id)}
                              className="p-2 rounded-xl text-text-muted hover:text-red-500 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-colors disabled:opacity-30 cursor-pointer"
                              title={t("removeStop")}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Row 2: Cost & Transit Pass */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-0.5">
                          {/* Cost & IC Card */}
                          <div>
                            <label className={labelClass}>
                              <CircleDollarSign className="w-3 h-3 text-accent" /> {t("cost")}
                            </label>
                            <div className="flex items-center gap-2">
                              <select
                                value={row.currency}
                                onChange={(e) =>
                                  updateRow(row.id, { currency: e.target.value as "JPY" | "THB" })
                                }
                                className="px-2.5 py-2 bg-bg-base border border-border rounded-xl text-xs font-bold text-accent focus:outline-none focus:border-accent cursor-pointer flex-shrink-0"
                              >
                                <option value="JPY">¥ JPY</option>
                                <option value="THB">฿ THB</option>
                              </select>

                              <input
                                type="number"
                                value={row.amount}
                                onChange={(e) => updateRow(row.id, { amount: e.target.value })}
                                placeholder="0"
                                className="w-full px-3 py-2 bg-bg-base border border-border rounded-xl text-xs font-mono font-bold text-text-primary focus:outline-none focus:border-accent min-w-0"
                              />

                              <label className="flex items-center gap-1.5 text-xs text-text-secondary cursor-pointer select-none px-2.5 py-2 bg-bg-base border border-border rounded-xl flex-shrink-0 hover:border-accent/50 transition-colors">
                                <input
                                  type="checkbox"
                                  checked={row.isIcCard}
                                  onChange={(e) => updateRow(row.id, { isIcCard: e.target.checked })}
                                  className="rounded border-border text-accent focus:ring-accent cursor-pointer"
                                />
                                <CreditCard className="w-3.5 h-3.5 text-accent" />
                                <span className="font-semibold text-[11px]">IC</span>
                              </label>
                            </div>
                          </div>

                          {/* Rail Pass Used */}
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
                                onChange={(e) =>
                                  updateRow(row.id, { customPass: e.target.value })
                                }
                                placeholder={t("enterCustomPass")}
                                className={`${inputClass} mt-1.5`}
                              />
                            )}
                          </div>
                        </div>

                        {/* Row 3: Remarks & Links (Full Width) */}
                        <div className="pt-0.5">
                          <label className={labelClass}>
                            <LinkIcon className="w-3 h-3 text-text-faint" /> {t("remarksLinks")}
                          </label>
                          <input
                            type="text"
                            value={row.remark}
                            onChange={(e) =>
                              updateRow(row.id, { remark: e.target.value })
                            }
                            placeholder="e.g. URL link or notes"
                            className={inputClass}
                          />
                        </div>
                      </div>
                    </div>

                    {/* In-between Insert Divider Button */}
                    {idx < rows.length - 1 && (
                      <div className="relative flex items-center justify-center my-3 group/insert pl-11 sm:pl-14">
                        <div className="absolute inset-0 flex items-center pl-11 sm:pl-14">
                          <div className="w-full border-t border-dashed border-border/80 group-hover/insert:border-accent/60 transition-colors" />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleInsertRow(idx + 1)}
                          className="relative z-10 px-3.5 py-1.5 rounded-full bg-bg-surface hover:bg-accent text-text-muted hover:text-white border border-border/80 hover:border-accent text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs group-hover/insert:scale-105 cursor-pointer"
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
              })}
            </div>
          )}

          {/* Add Another Stop Button at Bottom */}
          {rows.length > 0 && (
            <div className="pl-11 sm:pl-14 pt-1">
              <button
                type="button"
                onClick={handleAddRow}
                className="w-full py-3 rounded-2xl border border-dashed border-accent/40 bg-accent/5 hover:bg-accent/10 text-accent text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer hover:border-accent shadow-2xs"
              >
                <Plus className="w-4 h-4" />
                <span>{t("addAnotherStop")}</span>
              </button>
            </div>
          )}
        </div>

        {/* Error notification banner if any */}
        {saveError && (
          <div className="px-5 sm:px-6 py-2.5 bg-red-500/10 border-t border-red-500/20 text-red-500 text-xs flex items-center justify-between flex-shrink-0">
            <span>{saveError}</span>
            <button
              type="button"
              onClick={() => setSaveError(null)}
              className="p-1 hover:bg-red-500/20 rounded-lg text-red-400 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Docked Footer Summary & Actions */}
        <div className="px-5 sm:px-6 py-4 border-t border-border bg-bg-surface/90 backdrop-blur-xs flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0 z-20">
          {/* Left: Clear All Stops Button */}
          <div className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-3">
            <button
              type="button"
              onClick={handleClearAllStops}
              disabled={loading || rows.length === 0}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-red-500 hover:text-red-600 bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{t("clearAllStops")}</span>
            </button>

            {deletedActivityIds.length > 0 && (
              <span className="px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 text-[11px] font-bold flex items-center gap-1">
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

          {/* Center: Total Cost */}
          <div className="text-xs text-text-muted flex items-center gap-1.5 font-medium">
            <span>{t("totalEstimatedCost")}:</span>
            <strong className="text-accent font-bold font-mono text-sm">
              {formatJPY(totalJpy)}
            </strong>
            <span className="text-[11px] text-text-faint">
              (≈ {formatTHB(totalThb)})
            </span>
          </div>

          {/* Right: Cancel & Save Buttons */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-text-muted hover:text-text-primary hover:bg-bg-surface transition-colors disabled:opacity-50 cursor-pointer"
            >
              {t("cancel")}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={handleSubmitAll}
              className="px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-light text-white text-xs font-bold shadow-accent transition-all hover:scale-102 disabled:opacity-60 flex items-center gap-1.5 cursor-pointer"
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

      {/* Custom In-App Confirmation Modal for Clearing All Stops */}
      {showClearConfirmModal && (
        <div className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-bg-card border border-border rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-red-500">
              <div className="w-10 h-10 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-text-primary">
                  {t("clearAllStops")}
                </h3>
                {dayTitle && (
                  <span className="text-[11px] text-text-muted">
                    {dayTitle}
                  </span>
                )}
              </div>
            </div>

            <p className="text-xs text-text-secondary leading-relaxed">
              {t("confirmClearAllStops")}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setShowClearConfirmModal(false)}
                className="px-4 py-2 rounded-xl border border-border text-text-muted hover:text-text-primary hover:bg-bg-surface text-xs font-semibold cursor-pointer transition-colors"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                onClick={handleConfirmClearAll}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md shadow-red-600/30 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t("clearAllStops")}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
