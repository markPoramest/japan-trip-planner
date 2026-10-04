import { describe, it, expect } from "vitest";
import { calculateSplitBill, SplitMember, SplitItem } from "@/lib/splitBill";

describe("src/lib/splitBill", () => {
  const members: SplitMember[] = [
    { id: "m-1", name: "Mark" },
    { id: "m-2", name: "Jane" },
    { id: "m-3", name: "Ken" },
  ];

  it("splits items equally among all members when memberIds is empty", () => {
    const items: SplitItem[] = [
      {
        id: "hotel-1",
        type: "hotel",
        title: "Hotel Gracery Shinjuku",
        costThb: 9000,
        costJpy: 37500,
        memberIds: [],
      },
    ];

    const result = calculateSplitBill(members, items);

    expect(result.totalThb).toBe(9000);
    expect(result.totalJpy).toBe(37500);
    expect(result.memberShares.length).toBe(3);

    // Each member should have 9000 / 3 = 3000 THB
    result.memberShares.forEach((share) => {
      expect(share.totalThb).toBe(3000);
      expect(share.totalJpy).toBe(12500);
      expect(share.items.length).toBe(1);
    });
  });

  it("handles custom member split (e.g. only 2 out of 3 share a twin room)", () => {
    const items: SplitItem[] = [
      {
        id: "hotel-twin",
        type: "hotel",
        title: "Twin Room for Mark & Jane",
        costThb: 6000,
        costJpy: 25000,
        memberIds: ["m-1", "m-2"], // Only Mark and Jane
      },
      {
        id: "pass-all",
        type: "pass",
        title: "JR Pass for Everyone",
        costThb: 15000,
        costJpy: 62500,
        memberIds: [], // All 3 members
      },
    ];

    const result = calculateSplitBill(members, items);

    expect(result.totalThb).toBe(21000);

    const mark = result.memberShares.find((ms) => ms.member.id === "m-1");
    const jane = result.memberShares.find((ms) => ms.member.id === "m-2");
    const ken = result.memberShares.find((ms) => ms.member.id === "m-3");

    // Mark: 6000/2 + 15000/3 = 3000 + 5000 = 8000 THB
    expect(mark?.totalThb).toBe(8000);
    // Jane: 3000 + 5000 = 8000 THB
    expect(jane?.totalThb).toBe(8000);
    // Ken: 0 + 5000 = 5000 THB
    expect(ken?.totalThb).toBe(5000);

    expect(mark?.items.length).toBe(2);
    expect(ken?.items.length).toBe(1);
  });

  it("handles empty items array gracefully", () => {
    const result = calculateSplitBill(members, []);
    expect(result.totalThb).toBe(0);
    expect(result.totalJpy).toBe(0);
    expect(result.memberShares.length).toBe(3);
    result.memberShares.forEach((ms) => {
      expect(ms.totalThb).toBe(0);
      expect(ms.items).toEqual([]);
    });
  });

  it("tracks unassigned items if all memberIds are invalid", () => {
    const items: SplitItem[] = [
      {
        id: "flight-orphan",
        type: "flight",
        title: "Flight with unknown user",
        costThb: 10000,
        costJpy: 40000,
        memberIds: ["non-existent-member"],
      },
    ];

    const result = calculateSplitBill(members, items);
    expect(result.unassignedCostThb).toBe(10000);
    expect(result.unassignedCostJpy).toBe(40000);
  });

  it("excludes items where isSplitEnabled is false", () => {
    const items: SplitItem[] = [
      {
        id: "hotel-included",
        type: "hotel",
        title: "Included Hotel",
        costThb: 6000,
        costJpy: 25000,
        isSplitEnabled: true,
        memberIds: [],
      },
      {
        id: "pass-personal",
        type: "pass",
        title: "Personal Unsplit Pass",
        costThb: 5000,
        costJpy: 20000,
        isSplitEnabled: false, // User chose not to split this item
        memberIds: [],
      },
    ];

    const result = calculateSplitBill(members, items);

    // Only 6000 THB is included in the split, not 11000
    expect(result.totalThb).toBe(6000);
    expect(result.totalJpy).toBe(25000);

    // Each member owes 6000 / 3 = 2000 THB
    result.memberShares.forEach((share) => {
      expect(share.totalThb).toBe(2000);
      expect(share.items.length).toBe(1);
      expect(share.items[0].title).toBe("Included Hotel");
    });
  });
});
