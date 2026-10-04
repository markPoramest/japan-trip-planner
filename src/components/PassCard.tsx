"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatJPY, formatTHB } from "@/lib/utils";
import { Train, Plane, Ticket, Plus, Edit2, Trash2 } from "lucide-react";
import { deleteFlight, deletePass } from "@/lib/actions";
import FlightModal from "@/components/FlightModal";
import PassModal from "@/components/PassModal";
import { useLanguage } from "@/context/LanguageContext";

interface PassBooking {
  id: string;
  name: string;
  costJpy: number | null;
  costThb: number | null;
  validDays: number | null;
  notes: string | null;
}

interface FlightBooking {
  id: string;
  flightNo: string;
  route: string;
  costThb: number | null;
  notes: string | null;
}

export default function PassCard({
  tripId,
  passes,
  flights,
  exchangeRate = 0.24,
}: {
  tripId?: string;
  passes: PassBooking[];
  flights: FlightBooking[];
  exchangeRate: number;
}) {
  const router = useRouter();
  const { t } = useLanguage();
  const [flightModalOpen, setFlightModalOpen] = useState(false);
  const [editingFlight, setEditingFlight] = useState<FlightBooking | null>(null);

  const [passModalOpen, setPassModalOpen] = useState(false);
  const [editingPass, setEditingPass] = useState<PassBooking | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const rate = exchangeRate > 0 ? exchangeRate : 0.24;

  const handleDeleteFlight = async (id: string) => {
    if (!tripId) return;
    if (!confirm("Are you sure you want to delete this flight booking?")) return;
    setDeletingId(id);
    try {
      await deleteFlight(id, tripId);
      router.refresh();
    } catch (err) {
      console.error(err);
      alert("Failed to delete flight");
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeletePass = async (id: string) => {
    if (!tripId) return;
    if (!confirm("Are you sure you want to delete this transit pass?")) return;
    setDeletingId(id);
    try {
      await deletePass(id, tripId);
      router.refresh();
    } catch (err) {
      console.error(err);
      alert("Failed to delete pass");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Rail Passes */}
      <div className="bg-bg-card border border-border rounded-3xl p-6 shadow-card space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-olive/10 text-olive border border-olive-muted">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-text-primary">{t("railPasses")}</h3>
              <p className="text-xs text-text-muted">{t("railPassesSubtitle")}</p>
            </div>
          </div>

          {tripId && (
            <button
              type="button"
              onClick={() => {
                setEditingPass(null);
                setPassModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-bg-surface hover:bg-olive hover:text-white border border-border text-text-secondary text-xs font-semibold transition-all shadow-xs active:scale-95 cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t("addPassOrRental")}</span>
            </button>
          )}
        </div>

        {passes.length === 0 ? (
          <div className="bg-bg-surface/50 border border-dashed border-border rounded-2xl p-6 text-center text-text-muted text-xs">
            <p>{t("noPassesPlanned")}</p>
            {tripId && (
              <button
                type="button"
                onClick={() => {
                  setEditingPass(null);
                  setPassModalOpen(true);
                }}
                className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-olive/15 text-olive hover:bg-olive hover:text-white border border-olive/30 font-bold transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t("addPassOrRental")}</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {passes.map((pass) => {
              const passJpy = pass.costJpy || (pass.costThb ? pass.costThb / rate : 0);
              const passThb =
                pass.costThb && pass.costThb !== pass.costJpy
                  ? pass.costThb
                  : passJpy > 0
                  ? passJpy * rate
                  : 0;

              return (
                <div key={pass.id} className="p-4 rounded-2xl bg-bg-surface border border-border/80 space-y-2 group">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <Train className="w-4 h-4" />
                      </div>
                      <div className="font-bold text-text-primary text-sm truncate">
                        {pass.name}
                        {pass.validDays && (
                          <span className="text-[10px] text-text-muted font-normal ml-1">({pass.validDays}d)</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right flex-shrink-0">
                        <div className="font-mono font-extrabold text-text-primary">
                          {passJpy > 0 ? formatJPY(passJpy) : "—"}
                        </div>
                        <div className="text-[11px] text-text-muted font-mono">
                          {passThb > 0 ? `≈ ${formatTHB(passThb)}` : ""}
                        </div>
                      </div>
                      {tripId && (
                        <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPass(pass);
                              setPassModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-card transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={deletingId === pass.id}
                            onClick={() => handleDeletePass(pass.id)}
                            className="p-1.5 rounded-lg text-text-muted hover:text-red-400 hover:bg-red-950/30 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  {pass.notes && (
                    <p className="text-xs text-text-muted leading-relaxed border-t border-border/40 pt-2">{pass.notes}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Flights */}
      <div className="bg-bg-card border border-border rounded-3xl p-6 shadow-card space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-teal-500/10 text-teal-600 border border-teal-500/20">
              <Plane className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-text-primary">{t("flights")}</h3>
              <p className="text-xs text-text-muted">{t("flightsSubtitle")}</p>
            </div>
          </div>

          {tripId && (
            <button
              type="button"
              onClick={() => {
                setEditingFlight(null);
                setFlightModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-bg-surface hover:bg-sage hover:text-white border border-border text-text-secondary text-xs font-semibold transition-all shadow-xs active:scale-95 cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t("addFlight")}</span>
            </button>
          )}
        </div>

        {flights.length === 0 ? (
          <div className="bg-bg-surface/50 border border-dashed border-border rounded-2xl p-6 text-center text-text-muted text-xs">
            <p>{t("noFlightsPlanned")}</p>
            {tripId && (
              <button
                type="button"
                onClick={() => {
                  setEditingFlight(null);
                  setFlightModalOpen(true);
                }}
                className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sage/15 text-sage hover:bg-sage hover:text-white border border-sage/30 font-bold transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t("addFlight")}</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {flights.map((flight) => {
              const fThb = flight.costThb || 0;
              const fJpy = fThb / rate;

              return (
                <div key={flight.id} className="p-4 rounded-2xl bg-bg-surface border border-border/80 space-y-2 group">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                        <Plane className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-text-primary text-sm truncate">
                          {flight.flightNo}
                        </div>
                        <div className="text-xs text-text-muted truncate">{flight.route}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right flex-shrink-0">
                        <div className="font-mono font-extrabold text-text-primary">
                          {fThb > 0 ? formatTHB(fThb) : "—"}
                        </div>
                        <div className="text-[11px] text-text-muted font-mono">
                          {fThb > 0 ? `≈ ${formatJPY(fJpy)}` : ""}
                        </div>
                      </div>
                      {tripId && (
                        <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingFlight(flight);
                              setFlightModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-card transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={deletingId === flight.id}
                            onClick={() => handleDeleteFlight(flight.id)}
                            className="p-1.5 rounded-lg text-text-muted hover:text-red-400 hover:bg-red-950/30 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  {flight.notes && (
                    <p className="text-xs text-text-muted leading-relaxed border-t border-border/40 pt-2">{flight.notes}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      {tripId && (
        <>
          <FlightModal
            isOpen={flightModalOpen}
            onClose={() => setFlightModalOpen(false)}
            tripId={tripId}
            exchangeRate={rate}
            flight={editingFlight}
          />
          <PassModal
            isOpen={passModalOpen}
            onClose={() => setPassModalOpen(false)}
            tripId={tripId}
            exchangeRate={rate}
            pass={editingPass}
          />
        </>
      )}
    </div>
  );
}
