import { Guest, BudgetCategory } from '../../shared/types.ts';

export interface HeadcountSummary {
  expectedGuests: number;
  confirmedGuests: number;
  declinedGuests: number;
  maybeGuests: number;
  pendingGuests: number;
  totalWithPlusOnes: number;
  confirmedWithPlusOnes: number;
  dietaryBreakdown: {
    veg: number;
    nonVeg: number;
    jain: number;
    vegan: number;
  };
  groupBreakdown: Record<string, number>;
  cateringPerHeadEstimate: number;
  venuePerHeadEstimate: number;
  adjustedCateringRequirement: number;
}

export function calculateGuestMetrics(
  guests: Guest[],
  expectedTotalGuestCount: number,
  budgetCategories: BudgetCategory[]
): HeadcountSummary {
  let confirmedGuests = 0;
  let declinedGuests = 0;
  let maybeGuests = 0;
  let pendingGuests = 0;
  let totalWithPlusOnes = 0;
  let confirmedWithPlusOnes = 0;

  const dietaryBreakdown = {
    veg: 0,
    nonVeg: 0,
    jain: 0,
    vegan: 0,
  };

  const groupBreakdown: Record<string, number> = {};

  for (const g of guests) {
    const attendees = 1 + (g.plusOnes || 0);
    totalWithPlusOnes += attendees;

    // RSVP Status counts
    if (g.rsvpStatus === 'yes') {
      confirmedGuests++;
      confirmedWithPlusOnes += attendees;
    } else if (g.rsvpStatus === 'no') {
      declinedGuests++;
    } else if (g.rsvpStatus === 'maybe') {
      maybeGuests++;
    } else {
      pendingGuests++;
    }

    // Dietary
    if (g.rsvpStatus === 'yes' || g.rsvpStatus === 'maybe') {
      if (g.dietary === 'veg') dietaryBreakdown.veg += attendees;
      else if (g.dietary === 'non-veg') dietaryBreakdown.nonVeg += attendees;
      else if (g.dietary === 'jain') dietaryBreakdown.jain += attendees;
      else if (g.dietary === 'vegan') dietaryBreakdown.vegan += attendees;
    }

    // Group breakdown
    const grp = g.groupSide || 'general';
    groupBreakdown[grp] = (groupBreakdown[grp] || 0) + attendees;
  }

  // Budget category estimates
  const cateringCat = budgetCategories.find((c) => c.id === 'catering');
  const venueCat = budgetCategories.find((c) => c.id === 'venue');

  const basePlannedCount = Math.max(1, expectedTotalGuestCount);
  const cateringAllocated = cateringCat?.allocatedAmount || 0;
  const venueAllocated = venueCat?.allocatedAmount || 0;

  const cateringPerHeadEstimate = Math.round(cateringAllocated / basePlannedCount);
  const venuePerHeadEstimate = Math.round(venueAllocated / basePlannedCount);

  // Active head requirement: If there are confirmed guests, project catering based on confirmed + 50% of maybes + 25% of pendings, or expected count
  const effectiveProjectedAttendees = confirmedWithPlusOnes > 0
    ? Math.max(confirmedWithPlusOnes, Math.round(confirmedWithPlusOnes + maybeGuests * 0.5 + pendingGuests * 0.25))
    : basePlannedCount;

  const adjustedCateringRequirement = Math.round(cateringPerHeadEstimate * effectiveProjectedAttendees);

  return {
    expectedGuests: basePlannedCount,
    confirmedGuests,
    declinedGuests,
    maybeGuests,
    pendingGuests,
    totalWithPlusOnes,
    confirmedWithPlusOnes,
    dietaryBreakdown,
    groupBreakdown,
    cateringPerHeadEstimate,
    venuePerHeadEstimate,
    adjustedCateringRequirement,
  };
}
