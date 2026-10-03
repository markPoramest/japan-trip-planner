"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { createHotel, updateHotel } from "@/lib/actions";
import { X, Hotel, Calendar, FileText, ArrowRightLeft, Loader2 } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { formatJPY, formatTHB } from "@/lib/utils";
import DateRangePicker from "@/components/DateRangePicker";
import { parseHotelDates, formatHotelStay } from "@/lib/hotelDates";

interface HotelBooking {
  id: string;
  name: string;
  dateRange: string;
  checkIn?: string | Date | null;
  checkOut?: string | Date | null;
  costThb: number | null;
  costJpy: number | null;
  bookingRef: string | null;
  notes: string | null;
}

interface HotelModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
  exchangeRate: number;
  hotel?: HotelBooking | null;
  tripStartDate?: string;
  tripEndDate?: string;
}

export default function HotelModal({
  isOpen,
  onClose,
  tripId,
  exchangeRate,
  hotel,
  tripStartDate,
  tripEndDate,
}: HotelModalProps) {
  const router = useRouter();
  const { t, language } = useLanguage();
  const isEditing = !!hotel;

  const minDate = tripStartDate ? tripStartDate.split("T")[0] : undefined;
  const maxDate = tripEndDate ? tripEndDate.split("T")[0] : undefined;

  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dateRange, setDateRange] = useState("");
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
    if (hotel && isOpen) {
      setName(hotel.name || "");
      setDateRange(hotel.dateRange || "");

      const tripYear = minDate ? parseInt(minDate.split("-")[0], 10) : new Date().getFullYear();
      const parsed = parseHotelDates(hotel, tripYear);
      if (parsed) {
        setStartDate(parsed.startDate);
        setEndDate(parsed.endDate);
      } else {
        setStartDate(minDate || "");
        setEndDate(maxDate || "");
      }

      if (hotel.costThb) {
        setInputCurrency("THB");
        setAmountValue(hotel.costThb.toString());
      } else if (hotel.costJpy) {
        setInputCurrency("JPY");
        setAmountValue(hotel.costJpy.toString());
      } else {
        setAmountValue("");
      }
      setNotes(hotel.notes || hotel.bookingRef || "");
    } else if (!hotel && isOpen) {
      setName("");
      const initialStart = minDate || "";
      let initialEnd = maxDate || "";
      if (initialStart && !initialEnd) {
        const next = new Date(initialStart + "T00:00:00");
        next.setDate(next.getDate() + 1);
        initialEnd = next.toISOString().split("T")[0];
      }

      setStartDate(initialStart);
      setEndDate(initialEnd);

      if (initialStart && initialEnd) {
        const tripYear = minDate ? parseInt(minDate.split("-")[0], 10) : new Date().getFullYear();
        const dateText = formatHotelStay({ checkIn: initialStart, checkOut: initialEnd }, "en", { defaultYear: tripYear });
        setDateRange(dateText);
      } else {
        setDateRange("");
      }

      setInputCurrency("THB");
      setAmountValue("");
      setNotes("");
    }
  }, [hotel, isOpen, minDate, maxDate]);

  if (!isOpen || !mounted) return null;

  const numVal = parseFloat(amountValue) || 0;
  const thbVal = inputCurrency === "THB" ? numVal : Math.round(numVal * exchangeRate);
  const jpyVal = inputCurrency === "JPY" ? numVal : exchangeRate > 0 ? Math.round(numVal / exchangeRate) : 0;

  const handleDateChange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);

    if (start && end) {
      const tripYear = minDate ? parseInt(minDate.split("-")[0], 10) : new Date().getFullYear();
      const dateText = formatHotelStay({ checkIn: start, checkOut: end }, "en", { defaultYear: tripYear });
      setDateRange(dateText);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const tripYear = minDate ? parseInt(minDate.split("-")[0], 10) : new Date().getFullYear();
    const finalDateRange =
      (startDate && endDate
        ? formatHotelStay({ checkIn: startDate, checkOut: endDate }, "en", { defaultYear: tripYear })
        : "") || dateRange.trim();

    if (!name.trim() || !finalDateRange) {
      alert("Please enter hotel name and select check-in / check-out dates.");
      return;
    }
    setLoading(true);

    try {
      const payload = {
        name: name.trim(),
        dateRange: finalDateRange,
        checkIn: startDate ? new Date(`${startDate}T00:00:00.000Z`) : null,
        checkOut: endDate ? new Date(`${endDate}T00:00:00.000Z`) : null,
        costThb: thbVal || 0,
        costJpy: jpyVal || 0,
        notes: notes.trim() || undefined,
      };

      if (isEditing && hotel) {
        await updateHotel(hotel.id, payload);
      } else {
        await createHotel(tripId, payload);
      }
      router.refresh();
      onClose();
    } catch (err) {
      console.error(err);
      alert("Failed to save hotel booking.");
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
            <Hotel className="w-4 h-4 text-accent" />
            <span>{isEditing ? t("editHotel") : t("addHotel")}</span>
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
          {/* Hotel Name */}
          <div>
            <label className={labelClass}>
              <Hotel className="w-3.5 h-3.5 text-accent" /> {t("hotelName")} *
            </label>
            <input
              required
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rembrandt Inn Aomori, Sotetsu Fresa Inn"
              className={inputClass}
            />
          </div>

          {/* Interactive Date Range Picker with Hotel Mode & Min/Max */}
          <div>
            <DateRangePicker
              mode="hotel"
              label={t("stayDatesWithCheckInOut")}
              startDate={startDate}
              endDate={endDate}
              minDate={minDate}
              maxDate={maxDate}
              onChange={handleDateChange}
            />
          </div>

          {/* Currency selection & Amount */}
          <div className="p-3.5 bg-bg-surface border border-border rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                {t("currencyAndHotelCost")}
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
                placeholder={inputCurrency === "THB" ? "฿ 5,200" : "¥ 22,000"}
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

          {/* Booking Ref */}
          <div>
            <label className={labelClass}>
              <FileText className="w-3.5 h-3.5 text-text-faint" /> {t("bookingRef")}
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Booking.com / Agoda Ref #123456"
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
              <span>{loading ? t("savingEllipsis") : isEditing ? t("saveChanges") : t("addHotel")}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
