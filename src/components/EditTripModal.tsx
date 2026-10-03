"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { updateTrip, deleteTrip } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { X, Calendar, MapPin, AlignLeft, JapaneseYen, Edit3, Trash2, AlertTriangle, Loader2, AlertCircle } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import DateRangePicker from "@/components/DateRangePicker";

interface EditTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: {
    id: string;
    title: string;
    description: string | null;
    startDate: string;
    endDate: string;
    exchangeRate: number;
    currency?: string;
    baseCurrency?: string;
  };
}

export default function EditTripModal({ isOpen, onClose, trip }: EditTripModalProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [title, setTitle] = useState(trip.title);
  const [description, setDescription] = useState(trip.description || "");
  const [startDate, setStartDate] = useState(trip.startDate.split("T")[0]);
  const [endDate, setEndDate] = useState(trip.endDate.split("T")[0]);
  const [exchangeRate, setExchangeRate] = useState(trip.exchangeRate.toString());
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showReduceWarning, setShowReduceWarning] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Original duration
  const origStart = trip.startDate.split("T")[0];
  const origEnd = trip.endDate.split("T")[0];
  const origDaysCount = Math.max(
    1,
    Math.round((new Date(origEnd + "T00:00:00").getTime() - new Date(origStart + "T00:00:00").getTime()) / (1000 * 60 * 60 * 24)) + 1
  );

  // New selected duration
  const newDaysCount =
    startDate && endDate && endDate >= startDate
      ? Math.round((new Date(endDate + "T00:00:00").getTime() - new Date(startDate + "T00:00:00").getTime()) / (1000 * 60 * 60 * 24)) + 1
      : 0;

  useEffect(() => {
    if (isOpen) {
      setTitle(trip.title);
      setDescription(trip.description || "");
      setStartDate(trip.startDate.split("T")[0]);
      setEndDate(trip.endDate.split("T")[0]);
      setExchangeRate(trip.exchangeRate.toString());
      setShowDeleteConfirm(false);
      setShowReduceWarning(false);
      setDeleting(false);
    }
  }, [isOpen, trip]);

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

  if (!isOpen || !mounted) return null;

  async function performSave() {
    setLoading(true);
    try {
      await updateTrip(trip.id, {
        title,
        description,
        startDate,
        endDate,
        exchangeRate: parseFloat(exchangeRate) || 0.24,
      });
      onClose();
      router.refresh();
    } catch (err) {
      console.error(err);
      alert("Failed to update trip details.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !startDate || !endDate) return;

    if (new Date(endDate + "T00:00:00") < new Date(startDate + "T00:00:00")) {
      alert(t("dateRangeError"));
      return;
    }

    // Check if trip duration was reduced
    if (newDaysCount < origDaysCount) {
      setShowReduceWarning(true);
      return;
    }

    await performSave();
  }

  async function handleDeleteTrip() {
    setDeleting(true);
    try {
      await deleteTrip(trip.id);
      onClose();
      router.push("/trips");
    } catch (err) {
      console.error(err);
      alert("Failed to delete trip.");
      setDeleting(false);
    }
  }

  const inputClass =
    "w-full px-3.5 py-2.5 bg-bg-base border border-border rounded-xl text-text-primary text-sm placeholder-text-faint focus:outline-none focus:border-accent transition-colors";
  const labelClass = "block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 flex items-center gap-1.5";

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-md overflow-y-auto">
      <div className="bg-bg-card border border-border rounded-3xl w-full max-w-xl shadow-2xl my-auto animate-in fade-in zoom-in-95 duration-150 relative">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-accent" /> {t("editTrip")}
          </h3>
          <button
            onClick={onClose}
            type="button"
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-surface transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Delete Confirmation Screen */}
        {showDeleteConfirm ? (
          <div className="p-6 space-y-4">
            <div className="p-4 rounded-2xl bg-red-950/30 border border-red-500/30 text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-text-primary mb-1">{t("deleteTripConfirmTitle")}</h4>
                <p className="text-xs text-text-muted leading-relaxed">
                  {t("deleteTripConfirmText")}
                </p>
                <p className="text-xs font-semibold text-text-primary mt-2">
                  &quot;{trip.title}&quot;
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-text-muted hover:text-text-primary hover:bg-bg-surface transition-colors cursor-pointer"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                onClick={handleDeleteTrip}
                disabled={deleting}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{t("deleting")}</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t("deleteTrip")}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : showReduceWarning ? (
          /* Reduce Days Warning Screen */
          <div className="p-6 space-y-4 animate-in fade-in">
            <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/30 text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-text-primary">{t("reduceTripWarningTitle")}</h4>
                <p className="text-xs text-text-muted leading-relaxed">
                  {t("reduceTripWarningText", {
                    orig: origDaysCount,
                    newDays: newDaysCount,
                    diff: origDaysCount - newDaysCount,
                    startDel: newDaysCount + 1,
                    endDel: origDaysCount > newDaysCount + 1 ? ` - Day ${origDaysCount}` : "",
                  })}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowReduceWarning(false)}
                disabled={loading}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-text-muted hover:text-text-primary hover:bg-bg-surface transition-colors cursor-pointer"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                onClick={performSave}
                disabled={loading}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{t("creating")}</span>
                  </>
                ) : (
                  t("confirmReduceDays")
                )}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            {/* Title */}
            <div>
              <label className={labelClass}>
                <MapPin className="w-3.5 h-3.5 text-accent" /> {t("tripTitleRequired")}
              </label>
              <input
                required
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={inputClass}
              />
            </div>

            {/* Description */}
            <div>
              <label className={labelClass}>
                <AlignLeft className="w-3.5 h-3.5 text-text-faint" /> {t("description")}
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Summary of regions, seasons, or goals..."
                className={inputClass + " resize-none"}
              />
            </div>

            {/* Google Flights Style Interactive Date Range Picker */}
            <div>
              <DateRangePicker
                label={t("dateRangeSelected")}
                startDate={startDate}
                endDate={endDate}
                onChange={(start, end) => {
                  setStartDate(start);
                  setEndDate(end);
                }}
              />
            </div>

            {/* Fixed Currency & Exchange rate */}
            <div className="p-4 bg-bg-surface border border-border rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <label className={labelClass}>
                  <JapaneseYen className="w-3.5 h-3.5 text-sand" /> {t("exchangeRate")} (1 JPY ➔ THB)
                </label>
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-text-muted bg-bg-base px-2 py-0.5 rounded-md border border-border/60">
                  <span>🇯🇵 JPY</span>
                  <span>⇄</span>
                  <span>🇹🇭 THB</span>
                </div>
              </div>

              <input
                type="number"
                step="0.001"
                value={exchangeRate}
                onChange={(e) => setExchangeRate(e.target.value)}
                placeholder="0.24"
                className={inputClass}
              />
              <p className="text-[11px] text-text-muted font-mono">
                10,000 JPY ≈ {Math.round(10000 * (parseFloat(exchangeRate) || 0.24)).toLocaleString()} THB
              </p>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-border flex items-center justify-between">
              {/* Delete Button */}
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-red-500/30 text-red-400 hover:text-red-300 hover:bg-red-950/30 text-xs font-bold transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t("deleteTrip")}</span>
              </button>

              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-text-muted hover:text-text-primary hover:bg-bg-surface transition-colors cursor-pointer"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={loading || !startDate || !endDate}
                  className="px-6 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold shadow-accent transition-all hover:scale-105 disabled:opacity-60 cursor-pointer"
                >
                  {loading ? t("creating") : t("saveChanges")}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}
