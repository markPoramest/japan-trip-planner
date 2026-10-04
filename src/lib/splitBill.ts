/**
 * Split Bill helper functions and types.
 * Calculates fair split allocations for pre-booked fixed costs (Hotels, Flights, Passes)
 * based on selected members per item or equal overall split.
 */

export interface SplitMember {
  id: string;
  name: string;
  avatarColor?: string;
}

export interface SplitItem {
  id: string;
  type: "hotel" | "flight" | "pass";
  title: string;
  subtitle?: string;
  costThb: number;
  costJpy: number;
  isSplitEnabled?: boolean; // When false, this item is excluded from bill splitting
  // List of member IDs sharing this item (empty means all members)
  memberIds: string[];
}

export interface MemberShare {
  member: SplitMember;
  totalThb: number;
  totalJpy: number;
  items: {
    itemId: string;
    type: "hotel" | "flight" | "pass";
    title: string;
    shareThb: number;
    shareJpy: number;
    splitWithCount: number;
  }[];
}

export interface SplitBillSummary {
  totalThb: number;
  totalJpy: number;
  memberShares: MemberShare[];
  unassignedCostThb: number;
  unassignedCostJpy: number;
}

const DEFAULT_AVATAR_COLORS = [
  "bg-emerald-500 text-white",
  "bg-amber-500 text-white",
  "bg-indigo-500 text-white",
  "bg-rose-500 text-white",
  "bg-purple-500 text-white",
  "bg-cyan-500 text-white",
  "bg-orange-500 text-white",
  "bg-teal-500 text-white",
];

export function getAvatarColor(index: number): string {
  return DEFAULT_AVATAR_COLORS[index % DEFAULT_AVATAR_COLORS.length];
}

/**
 * Calculates member shares from items and member assignments.
 * If an item has no specific memberIds assigned, it is shared equally among all members.
 */
export function calculateSplitBill(
  members: SplitMember[],
  items: SplitItem[]
): SplitBillSummary {
  let totalThb = 0;
  let totalJpy = 0;

  // Initialize shares map
  const sharesMap = new Map<string, MemberShare>();
  members.forEach((m) => {
    sharesMap.set(m.id, {
      member: m,
      totalThb: 0,
      totalJpy: 0,
      items: [],
    });
  });

  let unassignedCostThb = 0;
  let unassignedCostJpy = 0;

  items.forEach((item) => {
    // Skip if user explicitly disabled splitting for this item
    if (item.isSplitEnabled === false) {
      return;
    }

    totalThb += item.costThb || 0;
    totalJpy += item.costJpy || 0;

    // Determine who shares this item
    let beneficiaries = item.memberIds && item.memberIds.length > 0
      ? item.memberIds.filter((id) => sharesMap.has(id))
      : members.map((m) => m.id);

    if (beneficiaries.length === 0) {
      unassignedCostThb += item.costThb || 0;
      unassignedCostJpy += item.costJpy || 0;
      return;
    }

    const count = beneficiaries.length;
    const shareThb = Math.round(((item.costThb || 0) / count) * 100) / 100;
    const shareJpy = Math.round((item.costJpy || 0) / count);

    beneficiaries.forEach((mId) => {
      const ms = sharesMap.get(mId);
      if (ms) {
        ms.totalThb += shareThb;
        ms.totalJpy += shareJpy;
        ms.items.push({
          itemId: item.id,
          type: item.type,
          title: item.title,
          shareThb,
          shareJpy,
          splitWithCount: count,
        });
      }
    });
  });

  const memberShares = Array.from(sharesMap.values());

  return {
    totalThb,
    totalJpy,
    memberShares,
    unassignedCostThb,
    unassignedCostJpy,
  };
}
