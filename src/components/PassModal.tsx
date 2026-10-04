"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { createPass, updatePass } from "@/lib/actions";
import { X, Train, Ticket, Calendar, FileText, ArrowRightLeft, Loader2 } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { formatJPY, formatTHB } from "@/lib/utils";

interface PassBooking {
  id: string;
  name: string;
  costJpy: number | null;
  costThb: number | null;
  validDays: number | null;
  notes: string | null;
}

interface PassModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
  exchangeRate?: number;
  pass?: PassBooking | null;
}

export default function PassModal({
  isOpen,
  onClose,
  tripId,
  exchangeRate = 0.24,
  pass,
}: PassModalProps) {
  const router = useRouter();
  const { t, language } = useLanguage();
  const isEditing = !!pass;

  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState("");
  const [inputCurrency, setInputCurrency] = useState<"JPY" | "THB">("JPY");
  const [amountValue, setAmountValue] = useState("");
  const [validDays, setValidDays] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

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
    if (pass && isOpen) {
      setName(pass.name || "");
      if (pass.costJpy) {
        setInputCurrency("JPY");
        setAmountValue(pass.costJpy.toString());
      } else if (pass.costThb) {
        setInputCurrency("THB");
        setAmountValue(pass.costThb.toString());
      } else {
        setAmountValue("");
      }
      setValidDays(pass.validDays !== null && pass.validDays !== undefined ? pass.validDays.toString() : "");
      setNotes(pass.notes || "");
    } else if (!pass && isOpen) {
      setName("");
      setInputCurrency("JPY");
      setAmountValue("");
      setValidDays("");
      setNotes("");
    }
  }, [pass, isOpen]);

  if (!isOpen || !mounted) return null;

  const numVal = parseFloat(amountValue) || 0;
  const jpyVal = inputCurrency === "JPY" ? numVal : exchangeRate > 0 ? Math.round(numVal / exchangeRate) : 0;
  const thbVal = inputCurrency === "THB" ? numVal : Math.round(numVal * exchangeRate);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);

    try {
      if (isEditing && pass) {
        await updatePass(pass.id, {
          name: name.trim(),
          costJpy: jpyVal || 0,
          costThb: thbVal || 0,
          validDays: parseInt(validDays) || undefined,
          notes: notes.trim() || undefined,
        });
      } else {
        await createPass(tripId, {
          name: name.trim(),
          costJpy: jpyVal || 0,
          costThb: thbVal || 0,
          validDays: parseInt(validDays) || undefined,
          notes: notes.trim() || undefined,
        });
      }
      onClose();
      router.refresh();
    } catch (err) {
      console.error(err);
      alert("Failed to save transit pass.");
    } finally {
      setLoading(false);
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
            <Ticket className="w-4 h-4 text-olive" />
            <span>{isEditing ? t("editPass") : t("addPass")}</span>
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
          <div>
            <label className={labelClass}>
              <Ticket className="w-3.5 h-3.5 text-olive" /> {t("passName")} *
            </label>
            <input
              required
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("passNamePlaceholder")}
              className={inputClass}
            />
          </div>

          {/* Price & Currency in the same row */}
          <div className="p-3.5 bg-bg-surface border border-border rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                <Ticket className="w-3.5 h-3.5 text-olive" />
                <span>{t("passCostJpy")} / {t("currency")}</span>
              </label>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="number"
                  value={amountValue}
                  onChange={(e) => setAmountValue(e.target.value)}
                  placeholder={inputCurrency === "JPY" ? "¥ 15,000" : "฿ 3,500"}
                  className={`${inputClass} font-mono text-base font-bold`}
                />
              </div>

              <select
                value={inputCurrency}
                onChange={(e) => {
                  const newCurr = e.target.value as "JPY" | "THB";
                  if (newCurr !== inputCurrency && numVal > 0) {
                    if (newCurr === "THB") {
                      setAmountValue(Math.round(numVal * exchangeRate).toString());
                    } else {
                      setAmountValue(exchangeRate > 0 ? Math.round(numVal / exchangeRate).toString() : numVal.toString());
                    }
                  }
                  setInputCurrency(newCurr);
                }}
                className="w-32 sm:w-36 px-3 py-2.5 bg-bg-base border border-border rounded-xl text-xs sm:text-sm font-bold text-accent focus:outline-none focus:border-accent cursor-pointer shrink-0"
              >
                <option value="JPY">JPY (¥ เยน)</option>
                <option value="THB">THB (฿ บาท)</option>
              </select>
            </div>

            {numVal > 0 && (
              <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs">
                <span className="text-text-muted flex items-center gap-1">
                  <ArrowRightLeft className="w-3 h-3 text-accent" />
                  <span>{t("equivalentTo")}:</span>
                </span>
                <div className="font-mono font-bold text-right">
                  <span className="text-accent">{formatJPY(jpyVal)}</span>
                  <span className="text-text-faint mx-1.5">≈</span>
                  <span className="text-text-primary">{formatTHB(thbVal)}</span>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Validity Days */}
            <div>
              <label className={labelClass}>
                <Calendar className="w-3.5 h-3.5 text-accent" /> {t("validDays")}
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={validDays}
                onChange={(e) => setValidDays(e.target.value)}
                placeholder="e.g. 7"
                className={inputClass}
              />
            </div>

            {/* Booking Ref / Notes */}
            <div>
              <label className={labelClass}>
                <FileText className="w-3.5 h-3.5 text-text-faint" /> {t("bookingRef")}
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Klook voucher #12345"
                className={inputClass}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-border flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-text-muted hover:text-text-primary hover:bg-bg-surface transition-colors cursor-pointer disabled:opacity-50"
            >
              {t("cancel")}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-accent hover:bg-accent-light text-white text-xs font-bold shadow-accent transition-all hover:scale-105 disabled:opacity-60 cursor-pointer flex items-center gap-1.5"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{loading ? t("savingEllipsis") : isEditing ? t("saveChanges") : t("addPass")}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
