import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CurrencyCostInput from "@/components/CurrencyCostInput";

// Mock LanguageContext and CurrencyContext
vi.mock("@/context/LanguageContext", () => ({
  useLanguage: () => ({
    t: (key: string) => (key === "equivalentTo" ? "Equivalent to" : key),
    language: "en",
  }),
}));

describe("src/components/CurrencyCostInput", () => {
  it("renders label and inputs properly", () => {
    const onAmountChange = vi.fn();
    const onCurrencyChange = vi.fn();

    render(
      <CurrencyCostInput
        label="Currency & Hotel Cost"
        amount="5000"
        currency="THB"
        exchangeRate={0.24}
        onAmountChange={onAmountChange}
        onCurrencyChange={onCurrencyChange}
      />
    );

    expect(screen.getByText("Currency & Hotel Cost")).toBeInTheDocument();
    const input = screen.getByDisplayValue("5000");
    expect(input).toBeInTheDocument();
  });

  it("calls onAmountChange when user types in amount input", () => {
    const onAmountChange = vi.fn();
    const onCurrencyChange = vi.fn();

    render(
      <CurrencyCostInput
        label="Currency & Hotel Cost"
        amount="5000"
        currency="THB"
        exchangeRate={0.24}
        onAmountChange={onAmountChange}
        onCurrencyChange={onCurrencyChange}
      />
    );

    const input = screen.getByDisplayValue("5000");
    fireEvent.change(input, { target: { value: "6000" } });
    expect(onAmountChange).toHaveBeenCalledWith("6000");
  });

  it("shows dual currency equivalence when amount > 0", () => {
    render(
      <CurrencyCostInput
        label="Cost"
        amount="10000"
        currency="JPY"
        exchangeRate={0.24}
        onAmountChange={vi.fn()}
        onCurrencyChange={vi.fn()}
      />
    );

    expect(screen.getByText(/Equivalent to/i)).toBeInTheDocument();
    // 10000 JPY * 0.24 = 2400 THB
    expect(screen.getByText(/2,400\.00/)).toBeInTheDocument();
  });

  it("auto-converts amount when switching currency", () => {
    const onAmountChange = vi.fn();
    const onCurrencyChange = vi.fn();

    render(
      <CurrencyCostInput
        label="Cost"
        amount="10000"
        currency="JPY"
        exchangeRate={0.24}
        onAmountChange={onAmountChange}
        onCurrencyChange={onCurrencyChange}
      />
    );

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "THB" } });

    // 10000 * 0.24 = 2400
    expect(onAmountChange).toHaveBeenCalledWith("2400");
    expect(onCurrencyChange).toHaveBeenCalledWith("THB");
  });

  it("renders extra children slot (e.g. IC card toggle)", () => {
    render(
      <CurrencyCostInput
        label="Cost"
        amount="1000"
        currency="JPY"
        exchangeRate={0.24}
        onAmountChange={vi.fn()}
        onCurrencyChange={vi.fn()}
      >
        <span data-testid="extra-child">IC Card Checkbox</span>
      </CurrencyCostInput>
    );

    expect(screen.getByTestId("extra-child")).toBeInTheDocument();
  });
});
