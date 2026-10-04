"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Users2,
  Plus,
  Trash2,
  Hotel,
  Plane,
  Ticket,
  Calculator,
  Check,
  Coins,
  Info,
  Ban,
  User,
  SlidersHorizontal,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { formatTHB, formatJPY } from "@/lib/utils";
import {
  SplitMember,
  SplitItem,
  calculateSplitBill,
  getAvatarColor,
} from "@/lib/splitBill";

interface SplitBillClientProps {
  trip: {
    id: string;
    title: string;
    exchangeRate: number;
    hotels: any[];
    passes: any[];
    flights: any[];
  };
  isOwner?: boolean;
}

const PRESET_NAMES = ["Friend 1", "Friend 2", "Mark", "Jane", "Ken", "Sarah"];

export default function BookingsClient({ trip }: SplitBillClientProps) {
  const { t } = useLanguage();
  const exchangeRate = trip.exchangeRate || 0.24;

  // Local storage keys
  const storageKey = `japan_trip_split_members_${trip.id || "default"}`;
  const itemAssignmentKey = `japan_trip_split_assignments_${trip.id || "default"}`;
  const itemEnabledKey = `japan_trip_split_enabled_${trip.id || "default"}`;

  // 1. Members state: default is strictly 1 person: "Me"
  const [members, setMembers] = useState<SplitMember[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (e) {
        console.error(e);
      }
    }
    // Default 1 person (Me)
    return [{ id: "m-1", name: "Me" }];
  });

  const [newMemberName, setNewMemberName] = useState("");

  // 2. Map of item ID -> boolean (whether user chooses to split this item or not)
  const [splitEnabledMap, setSplitEnabledMap] = useState<Record<string, boolean>>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(itemEnabledKey);
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return {};
  });

  // 3. Map of item ID -> array of member IDs assigned to split this item
  const [itemAssignments, setItemAssignments] = useState<Record<string, string[]>>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(itemAssignmentKey);
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return {};
  });

  // Save states to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(members));
    } catch (e) {
      console.error(e);
    }
  }, [members, storageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(itemAssignmentKey, JSON.stringify(itemAssignments));
    } catch (e) {
      console.error(e);
    }
  }, [itemAssignments, itemAssignmentKey]);

  useEffect(() => {
    try {
      localStorage.setItem(itemEnabledKey, JSON.stringify(splitEnabledMap));
    } catch (e) {
      console.error(e);
    }
  }, [splitEnabledMap, itemEnabledKey]);

  // Convert raw trip hotels, flights, and passes to standard SplitItem list
  const splitItems: SplitItem[] = useMemo(() => {
    const list: SplitItem[] = [];

    // Hotels
    (trip.hotels || []).forEach((h) => {
      const jpy = h.costJpy || (h.costThb && exchangeRate > 0 ? Math.round(h.costThb / exchangeRate) : 0);
      const thb = h.costThb || Math.round(jpy * exchangeRate);
      const itemId = `hotel-${h.id}`;
      const isSplitEnabled = splitEnabledMap[itemId] !== false;

      list.push({
        id: itemId,
        type: "hotel",
        title: h.name,
        subtitle: h.dateRange || undefined,
        costThb: thb,
        costJpy: jpy,
        isSplitEnabled,
        memberIds: itemAssignments[itemId] || [],
      });
    });

    // Flights
    (trip.flights || []).forEach((f) => {
      const thb = f.costThb || 0;
      const jpy = exchangeRate > 0 ? Math.round(thb / exchangeRate) : 0;
      const itemId = `flight-${f.id}`;
      const isSplitEnabled = splitEnabledMap[itemId] !== false;

      list.push({
        id: itemId,
        type: "flight",
        title: `${f.flightNo} (${f.route})`,
        subtitle: f.notes || undefined,
        costThb: thb,
        costJpy: jpy,
        isSplitEnabled,
        memberIds: itemAssignments[itemId] || [],
      });
    });

    // Passes
    (trip.passes || []).forEach((p) => {
      const jpy = p.costJpy || (p.costThb && exchangeRate > 0 ? Math.round(p.costThb / exchangeRate) : 0);
      const thb = p.costThb || Math.round(jpy * exchangeRate);
      const itemId = `pass-${p.id}`;
      const isSplitEnabled = splitEnabledMap[itemId] !== false;

      list.push({
        id: itemId,
        type: "pass",
        title: p.name,
        subtitle: p.notes || undefined,
        costThb: thb,
        costJpy: jpy,
        isSplitEnabled,
        memberIds: itemAssignments[itemId] || [],
      });
    });

    return list;
  }, [trip.hotels, trip.flights, trip.passes, exchangeRate, itemAssignments, splitEnabledMap]);

  // Active items selected for split
  const activeItemsCount = splitItems.filter((it) => it.isSplitEnabled).length;

  // Split calculation results (only includes isSplitEnabled === true items)
  const splitSummary = useMemo(() => {
    return calculateSplitBill(members, splitItems);
  }, [members, splitItems]);

  // Handlers for members
  const handleAddMember = (nameToAdd?: string) => {
    const name = (nameToAdd || newMemberName).trim();
    if (!name) return;
    const newMember: SplitMember = {
      id: `m-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name,
    };
    setMembers((prev) => [...prev, newMember]);
    setNewMemberName("");
  };

  const handleRemoveMember = (id: string) => {
    if (members.length <= 1) return;
    setMembers((prev) => prev.filter((m) => m.id !== id));
    // Clean up assignments
    setItemAssignments((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((key) => {
        updated[key] = updated[key].filter((mId) => mId !== id);
      });
      return updated;
    });
  };

  // Toggle whether an item is split or not
  const handleToggleItemSplit = (itemId: string) => {
    setSplitEnabledMap((prev) => {
      const current = prev[itemId] !== false; // defaults to true
      return {
        ...prev,
        [itemId]: !current,
      };
    });
  };

  // Toggle member assignment for an item
  const handleToggleMemberForItem = (itemId: string, memberId: string) => {
    setItemAssignments((prev) => {
      const current = prev[itemId] || [];
      const exists = current.includes(memberId);
      let updated: string[];

      if (current.length === 0) {
        // Was "all members" (empty list), now explicitly exclude this member
        updated = members.map((m) => m.id).filter((id) => id !== memberId);
      } else if (exists) {
        updated = current.filter((id) => id !== memberId);
      } else {
        updated = [...current, memberId];
        // If all members are now selected, reset to empty (means everyone)
        if (updated.length === members.length) {
          updated = [];
        }
      }

      return {
        ...prev,
        [itemId]: updated,
      };
    });
  };

  const handleSetAllMembersForItem = (itemId: string) => {
    setItemAssignments((prev) => ({
      ...prev,
      [itemId]: [], // empty means all members
    }));
  };

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
      {/* Page Header */}
      <div data-aos="fade-down" className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-accent/10 text-accent border border-accent/20">
              <Users2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
                {t("splitBill")}
              </h1>
              <p className="text-xs sm:text-sm text-text-muted mt-0.5">
                {t("onlySplitSelectedSubtitle")}
              </p>
            </div>
          </div>
        </div>

        {/* Total Pre-booked Badge */}
        <div className="bg-bg-surface border border-border rounded-2xl px-4 py-3 flex items-center gap-3">
          <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
              <span>{t("splitBillTotalPrebooked")}</span>
              <span className="text-accent font-semibold font-mono">
                ({activeItemsCount}/{splitItems.length} {t("bookingItems")})
              </span>
            </div>
            <div className="font-mono text-base font-extrabold text-accent">
              {formatTHB(splitSummary.totalThb)}
              <span className="text-xs font-normal text-text-muted ml-1.5">
                ≈ {formatJPY(splitSummary.totalJpy)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ════════════ Members Section (Default: 1 person - Me) ════════════ */}
      <section
        data-aos="fade-up"
        className="bg-bg-card border border-border rounded-3xl p-5 sm:p-6 shadow-sm space-y-4"
      >
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-sm sm:text-base font-bold text-text-primary flex items-center gap-2">
            <User className="w-4 h-4 text-accent" />
            <span>{t("splitBillMembers")} ({members.length})</span>
          </h2>
          <span className="text-xs text-text-muted">
            {members.length === 1
              ? t("soloTravelNote")
              : t("equalSplitCount", { count: members.length })}
          </span>
        </div>

        {/* Members Pill List */}
        <div className="flex flex-wrap items-center gap-2.5">
          {members.map((member, idx) => {
            const avatarColor = getAvatarColor(idx);
            return (
              <div
                key={member.id}
                className="inline-flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 bg-bg-surface border border-border hover:border-accent/30 rounded-2xl text-xs font-semibold text-text-primary transition-all shadow-2xs"
              >
                <div
                  className={`w-6 h-6 rounded-xl flex items-center justify-center font-bold text-[11px] shadow-2xs ${avatarColor}`}
                >
                  {member.name.charAt(0).toUpperCase()}
                </div>
                <span>{member.name}</span>
                {members.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveMember(member.id)}
                    className="p-1 rounded-lg text-text-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors cursor-pointer"
                    title="Remove member"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Add Member Form */}
        <div className="pt-2 border-t border-border/60 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex items-center gap-2 flex-1">
            <input
              type="text"
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddMember();
                }
              }}
              placeholder={t("memberNamePlaceholder")}
              className="w-full px-3.5 py-2 bg-bg-base border border-border rounded-xl text-xs font-semibold text-text-primary placeholder-text-faint focus:outline-none focus:border-accent"
            />
            <button
              type="button"
              onClick={() => handleAddMember()}
              disabled={!newMemberName.trim()}
              className="px-4 py-2 rounded-xl bg-accent hover:bg-accent-light text-white text-xs font-bold shadow-accent transition-all hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t("addMember")}</span>
            </button>
          </div>

          {/* Quick preset suggestions */}
          <div className="flex items-center gap-1.5 text-xs text-text-muted flex-wrap">
            <span className="text-[11px] text-text-faint">{t("quickAddPresetMembers")}</span>
            {PRESET_NAMES.filter(
              (p) => !members.some((m) => m.name.toLowerCase() === p.toLowerCase())
            )
              .slice(0, 3)
              .map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handleAddMember(p)}
                  className="px-2 py-1 rounded-lg bg-bg-surface hover:bg-accent/10 hover:text-accent border border-border text-[11px] font-semibold transition-colors cursor-pointer"
                >
                  + {p}
                </button>
              ))}
          </div>
        </div>
      </section>

      {/* ════════════ SECTION 1: CHOOSE ITEMS & ASSIGN MEMBERS ════════════ */}
      <section data-aos="fade-up" className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-text-primary flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-accent" />
              <span>{t("chooseItemsToSplitSection")}</span>
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              {t("chooseItemsToSplitDesc")}
            </p>
          </div>
          <div className="text-xs text-text-muted flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-accent" />
            <span>
              {splitItems.length} {t("preBookedBookingsTotal")} ({t("activeSplitItemsCount", { count: activeItemsCount })})
            </span>
          </div>
        </div>

        <div className="space-y-3">
          {splitItems.map((item) => {
            const isEnabled = item.isSplitEnabled !== false;
            const activeIds =
              item.memberIds && item.memberIds.length > 0
                ? item.memberIds
                : members.map((m) => m.id);
            const isAll = activeIds.length === members.length;
            const perPersonThb =
              activeIds.length > 0 ? Math.round((item.costThb / activeIds.length) * 100) / 100 : 0;

            return (
              <div
                key={item.id}
                className={`bg-bg-card border rounded-3xl p-4 sm:p-5 shadow-xs transition-all space-y-3 ${
                  isEnabled
                    ? "border-border hover:border-accent/40"
                    : "border-border/50 opacity-60 bg-bg-surface/40"
                }`}
              >
                {/* Item Header with Split Toggle */}
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2.5 rounded-2xl shrink-0 ${
                        !isEnabled
                          ? "bg-neutral-200 dark:bg-neutral-800 text-text-muted"
                          : item.type === "hotel"
                          ? "bg-amber-500/10 text-amber-500"
                          : item.type === "flight"
                          ? "bg-emerald-500/10 text-emerald-500"
                          : "bg-indigo-500/10 text-indigo-500"
                      }`}
                    >
                      {item.type === "hotel" && <Hotel className="w-5 h-5" />}
                      {item.type === "flight" && <Plane className="w-5 h-5" />}
                      {item.type === "pass" && <Ticket className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="text-sm sm:text-base font-bold text-text-primary flex items-center gap-2">
                        <span>{item.title}</span>
                        {!isEnabled && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-800 text-text-muted font-bold">
                            {t("doNotSplit")}
                          </span>
                        )}
                      </div>
                      {item.subtitle && (
                        <div className="text-xs text-text-muted mt-0.5">
                          {item.subtitle}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Price */}
                    <div className="text-right">
                      <div className="font-mono text-base sm:text-lg font-extrabold text-accent">
                        {formatTHB(item.costThb)}
                      </div>
                      <div className="font-mono text-xs text-text-muted">
                        ≈ {formatJPY(item.costJpy)}
                      </div>
                    </div>

                    {/* Enable/Disable Split Toggle Switch */}
                    <div className="flex items-center gap-2 pl-3 border-l border-border/80">
                      <button
                        type="button"
                        onClick={() => handleToggleItemSplit(item.id)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer focus:outline-none ${
                          isEnabled ? "bg-accent" : "bg-neutral-300 dark:bg-neutral-700"
                        }`}
                        title={isEnabled ? t("doNotSplit") : t("splitThisItem")}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-xs ${
                            isEnabled ? "translate-x-5" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Member Selector Row (only visible if item is enabled for splitting) */}
                {isEnabled && (
                  <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-text-secondary mr-1">
                        {t("splitWithLabel")}
                      </span>
                      {members.map((m, idx) => {
                        const isSelected = activeIds.includes(m.id);
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => handleToggleMemberForItem(item.id, m.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                              isSelected
                                ? "bg-accent text-white shadow-2xs font-bold"
                                : "bg-bg-surface text-text-muted border border-border hover:border-accent/40"
                            }`}
                          >
                            <span
                              className={`w-4 h-4 rounded-md flex items-center justify-center text-[10px] ${
                                isSelected ? "bg-white/20 text-white" : getAvatarColor(idx)
                              }`}
                            >
                              {m.name.charAt(0).toUpperCase()}
                            </span>
                            <span>{m.name}</span>
                            {isSelected && <Check className="w-3 h-3 ml-0.5" />}
                          </button>
                        );
                      })}

                      {!isAll && (
                        <button
                          type="button"
                          onClick={() => handleSetAllMembersForItem(item.id)}
                          className="px-2.5 py-1 rounded-xl text-[11px] font-semibold text-accent hover:bg-accent/10 transition-colors cursor-pointer"
                        >
                          {t("splitEquallyAll")}
                        </button>
                      )}
                    </div>

                    {/* Calculated Per-Person Amount */}
                    <div className="bg-bg-surface px-3 py-1.5 rounded-xl border border-border text-xs flex items-center gap-2">
                      <span className="text-text-muted">
                        {t("perPersonSuffix", { count: activeIds.length })}
                      </span>
                      <span className="font-mono font-bold text-accent">
                        {formatTHB(perPersonThb)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ════════════ SECTION 2: PER-PERSON SHARE SUMMARY ════════════ */}
      <section data-aos="fade-up" className="space-y-4 pt-4 border-t border-dashed border-border/80">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-text-primary flex items-center gap-2">
              <Calculator className="w-4 h-4 text-accent" />
              <span>{t("summaryShareSection")}</span>
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              {t("perPersonShare")}
            </p>
          </div>
        </div>

        {activeItemsCount === 0 ? (
          <div className="bg-bg-card border border-border rounded-3xl p-8 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
              <Ban className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-text-primary">
              {t("noItemsSelectedToSplit")}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {splitSummary.memberShares.map((ms, idx) => {
              const avatarColor = getAvatarColor(idx);
              const percent =
                splitSummary.totalThb > 0
                  ? Math.round((ms.totalThb / splitSummary.totalThb) * 100)
                  : 0;

              return (
                <div
                  key={ms.member.id}
                  className="bg-bg-card border border-border hover:border-accent/40 rounded-3xl p-5 shadow-xs transition-all space-y-4 relative overflow-hidden"
                >
                  {/* Top Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center font-extrabold text-sm shadow-sm ${avatarColor}`}
                      >
                        {ms.member.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-text-primary">
                          {ms.member.name}
                        </div>
                        <div className="text-[11px] text-text-muted">
                          {t("sharedBookingsCount", { count: ms.items.length })}
                        </div>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-accent/10 text-accent font-mono text-xs font-bold border border-accent/20">
                      {percent}%
                    </span>
                  </div>

                  {/* Share Amount */}
                  <div className="bg-bg-surface border border-border/80 rounded-2xl p-3.5 space-y-1">
                    <div className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                      {t("memberTotalOwed")}
                    </div>
                    <div className="font-mono text-xl sm:text-2xl font-black text-accent">
                      {formatTHB(ms.totalThb)}
                    </div>
                    <div className="font-mono text-xs text-text-muted">
                      ≈ {formatJPY(ms.totalJpy)}
                    </div>
                  </div>

                  {/* Itemized Mini List */}
                  <div className="space-y-2 pt-1">
                    <div className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">
                      {t("breakdownTitle")} ({ms.items.length})
                    </div>
                    {ms.items.length === 0 ? (
                      <p className="text-xs text-text-faint italic py-2">
                        {t("noBookingsAssignedToMember")}
                      </p>
                    ) : (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {ms.items.map((it) => (
                          <div
                            key={it.itemId}
                            className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-xl bg-bg-base border border-border/50"
                          >
                            <span className="truncate max-w-[160px] text-text-primary font-medium flex items-center gap-1.5">
                              {it.type === "hotel" && <Hotel className="w-3 h-3 text-amber-500 shrink-0" />}
                              {it.type === "flight" && <Plane className="w-3 h-3 text-emerald-500 shrink-0" />}
                              {it.type === "pass" && <Ticket className="w-3 h-3 text-indigo-500 shrink-0" />}
                              <span className="truncate">{it.title}</span>
                            </span>
                            <span className="font-mono font-bold text-text-primary ml-2 shrink-0">
                              {formatTHB(it.shareThb)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
