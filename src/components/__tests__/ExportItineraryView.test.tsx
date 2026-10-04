import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ExportItineraryView from "@/components/ExportItineraryView";

// Mock LanguageContext
vi.mock("@/context/LanguageContext", () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        backToTrip: "Back to Trip",
        printOrSavePdf: "Print / Save PDF",
        immigrationItineraryTitle: "JAPAN TRAVEL ITINERARY",
        flightInformation: "Flight Information",
        accommodationList: "Accommodations & Stays",
        transitPassTitle: "Transit Passes",
        scheduleAndTransit: "Day-by-Day Itinerary & Transportation",
        day: "Day",
        dayUnit: "day",
        daysUnit: "days",
        timeCol: "Time",
        locationCol: "Location",
        activityCol: "Activity Details",
        passCol: "Transit Pass / Remarks",
      };
      return map[key] || key;
    },
    language: "en",
    setLanguage: vi.fn(),
  }),
}));

describe("src/components/ExportItineraryView", () => {
  const dummyTrip = {
    id: "trip-test",
    title: "Central Japan Trip",
    description: "Alpine route and Tokyo",
    startDate: "2026-05-07T00:00:00.000Z",
    endDate: "2026-05-17T00:00:00.000Z",
    flights: [
      { id: "f-1", flightNo: "TG644", route: "BKK -> NGO", notes: "Morning flight" },
    ],
    hotels: [
      {
        id: "h-1",
        name: "Smile Hotel Premium Kanazawa",
        dateRange: "7 May - 9 May 2026",
        checkIn: "2026-05-07T00:00:00.000Z",
        checkOut: "2026-05-09T00:00:00.000Z",
      },
    ],
    passes: [
      { id: "p-1", name: "Takayama-Hokuriku Area Tourist Pass", validDays: 5 },
    ],
    days: [
      {
        id: "day-1",
        dayNumber: 1,
        date: "2026-05-07T00:00:00.000Z",
        dayOfWeek: "Thu",
        title: "Nagoya to Kanazawa",
        activities: [
          {
            id: "act-1",
            time: "08:00",
            location: "Chubu Centrair Airport",
            activity: "Arrive and pick up rail pass",
            cost: 0,
            usingPass: "Takayama-Hokuriku Pass",
          },
        ],
      },
    ],
  };

  it("renders printable document with header, flights, hotels, and schedule", () => {
    render(<ExportItineraryView trip={dummyTrip} />);

    expect(screen.getByText("Central Japan Trip")).toBeInTheDocument();
    expect(screen.getByText("TG644")).toBeInTheDocument();
    expect(screen.getByText("Smile Hotel Premium Kanazawa")).toBeInTheDocument();
    expect(screen.getByText("Chubu Centrair Airport")).toBeInTheDocument();
    expect(screen.getByText("Day-by-Day Itinerary & Transportation")).toBeInTheDocument();
  });

  it("ensures day cards and table header have crisp top border, and Day 1 flows on Page 1", () => {
    const { container } = render(<ExportItineraryView trip={dummyTrip} />);

    // Day 1 flows directly on Page 1 without a schedule-break class
    const scheduleSection = container.querySelector(".print-schedule-break");
    expect(scheduleSection).not.toBeInTheDocument();

    const dayCard = container.querySelector(".print-day-card");
    expect(dayCard).toBeInTheDocument();
    expect(dayCard).toHaveClass("print:break-inside-avoid");

    const theadRow = container.querySelector("thead tr");
    expect(theadRow).toBeInTheDocument();
    expect(theadRow).toHaveClass("print:border-t-2");

    const row = container.querySelector("tbody tr");
    expect(row).toBeInTheDocument();
    expect(row).toHaveClass("print:break-inside-avoid");
  });
});
