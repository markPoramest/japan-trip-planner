"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { createActivity, updateActivity } from "@/lib/actions";
import {
  X, Clock, MapPin, AlignLeft, CreditCard, Train, Ticket,
  Link as LinkIcon, CircleDollarSign, ArrowRightLeft, Loader2, Sparkles, ChevronDown, Plus
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { formatJPY, formatTHB } from "@/lib/utils";
import { fuzzyMatch, getMatchedSegments } from "@/lib/fuzzy";
import CurrencyCostInput from "@/components/CurrencyCostInput";

interface ActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  dayId: string;
  exchangeRate?: number;
  availablePasses?: string[];
  previousLocations?: { name: string; count?: number }[] | string[];
  planId?: string;
  activity?: {
    id: string;
    time: string;
    location: string;
    activity: string;
    cost: number;
    isIcCard: boolean;
    usingPass: string | null;
    remark: string | null;
  } | null;
}



export default function ActivityFormModal({
  isOpen,
  onClose,
  dayId,
  exchangeRate = 0.24,
  availablePasses = [],
  previousLocations = [],
  planId,
  activity,
}: ActivityModalProps) {
  const router = useRouter();
  const { t, language } = useLanguage();
  const isEditing = !!activity;

  const [mounted, setMounted] = useState(false);
  const [selectedHour, setSelectedHour] = useState("09");
  const [selectedMinute, setSelectedMinute] = useState("00");
  const [location, setLocation] = useState("");
  const [actText, setActText] = useState("");
  const [inputCurrency, setInputCurrency] = useState<"JPY" | "THB">("JPY");
  const [amountValue, setAmountValue] = useState("");
  const [isIcCard, setIsIcCard] = useState(false);
  const [selectedPass, setSelectedPass] = useState("");
  const [customPass, setCustomPass] = useState("");
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [remark, setRemark] = useState("");
  const [loading, setLoading] = useState(false);
  const [savingMode, setSavingMode] = useState<"close" | "another">("close");

  // Fuzzy Search Locations State
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [localLocations, setLocalLocations] = useState<string[]>([]);
  const locationContainerRef = useRef<HTMLDivElement>(null);
  const locationInputRef = useRef<HTMLInputElement>(null);
  const suggestionsListRef = useRef<HTMLUListElement>(null);

  // Normalize previousLocations and merge with any newly saved locations in current session
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

    for (const loc of localLocations) {
      const trimmed = loc.trim();
      if (trimmed && trimmed.toLowerCase() !== "location") {
        const key = trimmed.toLowerCase();
        const existing = map.get(key);
        map.set(key, {
          name: existing?.name || trimmed,
          count: (existing?.count || 0) + 1,
        });
      }
    }

    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [previousLocations, localLocations]);

  // Compute fuzzy matched locations based on current typed text
  const filteredLocations = useMemo(() => {
    if (!availableLocations.length) return [];
    const query = location.trim();
    if (!query) {
      return availableLocations.map((item) => ({
        ...item,
        score: item.count || 1,
        indices: [] as number[],
      }));
    }

    return availableLocations
      .map((item) => {
        const res = fuzzyMatch(query, item.name);
        return {
          ...item,
          matches: res.matches,
          score: res.score,
          indices: res.indices,
        };
      })
      .filter((item) => item.matches)
      .sort((a, b) => b.score - a.score);
  }, [availableLocations, location]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        locationContainerRef.current &&
        !locationContainerRef.current.contains(e.target as Node)
      ) {
        setShowLocationSuggestions(false);
      }
    }
    if (showLocationSuggestions) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showLocationSuggestions]);

  useEffect(() => {
    if (!isOpen) {
      setShowLocationSuggestions(false);
      setHighlightedIndex(-1);
    }
  }, [isOpen]);

  useEffect(() => {
    if (highlightedIndex >= 0 && suggestionsListRef.current) {
      const items = suggestionsListRef.current.querySelectorAll("li");
      const activeItem = items[highlightedIndex];
      if (activeItem) {
        activeItem.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex]);

  const selectLocation = (locName: string) => {
    setLocation(locName);
    setShowLocationSuggestions(false);
    setHighlightedIndex(-1);
  };

  const handleLocationKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showLocationSuggestions || filteredLocations.length === 0) {
      if (e.key === "ArrowDown" && availableLocations.length > 0) {
        e.preventDefault();
        setShowLocationSuggestions(true);
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
        selectLocation(filteredLocations[highlightedIndex].name);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      setShowLocationSuggestions(false);
    } else if (e.key === "Tab") {
      setShowLocationSuggestions(false);
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const orig = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = orig;
      };
    }
  }, [isOpen]);

  useEffect(() => {
    if (activity && isOpen) {
      const rawTime = activity.time || "09:00";
      const parts = rawTime.split(":");
      const h = parts[0]?.padStart(2, "0") || "09";
      const m = parts[1]?.padStart(2, "0") || "00";
      setSelectedHour(h);
      setSelectedMinute(m);

      setLocation(activity.location || "");
      setActText(activity.activity || "");
      setInputCurrency("JPY");
      setAmountValue(activity.cost !== undefined && activity.cost !== null ? activity.cost.toString() : "");
      setIsIcCard(activity.isIcCard || false);

      const passVal = activity.usingPass || "";
      if (passVal && !availablePasses.includes(passVal)) {
        setIsCustomMode(true);
        setSelectedPass("__custom__");
        setCustomPass(passVal);
      } else {
        setIsCustomMode(false);
        setSelectedPass(passVal);
        setCustomPass("");
      }

      setRemark(activity.remark || "");
    } else if (!activity && isOpen) {
      setSelectedHour("09");
      setSelectedMinute("00");
      setLocation("");
      setActText("");
      setInputCurrency("JPY");
      setAmountValue("");
      setIsIcCard(false);
      setSelectedPass("");
      setCustomPass("");
      setIsCustomMode(false);
      setRemark("");
    }
  }, [activity, isOpen, availablePasses]);

  if (!isOpen || !mounted) return null;

  const formattedHour = (selectedHour || "09").padStart(2, "0");
  const formattedMinute = (selectedMinute || "00").padStart(2, "0");
  const time = `${formattedHour}:${formattedMinute}`;
  const numVal = parseFloat(amountValue) || 0;
  const jpyVal = inputCurrency === "JPY" ? numVal : exchangeRate > 0 ? Math.round(numVal / exchangeRate) : 0;
  const thbVal = inputCurrency === "THB" ? numVal : Math.round(numVal * exchangeRate);

  const resolvedPass = isCustomMode ? customPass.trim() || null : selectedPass || null;

  async function handleSubmit(e: React.FormEvent, addAnother = false) {
    e.preventDefault();
    setLoading(true);
    setSavingMode(addAnother ? "another" : "close");
    try {
      if (isEditing && activity) {
        await updateActivity(activity.id, {
          time,
          location,
          activity: actText,
          cost: jpyVal || 0,
          isIcCard,
          usingPass: resolvedPass,
          remark: remark || null,
        });
      } else {
        await createActivity(dayId, {
          time,
          location,
          activity: actText,
          cost: jpyVal || 0,
          isIcCard,
          usingPass: resolvedPass || undefined,
          remark: remark || undefined,
          planId,
        });
      }
      if (location.trim()) {
        setLocalLocations((prev) => [location.trim(), ...prev]);
      }
      router.refresh();
      if (addAnother && !isEditing) {
        const curH = parseInt(selectedHour, 10);
        const nextH = Math.min(23, curH + 2);
        setSelectedHour(String(nextH).padStart(2, "0"));
        setLocation("");
        setActText("");
        setAmountValue("");
        setRemark("");
        setIsIcCard(false);
        locationInputRef.current?.focus();
      } else {
        onClose();
      }
    } catch (err) {
      console.error(err);
      alert("Failed to save activity");
    } finally {
      setLoading(false);
    }
  }

  const handlePassSelectChange = (val: string) => {
    setSelectedPass(val);
    if (val === "__custom__") {
      setIsCustomMode(true);
    } else {
      setIsCustomMode(false);
    }
  };

  const inputClass =
    "w-full px-3.5 py-2.5 bg-bg-base border border-border rounded-xl text-text-primary text-sm placeholder-text-faint focus:outline-none focus:border-accent transition-colors";
  const labelClass = "block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 flex items-center gap-1.5";

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-md overflow-y-auto">
      <div className="bg-bg-card border border-border rounded-3xl w-full max-w-lg shadow-2xl my-auto animate-in fade-in zoom-in-95 duration-150 relative">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
            <Clock className="w-4 h-4 text-accent" />
            <span>{isEditing ? t("editStopActivity") : t("addStopActivity")}</span>
          </h3>
          <button
            onClick={onClose}
            disabled={loading}
            type="button"
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-surface transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
          {/* Time Picker & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {/* Time Picker (Hour : Minute Dropdown) */}
            <div className="sm:col-span-2">
              <label className={labelClass}>
                <Clock className="w-3.5 h-3.5 text-accent" /> {t("time")}
              </label>

              <div className="flex items-center gap-1 bg-bg-base border border-border rounded-xl px-3 py-2.5 focus-within:border-accent">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={2}
                  value={selectedHour}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "").slice(0, 2);
                    const num = parseInt(digits, 10);
                    if (digits === "" || (!isNaN(num) && num >= 0 && num <= 23)) {
                      setSelectedHour(digits);
                    }
                  }}
                  onBlur={() => {
                    if (!selectedHour) setSelectedHour("09");
                    else setSelectedHour(selectedHour.padStart(2, "0"));
                  }}
                  placeholder="09"
                  className="w-full text-center bg-transparent text-sm font-mono font-bold text-text-primary focus:outline-none"
                />
                <span className="font-bold text-text-muted font-mono text-base">:</span>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={2}
                  value={selectedMinute}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "").slice(0, 2);
                    const num = parseInt(digits, 10);
                    if (digits === "" || (!isNaN(num) && num >= 0 && num <= 59)) {
                      setSelectedMinute(digits);
                    }
                  }}
                  onBlur={() => {
                    if (!selectedMinute) setSelectedMinute("00");
                    else setSelectedMinute(selectedMinute.padStart(2, "0"));
                  }}
                  placeholder="00"
                  className="w-full text-center bg-transparent text-sm font-mono font-bold text-text-primary focus:outline-none"
                />
              </div>
            </div>

            {/* Location with Fuzzy Search Dropdown */}
            <div className="sm:col-span-3">
              <label className={labelClass}>
                <MapPin className="w-3.5 h-3.5 text-accent" /> {t("locationPlace")} *
              </label>

              <div className="relative z-30" ref={locationContainerRef}>
                <input
                  ref={locationInputRef}
                  required
                  type="text"
                  value={location}
                  onChange={(e) => {
                    setLocation(e.target.value);
                    setShowLocationSuggestions(true);
                    setHighlightedIndex(-1);
                  }}
                  onFocus={() => {
                    if (availableLocations.length > 0) {
                      setShowLocationSuggestions(true);
                    }
                  }}
                  onKeyDown={handleLocationKeyDown}
                  placeholder="e.g. Asakusa Sensoji Temple"
                  className={`${inputClass} ${availableLocations.length > 0 ? "pr-9" : ""}`}
                  autoComplete="off"
                />

                {availableLocations.length > 0 && (
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => {
                      setShowLocationSuggestions((prev) => !prev);
                      locationInputRef.current?.focus();
                    }}
                    title={t("viewPreviousLocations")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-text-muted hover:text-accent hover:bg-bg-surface transition-colors cursor-pointer"
                  >
                    <ChevronDown
                      className={`w-4 h-4 transition-transform duration-200 ${showLocationSuggestions ? "rotate-180 text-accent" : ""
                        }`}
                    />
                  </button>
                )}

                {/* Suggestions Dropdown */}
                {showLocationSuggestions && availableLocations.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-bg-card border border-border rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3 py-2 bg-bg-surface border-b border-border/70 flex items-center justify-between">
                      <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3 text-accent" />
                        {t("tripLocationsTitle")} ({filteredLocations.length})
                      </span>
                      <span className="text-[10px] text-text-faint hidden sm:inline">
                        {t("fuzzySearchTip")}
                      </span>
                    </div>

                    <ul
                      ref={suggestionsListRef}
                      className="max-h-52 overflow-y-auto divide-y divide-border/40 py-1"
                      role="listbox"
                    >
                      {filteredLocations.length > 0 ? (
                        filteredLocations.map((item, idx) => {
                          const isHighlighted = idx === highlightedIndex;
                          const segments = getMatchedSegments(item.name, item.indices);
                          return (
                            <li
                              key={`${item.name}-${idx}`}
                              role="option"
                              aria-selected={isHighlighted}
                              onMouseEnter={() => setHighlightedIndex(idx)}
                              onMouseDown={(e) => {
                                // Prevent input blur before click finishes
                                e.preventDefault();
                              }}
                              onClick={() => selectLocation(item.name)}
                              className={`px-3 py-2 text-xs flex items-center justify-between cursor-pointer transition-colors ${isHighlighted
                                  ? "bg-accent/15 text-text-primary"
                                  : "hover:bg-bg-surface text-text-secondary hover:text-text-primary"
                                }`}
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                                <MapPin
                                  className={`w-3.5 h-3.5 flex-shrink-0 ${isHighlighted ? "text-accent" : "text-text-faint"
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
                              {item.count && item.count > 1 ? (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent font-semibold border border-accent/20 flex-shrink-0">
                                  {item.count}x
                                </span>
                              ) : null}
                            </li>
                          );
                        })
                      ) : (
                        <li className="px-3 py-3 text-xs text-text-muted text-center italic">
                          {t("noMatchingLocations")}
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Activity Description */}
          <div>
            <label className={labelClass}>
              <AlignLeft className="w-3.5 h-3.5 text-text-faint" /> {t("activityDetails")} *
            </label>
            <textarea
              required
              rows={2}
              value={actText}
              onChange={(e) => setActText(e.target.value)}
              placeholder="e.g. Walk Nakamise street, eat melon pan..."
              className={inputClass + " resize-none"}
            />
          </div>

          {/* Currency selection & Cost input */}
          <CurrencyCostInput
            label={t("currencyAndCost")}
            amount={amountValue}
            currency={inputCurrency}
            exchangeRate={exchangeRate}
            placeholder={inputCurrency === "JPY" ? "0 or e.g. 1500" : "0 or e.g. 360"}
            onAmountChange={setAmountValue}
            onCurrencyChange={setInputCurrency}
          >
            {/* IC Card toggle */}
            <div className="pt-2 border-t border-border/60">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isIcCard}
                  onChange={(e) => setIsIcCard(e.target.checked)}
                  className="w-4 h-4 rounded border-border text-sage focus:ring-sage accent-sage"
                />
                <span className="text-xs font-semibold text-text-secondary flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-sage" />
                  <span>{t("icCard")} (Suica / Pasmo / ICOCA)</span>
                </span>
              </label>
            </div>
          </CurrencyCostInput>

          {/* Transit Pass Selector */}
          <div>
            <label className={labelClass}>
              <Ticket className="w-3.5 h-3.5 text-olive" /> {t("railPassUsed")}
            </label>
            <select
              value={isCustomMode ? "__custom__" : selectedPass}
              onChange={(e) => handlePassSelectChange(e.target.value)}
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

            {isCustomMode && (
              <input
                type="text"
                value={customPass}
                onChange={(e) => setCustomPass(e.target.value)}
                placeholder={t("enterCustomPass")}
                className={inputClass + " mt-2"}
              />
            )}
          </div>

          {/* Remarks / Link */}
          <div>
            <label className={labelClass}>
              <LinkIcon className="w-3.5 h-3.5 text-text-faint" /> {t("remarksLinks")}
            </label>
            <input
              type="text"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="e.g. Transit timetable URL or notes"
              className={inputClass}
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-border flex items-center justify-end gap-2 flex-wrap">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-text-muted hover:text-text-primary hover:bg-bg-surface transition-colors disabled:opacity-50 cursor-pointer"
            >
              {t("cancel")}
            </button>
            {!isEditing && (
              <button
                type="button"
                disabled={loading || !location.trim() || !actText.trim()}
                onClick={(e) => handleSubmit(e, true)}
                className="px-3.5 py-2 rounded-xl bg-bg-surface border border-accent/40 text-accent hover:bg-accent/10 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                title={t("saveAndAddAnother")}
              >
                {loading && savingMode === "another" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )}
                <span>{t("saveAndAddAnother")}</span>
              </button>
            )}
            <button
              type="button"
              disabled={loading}
              onClick={(e) => handleSubmit(e, false)}
              className="px-5 py-2 rounded-xl bg-accent hover:bg-accent-light text-white text-xs font-bold shadow-accent transition-all hover:scale-105 disabled:opacity-60 flex items-center gap-1.5 cursor-pointer"
            >
              {loading && savingMode === "close" && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{loading && savingMode === "close" ? t("savingEllipsis") : isEditing ? t("saveChanges") : t("addActivity")}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
