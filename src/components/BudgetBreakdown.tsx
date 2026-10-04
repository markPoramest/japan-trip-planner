"use client";

import { useState, useEffect } from "react";
import { formatJPY, formatTHB } from "@/lib/utils";
import { Wallet, CreditCard, Banknote, Landmark, Edit3, Plus } from "lucide-react";
import EditBudgetModal from "@/components/EditBudgetModal";
import { useLanguage } from "@/context/LanguageContext";

interface BudgetWallet {
  id: string;
  category: string;
  amountJpy: number;
  amountThb: number;
  notes: string | null;
}

export default function BudgetBreakdown({
  tripId,
  budgets,
  exchangeRate = 0.24,
}: {
  tripId?: string;
  budgets: BudgetWallet[];
  totalIcSpentJpy?: number;
  totalNonIcSpentJpy?: number;
  exchangeRate?: number;
}) {
  const { t, language } = useLanguage();
  const [modalOpen, setModalOpen] = useState(false);
  const [localBudgets, setLocalBudgets] = useState<BudgetWallet[]>(budgets);

  useEffect(() => {
    setLocalBudgets(budgets);
  }, [budgets]);

  const rate = exchangeRate > 0 ? exchangeRate : 0.24;
  const currentBudgets = localBudgets && localBudgets.length > 0 ? localBudgets : budgets;

  const totalJpy = currentBudgets.reduce((s, b) => {
    const val = b.amountJpy > 0 ? b.amountJpy : rate > 0 ? b.amountThb / rate : 0;
    return s + (val || 0);
  }, 0);
  const totalThb = totalJpy * rate;

  const getIcon = (cat: string) => {
    const lower = (cat || "").toLowerCase();
    if (lower.includes("ic card") || lower.includes("suica") || lower.includes("pasmo")) return <CreditCard className="w-5 h-5 text-sage" />;
    if (lower.includes("cash") || lower.includes("เงินสด")) return <Banknote className="w-5 h-5 text-olive" />;
    return <Landmark className="w-5 h-5 text-sand" />;
  };

  return (
    <div className="bg-bg-card border border-border rounded-3xl p-6 shadow-card space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-2xl bg-accent/10 text-accent border border-accent/20">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-text-primary">{t("budgetAllocations")}</h3>
            <p className="text-xs text-text-muted">{t("budgetAllocationsSubtitle")}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {currentBudgets.length > 0 && (
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-2xl bg-bg-surface/80 border border-border/80 shadow-2xs">
              <div className="w-2 h-2 rounded-full bg-accent/70 shrink-0" />
              <div className="text-right">
                <div className="text-[10px] text-text-muted uppercase tracking-wider font-bold leading-none mb-0.5">{t("totalPocketBudget")}</div>
                <div className="flex items-baseline justify-end gap-1.5 leading-none">
                  <span className="text-sm font-extrabold text-text-primary font-mono">{formatJPY(totalJpy)}</span>
                  <span className="text-[11px] text-text-muted font-mono">≈ {formatTHB(totalThb)}</span>
                </div>
              </div>
            </div>
          )}
          {tripId && (
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-bg-surface hover:bg-accent hover:text-white border border-border text-text-secondary text-xs font-semibold transition-all shadow-xs active:scale-95 cursor-pointer shrink-0"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{currentBudgets.length > 0 ? t("editBudget") : t("addWallet")}</span>
            </button>
          )}
        </div>
      </div>

      {currentBudgets.length === 0 ? (
        <div className="bg-bg-surface/50 border border-dashed border-border rounded-2xl p-6 text-center text-text-muted text-xs">
          <p className="font-semibold text-text-secondary">{t("noBudgetsTitle")}</p>
          <p className="text-text-muted mt-1">{t("noBudgetsSubtitle")}</p>
          {tripId && (
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-accent/15 text-accent hover:bg-accent hover:text-white border border-accent/30 font-bold transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t("addWallet")}</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {currentBudgets.map((b) => {
            const jpyVal = b.amountJpy > 0 ? b.amountJpy : rate > 0 ? b.amountThb / rate : 0;
            const thbVal = b.amountThb > 0 ? b.amountThb : jpyVal * rate;
            const lower = (b.category || "").toLowerCase();
            const isIc = lower.includes("ic card") || lower.includes("suica") || lower.includes("pasmo");
            const isCash = lower.includes("cash") || lower.includes("เงินสด");
            const iconBg = isIc
              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200/50"
              : isCash
              ? "bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 border-teal-200/50"
              : "bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border-purple-200/50";

            return (
              <div
                key={b.id}
                onClick={() => tripId && setModalOpen(true)}
                className={`p-4 rounded-2xl bg-bg-surface border border-border/80 flex flex-col justify-between transition-all group ${
                  tripId ? "cursor-pointer hover:border-accent/50 hover:shadow-2xs" : ""
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`p-2 rounded-xl border shrink-0 ${iconBg}`}>
                    {getIcon(b.category)}
                  </div>
                  <span className="font-bold text-text-primary text-sm truncate">{b.category}</span>
                </div>

                <div className="mt-3 pt-2.5 border-t border-border/40 flex items-baseline justify-between">
                  <span className="text-base font-mono font-extrabold text-text-primary">
                    {formatJPY(jpyVal)}
                  </span>
                  <span className="text-xs font-mono text-text-muted">
                    ≈ {formatTHB(thbVal)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tripId && (
        <EditBudgetModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          tripId={tripId}
          exchangeRate={rate}
          budgets={currentBudgets}
          onBudgetsChange={(updated) => setLocalBudgets(updated)}
        />
      )}
    </div>
  );
}
