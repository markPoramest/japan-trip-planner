"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { updateBudget, createBudgetWallet, deleteBudgetWallet } from "@/lib/actions";
import { X, Wallet, Plus, Trash2, JapaneseYen, Banknote, Save, ArrowRightLeft, Loader2, Check, Sparkles } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { formatJPY, formatTHB } from "@/lib/utils";

interface BudgetWallet {
  id: string;
  category: string;
  amountJpy: number;
  amountThb: number;
  notes: string | null;
}

interface EditBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
  exchangeRate: number;
  budgets: BudgetWallet[];
  onBudgetsChange?: (updated: BudgetWallet[]) => void;
}

export default function EditBudgetModal({
  isOpen,
  onClose,
  tripId,
  exchangeRate = 0.24,
  budgets,
  onBudgetsChange,
}: EditBudgetModalProps) {
  const router = useRouter();
  const { t, language } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [savingAll, setSavingAll] = useState(false);

  // New budget wallet inputs
  const [newCategory, setNewCategory] = useState("");
  const [newCurrency, setNewCurrency] = useState<"JPY" | "THB">("JPY");
  const [newAmount, setNewAmount] = useState("");
  const [adding, setAdding] = useState(false);

  // Local state for editing rows
  const [editList, setEditList] = useState<
    { id: string; category: string; amountJpy: string; amountThb: string; notes: string }[]
  >([]);

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

  // Sync state on open
  useEffect(() => {
    if (isOpen) {
      setEditList(
        budgets.map((b) => ({
          id: b.id,
          category: b.category,
          amountJpy: b.amountJpy ? b.amountJpy.toString() : "",
          amountThb: b.amountThb ? b.amountThb.toString() : "",
          notes: b.notes || "",
        }))
      );
      setNewCategory("");
      setNewAmount("");
    }
  }, [isOpen, budgets]);

  if (!isOpen || !mounted) return null;

  const handleJpyChange = (id: string, val: string) => {
    const num = parseFloat(val) || 0;
    const calcThb = Math.round(num * exchangeRate);
    setEditList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, amountJpy: val, amountThb: calcThb > 0 ? calcThb.toString() : "" } : item))
    );
  };

  const handleThbChange = (id: string, val: string) => {
    const num = parseFloat(val) || 0;
    const calcJpy = exchangeRate > 0 ? Math.round(num / exchangeRate) : 0;
    setEditList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, amountThb: val, amountJpy: calcJpy > 0 ? calcJpy.toString() : "" } : item))
    );
  };

  const handleUpdate = async (item: { id: string; category: string; amountJpy: string; amountThb: string; notes: string }) => {
    setLoadingId(item.id);
    try {
      const updated = await updateBudget(item.id, {
        category: item.category,
        amountJpy: parseFloat(item.amountJpy) || 0,
        amountThb: parseFloat(item.amountThb) || 0,
        notes: item.notes || undefined,
      });
      setSavedId(item.id);
      setTimeout(() => setSavedId(null), 1500);
      router.refresh();
      if (onBudgetsChange) {
        onBudgetsChange(
          editList.map((i) =>
            i.id === item.id
              ? {
                  id: i.id,
                  category: i.category,
                  amountJpy: parseFloat(i.amountJpy) || 0,
                  amountThb: parseFloat(i.amountThb) || 0,
                  notes: i.notes || null,
                }
              : {
                  id: i.id,
                  category: i.category,
                  amountJpy: parseFloat(i.amountJpy) || 0,
                  amountThb: parseFloat(i.amountThb) || 0,
                  notes: i.notes || null,
                }
          )
        );
      }
    } catch (err) {
      console.error(err);
      alert("Failed to update budget");
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this budget wallet?")) return;
    setLoadingId(id);
    try {
      await deleteBudgetWallet(id, tripId);
      const remaining = editList.filter((item) => item.id !== id);
      setEditList(remaining);
      router.refresh();
      if (onBudgetsChange) {
        onBudgetsChange(
          remaining.map((i) => ({
            id: i.id,
            category: i.category,
            amountJpy: parseFloat(i.amountJpy) || 0,
            amountThb: parseFloat(i.amountThb) || 0,
            notes: i.notes || null,
          }))
        );
      }
    } catch (err) {
      console.error(err);
      alert("Failed to delete budget");
    } finally {
      setLoadingId(null);
    }
  };

  const newNum = parseFloat(newAmount) || 0;
  const newJpyVal = newCurrency === "JPY" ? newNum : exchangeRate > 0 ? Math.round(newNum / exchangeRate) : 0;
  const newThbVal = newCurrency === "THB" ? newNum : Math.round(newNum * exchangeRate);

  const handleAdd = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newCategory.trim()) return;
    setAdding(true);
    try {
      const created = await createBudgetWallet(tripId, {
        category: newCategory.trim(),
        amountJpy: newJpyVal || 0,
        amountThb: newThbVal || 0,
      });

      const nextList = [
        ...editList,
        {
          id: created.id,
          category: created.category,
          amountJpy: created.amountJpy ? created.amountJpy.toString() : "",
          amountThb: created.amountThb ? created.amountThb.toString() : "",
          notes: created.notes || "",
        },
      ];

      setEditList(nextList);
      setNewCategory("");
      setNewAmount("");
      router.refresh();

      if (onBudgetsChange) {
        onBudgetsChange(
          nextList.map((i) => ({
            id: i.id,
            category: i.category,
            amountJpy: parseFloat(i.amountJpy) || 0,
            amountThb: parseFloat(i.amountThb) || 0,
            notes: i.notes || null,
          }))
        );
      }
    } catch (err) {
      console.error(err);
      alert("Failed to add budget");
    } finally {
      setAdding(false);
    }
  };

  // Preset quick fill
  const handleQuickPreset = (presetName: string) => {
    setNewCategory(presetName);
  };

  // Main Save / Done button: saves new input if filled, and saves all rows
  const handleSaveAllAndClose = async () => {
    setSavingAll(true);
    try {
      // If user typed in new category, add it first
      if (newCategory.trim()) {
        const created = await createBudgetWallet(tripId, {
          category: newCategory.trim(),
          amountJpy: newJpyVal || 0,
          amountThb: newThbVal || 0,
        });
        editList.push({
          id: created.id,
          category: created.category,
          amountJpy: created.amountJpy ? created.amountJpy.toString() : "",
          amountThb: created.amountThb ? created.amountThb.toString() : "",
          notes: created.notes || "",
        });
      }

      // Save all existing edited rows
      for (const item of editList) {
        await updateBudget(item.id, {
          category: item.category,
          amountJpy: parseFloat(item.amountJpy) || 0,
          amountThb: parseFloat(item.amountThb) || 0,
          notes: item.notes || undefined,
        });
      }

      if (onBudgetsChange) {
        onBudgetsChange(
          editList.map((i) => ({
            id: i.id,
            category: i.category,
            amountJpy: parseFloat(i.amountJpy) || 0,
            amountThb: parseFloat(i.amountThb) || 0,
            notes: i.notes || null,
          }))
        );
      }

      router.refresh();
      onClose();
    } catch (err) {
      console.error(err);
      alert("Failed to save all budgets");
    } finally {
      setSavingAll(false);
    }
  };

  const inputClass =
    "px-3.5 py-2.5 bg-bg-base border border-border rounded-xl text-text-primary text-xs focus:outline-none focus:border-accent transition-colors";

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-md overflow-y-auto">
      <div className="bg-bg-card border border-border rounded-3xl w-full max-w-2xl shadow-2xl my-auto animate-in fade-in zoom-in-95 duration-150 relative">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-accent/10 text-accent border border-accent/20">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-text-primary">{t("manageBudgets")}</h3>
              <p className="text-xs text-text-muted">{t("budgetAllocationsSubtitle")}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-surface transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Add New Wallet Section (Top for Prominence) */}
          <form onSubmit={handleAdd} className="p-4 bg-bg-surface/80 border border-accent/30 rounded-2xl space-y-3 shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h4 className="text-xs font-bold text-accent uppercase tracking-wider flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                <span>{t("addWallet")}</span>
              </h4>

              {/* Quick Presets */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-text-muted flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-accent" />
                  <span>{t("presets")}</span>
                </span>
                {[
                  { label: "IC Card", val: "IC Card (Suica/Pasmo)" },
                  { label: t("cashPreset"), val: t("cashPresetPocket") },
                  { label: "Wise / Card", val: "Travel Card (Wise)" },
                  { label: t("shoppingPreset"), val: t("shoppingPresetBudget") },
                ].map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => handleQuickPreset(p.val)}
                    className="px-2 py-0.5 rounded-lg bg-bg-base hover:bg-accent/20 hover:text-accent border border-border text-[10px] font-semibold text-text-secondary transition-all active:scale-95 cursor-pointer"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                required
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="e.g. IC Card, Cash Pocket"
                className={`${inputClass} sm:col-span-1`}
              />

              <div className="flex items-center gap-2 sm:col-span-2">
                <select
                  value={newCurrency}
                  onChange={(e) => setNewCurrency(e.target.value as "JPY" | "THB")}
                  className="px-2.5 py-2.5 bg-bg-base border border-border rounded-xl text-xs font-bold text-accent focus:outline-none focus:border-accent cursor-pointer"
                >
                  <option value="JPY">JPY (¥)</option>
                  <option value="THB">THB (฿)</option>
                </select>

                <input
                  required
                  type="number"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  placeholder={newCurrency === "JPY" ? "¥ 30,000" : "฿ 7,000"}
                  className={`${inputClass} flex-1 font-mono`}
                />

                <button
                  type="submit"
                  disabled={adding || !newCategory.trim()}
                  className="px-4 py-2.5 rounded-xl bg-accent hover:bg-accent-light text-white text-xs font-bold shadow-accent transition-all hover:scale-105 flex items-center gap-1.5 cursor-pointer disabled:opacity-60 flex-shrink-0"
                >
                  {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>{adding ? t("addingEllipsis") : t("addWallet")}</span>
                </button>
              </div>
            </div>

            {/* Live Dual Currency Conversion Hint */}
            {newNum > 0 && (
              <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs">
                <span className="text-text-muted flex items-center gap-1">
                  <ArrowRightLeft className="w-3 h-3 text-accent" />
                  <span>{t("equivalentTo")}:</span>
                </span>
                <div className="font-mono font-bold text-right text-xs">
                  <span className="text-accent">{formatTHB(newThbVal)}</span>
                  <span className="text-text-faint mx-1.5">≈</span>
                  <span className="text-text-primary">{formatJPY(newJpyVal)}</span>
                </div>
              </div>
            )}
          </form>

          {/* Existing Budget Wallets List */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider">
              {t("budgetAllocations")} ({editList.length})
            </h4>

            {editList.length === 0 ? (
              <p className="text-xs text-text-faint italic p-4 text-center bg-bg-surface rounded-2xl border border-border">
                {t("noBudgetsTitle")}
              </p>
            ) : (
              editList.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 bg-bg-surface border border-border rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
                >
                  <input
                    type="text"
                    value={item.category}
                    onChange={(e) =>
                      setEditList((prev) =>
                        prev.map((i) => (i.id === item.id ? { ...i, category: e.target.value } : i))
                      )
                    }
                    placeholder={t("walletName")}
                    className={`${inputClass} flex-1 font-semibold`}
                  />

                  <div className="flex items-center gap-2">
                    <div className="relative flex-1 sm:w-28">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-text-muted font-bold">
                        ¥
                      </span>
                      <input
                        type="number"
                        value={item.amountJpy}
                        onChange={(e) => handleJpyChange(item.id, e.target.value)}
                        placeholder="JPY"
                        className={`${inputClass} pl-6 w-full font-mono text-xs`}
                      />
                    </div>

                    <div className="relative flex-1 sm:w-28">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-text-muted font-bold">
                        ฿
                      </span>
                      <input
                        type="number"
                        value={item.amountThb}
                        onChange={(e) => handleThbChange(item.id, e.target.value)}
                        placeholder="THB"
                        className={`${inputClass} pl-6 w-full font-mono text-xs`}
                      />
                    </div>

                    <button
                      type="button"
                      disabled={loadingId === item.id}
                      onClick={() => handleUpdate(item)}
                      className={`p-2.5 rounded-xl text-white text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50 ${
                        savedId === item.id ? "bg-sage" : "bg-accent hover:bg-accent-light"
                      }`}
                      title={t("saveChanges")}
                    >
                      {loadingId === item.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : savedId === item.id ? (
                        <Check className="w-3.5 h-3.5 text-white" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                    </button>

                    <button
                      type="button"
                      disabled={loadingId === item.id}
                      onClick={() => handleDelete(item.id)}
                      className="p-2.5 rounded-xl text-text-faint hover:text-red-400 hover:bg-red-950/30 transition-colors cursor-pointer disabled:opacity-50"
                      title={t("deleteTrip")}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-text-muted hover:text-text-primary hover:bg-bg-surface transition-colors cursor-pointer"
          >
            {t("cancel")}
          </button>
          <button
            type="button"
            disabled={savingAll}
            onClick={handleSaveAllAndClose}
            className="px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-light text-white text-xs font-bold transition-all shadow-accent flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
          >
            {savingAll && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{savingAll ? t("savingEllipsis") : t("saveChanges")}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
