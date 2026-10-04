import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import NavbarClient from "@/components/NavbarClient";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// Mock LanguageContext
vi.mock("@/context/LanguageContext", () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        overview: "Overview",
        hotelsAndPasses: "Split Bill",
        excelMatrix: "Cost Matrix",
        allTrips: "All Trips",
        days: "Days",
        day: "Day",
        exportPdf: "Export PDF",
      };
      return map[key] || key;
    },
    language: "en",
  }),
}));

// Mock SettingsKebab
vi.mock("@/components/SettingsKebab", () => ({
  default: () => <div data-testid="settings-kebab">Settings</div>,
}));

describe("src/components/NavbarClient", () => {
  const defaultProps = {
    tripId: "trip-123",
    tripTitle: "Japan Trip Autumn",
    startDate: "2026-10-10T00:00:00.000Z",
    endDate: "2026-10-15T00:00:00.000Z",
    days: [
      { id: "day-1", dayNumber: 1, title: "Tokyo Arrival", slug: "day-1" },
      { id: "day-2", dayNumber: 2, title: "Shinjuku & Shibuya", slug: "day-2" },
    ],
  };

  it("renders Split Bill and Cost Matrix tabs when user is owner (isOwner=true)", () => {
    render(<NavbarClient {...defaultProps} isOwner={true} />);

    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("Split Bill")).toBeInTheDocument();
    expect(screen.getByText("Cost Matrix")).toBeInTheDocument();
  });

  it("hides Split Bill and Cost Matrix tabs when shared publicly with non-owner (isOwner=false)", () => {
    render(<NavbarClient {...defaultProps} isOwner={false} />);

    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.queryByText("Split Bill")).not.toBeInTheDocument();
    expect(screen.queryByText("Cost Matrix")).not.toBeInTheDocument();
  });
});
