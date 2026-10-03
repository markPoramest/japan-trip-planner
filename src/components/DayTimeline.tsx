"use client";

import { useState, useEffect, startTransition } from "react";
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
  ArrowRightLeft, Sparkles, CloudRain, Building, Coffee, Zap, Star,
  Coins, Wallet
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

function normalizePlanList(
  rawPlans: DayPlanData[] | undefined,
  fallbackTitle: string,
  fallbackActivities: Activity[] = []
): DayPlanData[] {
  const baseList: DayPlanData[] = (
    rawPlans && rawPlans.length > 0
      ? rawPlans
      : [
          {
            id: "default-main",
            title: fallbackTitle || "Main Plan",
            tag: "main",
            isMain: true,
            sortOrder: 0,
            notes: null,
            activities: fallbackActivities,
          },
        ]
  );

  return baseList.map((p) => {
    let title = p.title;
    if (p.isMain) {
      if (/^plan\s*a\b/i.test(title) || title.toLowerCase() === "(main)" || title.toLowerCase() === "main") {
        title = title.replace(/^plan\s*a\s*(\((main|หลัก)\))?\s*[-:·]?\s*/i, "").trim();
        if (!title || title.toLowerCase() === "(main)" || title.toLowerCase() === "main") {
          title = fallbackTitle || "Main Plan";
        }
      }
    } else {
      if (/^plan\s*a\b/i.test(title)) {
        title = title.replace(/^plan\s*a\s*[-:·]?\s*/i, "").trim() || title;
      }
    }
    return { ...p, title };
  });
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
  const [insertAtIndex, setInsertAtIndex] = useState<number | null>(null);

  // Day Title Editing State
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [currentTitle, setCurrentTitle] = useState(dayTitle);
  const [titleInput, setTitleInput] = useState(dayTitle);
  const [savingTitle, setSavingTitle] = useState(false);

  // Local reactive plans state for 0ms optimistic updates
  const [localPlans, setLocalPlans] = useState<DayPlanData[]>(() =>
    normalizePlanList(plans, dayTitle, activities)
  );

  useEffect(() => {
    setLocalPlans(normalizePlanList(plans, currentTitle, activities));
  }, [plans, currentTitle, activities]);

  const mainPlan = localPlans.find((p) => p.isMain) || localPlans[0];
  const [selectedPlanId, setSelectedPlanId] = useState<string>(mainPlan?.id || "default-main");

  // Fallback if selected plan is not found in latest plans
  const activePlan =
    localPlans.find((p) => p.id === selectedPlanId) || mainPlan;
  const currentActivities = activePlan?.activities || [];

  const substitutePlans = localPlans.filter((p) => !p.isMain);
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

  // Lock body scroll when any modal or overlay is open
  useEffect(() => {
    const isAnyModalOpen =
      createPlanModalOpen ||
      editPlanModalOpen ||
      swapModalOpen ||
      deletePlanModalOpen ||
      isSwapping;

    if (isAnyModalOpen) {
      const orig = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = orig;
      };
    }
  }, [createPlanModalOpen, editPlanModalOpen, swapModalOpen, deletePlanModalOpen, isSwapping]);

  // Cost calculation for the currently active plan view
  const totalCost = currentActivities.reduce((sum, a) => sum + (a.cost || 0), 0);
  const icCost = currentActivities
    .filter((a) => a.isIcCard)
    .reduce((sum, a) => sum + (a.cost || 0), 0);
  const nonIcCost = totalCost - icCost;
  const icPercent = totalCost > 0 ? Math.round((icCost / totalCost) * 100) : 0;
  const nonIcPercent = totalCost > 0 ? Math.round((nonIcCost / totalCost) * 100) : 0;

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
        showToast(t("dayTitleUpdated"));
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
    const existingTitles = localPlans.map((p) => p.title.toLowerCase());
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
    const existingTitles = localPlans.map((p) => p.title.toLowerCase());
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
        t("substitutePlanCreated", { title: newPlanTitle.trim() })
      );
      startTransition(() => {
        router.refresh();
      });
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
    setSwapModalOpen(true);
  }

  // Confirm Swap Plan to Main with Loading Page Overlay
  async function handleConfirmSwap() {
    if (!planToSwap || !isOwner) return;

    const previousPlans = localPlans;
    const previousTitle = currentTitle;
    const targetPlanId = planToSwap.id;
    const targetTitle = planToSwap.title;

    // Close the swap modal and activate full-screen loading overlay
    setSwapModalOpen(false);
    setIsSwapping(true);

    try {
      await swapMainPlan(dayId, targetPlanId);

      // Update state to match new main plan
      setLocalPlans((prev) =>
        prev.map((p) => {
          if (p.id === targetPlanId) {
            return { ...p, isMain: true, title: targetTitle };
          }
          if (p.isMain) {
            return { ...p, isMain: false };
          }
          return p;
        })
      );
      setCurrentTitle(targetTitle);
      setTitleInput(targetTitle);
      setSelectedPlanId(targetPlanId);

      startTransition(() => {
        router.refresh();
      });

      // Brief delay to allow new state and render to settle cleanly
      await new Promise((r) => setTimeout(r, 600));

      showToast(t("planSwappedToMain", { title: targetTitle }));
    } catch (err: any) {
      console.error(err);
      // Rollback on failure
      setLocalPlans(previousPlans);
      setCurrentTitle(previousTitle);
      setTitleInput(previousTitle);
      setSelectedPlanId(previousPlans.find((p) => p.isMain)?.id || targetPlanId);
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

  // Confirm Delete Plan (instant optimistic update)
  async function handleConfirmDeletePlan() {
    if (!planToDelete || !isOwner) return;

    const previousPlans = localPlans;
    const deletedId = planToDelete.id;
    const deletedTitle = planToDelete.title;

    // 1. Instant optimistic update
    setLocalPlans((prev) => prev.filter((p) => p.id !== deletedId));
    setSelectedPlanId(mainPlan.id);
    setDeletePlanModalOpen(false);
    showToast(
      t("substitutePlanDeleted", { title: deletedTitle })
    );

    // 2. Background server sync
    setIsDeletingPlan(true);
    try {
      await deleteSubstitutePlan(deletedId);
      startTransition(() => {
        router.refresh();
      });
    } catch (err: any) {
      console.error(err);
      setLocalPlans(previousPlans);
      showToast(err?.message || "Failed to delete plan", "error");
    } finally {
      setIsDeletingPlan(false);
    }
  }

  // Submit Edit Plan Metadata (instant optimistic update)
  async function handleEditPlanSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingPlanData || !editingPlanData.title.trim()) return;

    const previousPlans = localPlans;
    const previousTitle = currentTitle;
    const planId = editingPlanData.id;
    const updatedTitle = editingPlanData.title.trim();
    const updatedTag = editingPlanData.tag;
    const updatedNotes = editingPlanData.notes.trim() || null;

    // 1. Instant optimistic update
    setLocalPlans((prev) =>
      prev.map((p) =>
        p.id === planId
          ? { ...p, title: updatedTitle, tag: updatedTag, notes: updatedNotes }
          : p
      )
    );
    if (activePlan?.id === planId && activePlan.isMain) {
      setCurrentTitle(updatedTitle);
      setTitleInput(updatedTitle);
    }
    setEditPlanModalOpen(false);
    showToast(t("planUpdatedSuccess"));

    // 2. Background server sync
    setSavingPlanMeta(true);
    try {
      await updateDayPlan(planId, {
        title: updatedTitle,
        tag: updatedTag,
        notes: updatedNotes || undefined,
      });
      startTransition(() => {
        router.refresh();
      });
    } catch (err: any) {
      console.error(err);
      setLocalPlans(previousPlans);
      setCurrentTitle(previousTitle);
      setTitleInput(previousTitle);
      showToast(err?.message || "Failed to update plan", "error");
    } finally {
      setSavingPlanMeta(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Day Header & Live Stats */}
      <div data-aos="fade-down" className="bg-bg-card border border-border rounded-3xl p-4 sm:p-5 shadow-card space-y-3.5 sm:space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-bold uppercase tracking-wider">
                {t("day")} {dayNumber}
              </span>
              <span className="text-xs sm:text-sm text-text-muted">{formattedDate}</span>
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
              <div className="flex items-center gap-2.5 group">
                <h1 className="text-xl sm:text-2xl font-extrabold text-text-primary tracking-tight truncate">
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
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>

          {isOwner ? (
            <div className="flex items-center gap-2 flex-wrap self-start md:self-auto flex-shrink-0">
              <button
                type="button"
                onClick={() => {
                  setInsertAtIndex(null);
                  setBatchModalMode(currentActivities.length > 0 ? "edit" : "create");
                  setBatchModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-accent hover:bg-accent-light text-white text-xs sm:text-sm font-bold shadow-accent flex items-center gap-2 transition-all hover:scale-102 cursor-pointer"
              >
                {currentActivities.length > 0 ? (
                  <>
                    <Edit3 className="w-4 h-4" />
                    <span>{t("manageStops")}</span>
                    <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-xs font-extrabold tracking-wide">
                      {currentActivities.length}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                    </span>
                    <Plus className="w-4 h-4" />
                    <span>{t("addStopActivity")}</span>
                  </>
                )}
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
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none flex-1 min-w-0">
              {localPlans.map((plan) => {
                const isSelected = plan.id === activePlan.id;
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setSelectedPlanId(plan.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${isSelected
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
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-accent hover:text-accent-hover bg-accent/10 hover:bg-accent/15 border border-accent/30 transition-all flex items-center gap-1 whitespace-nowrap cursor-pointer"
                  title={t("addSubstitutePlan")}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t("addSubstitutePlan")}</span>
                </button>
              )}
            </div>

            {/* Right side toolbar: Edit Plan Name & Plan Count */}
            <div className="flex items-center justify-between sm:justify-end gap-2.5 flex-shrink-0 pt-0.5 sm:pt-0">
              {isOwner && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingPlanData({
                      id: activePlan.id,
                      title: activePlan.title,
                      tag: activePlan.tag || (activePlan.isMain ? "main" : "backup"),
                      notes: activePlan.notes || "",
                    });
                    setEditPlanModalOpen(true);
                  }}
                  className="px-2.5 py-1 rounded-lg border border-border/80 hover:border-accent text-text-muted hover:text-accent transition-colors cursor-pointer text-xs flex items-center gap-1 bg-bg-surface/60"
                  title={t("editPlanName")}
                >
                  <Edit2 className="w-3 h-3" />
                  <span className="text-[11px] font-medium">{t("editPlanName")}</span>
                </button>
              )}
              <span className="text-[11px] text-text-faint whitespace-nowrap">
                {substituteCount} / 3 {t(substituteCount === 1 ? "substitutePlan" : "substitutePlans")}
              </span>
            </div>
          </div>

          {/* Active Plan Status Banner (Only for Substitute Plans) */}
          {!activePlan.isMain && (
            <div className="mt-2.5 bg-sky-500/10 border border-sky-500/30 rounded-xl p-2.5 sm:p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs animate-in fade-in duration-200">
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 font-bold text-[10px] border border-sky-500/30">
                    {t("substitutePlan")}
                  </span>
                  <span className="font-bold text-text-primary text-xs truncate">
                    {activePlan.title}
                  </span>
                </div>
                {activePlan.notes && (
                  <p className="text-text-muted text-[11px] truncate">
                    {activePlan.notes}
                  </p>
                )}
              </div>

              {isOwner && (
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => handleOpenSwapModal(activePlan)}
                    disabled={isSwapping}
                    className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-accent to-amber-600 hover:from-accent-hover hover:to-amber-500 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <ArrowRightLeft className="w-3 h-3" />
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
                    className="p-1.5 rounded-lg border border-border hover:border-accent text-text-muted hover:text-accent transition-colors cursor-pointer"
                    title={t("editPlan")}
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenDeletePlanModal(activePlan)}
                    disabled={isDeletingPlan}
                    className="p-1.5 rounded-lg border border-border hover:border-red-500/50 hover:bg-red-500/10 text-text-muted hover:text-red-400 transition-colors cursor-pointer disabled:opacity-50"
                    title={t("deletePlan")}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Live Cost Stats Banner */}
        <div className="pt-3 border-t border-border">
          <div className="bg-[#FAF3EA] dark:bg-bg-surface/50 border border-sand/30 dark:border-border rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
            {/* Left: Total Day Cost */}
            <div className="flex items-center gap-4 sm:gap-5 flex-1 min-w-0">
              {/* Coins Circular Badge */}
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#FCE8D3] dark:bg-sand/15 ring-8 ring-[#FCE8D3]/50 dark:ring-sand/10 flex items-center justify-center flex-shrink-0">
                <Coins className="w-7 h-7 sm:w-8 sm:h-8 text-orange-500 dark:text-sand" />
              </div>

              {/* Cost Info */}
              <div className="min-w-0 flex-1">
                <div className="text-xs sm:text-sm font-medium text-text-muted truncate">
                  {t("totalDayCost")}
                </div>
                <div className="text-2xl sm:text-3xl font-black font-mono text-text-primary mt-0.5 tracking-tight">
                  {formatJPY(totalCost)}
                </div>
                <div className="text-xs text-text-muted font-mono mt-0.5">
                  ≈ {formatTHB(totalCost * exchangeRate)}
                </div>
              </div>
            </div>

            {/* Right Column: Two rows (IC Card Spent & Cash/Credit Card) in same column */}
            <div className="flex flex-col gap-2.5 w-full md:w-auto md:min-w-[300px] lg:min-w-[340px] flex-shrink-0">
              {/* Row 1: IC Card Spent */}
              <div className="bg-white/90 dark:bg-bg-card border border-border/70 rounded-2xl px-3.5 py-2.5 shadow-2xs space-y-1.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold text-text-secondary truncate">
                        {t("icCardSpent")}
                      </div>
                      <div className="text-[10px] text-text-muted font-mono">
                        ≈ {formatTHB(icCost * exchangeRate)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      {icPercent}%
                    </span>
                    <span className="text-sm sm:text-base font-bold font-mono text-text-primary">
                      {formatJPY(icCost)}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="h-1.5 rounded-full bg-border/40 dark:bg-bg-surface overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, icPercent))}%` }}
                  />
                </div>
              </div>

              {/* Row 2: Cash & Credit Card */}
              <div className="bg-white/90 dark:bg-bg-card border border-border/70 rounded-2xl px-3.5 py-2.5 shadow-2xs space-y-1.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center flex-shrink-0">
                      <Wallet className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold text-text-secondary truncate">
                        {t("cashAndCreditCard")}
                      </div>
                      <div className="text-[10px] text-text-muted font-mono">
                        ≈ {formatTHB(nonIcCost * exchangeRate)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded-md bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                      {nonIcPercent}%
                    </span>
                    <span className="text-sm sm:text-base font-bold font-mono text-text-primary">
                      {formatJPY(nonIcCost)}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="h-1.5 rounded-full bg-border/40 dark:bg-bg-surface overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-orange-400 to-orange-500 transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, nonIcPercent))}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline Activities List */}
      <div className="space-y-4">
        {currentActivities.length === 0 ? (
          <div
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
                    setInsertAtIndex(null);
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
          <>
            {isOwner && currentActivities.length > 0 && (
              <div className="pl-11 sm:pl-14 pb-1">
                <button
                  type="button"
                  onClick={() => {
                    setInsertAtIndex(0);
                    setBatchModalMode("edit");
                    setBatchModalOpen(true);
                  }}
                  className="w-full py-3 rounded-2xl border border-dashed border-accent/40 bg-accent/5 hover:bg-accent/10 text-accent text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer hover:border-accent shadow-2xs"
                  title={t("insertStopBeforeFirst")}
                >
                  <Plus className="w-4 h-4" />
                  <span>{t("insertStopBeforeFirst")}</span>
                </button>
              </div>
            )}

            <div className="relative">
              {/* Continuous vertical dashed line down the entire timeline */}
              <div className="absolute left-[21px] sm:left-[27px] top-6 bottom-6 w-0 border-l-2 border-dashed border-border/80 pointer-events-none z-0" />

              {currentActivities.map((activity, idx) => {
                const linkMatch = activity.remark ? activity.remark.match(/https?:\/\/[^\s]+/) : null;
                const linkUrl = linkMatch ? linkMatch[0] : null;

                return (
                  <div key={activity.id} className="relative">
                    {/* Stop Row with Left Timeline Track & Right Card */}
                    <div className="flex items-start gap-3 sm:gap-4 relative">
                      {/* Timeline Track (Left Column) */}
                      <div className="flex flex-col items-center flex-shrink-0 w-11 sm:w-14 pt-3.5 relative select-none">
                        {/* Number Badge */}
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-accent text-white font-black text-xs sm:text-sm flex items-center justify-center shadow-md relative z-10 ring-4 ring-bg-base">
                          {idx + 1}
                        </div>

                        {/* Scheduled Time under Circle */}
                        <span className="text-[11px] sm:text-xs font-mono font-bold text-text-secondary mt-1.5 tracking-tight text-center relative z-10 bg-bg-base px-1 rounded">
                          {activity.time}
                        </span>
                      </div>

                      {/* Activity Card (Right Column) */}
                      <div className="flex-1 min-w-0 bg-bg-card border border-border rounded-2xl p-4 sm:p-5 hover:border-accent/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-card group relative">
                        {/* Activity Details */}
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
                    </div>

                    {/* In-between Insert Divider Button */}
                    {isOwner && idx < currentActivities.length - 1 && (
                      <div className="relative flex items-center justify-center my-3 group/insert pl-11 sm:pl-14 z-10">
                        <div className="absolute inset-0 flex items-center pl-11 sm:pl-14">
                          <div className="w-full border-t border-dashed border-border/80 group-hover/insert:border-accent/60 transition-colors" />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setInsertAtIndex(idx + 1);
                            setBatchModalMode("edit");
                            setBatchModalOpen(true);
                          }}
                          className="relative z-10 px-3.5 py-1.5 rounded-full bg-bg-card hover:bg-accent text-text-muted hover:text-white border border-border/80 hover:border-accent text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs group-hover/insert:scale-105 cursor-pointer opacity-80 group-hover/insert:opacity-100"
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

            {/* Add Another Stop Button at Bottom */}
            {isOwner && currentActivities.length > 0 && (
              <div className="pl-11 sm:pl-14 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setInsertAtIndex(currentActivities.length);
                    setBatchModalMode("edit");
                    setBatchModalOpen(true);
                  }}
                  className="w-full py-3 rounded-2xl border border-dashed border-accent/40 bg-accent/5 hover:bg-accent/10 text-accent text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer hover:border-accent shadow-2xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>{t("addAnotherStop")}</span>
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Batch Activity Modal (targets currently active plan) */}
      <BatchActivityModal
        isOpen={batchModalOpen}
        onClose={() => {
          setBatchModalOpen(false);
          setInsertAtIndex(null);
        }}
        dayId={dayId}
        dayNumber={dayNumber}
        dayTitle={
          activePlan.isMain || activePlan.title === currentTitle
            ? currentTitle
            : `${currentTitle} - ${activePlan.title}`
        }
        exchangeRate={exchangeRate}
        availablePasses={availablePasses}
        previousLocations={previousLocations}
        existingActivities={currentActivities}
        previousDayLastLocation={previousDayLastLocation}
        planId={activePlan.id}
        initialMode={batchModalMode}
        initialInsertIndex={insertAtIndex}
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
          LOADING OVERLAY: DISPLAYED WHILE SWAPPING MAIN PLAN
      ───────────────────────────────────────────────────────────── */}
      {isSwapping && mounted && createPortal(
        <div className="fixed inset-0 z-[999999] bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-bg-card border border-border rounded-3xl p-8 max-w-sm w-full shadow-2xl flex flex-col items-center text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <div className="absolute inset-0 rounded-2xl bg-accent/20 animate-ping opacity-75" />
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-accent to-amber-500 text-white flex items-center justify-center shadow-lg shadow-accent/30 relative z-10">
                <ArrowRightLeft className="w-8 h-8 animate-pulse" />
              </div>
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-text-primary">
                {t("swappingPlanLoadingTitle")}
              </h3>
              <p className="text-xs text-text-muted leading-relaxed">
                {t("swappingPlanLoadingSubtitle")}
              </p>
            </div>

            <div className="pt-2 flex items-center gap-2 text-xs font-bold text-accent">
              <Loader2 className="w-4 h-4 animate-spin text-accent" />
              <span>{t("pleaseWaitMoment")}</span>
            </div>
          </div>
        </div>,
        document.body
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
                    {t("newMainPlanLabel")}
                  </span>
                  <span className="font-bold text-accent flex items-center gap-1">
                    <span>{getPlanIcon(planToSwap.tag, false)}</span>
                    <span>{planToSwap.title}</span>
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border/60">
                  <span className="text-text-muted font-medium">
                    {t("dayTitleWillBecome")}
                  </span>
                  <span className="font-bold text-text-primary">
                    "{planToSwap.title}"
                  </span>
                </div>
              </div>

              <p className="text-text-muted text-[11px] leading-relaxed">
                {t("swapPlanDesc")}
              </p>
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
                disabled={isSwapping}
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
