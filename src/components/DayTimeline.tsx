"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { formatJPY, formatTHB } from "@/lib/utils";
import {
  updateTripDay,
  createSubstitutePlan,
  swapMainPlan,
  updateDayPlan,
  deleteSubstitutePlan,
} from "@/lib/actions";
import BatchActivityModal from "./BatchActivityModal";
import {
  Clock, MapPin, CreditCard, Train, ExternalLink,
  Plus, Edit2, Edit3, Trash2, Banknote, DollarSign, AlertCircle, AlertTriangle, Check, X, Loader2, Globe,
  ArrowRightLeft, Sparkles, CloudRain, Building, Coffee, Zap, Star
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export interface Activity {
  id: string;
  time: string;
  location: string;
  activity: string;
  cost: number;
  isIcCard: boolean;
  usingPass: string | null;
  remark: string | null;
  sortOrder: number;
}

export interface DayPlanData {
  id: string;
  title: string;
  tag: string | null;
  isMain: boolean;
  sortOrder: number;
  notes: string | null;
  activities: Activity[];
}

interface DayTimelineProps {
  tripId: string;
  isOwner?: boolean;
  dayId: string;
  dayNumber: number;
  dayTitle: string;
  date: Date;
  dayOfWeek: string;
  activities?: Activity[];
  plans?: DayPlanData[];
  availablePasses?: string[];
  exchangeRate?: number;
  previousLocations?: { name: string; count?: number }[] | string[];
  previousDayLastLocation?: string;
}

function getPlanIcon(tag: string | null | undefined, isMain: boolean) {
  if (isMain) return "⭐";
  if (!tag) return "📋";
  const lower = tag.toLowerCase();
  if (lower.includes("rain") || lower.includes("weather")) return "🌧️";
  if (lower.includes("indoor") || lower.includes("museum") || lower.includes("mall") || lower.includes("shopping")) return "🏛️";
  if (lower.includes("chill") || lower.includes("relax") || lower.includes("cafe")) return "☕";
  if (lower.includes("backup") || lower.includes("route") || lower.includes("detour")) return "⚡";
  if (lower.includes("food") || lower.includes("eat")) return "🍱";
  return "📋";
}

export default function DayTimeline({
  tripId,
  isOwner = false,
  dayId,
  dayNumber,
  dayTitle,
  date,
  dayOfWeek,
  activities = [],
  plans = [],
  availablePasses = [],
  exchangeRate = 0.24,
  previousLocations = [],
  previousDayLastLocation,
}: DayTimelineProps) {
  const router = useRouter();
  const { t, language } = useLanguage();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Modals state
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchModalMode, setBatchModalMode] = useState<"create" | "edit">("create");

  // Day Title Editing State
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [currentTitle, setCurrentTitle] = useState(dayTitle);
  const [titleInput, setTitleInput] = useState(dayTitle);
  const [savingTitle, setSavingTitle] = useState(false);

  // Plans normalization
  const normalizedPlans: DayPlanData[] =
    plans && plans.length > 0
      ? plans
      : [
        {
          id: "default-main",
          title: "Plan A (Main)",
          tag: "main",
          isMain: true,
          sortOrder: 0,
          notes: null,
          activities: activities,
        },
      ];

  const mainPlan = normalizedPlans.find((p) => p.isMain) || normalizedPlans[0];
  const [selectedPlanId, setSelectedPlanId] = useState<string>(mainPlan.id);

  // Fallback if selected plan is not found in latest plans
  const activePlan =
    normalizedPlans.find((p) => p.id === selectedPlanId) || mainPlan;
  const currentActivities = activePlan?.activities || [];

  const substitutePlans = normalizedPlans.filter((p) => !p.isMain);
  const substituteCount = substitutePlans.length;

  // Plan Creation Modal State
  const [createPlanModalOpen, setCreatePlanModalOpen] = useState(false);
  const [newPlanTitle, setNewPlanTitle] = useState("");
  const [newPlanTag, setNewPlanTag] = useState("rainy");
  const [newPlanNotes, setNewPlanNotes] = useState("");
  const [copyActivities, setCopyActivities] = useState(true);
  const [creatingPlan, setCreatingPlan] = useState(false);

  // Plan Editing Modal State
  const [editPlanModalOpen, setEditPlanModalOpen] = useState(false);
  const [editingPlanData, setEditingPlanData] = useState<{
    id: string;
    title: string;
    tag: string;
    notes: string;
  } | null>(null);
  const [savingPlanMeta, setSavingPlanMeta] = useState(false);

  // Action status
  const [isSwapping, setIsSwapping] = useState(false);
  const [isDeletingPlan, setIsDeletingPlan] = useState(false);

  // Swap Plan Modal State
  const [swapModalOpen, setSwapModalOpen] = useState(false);
  const [planToSwap, setPlanToSwap] = useState<DayPlanData | null>(null);
  const [shouldUpdateDayTitle, setShouldUpdateDayTitle] = useState(true);
  const [newDayTitleInput, setNewDayTitleInput] = useState("");

  // Delete Plan Modal State
  const [deletePlanModalOpen, setDeletePlanModalOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<DayPlanData | null>(null);

  // In-App Toast State
  const [toastMessage, setToastMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ type, text });
  };

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 3500);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // Cost calculation for the currently active plan view
  const totalCost = currentActivities.reduce((sum, a) => sum + (a.cost || 0), 0);
  const icCost = currentActivities
    .filter((a) => a.isIcCard)
    .reduce((sum, a) => sum + (a.cost || 0), 0);
  const nonIcCost = totalCost - icCost;

  const dateLocale = language === "th" ? "th-TH" : "en-GB";
  const formattedDate = new Date(date).toLocaleDateString(dateLocale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  function handleSaveDayTitle(e: React.FormEvent) {
    e.preventDefault();
    if (!isOwner) return;
    const newTitle = titleInput.trim();
    if (!newTitle) return;

    if (newTitle === currentTitle) {
      setIsEditingTitle(false);
      return;
    }

    const previousTitle = currentTitle;
    setCurrentTitle(newTitle);
    setIsEditingTitle(false);

    updateTripDay(dayId, tripId, {
      title: newTitle,
      dayNumber,
    })
      .then((updated) => {
        if (updated?.slug) {
          window.history.replaceState(null, "", `/trips/${tripId}/days/${updated.slug}`);
        }
        showToast(language === "th" ? "บันทึกชื่อวันเรียบร้อย" : "Day title updated");
      })
      .catch((err) => {
        console.error(err);
        setCurrentTitle(previousTitle);
        setTitleInput(previousTitle);
        showToast("Failed to update day title.", "error");
      });
  }

  function handleCancelDayTitle() {
    setTitleInput(currentTitle);
    setIsEditingTitle(false);
  }

  // Open Create Plan Modal with smart defaults
  function handleOpenCreatePlanModal() {
    if (substituteCount >= 3) {
      showToast(t("maxSubstitutesReached"), "error");
      return;
    }
    const letters = ["B", "C", "D"];
    const existingTitles = normalizedPlans.map((p) => p.title.toLowerCase());
    let nextLetter = letters[substituteCount] || "B";
    for (const l of letters) {
      if (!existingTitles.some((tit) => tit.includes(`plan ${l.toLowerCase()}`))) {
        nextLetter = l;
        break;
      }
    }

    const defaultTitle = `Plan ${nextLetter} (${t("rainyDay")})`;
    setNewPlanTitle(defaultTitle);
    setNewPlanTag("rainy");
    setNewPlanNotes("");
    setCopyActivities(true);
    setCreatePlanModalOpen(true);
  }

  // Handle Preset Button Click in Create Modal
  function handleSelectPreset(presetTag: string) {
    setNewPlanTag(presetTag);
    const letters = ["B", "C", "D"];
    const existingTitles = normalizedPlans.map((p) => p.title.toLowerCase());
    let nextLetter = letters[substituteCount] || "B";
    for (const l of letters) {
      if (!existingTitles.some((tit) => tit.includes(`plan ${l.toLowerCase()}`))) {
        nextLetter = l;
        break;
      }
    }

    if (presetTag === "rainy") {
      setNewPlanTitle(`Plan ${nextLetter} (${t("rainyDay")})`);
      setNewPlanNotes("Indoor contingency for rain or bad weather");
    } else if (presetTag === "indoor") {
      setNewPlanTitle(`Plan ${nextLetter} (${t("indoorShopping")})`);
      setNewPlanNotes("Museums, aquariums, department stores, and arcades");
    } else if (presetTag === "chill") {
      setNewPlanTitle(`Plan ${nextLetter} (${t("relaxedPace")})`);
      setNewPlanNotes("Slow-paced cafe hopping, gardens, and leisure walking");
    } else if (presetTag === "backup") {
      setNewPlanTitle(`Plan ${nextLetter} (${t("backupRoute")})`);
      setNewPlanNotes("Alternative transit or detour route");
    }
  }

  // Submit Create Plan
  async function handleCreatePlanSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newPlanTitle.trim()) return;
    setCreatingPlan(true);
    try {
      const newPlan = await createSubstitutePlan(dayId, {
        title: newPlanTitle.trim(),
        tag: newPlanTag,
        notes: newPlanNotes.trim() || undefined,
        copyFromPlanId: copyActivities && mainPlan ? mainPlan.id : undefined,
      });
      setSelectedPlanId(newPlan.id);
      setCreatePlanModalOpen(false);
      showToast(
        language === "th"
          ? `สร้างแผน "${newPlanTitle.trim()}" สำเร็จ`
          : `Created substitute plan "${newPlanTitle.trim()}"`
      );
      router.refresh();
    } catch (err: any) {
      console.error(err);
      showToast(err?.message || "Failed to create substitute plan", "error");
    } finally {
      setCreatingPlan(false);
    }
  }

  // Open Swap Modal
  function handleOpenSwapModal(plan: DayPlanData) {
    if (!isOwner || plan.isMain) return;
    setPlanToSwap(plan);
    setNewDayTitleInput(plan.title);
    setShouldUpdateDayTitle(false);
    setSwapModalOpen(true);
  }

  // Confirm Swap Plan to Main (with optional Day Title change)
  async function handleConfirmSwap() {
    if (!planToSwap || !isOwner) return;

    setIsSwapping(true);
    try {
      const res = await swapMainPlan(
        dayId,
        planToSwap.id,
        shouldUpdateDayTitle ? newDayTitleInput.trim() : undefined
      );

      if (res && typeof res === "object") {
        if (res.dayTitle) {
          setCurrentTitle(res.dayTitle);
          setTitleInput(res.dayTitle);
        }
      }

      setSelectedPlanId(planToSwap.id);
      setSwapModalOpen(false);
      showToast(
        language === "th"
          ? `สลับ "${planToSwap.title}" เป็นแผนหลักเรียบร้อยแล้ว!`
          : `Swapped "${planToSwap.title}" to Main Plan!`
      );
      router.refresh();
    } catch (err: any) {
      console.error(err);
      showToast(err?.message || "Failed to swap plans", "error");
    } finally {
      setIsSwapping(false);
    }
  }

  // Open Delete Plan Modal
  function handleOpenDeletePlanModal(plan: DayPlanData) {
    if (!isOwner || plan.isMain) return;
    setPlanToDelete(plan);
    setDeletePlanModalOpen(true);
  }

  // Confirm Delete Plan
  async function handleConfirmDeletePlan() {
    if (!planToDelete || !isOwner) return;

    setIsDeletingPlan(true);
    try {
      const deletedTitle = planToDelete.title;
      await deleteSubstitutePlan(planToDelete.id);
      setSelectedPlanId(mainPlan.id);
      setDeletePlanModalOpen(false);
      showToast(
        language === "th"
          ? `ลบแผน "${deletedTitle}" สำเร็จ`
          : `Deleted plan "${deletedTitle}"`
      );
      router.refresh();
    } catch (err: any) {
      console.error(err);
      showToast(err?.message || "Failed to delete plan", "error");
    } finally {
      setIsDeletingPlan(false);
    }
  }

  // Submit Edit Plan Metadata
  async function handleEditPlanSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingPlanData || !editingPlanData.title.trim()) return;
    setSavingPlanMeta(true);
    try {
      await updateDayPlan(editingPlanData.id, {
        title: editingPlanData.title.trim(),
        tag: editingPlanData.tag,
        notes: editingPlanData.notes.trim() || undefined,
      });
      setEditPlanModalOpen(false);
      showToast(language === "th" ? "บันทึกข้อมูลแผนเรียบร้อย" : "Plan updated successfully");
      router.refresh();
    } catch (err: any) {
      console.error(err);
      showToast(err?.message || "Failed to update plan", "error");
    } finally {
      setSavingPlanMeta(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Day Header & Live Stats */}
      <div data-aos="fade-down" className="bg-bg-card border border-border rounded-3xl p-6 shadow-card space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-bold uppercase tracking-wider">
                {t("day")} {dayNumber}
              </span>
              <span className="text-sm text-text-muted">{formattedDate}</span>
            </div>

            {/* Title / Inline Title Editor */}
            {isEditingTitle ? (
              <form onSubmit={handleSaveDayTitle} className="flex items-center gap-2 mt-1">
                <input
                  type="text"
                  autoFocus
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  placeholder={`Day ${dayNumber} destination...`}
                  className="px-3.5 py-1.5 bg-bg-base border border-accent rounded-xl text-xl sm:text-2xl font-extrabold text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/20 max-w-md w-full"
                />
                <button
                  type="submit"
                  disabled={savingTitle}
                  className="p-2 rounded-xl bg-accent hover:bg-accent-hover text-white transition-all cursor-pointer disabled:opacity-50"
                  title={t("saveChanges")}
                >
                  {savingTitle ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={handleCancelDayTitle}
                  className="p-2 rounded-xl bg-bg-surface text-text-muted hover:text-text-primary transition-all cursor-pointer"
                  title={t("cancel")}
                >
                  <X className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <div className="flex items-center gap-3 group mt-1">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight truncate">
                  {currentTitle}
                </h1>
                {isOwner && (
                  <button
                    type="button"
                    onClick={() => {
                      setTitleInput(currentTitle);
                      setIsEditingTitle(true);
                    }}
                    className="p-1.5 rounded-lg text-text-faint hover:text-accent hover:bg-bg-surface transition-colors cursor-pointer"
                    title={t("editDayTitle")}
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>

          {isOwner ? (
            <div className="flex items-center gap-2 flex-wrap self-start md:self-auto flex-shrink-0">
              {currentActivities.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setBatchModalMode("edit");
                    setBatchModalOpen(true);
                  }}
                  className="px-3.5 py-2.5 rounded-xl bg-bg-surface border border-border hover:border-accent hover:text-accent text-text-primary text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm hover:scale-105"
                  title={t("batchEditStops")}
                >
                  <Edit3 className="w-4 h-4 text-accent" />
                  <span>{t("batchEditStops")}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setBatchModalMode("create");
                  setBatchModalOpen(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-accent hover:bg-accent-light text-white text-sm font-bold shadow-accent flex items-center gap-2 transition-all hover:scale-105 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> {t("addStopActivity")}
              </button>
            </div>
          ) : (
            <span className="self-start md:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-bg-surface border border-border text-xs font-semibold text-text-muted">
              <Globe className="w-3.5 h-3.5 text-emerald-400" />
              <span>{t("viewOnly")}</span>
            </span>
          )}
        </div>

        {/* ─────────────────────────────────────────────────────────────
            PLAN SWITCHER TABS & SUBSTITUTE PLANS
        ───────────────────────────────────────────────────────────── */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-end text-xs">
            <span className="text-[11px] text-text-faint">
              {substituteCount} / 3 {language === "th" ? t("substitutePlans") : (substituteCount === 1 ? t("substitutePlan") : t("substitutePlans")).toLowerCase()}
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1.5 sm:pb-0 scrollbar-none">
            {normalizedPlans.map((plan) => {
              const isSelected = plan.id === activePlan.id;
              return (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => setSelectedPlanId(plan.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${isSelected
                    ? plan.isMain
                      ? "bg-accent text-white shadow-accent"
                      : "bg-sky-600 text-white shadow-md shadow-sky-600/30"
                    : "bg-bg-surface text-text-muted hover:text-text-primary hover:bg-bg-surface/80 border border-border"
                    }`}
                >
                  <span>{getPlanIcon(plan.tag, plan.isMain)}</span>
                  <span>{plan.title}</span>
                  {plan.isMain && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/20 text-white font-extrabold tracking-wider">
                      MAIN
                    </span>
                  )}
                  <span className="text-[10px] opacity-75">
                    ({plan.activities.length})
                  </span>
                </button>
              );
            })}

            {isOwner && substituteCount < 3 && (
              <button
                type="button"
                onClick={handleOpenCreatePlanModal}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-accent hover:text-accent-hover bg-accent/10 hover:bg-accent/15 border border-accent/30 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                title={t("addSubstitutePlan")}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t("addSubstitutePlan")}</span>
              </button>
            )}
          </div>

          {/* Active Plan Status Banner */}
          {!activePlan.isMain ? (
            <div className="bg-sky-500/10 border border-sky-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-in fade-in duration-200">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 font-bold text-[11px] border border-sky-500/30">
                    {t("substitutePlan")}
                  </span>
                  <span className="font-bold text-text-primary text-sm">
                    {activePlan.title}
                  </span>
                </div>
                <p className="text-text-muted text-[11px]">
                  {activePlan.notes || t("substitutePlanDesc")}
                </p>
              </div>

              {isOwner && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => handleOpenSwapModal(activePlan)}
                    disabled={isSwapping}
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-accent to-amber-600 hover:from-accent-hover hover:to-amber-500 text-white font-bold text-xs shadow-md shadow-accent/25 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    <span>{isSwapping ? "..." : t("swapToMain")}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingPlanData({
                        id: activePlan.id,
                        title: activePlan.title,
                        tag: activePlan.tag || "backup",
                        notes: activePlan.notes || "",
                      });
                      setEditPlanModalOpen(true);
                    }}
                    className="p-2 rounded-xl border border-border hover:border-accent text-text-muted hover:text-accent transition-colors cursor-pointer"
                    title={t("editPlan")}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenDeletePlanModal(activePlan)}
                    disabled={isDeletingPlan}
                    className="p-2 rounded-xl border border-border hover:border-red-500/50 hover:bg-red-500/10 text-text-muted hover:text-red-400 transition-colors cursor-pointer disabled:opacity-50"
                    title={t("deletePlan")}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-4 py-2 flex items-center justify-between text-xs text-emerald-400">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="font-bold">{t("activeMainPlan")}</span>
              </div>
              {isOwner && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingPlanData({
                      id: activePlan.id,
                      title: activePlan.title,
                      tag: activePlan.tag || "main",
                      notes: activePlan.notes || "",
                    });
                    setEditPlanModalOpen(true);
                  }}
                  className="text-text-muted hover:text-text-primary text-[11px] flex items-center gap-1 cursor-pointer"
                >
                  <Edit2 className="w-3 h-3" /> {t("editPlanName")}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Live Cost Stats */}
        <div className="space-y-2 pt-4 border-t border-border">
          {/* Primary: Total Day Cost */}
          <div
            data-aos="fade-up"
            className="bg-bg-surface border border-border rounded-xl p-3.5 flex items-center justify-between"
          >
            <div>
              <div className="text-xs text-text-muted">{t("totalDayCost")} ({activePlan.title})</div>
              <div className="text-lg font-bold font-mono text-text-primary mt-0.5">
                {formatJPY(totalCost)}
              </div>
              <div className="text-[10px] text-text-muted font-mono">≈ {formatTHB(totalCost * exchangeRate)}</div>
            </div>
            <div className="p-2.5 rounded-lg bg-bg-card border border-border">
              <DollarSign className="w-5 h-5 text-sand" />
            </div>
          </div>

          {/* Subset: IC Card + Cash/Credit breakdown */}
          <div className="grid grid-cols-2 gap-2">
            {/* IC Card */}
            <div
              data-aos="fade-up"
              data-aos-delay={80}
              className="bg-bg-card/60 border border-border/60 border-l-2 border-l-sage/40 rounded-lg px-2.5 py-2 flex items-center justify-between gap-2"
            >
              <div className="min-w-0">
                <div className="text-[10px] text-text-faint font-medium truncate">{t("icCardSpent")}</div>
                <div className="text-sm font-bold font-mono text-sage mt-0.5">
                  {formatJPY(icCost)}
                </div>
                <div className="text-[9px] text-text-faint font-mono">≈ {formatTHB(icCost * exchangeRate)}</div>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <div className="p-1.5 rounded-md bg-bg-surface border border-border">
                  <CreditCard className="w-3.5 h-3.5 text-sage" />
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold text-sage bg-sage-subtle border border-sage-muted">
                  {totalCost > 0 ? Math.round((icCost / totalCost) * 100) : 0}%
                </span>
              </div>
            </div>

            {/* Cash & Credit Card */}
            <div
              data-aos="fade-up"
              data-aos-delay={160}
              className="bg-bg-card/60 border border-border/60 border-l-2 border-l-sand/40 rounded-lg px-2.5 py-2 flex items-center justify-between gap-2"
            >
              <div className="min-w-0">
                <div className="text-[10px] text-text-faint font-medium truncate">{t("cashAndCreditCard")}</div>
                <div className="text-sm font-bold font-mono text-sand mt-0.5">
                  {formatJPY(nonIcCost)}
                </div>
                <div className="text-[9px] text-text-faint font-mono">≈ {formatTHB(nonIcCost * exchangeRate)}</div>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <div className="p-1.5 rounded-md bg-bg-surface border border-border">
                  <Banknote className="w-3.5 h-3.5 text-sand" />
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold text-sand bg-sand-subtle border border-sand-muted">
                  {totalCost > 0 ? Math.round((nonIcCost / totalCost) * 100) : 0}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline Activities List */}
      <div className="space-y-4">
        {currentActivities.length === 0 ? (
          <div
            data-aos="fade-up"
            className="bg-bg-card border border-border border-dashed rounded-3xl p-10 text-center text-text-muted shadow-card space-y-4"
          >
            <AlertCircle className="w-8 h-8 text-text-faint mx-auto" />
            <div>
              <p className="font-semibold text-text-secondary">
                {t("noActivitiesTitle")}
              </p>
              <p className="text-xs text-text-muted mt-1">
                {t("noActivitiesSubtitle")}
              </p>
            </div>
            {isOwner && (
              <div className="flex items-center justify-center pt-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setBatchModalMode("create");
                    setBatchModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-accent text-white text-xs font-bold hover:bg-accent-light transition-all flex items-center gap-1.5 cursor-pointer shadow-accent"
                >
                  <Plus className="w-3.5 h-3.5" /> {t("addStopActivity")}
                </button>
              </div>
            )}
          </div>
        ) : (
          currentActivities.map((activity, idx) => {
            const linkMatch = activity.remark ? activity.remark.match(/https?:\/\/[^\s]+/) : null;
            const linkUrl = linkMatch ? linkMatch[0] : null;

            return (
              <div
                key={activity.id}
                data-aos="fade-up"
                data-aos-delay={(idx % 6) * 60}
                className="bg-bg-card border border-border rounded-2xl p-4 sm:p-5 hover:border-accent/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-card group"
              >
                {/* Time & Activity Details */}
                <div className="flex items-start gap-3 sm:gap-4 flex-1">
                  <div className="flex flex-col items-center flex-shrink-0">
                    <span className="px-2.5 py-1 rounded-lg bg-bg-surface border border-border text-xs font-mono font-bold text-accent">
                      {activity.time}
                    </span>
                  </div>

                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-text-primary text-sm sm:text-base">
                        {activity.location}
                      </span>
                      {activity.usingPass && (
                        <span className="px-2 py-0.5 rounded-full bg-olive-subtle border border-olive-muted text-olive text-[11px] font-medium flex items-center gap-1">
                          <Train className="w-3 h-3" /> {activity.usingPass}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      {activity.activity}
                    </p>
                    {activity.remark && (
                      <div className="text-[11px] text-text-muted flex items-center gap-1 pt-0.5">
                        {linkUrl ? (
                          <a
                            href={linkUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-accent hover:underline flex items-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3" /> {activity.remark}
                          </a>
                        ) : (
                          <span>{activity.remark}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Cost & Action Controls */}
                <div className="flex items-center justify-between sm:justify-end gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-border/60">
                  <div className="text-right">
                    <div className="flex items-center gap-1 font-bold text-sm font-mono text-text-primary">
                      {activity.isIcCard && (
                        <span title="Paid with IC Card">
                          <CreditCard className="w-3.5 h-3.5 text-sage" />
                        </span>
                      )}
                      <span>{formatJPY(activity.cost || 0)}</span>
                    </div>
                    <div className="text-[10px] text-text-muted font-mono">
                      ≈ {formatTHB((activity.cost || 0) * exchangeRate)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Batch Activity Modal (targets currently active plan) */}
      <BatchActivityModal
        isOpen={batchModalOpen}
        onClose={() => setBatchModalOpen(false)}
        dayId={dayId}
        dayNumber={dayNumber}
        dayTitle={`${currentTitle} - ${activePlan.title}`}
        exchangeRate={exchangeRate}
        availablePasses={availablePasses}
        previousLocations={previousLocations}
        existingActivities={currentActivities}
        previousDayLastLocation={previousDayLastLocation}
        planId={activePlan.id}
        initialMode={batchModalMode}
        onSuccess={() => showToast(t("batchSaveSuccess"))}
      />

      {mounted && typeof document !== "undefined" && createPortal(
        <>
          {/* ─────────────────────────────────────────────────────────────
              MODAL: CREATE SUBSTITUTE PLAN
          ───────────────────────────────────────────────────────────── */}
          {createPlanModalOpen && (
        <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-bg-card border border-border rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                <Plus className="w-4 h-4 text-accent" />
                <span>{t("createSubstitutePlan")}</span>
              </h3>
              <button
                type="button"
                onClick={() => setCreatePlanModalOpen(false)}
                className="text-text-muted hover:text-text-primary p-1 rounded-lg hover:bg-bg-surface transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePlanSubmit} className="space-y-4 text-xs">
              {/* Plan Name */}
              <div>
                <label className="block text-text-secondary font-semibold mb-1">
                  {t("planName")} *
                </label>
                <input
                  type="text"
                  required
                  value={newPlanTitle}
                  onChange={(e) => setNewPlanTitle(e.target.value)}
                  placeholder="e.g. Plan B (Rainy Day)"
                  className="w-full bg-bg-base border border-border rounded-xl px-3.5 py-2.5 text-text-primary placeholder-text-faint focus:outline-none focus:border-accent"
                />
              </div>

              {/* Scenario Presets */}
              <div>
                <label className="block text-text-secondary font-semibold mb-1.5">
                  {t("scenarioPreset")}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { tag: "rainy", label: t("rainyDay"), icon: "🌧️" },
                    { tag: "indoor", label: t("indoorShopping"), icon: "🏛️" },
                    { tag: "chill", label: t("relaxedPace"), icon: "☕" },
                    { tag: "backup", label: t("backupRoute"), icon: "⚡" },
                  ].map((preset) => (
                    <button
                      key={preset.tag}
                      type="button"
                      onClick={() => handleSelectPreset(preset.tag)}
                      className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${newPlanTag === preset.tag
                        ? "bg-accent/15 border-accent text-accent font-bold"
                        : "bg-bg-surface border-border text-text-muted hover:border-accent/40"
                        }`}
                    >
                      <span className="text-base">{preset.icon}</span>
                      <span className="truncate">{preset.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Trigger Notes */}
              <div>
                <label className="block text-text-secondary font-semibold mb-1">
                  {t("triggerNotes")}
                </label>
                <input
                  type="text"
                  value={newPlanNotes}
                  onChange={(e) => setNewPlanNotes(e.target.value)}
                  placeholder="e.g. Switch if morning rain forecast is > 60%"
                  className="w-full bg-bg-base border border-border rounded-xl px-3.5 py-2.5 text-text-primary placeholder-text-faint focus:outline-none focus:border-accent"
                />
              </div>

              {/* Copy Option */}
              <div className="bg-bg-surface/60 border border-border rounded-2xl p-3.5 space-y-2">
                <span className="font-semibold text-text-secondary block">
                  {t("initialSchedule")}
                </span>
                <label className="flex items-start gap-2.5 cursor-pointer text-text-secondary">
                  <input
                    type="radio"
                    name="copy_activities"
                    checked={copyActivities}
                    onChange={() => setCopyActivities(true)}
                    className="accent-accent mt-0.5"
                  />
                  <span>{t("copyFromMain")}</span>
                </label>
                <label className="flex items-start gap-2.5 cursor-pointer text-text-secondary">
                  <input
                    type="radio"
                    name="copy_activities"
                    checked={!copyActivities}
                    onChange={() => setCopyActivities(false)}
                    className="accent-accent mt-0.5"
                  />
                  <span>{t("startBlank")}</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setCreatePlanModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-border text-text-muted hover:text-text-primary hover:bg-bg-surface text-xs font-semibold cursor-pointer"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={creatingPlan || !newPlanTitle.trim()}
                  className="px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold shadow-accent transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {creatingPlan && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{t("createSubstitutePlan")}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: EDIT PLAN METADATA
      ───────────────────────────────────────────────────────────── */}
      {editPlanModalOpen && editingPlanData && (
        <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-bg-card border border-border rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-accent" />
                <span>{t("editPlan")}</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditPlanModalOpen(false)}
                className="text-text-muted hover:text-text-primary p-1 rounded-lg hover:bg-bg-surface transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditPlanSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-text-secondary font-semibold mb-1">
                  {t("planName")} *
                </label>
                <input
                  type="text"
                  required
                  value={editingPlanData.title}
                  onChange={(e) =>
                    setEditingPlanData((prev) =>
                      prev ? { ...prev, title: e.target.value } : null
                    )
                  }
                  className="w-full bg-bg-base border border-border rounded-xl px-3.5 py-2.5 text-text-primary focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-text-secondary font-semibold mb-1">
                  {t("triggerNotes")}
                </label>
                <input
                  type="text"
                  value={editingPlanData.notes}
                  onChange={(e) =>
                    setEditingPlanData((prev) =>
                      prev ? { ...prev, notes: e.target.value } : null
                    )
                  }
                  className="w-full bg-bg-base border border-border rounded-xl px-3.5 py-2.5 text-text-primary focus:outline-none focus:border-accent"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setEditPlanModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-border text-text-muted hover:text-text-primary hover:bg-bg-surface text-xs font-semibold cursor-pointer"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={savingPlanMeta || !editingPlanData.title.trim()}
                  className="px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold shadow-accent transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {savingPlanMeta && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{t("saveChanges")}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ─────────────────────────────────────────────────────────────
          MODAL: SWAP PLAN TO MAIN WITH DAY TITLE CHANGE OPTION
      ───────────────────────────────────────────────────────────── */}
      {swapModalOpen && planToSwap && (
        <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-bg-card border border-border rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-accent" />
                <span>{t("swapToMainPlanModalTitle")}</span>
              </h3>
              <button
                type="button"
                onClick={() => setSwapModalOpen(false)}
                className="text-text-muted hover:text-text-primary p-1 rounded-lg hover:bg-bg-surface transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Plan Comparison Summary */}
              <div className="bg-bg-surface/80 border border-border rounded-2xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-text-muted font-medium">
                    {language === "th" ? "แผนที่จะเปลี่ยนเป็นแผนหลัก:" : "New Main Plan:"}
                  </span>
                  <span className="font-bold text-accent flex items-center gap-1">
                    <span>{getPlanIcon(planToSwap.tag, false)}</span>
                    <span>{planToSwap.title}</span>
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border/60">
                  <span className="text-text-muted font-medium">
                    {language === "th" ? "แผนหลักเดิมจะกลายเป็น:" : "Current Main becomes:"}
                  </span>
                  <span className="font-medium text-text-secondary flex items-center gap-1">
                    <span>📋</span>
                    <span>{mainPlan.title}</span>
                  </span>
                </div>
              </div>

              <p className="text-text-muted text-[11px] leading-relaxed">
                {t("swapPlanDesc")}
              </p>

              {/* Day Title Option */}
              <div className="bg-bg-surface/50 border border-border rounded-2xl p-3.5 space-y-3">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={shouldUpdateDayTitle}
                    onChange={(e) => setShouldUpdateDayTitle(e.target.checked)}
                    className="w-4 h-4 rounded text-accent bg-bg-base border-border focus:ring-accent accent-accent cursor-pointer"
                  />
                  <span className="font-semibold text-text-primary text-xs">
                    {t("updateDayTitleWithPlan")}
                  </span>
                </label>

                {shouldUpdateDayTitle ? (
                  <div className="space-y-1.5 pl-6 animate-in fade-in duration-150">
                    <label className="block text-[11px] text-text-muted font-medium">
                      {t("newDayTitleLabel")}
                    </label>
                    <input
                      type="text"
                      required={shouldUpdateDayTitle}
                      value={newDayTitleInput}
                      onChange={(e) => setNewDayTitleInput(e.target.value)}
                      placeholder="e.g. Fukuoka Shopping & Tenjin"
                      className="w-full bg-bg-base border border-accent/60 rounded-xl px-3 py-2 text-text-primary text-xs focus:outline-none focus:border-accent"
                    />
                  </div>
                ) : (
                  <div className="pl-6 text-[11px] text-text-faint">
                    {language === "th"
                      ? `คงชื่อวันเดิมไว้: "${currentTitle}"`
                      : `Keep current day title: "${currentTitle}"`}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setSwapModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-border text-text-muted hover:text-text-primary hover:bg-bg-surface text-xs font-semibold cursor-pointer"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                onClick={handleConfirmSwap}
                disabled={isSwapping || (shouldUpdateDayTitle && !newDayTitleInput.trim())}
                className="px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold shadow-accent transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSwapping ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                )}
                <span>{t("confirmSwap")}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: DELETE SUBSTITUTE PLAN CONFIRMATION
      ───────────────────────────────────────────────────────────── */}
      {deletePlanModalOpen && planToDelete && (
        <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-bg-card border border-border rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-red-400">
              <div className="w-10 h-10 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-text-primary">
                  {t("deletePlanModalTitle")}
                </h3>
                <span className="text-[11px] text-text-muted">
                  "{planToDelete.title}"
                </span>
              </div>
            </div>

            <p className="text-xs text-text-secondary leading-relaxed">
              {t("deletePlanConfirmDesc")}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setDeletePlanModalOpen(false)}
                className="px-3.5 py-2 rounded-xl border border-border text-text-muted hover:text-text-primary hover:bg-bg-surface text-xs font-semibold cursor-pointer"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                onClick={handleConfirmDeletePlan}
                disabled={isDeletingPlan}
                className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md shadow-red-600/30 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {isDeletingPlan && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{t("deletePlan")}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          IN-APP TOAST NOTIFICATION
      ───────────────────────────────────────────────────────────── */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[100000] flex items-center gap-3 px-4 py-3 rounded-2xl bg-bg-card/95 backdrop-blur-md border border-border shadow-2xl animate-in slide-in-from-bottom-5 fade-in duration-200 max-w-sm">
          {toastMessage.type === "success" ? (
            <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
              <Check className="w-4 h-4" />
            </div>
          ) : (
            <div className="w-7 h-7 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
          )}
          <span className="text-xs font-semibold text-text-primary leading-tight">
            {toastMessage.text}
          </span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-text-muted hover:text-text-primary ml-auto p-1 rounded-lg hover:bg-bg-surface transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
        </>,
        document.body
      )}
    </div>
  );
}
