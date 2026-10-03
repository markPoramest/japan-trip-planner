"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { createFlight, updateFlight } from "@/lib/actions";
import { X, Plane, FileText, Navigation, ArrowRightLeft, Loader2 } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { formatJPY, formatTHB } from "@/lib/utils";

interface FlightBooking {
  id: string;
  flightNo: string;
  route: string;
  costThb: number | null;
  notes: string | null;
}

interface FlightModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
  exchangeRate?: number;
  flight?: FlightBooking | null;
}

export default function FlightModal({
  isOpen,
  onClose,
  tripId,
  exchangeRate = 0.24,
  flight,
}: FlightModalProps) {
  const router = useRouter();
  const { t, language } = useLanguage();
  const isEditing = !!flight;

  const [mounted, setMounted] = useState(false);
  const [flightNo, setFlightNo] = useState("");
  const [route, setRoute] = useState("");
  const [inputCurrency, setInputCurrency] = useState<"THB" | "JPY">("THB");
  const [amountValue, setAmountValue] = useState("");
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
    if (flight && isOpen) {
      setFlightNo(flight.flightNo || "");
      setRoute(flight.route || "");
      if (flight.costThb) {
        setInputCurrency("THB");
        setAmountValue(flight.costThb.toString());
      } else {
        setAmountValue("");
      }
      setNotes(flight.notes || "");
    } else if (!flight && isOpen) {
      setFlightNo("");
      setRoute("");
      setInputCurrency("THB");
      setAmountValue("");
      setNotes("");
    }
  }, [flight, isOpen]);

  if (!isOpen || !mounted) return null;

  const numVal = parseFloat(amountValue) || 0;
  const thbVal = inputCurrency === "THB" ? numVal : Math.round(numVal * exchangeRate);
  const jpyVal = inputCurrency === "JPY" ? numVal : exchangeRate > 0 ? Math.round(numVal / exchangeRate) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!flightNo.trim() || !route.trim()) return;
    setLoading(true);

    try {
      if (isEditing && flight) {
        await updateFlight(flight.id, {
          flightNo: flightNo.trim(),
          route: route.trim(),
          costThb: thbVal || 0,
          notes: notes.trim() || undefined,
        });
      } else {
        await createFlight(tripId, {
          flightNo: flightNo.trim(),
          route: route.trim(),
          costThb: thbVal || 0,
          notes: notes.trim() || undefined,
        });
      }
      router.refresh();
      onClose();
    } catch (err) {
      console.error(err);
      alert("Failed to save flight booking.");
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
            <Plane className="w-4 h-4 text-sage" />
            <span>{isEditing ? t("editFlight") : t("addFlight")}</span>
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
              <Plane className="w-3.5 h-3.5 text-sage" /> {t("flightNumber")} *
            </label>
            <input
              required
              type="text"
              value={flightNo}
              onChange={(e) => setFlightNo(e.target.value)}
              placeholder="e.g. TG676, JL708, XJ600"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>
              <Navigation className="w-3.5 h-3.5 text-accent" /> {t("flightRoute")} *
            </label>
            <input
              required
              type="text"
              value={route}
              onChange={(e) => setRoute(e.target.value)}
              placeholder="e.g. BKK ➔ NRT (Round-trip)"
              className={inputClass}
            />
          </div>

          {/* Currency selection & Amount */}
          <div className="p-3.5 bg-bg-surface border border-border rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                {t("currencyAndAirfare")}
              </label>
              <select
                value={inputCurrency}
                onChange={(e) => setInputCurrency(e.target.value as "THB" | "JPY")}
                className="px-2.5 py-1 bg-bg-base border border-border rounded-lg text-xs font-bold text-accent focus:outline-none focus:border-accent cursor-pointer"
              >
                <option value="THB">THB (฿ บาท)</option>
                <option value="JPY">JPY (¥ เยน)</option>
              </select>
            </div>

            <div className="relative">
              <input
                type="number"
                value={amountValue}
                onChange={(e) => setAmountValue(e.target.value)}
                placeholder={inputCurrency === "THB" ? "฿ 18,500" : "¥ 78,000"}
                className={`${inputClass} font-mono text-base font-bold`}
              />
            </div>

            {/* Live Dual Currency Conversion Display */}
            {numVal > 0 && (
              <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs">
                <span className="text-text-muted flex items-center gap-1">
                  <ArrowRightLeft className="w-3 h-3 text-accent" />
                  <span>{t("equivalentTo")}:</span>
                </span>
                <div className="font-mono font-bold text-right">
                  <span className="text-accent">{formatTHB(thbVal)}</span>
                  <span className="text-text-faint mx-1.5">≈</span>
                  <span className="text-text-primary">{formatJPY(jpyVal)}</span>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className={labelClass}>
              <FileText className="w-3.5 h-3.5 text-text-faint" /> {t("bookingRef")}
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Airline PNR / Booking Ref #ABCDEF"
              className={inputClass}
            />
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
              <span>{loading ? t("savingEllipsis") : isEditing ? t("saveChanges") : t("addFlight")}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
