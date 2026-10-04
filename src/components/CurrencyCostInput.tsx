"use client";

import React from "react";
import { ArrowRightLeft } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { formatTHB, formatJPY } from "@/lib/utils";

export interface CurrencyCostInputProps {
  label: string;
  amount: string;
  currency: "THB" | "JPY";
  exchangeRate: number;
  icon?: React.ReactNode;
  placeholder?: string;
  autoConvertOnCurrencyChange?: boolean;
  onAmountChange: (value: string) => void;
  onCurrencyChange: (currency: "THB" | "JPY") => void;
  children?: React.ReactNode; // Optional extra content, like IC card checkbox
  className?: string;
}

export default function CurrencyCostInput({
  label,
  amount,
  currency,
  exchangeRate,
  icon,
  placeholder,
  autoConvertOnCurrencyChange = true,
  onAmountChange,
  onCurrencyChange,
  children,
  className = "",
}: CurrencyCostInputProps) {
  const { t } = useLanguage();

  const numVal = parseFloat(amount) || 0;
  const thbVal = currency === "THB" ? numVal : Math.round(numVal * exchangeRate);
  const jpyVal =
    currency === "JPY"
      ? numVal
      : exchangeRate > 0
      ? Math.round(numVal / exchangeRate)
      : 0;

  const defaultPlaceholder =
    currency === "THB" ? "฿ 5,200" : "¥ 22,000";

  const handleCurrencySelect = (newCurr: "THB" | "JPY") => {
    if (newCurr !== currency) {
      if (autoConvertOnCurrencyChange && numVal > 0) {
        if (newCurr === "THB") {
          onAmountChange(Math.round(numVal * exchangeRate).toString());
        } else {
          onAmountChange(
            exchangeRate > 0
              ? Math.round(numVal / exchangeRate).toString()
              : numVal.toString()
          );
        }
      }
      onCurrencyChange(newCurr);
    }
  };

  return (
    <div
      className={`p-3.5 bg-bg-surface border border-border rounded-2xl space-y-3 ${className}`}
    >
      {/* Top Header: Label & Currency Dropdown */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
          {icon}
          <span>{label}</span>
        </label>
        <select
          value={currency}
          onChange={(e) => handleCurrencySelect(e.target.value as "THB" | "JPY")}
          className="px-2.5 py-1 bg-bg-base border border-border rounded-lg text-xs font-bold text-accent focus:outline-none focus:border-accent cursor-pointer"
        >
          <option value="THB">THB (฿ บาท)</option>
          <option value="JPY">JPY (¥ เยน)</option>
        </select>
      </div>

      {/* Amount Input */}
      <div className="relative">
        <input
          type="number"
          value={amount}
          onChange={(e) => onAmountChange(e.target.value)}
          placeholder={placeholder || defaultPlaceholder}
          className="w-full px-3.5 py-2.5 bg-bg-base border border-border rounded-xl text-text-primary text-sm placeholder-text-faint focus:outline-none focus:border-accent transition-colors font-mono text-base font-bold"
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

      {/* Extra slot (e.g. IC card toggle) */}
      {children}
    </div>
  );
}
