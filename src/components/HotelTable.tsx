"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatJPY, formatTHB } from "@/lib/utils";
import { Hotel, Calendar, CheckCircle2, Plus, Edit2, Trash2 } from "lucide-react";
import { deleteHotel } from "@/lib/actions";
import HotelModal from "@/components/HotelModal";
import { useLanguage } from "@/context/LanguageContext";
import { formatHotelStay } from "@/lib/hotelDates";

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

export default function HotelTable({
  tripId,
  hotels,
  exchangeRate = 0.24,
  tripStartDate,
  tripEndDate,
}: {
  tripId?: string;
  hotels: HotelBooking[];
  exchangeRate: number;
  tripStartDate?: string;
  tripEndDate?: string;
}) {
  const router = useRouter();
  const { t, language } = useLanguage();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingHotel, setEditingHotel] = useState<HotelBooking | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const rate = exchangeRate > 0 ? exchangeRate : 0.24;
  const totalThb = hotels.reduce((s, h) => s + (h.costThb || 0), 0);
  const totalJpy = totalThb / rate;

  const handleDelete = async (id: string) => {
    if (!tripId) return;
    if (!confirm("Are you sure you want to delete this hotel booking?")) return;
    setDeletingId(id);
    try {
      await deleteHotel(id, tripId);
      router.refresh();
    } catch (err) {
      console.error(err);
      alert("Failed to delete hotel");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="bg-bg-card border border-border rounded-3xl p-6 shadow-card space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-2xl bg-accent/10 text-accent border border-accent/20">
            <Hotel className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-text-primary">{t("hotelBookings")}</h2>
              {tripId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingHotel(null);
                    setModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-bg-surface hover:bg-accent hover:text-white border border-border text-text-muted hover:text-white text-[11px] font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>{t("addHotel")}</span>
                </button>
              )}
            </div>
            <p className="text-xs text-text-muted">{t("accommodationsAlongRoute")}</p>
          </div>
        </div>

        {hotels.length > 0 && (
          <div className="text-right">
            <div className="text-xs text-text-muted uppercase font-semibold">{t("totalHotel")}</div>
            <div className="text-lg font-bold text-text-primary font-mono">{formatTHB(totalThb)}</div>
            <div className="text-[11px] text-text-muted font-mono">≈ {formatJPY(totalJpy)}</div>
          </div>
        )}
      </div>

      {hotels.length === 0 ? (
        <div className="bg-bg-surface/50 border border-dashed border-border rounded-2xl p-6 text-center text-text-muted text-xs">
          <p className="font-semibold text-text-secondary">{t("noHotelsPlanned")}</p>
          {tripId && (
            <button
              type="button"
              onClick={() => {
                setEditingHotel(null);
                setModalOpen(true);
              }}
              className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-accent/15 text-accent hover:bg-accent hover:text-white border border-accent/30 font-bold transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t("addHotel")}</span>
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border text-text-secondary uppercase font-semibold text-[10px] tracking-wider">
                <th className="pb-3 pl-2">{t("hotelName")}</th>
                <th className="pb-3">{t("dates")}</th>
                <th className="pb-3 text-right">{t("costThb")}</th>
                <th className="pb-3 text-right">{t("costJpy")}</th>
                <th className="pb-3 pl-4">{t("bookingRef")}</th>
                {tripId && <th className="pb-3 text-right pr-2">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {hotels.map((hotel) => {
                const costThb = hotel.costThb || (hotel.costJpy ? hotel.costJpy * rate : 0);
                const costJpy = hotel.costJpy || (hotel.costThb ? hotel.costThb / rate : 0);
                const isDeleting = deletingId === hotel.id;

                return (
                  <tr key={hotel.id} className="hover:bg-bg-surface/60 transition-colors group">
                    <td className="py-3.5 pl-2 font-bold text-text-primary flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-accent flex-shrink-0" />
                      <span>{hotel.name}</span>
                    </td>
                    <td className="py-3.5 text-text-secondary font-medium">
                      <div className="flex items-center gap-1 text-text-muted">
                        <Calendar className="w-3 h-3 text-accent" />
                        <span>{formatHotelStay(hotel, language)}</span>
                      </div>
                    </td>
                    <td className="py-3.5 text-right font-mono font-bold text-text-primary">
                      {formatTHB(costThb)}
                    </td>
                    <td className="py-3.5 text-right font-mono text-text-muted">
                      {formatJPY(costJpy)}
                    </td>
                    <td className="py-3.5 pl-4 text-text-muted font-mono text-[11px]">
                      {hotel.bookingRef || hotel.notes || "-"}
                    </td>
                    {tripId && (
                      <td className="py-3.5 text-right pr-2">
                        <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingHotel(hotel);
                              setModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-text-muted hover:text-accent hover:bg-bg-surface transition-colors cursor-pointer"
                            title={t("editHotel")}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={isDeleting}
                            onClick={() => handleDelete(hotel.id)}
                            className="p-1.5 rounded-lg text-text-muted hover:text-red-400 hover:bg-red-950/30 transition-colors cursor-pointer disabled:opacity-50"
                            title={t("deleteTrip")}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {tripId && (
        <HotelModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setEditingHotel(null);
          }}
          tripId={tripId}
          exchangeRate={rate}
          hotel={editingHotel}
          tripStartDate={tripStartDate}
          tripEndDate={tripEndDate}
        />
      )}
    </div>
  );
}
