"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatJPY, formatTHB } from "@/lib/utils";
import { deleteActivity, updateTripDay } from "@/lib/actions";
import ActivityFormModal from "./ActivityFormModal";
import BatchActivityModal from "./BatchActivityModal";
import {
  Clock, MapPin, CreditCard, Train, ExternalLink,
  Plus, Edit2, Trash2, Banknote, DollarSign, AlertCircle, Check, X, Loader2, Globe
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

interface Activity {
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

interface DayTimelineProps {
  tripId: string;
  isOwner?: boolean;
  dayId: string;
  dayNumber: number;
  dayTitle: string;
  date: Date;
  dayOfWeek: string;
  activities: Activity[];
  availablePasses?: string[];
  exchangeRate?: number;
  previousLocations?: { name: string; count?: number }[] | string[];
}

export default function DayTimeline({
  tripId,
  isOwner = false,
  dayId,
  dayNumber,
  dayTitle,
  date,
  dayOfWeek,
  activities,
  availablePasses = [],
  exchangeRate = 0.24,
  previousLocations = [],
}: DayTimelineProps) {
  const router = useRouter();
  const { t, language } = useLanguage();
  const [modalOpen, setModalOpen] = useState(false);
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Day Title Editing State
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [currentTitle, setCurrentTitle] = useState(dayTitle);
  const [titleInput, setTitleInput] = useState(dayTitle);
  const [savingTitle, setSavingTitle] = useState(false);

  const totalCost = activities.reduce((sum, a) => sum + (a.cost || 0), 0);
  const icCost = activities.filter((a) => a.isIcCard).reduce((sum, a) => sum + (a.cost || 0), 0);
  const nonIcCost = totalCost - icCost;

  const dateLocale = language === "th" ? "th-TH" : "en-GB";
  const formattedDate = new Date(date).toLocaleDateString(dateLocale, {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  async function handleDelete(id: string) {
    if (!isOwner) return;
    if (!confirm(t("deleteConfirm"))) return;
    setDeletingId(id);
    try {
      await deleteActivity(id);
      router.refresh();
    } catch (e) {
      console.error(e);
      alert("Failed to delete");
    } finally {
      setDeletingId(null);
    }
  }

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

    // Instant optimistic update (0ms UI latency)
    setCurrentTitle(newTitle);
    setIsEditingTitle(false);

    // Background server update
    updateTripDay(dayId, tripId, {
      title: newTitle,
      dayNumber,
    })
      .then((updated) => {
        if (updated?.slug) {
          window.history.replaceState(null, "", `/trips/${tripId}/days/${updated.slug}`);
        }
      })
      .catch((err) => {
        console.error(err);
        setCurrentTitle(previousTitle);
        setTitleInput(previousTitle);
        alert("Failed to update day title.");
      });
  }

  function handleCancelDayTitle() {
    setTitleInput(currentTitle);
    setIsEditingTitle(false);
  }

  return (
    <div className="space-y-6">
      {/* Day Header & Live Stats */}
      <div data-aos="fade-down" className="bg-bg-card border border-border rounded-3xl p-6 shadow-card">
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
            <button
              onClick={() => setBatchModalOpen(true)}
              className="self-start md:self-auto px-4 py-2.5 rounded-xl bg-accent hover:bg-accent-light text-white text-sm font-bold shadow-accent flex items-center gap-2 transition-all hover:scale-105 cursor-pointer flex-shrink-0"
            >
              <Plus className="w-4 h-4" /> {t("addStopActivity")}
            </button>
          ) : (
            <span className="self-start md:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-bg-surface border border-border text-xs font-semibold text-text-muted">
              <Globe className="w-3.5 h-3.5 text-emerald-400" />
              <span>{language === "th" ? "โหมดอ่านอย่างเดียว" : "View Only"}</span>
            </span>
          )}
        </div>

        {/* Live Cost Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-5 border-t border-border">
          {[
            { label: t("totalDayCost"), value: formatJPY(totalCost), sub: `≈ ${formatTHB(totalCost * exchangeRate)}`, color: "text-text-primary", bg: "bg-bg-surface", icon: DollarSign, iconColor: "text-sand" },
            { label: t("icCardSpent"), value: formatJPY(icCost), sub: `≈ ${formatTHB(icCost * exchangeRate)}`, color: "text-sage", bg: "bg-bg-surface", icon: CreditCard, iconColor: "text-sage", pct: totalCost > 0 ? Math.round((icCost / totalCost) * 100) : 0, badge: "text-sage bg-sage-subtle border border-sage-muted" },
            { label: t("cashAndCreditCard"), value: formatJPY(nonIcCost), sub: `≈ ${formatTHB(nonIcCost * exchangeRate)}`, color: "text-sand", bg: "bg-bg-surface", icon: Banknote, iconColor: "text-sand", pct: totalCost > 0 ? Math.round((nonIcCost / totalCost) * 100) : 0, badge: "text-sand bg-sand-subtle border border-sand-muted" },
          ].map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} data-aos="fade-up" data-aos-delay={idx * 80} className={`${stat.bg} border border-border rounded-xl p-3.5 flex items-center justify-between`}>
                <div>
                  <div className="text-xs text-text-muted">{stat.label}</div>
                  <div className={`text-base font-bold font-mono ${stat.color} mt-0.5`}>{stat.value}</div>
                  <div className="text-[10px] text-text-muted font-mono">{stat.sub}</div>
                </div>
                <div className="flex flex-col items-end space-y-1">
                  <div className="p-2 rounded-lg bg-bg-card border border-border">
                    <Icon className={`w-4 h-4 ${stat.iconColor}`} />
                  </div>
                  {stat.badge && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${stat.badge}`}>
                      {stat.pct}%
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Timeline Activities List */}
      <div className="space-y-4">
        {activities.length === 0 ? (
          <div data-aos="fade-up" className="bg-bg-card border border-border border-dashed rounded-3xl p-10 text-center text-text-muted shadow-card space-y-4">
            <AlertCircle className="w-8 h-8 text-text-faint mx-auto" />
            <div>
              <p className="font-semibold text-text-secondary">{t("noActivitiesTitle")}</p>
              <p className="text-xs text-text-muted mt-1">{t("noActivitiesSubtitle")}</p>
            </div>
            {isOwner && (
              <div className="flex items-center justify-center pt-2">
                <button
                  type="button"
                  onClick={() => setBatchModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-accent text-white text-xs font-bold hover:bg-accent-light transition-all flex items-center gap-1.5 cursor-pointer shadow-accent"
                >
                  <Plus className="w-3.5 h-3.5" /> {t("addStopActivity")}
                </button>
              </div>
            )}
          </div>
        ) : (
          activities.map((activity, idx) => {
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
                      <span className="font-bold text-text-primary text-sm sm:text-base">{activity.location}</span>
                      {activity.usingPass && (
                        <span className="px-2 py-0.5 rounded-full bg-olive-subtle border border-olive-muted text-olive text-[11px] font-medium flex items-center gap-1">
                          <Train className="w-3 h-3" /> {activity.usingPass}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-text-secondary leading-relaxed">{activity.activity}</p>
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

                  {isOwner && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { setEditingActivity(activity); setModalOpen(true); }}
                        className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-bg-surface transition-colors cursor-pointer"
                        title={t("editStopActivity")}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(activity.id)}
                        disabled={deletingId === activity.id}
                        className="p-2 rounded-xl text-text-muted hover:text-red-400 hover:bg-red-950/30 transition-colors cursor-pointer"
                        title={t("deleteTrip")}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Activity Add/Edit Modal */}
      <ActivityFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        dayId={dayId}
        exchangeRate={exchangeRate}
        activity={editingActivity}
        availablePasses={availablePasses}
        previousLocations={previousLocations}
      />

      {/* Batch Activity Modal */}
      <BatchActivityModal
        isOpen={batchModalOpen}
        onClose={() => setBatchModalOpen(false)}
        dayId={dayId}
        dayNumber={dayNumber}
        dayTitle={currentTitle}
        exchangeRate={exchangeRate}
        availablePasses={availablePasses}
        previousLocations={previousLocations}
      />
    </div>
  );
}
