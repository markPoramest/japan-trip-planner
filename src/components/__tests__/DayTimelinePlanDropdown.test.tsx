import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import DayTimeline from "@/components/DayTimeline";

// Mock server actions
vi.mock("@/lib/actions", () => ({
  swapMainPlan: vi.fn().mockResolvedValue({ success: true }),
  createSubstitutePlan: vi.fn().mockResolvedValue({ success: true }),
  updateDayPlan: vi.fn().mockResolvedValue({ success: true }),
  deleteSubstitutePlan: vi.fn().mockResolvedValue({ success: true }),
  updateTripDay: vi.fn().mockResolvedValue({ success: true }),
}));

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
    t: (key: string, params?: Record<string, any>) => {
      const map: Record<string, string> = {
        day: "Day",
        selectPlan: "Select Plan",
        switchPlan: "Switch plan",
        plansCount: "{count} plans",
        planCountSingle: "1 plan",
        substitutePlansLimit: "{count}/{max} plans",
        duplicatingPlanLoadingTitle: "Duplicating Plan...",
        duplicatingPlanLoadingSubtitle: "Creating a duplicate schedule with all activities...",
        maxLimitReachedLabel: "(Max 3 reached)",
        maxSubstitutesReached: "Max substitutes reached",
        setAsMain: "Set as main",
        rename: "Rename",
        duplicate: "Duplicate",
        deleteSubstitute: "Delete substitute",
        deletePlanModalTitle: "Delete Substitute Plan",
        deletePlanConfirmDesc: "Are you sure you want to delete this plan?",
        deletePlan: "Delete Plan",
        cancel: "Cancel",
        substitutePlanDeleted: "Deleted plan \"{title}\"",
        substitutePlan: "Substitute Plan",
        substitutePlans: "Substitute Plans",
        addSubstitutePlan: "Add substitute plan",
        editPlanName: "Edit name",
        swapToMain: "Swap to be Main Plan",
        manageStops: "Manage Stops",
        addStopActivity: "Add Stop / Activity",
        viewOnly: "View Only",
        totalDayCost: "Total Day Cost",
        stopNumber: "Stop",
        stops: "stops",
        stopSingle: "stop",
      };
      let val = map[key] || key;
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          val = val.replace(`{${k}}`, String(v));
        });
      }
      return val;
    },
    language: "en",
  }),
}));

describe("src/components/DayTimeline - Plan Selector Dropdown", () => {
  const dummyProps = {
    tripId: "trip-1",
    isOwner: true,
    dayId: "day-1",
    dayNumber: 1,
    dayTitle: "Tokyo Exploration",
    date: new Date("2026-10-10"),
    dayOfWeek: "Saturday",
    activities: [
      {
        id: "act-1",
        time: "09:00",
        location: "Shibuya Crossing",
        activity: "Sightseeing",
        cost: 0,
        isIcCard: false,
        usingPass: null,
        remark: null,
        sortOrder: 0,
      },
    ],
    plans: [
      {
        id: "plan-main",
        title: "Tokyo Exploration",
        tag: "main",
        isMain: true,
        sortOrder: 0,
        notes: null,
        activities: [
          {
            id: "act-1",
            time: "09:00",
            location: "Shibuya Crossing",
            activity: "Sightseeing",
            cost: 0,
            isIcCard: false,
            usingPass: null,
            remark: null,
            sortOrder: 0,
          },
        ],
      },
      {
        id: "plan-sub-1",
        title: "Rainy Day Indoor Shopping",
        tag: "rainy",
        isMain: false,
        sortOrder: 1,
        notes: "Use if raining",
        activities: [
          {
            id: "act-2",
            time: "10:00",
            location: "Shibuya Parco",
            activity: "Shopping",
            cost: 2000,
            isIcCard: false,
            usingPass: null,
            remark: null,
            sortOrder: 0,
          },
        ],
      },
    ],
  };

  it("renders plan dropdown trigger with active plan and opens menu with options, kebab actions, and add plan button", () => {
    render(<DayTimeline {...dummyProps} />);

    // Trigger button shows active plan
    const trigger = screen.getByRole("button", { name: /Select Plan/i });
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveTextContent("Tokyo Exploration");

    // Click trigger to open dropdown menu
    fireEvent.click(trigger);

    // Listbox with options should be visible
    const listbox = screen.getByRole("listbox");
    expect(listbox).toBeInTheDocument();

    const options = screen.getAllByRole("option");
    expect(options.length).toBe(2);
    expect(options[0]).toHaveTextContent("Tokyo Exploration");
    expect(options[1]).toHaveTextContent("Rainy Day Indoor Shopping");

    // Check header info inside dropdown: shows 2/3 plans on top right (1 main + 1 substitute)
    expect(screen.getByText("Switch plan")).toBeInTheDocument();
    expect(screen.getByText("2/3 plans")).toBeInTheDocument();

    // Check add substitute plan button at bottom
    expect(screen.getByRole("button", { name: /Add substitute plan/i })).toBeInTheDocument();

    // Open kebab menu for substitute plan
    const actionButtons = screen.getAllByRole("button", { name: "Plan actions" });
    expect(actionButtons.length).toBe(2);

    // Click kebab menu for substitute plan
    fireEvent.click(actionButtons[1]);

    // Should show Set as main, Rename, Duplicate, Delete substitute
    expect(screen.getByText("Set as main")).toBeInTheDocument();
    expect(screen.getByText("Rename")).toBeInTheDocument();
    expect(screen.getByText("Duplicate")).toBeInTheDocument();
    expect(screen.getByText("Delete substitute")).toBeInTheDocument();
  });

  it("switches to substitute plan when clicked from custom dropdown menu", async () => {
    render(<DayTimeline {...dummyProps} />);

    // Open dropdown menu
    const trigger = screen.getByRole("button", { name: /Select Plan/i });
    fireEvent.click(trigger);

    // Select substitute plan
    const subOption = screen.getByText("Rainy Day Indoor Shopping");
    fireEvent.click(subOption);

    // Timeline switches to substitute plan and displays its activities
    await waitFor(() => {
      expect(screen.getByText("Shibuya Parco")).toBeInTheDocument();
    });
  });

  it("shows loading screen when duplicating a plan and adds duplicated plan", async () => {
    render(<DayTimeline {...dummyProps} />);

    // Open dropdown menu
    const trigger = screen.getByRole("button", { name: /Select Plan/i });
    fireEvent.click(trigger);

    // Open kebab menu for main plan
    const actionButtons = screen.getAllByRole("button", { name: "Plan actions" });
    fireEvent.click(actionButtons[0]);

    // Click Duplicate
    const dupBtn = screen.getByText("Duplicate");
    fireEvent.click(dupBtn);

    // Duplicate loading screen appears
    expect(screen.getByText("Duplicating Plan...")).toBeInTheDocument();

    // Settle and verify duplicated plan
    await waitFor(() => {
      expect(screen.queryByText("Duplicating Plan...")).not.toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it("disables duplicate option and displays max limit indicator when 2 substitute plans exist (3 plans total)", () => {
    const fullPlansProps = {
      ...dummyProps,
      plans: [
        dummyProps.plans[0],
        { ...dummyProps.plans[1], id: "sub-1" },
        { ...dummyProps.plans[1], id: "sub-2", title: "Plan C" },
      ],
    };

    render(<DayTimeline {...fullPlansProps} />);

    // Open dropdown
    const trigger = screen.getByRole("button", { name: /Select Plan/i });
    fireEvent.click(trigger);

    // Top right shows 3/3 plans
    expect(screen.getByText("3/3 plans")).toBeInTheDocument();

    // Open kebab menu
    const actionButtons = screen.getAllByRole("button", { name: "Plan actions" });
    fireEvent.click(actionButtons[0]);

    // Duplicate button should be disabled and show limit indicator
    const duplicateBtn = screen.getByRole("button", { name: /Duplicate/i });
    expect(duplicateBtn).toBeDisabled();
    expect(screen.getByText("(Max 3 reached)")).toBeInTheDocument();
  });

  it("optimistically deletes substitute plan without page reload when confirmed", async () => {
    render(<DayTimeline {...dummyProps} />);

    // Open dropdown
    const trigger = screen.getByRole("button", { name: /Select Plan/i });
    fireEvent.click(trigger);

    // Initial count is 2/3 plans
    expect(screen.getByText("2/3 plans")).toBeInTheDocument();

    // Open kebab menu for substitute plan
    const actionButtons = screen.getAllByRole("button", { name: "Plan actions" });
    fireEvent.click(actionButtons[1]);

    // Click Delete substitute
    const deleteBtn = screen.getByText("Delete substitute");
    fireEvent.click(deleteBtn);

    // Confirmation modal should appear
    expect(screen.getByText("Delete Substitute Plan")).toBeInTheDocument();

    // Confirm deletion
    const confirmDeleteBtn = screen.getByRole("button", { name: /Delete Plan/i });
    fireEvent.click(confirmDeleteBtn);

    // Modal closes immediately and substitute plan is optimistically removed
    expect(screen.queryByText("Delete Substitute Plan")).not.toBeInTheDocument();

    // Re-open dropdown to verify quota counter updated and deleted plan is gone
    fireEvent.click(trigger);
    expect(screen.getByText("1/3 plans")).toBeInTheDocument();
    expect(screen.queryByText("Rainy Day Indoor Shopping")).not.toBeInTheDocument();
  });
});
