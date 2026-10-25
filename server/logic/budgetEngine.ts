import { BudgetCategory, EventType, PriorityTier } from '../../shared/types.ts';

export interface CategorySpec {
  id: string;
  name: string;
  weight: number;
  priorityTier: PriorityTier;
  notes?: string;
}

export const DEFAULT_CATEGORY_SPECS: Record<EventType, CategorySpec[]> = {
  wedding: [
    { id: 'venue', name: 'Venue & Banquets', weight: 30, priorityTier: 'must-have', notes: 'Ceremony and reception banquet space' },
    { id: 'catering', name: 'Catering & Beverages', weight: 28, priorityTier: 'must-have', notes: 'Multi-course meals, appetizers, live stations' },
    { id: 'decor', name: 'Theme Decor & Floral Mandap', weight: 14, priorityTier: 'important', notes: 'Stage, lighting, floral arrangements' },
    { id: 'photography', name: 'Photography & Cinematography', weight: 8, priorityTier: 'important', notes: 'Candid, traditional, drone footage' },
    { id: 'attire', name: 'Bridal & Groom Attire', weight: 7, priorityTier: 'important', notes: 'Wedding couture and accessories' },
    { id: 'entertainment', name: 'DJ, Music & Performers', weight: 4, priorityTier: 'nice-to-have', notes: 'Sound, light, live artist' },
    { id: 'invitations', name: 'Invitations & Stationery', weight: 2, priorityTier: 'nice-to-have', notes: 'Digital & physical cards' },
    { id: 'transport', name: 'Guest Transport & Logistics', weight: 2, priorityTier: 'nice-to-have', notes: 'Guest shuttles and bridal car' },
    { id: 'miscellaneous', name: 'Pooja Items & Favors', weight: 2, priorityTier: 'nice-to-have', notes: 'Ritual items, return gifts' },
    { id: 'contingency_buffer', name: 'Contingency Buffer', weight: 3, priorityTier: 'must-have', notes: 'Emergency fund for unforeseen expenses' },
  ],
  birthday: [
    { id: 'venue', name: 'Party Venue / Play Arena', weight: 28, priorityTier: 'must-have', notes: 'Private hall or fun activity zone' },
    { id: 'catering', name: 'Food, Drinks & Theme Cake', weight: 34, priorityTier: 'must-have', notes: 'Custom designer cake, finger food, dinner' },
    { id: 'entertainment', name: 'Emcee, Magician & Games', weight: 15, priorityTier: 'important', notes: 'Magic show, balloon artist, tattoo artist' },
    { id: 'decor', name: 'Theme Balloon & Backdrop Decor', weight: 12, priorityTier: 'important', notes: 'Balloon garland, custom cutouts' },
    { id: 'miscellaneous', name: 'Return Gifts & Party Favors', weight: 5, priorityTier: 'nice-to-have', notes: 'Curated goodie hampers' },
    { id: 'photography', name: 'Candid Birthday Photography', weight: 3, priorityTier: 'nice-to-have', notes: 'Photo coverage & mini album' },
    { id: 'contingency_buffer', name: 'Contingency Buffer', weight: 3, priorityTier: 'must-have', notes: 'Emergency cushion' },
  ],
  community: [
    { id: 'venue', name: 'Community Hall / Ground', weight: 25, priorityTier: 'must-have', notes: 'Ground rental and civic permissions' },
    { id: 'catering', name: 'Community Meals & Prasad', weight: 28, priorityTier: 'must-have', notes: 'Buffet or prasad distribution' },
    { id: 'decor', name: 'Lighting, Tent & Stage Setup', weight: 20, priorityTier: 'must-have', notes: 'Pandal, stage backdrop, sound setup' },
    { id: 'entertainment', name: 'Cultural Artists & Sound System', weight: 14, priorityTier: 'important', notes: 'Folk singers, anchor, sound acoustics' },
    { id: 'miscellaneous', name: 'Safety, Licenses & Prizes', weight: 5, priorityTier: 'important', notes: 'Fire clearance, medical kit, trophies' },
    { id: 'photography', name: 'Event Coverage & Live Stream', weight: 3, priorityTier: 'nice-to-have', notes: 'Documentary footage' },
    { id: 'contingency_buffer', name: 'Contingency & Weather Buffer', weight: 5, priorityTier: 'must-have', notes: 'Unforeseen costs & weather safety' },
  ],
};

/**
 * Deterministically normalizes category allocations to sum exactly to totalBudget in integer rupees.
 * Any remainder due to floor division is assigned to the contingency buffer (or last category).
 */
export function normalizeBudgetAllocations(
  totalBudget: number,
  specs: CategorySpec[],
  existingCategories?: BudgetCategory[]
): BudgetCategory[] {
  if (totalBudget <= 0) {
    throw new Error('Total budget must be greater than zero');
  }
  if (!specs || specs.length === 0) {
    throw new Error('At least one budget category specification is required');
  }

  const existingMap = new Map<string, BudgetCategory>();
  if (existingCategories) {
    for (const cat of existingCategories) {
      existingMap.set(cat.id, cat);
    }
  }

  const totalWeight = specs.reduce((acc, s) => acc + Math.max(0, s.weight), 0);
  if (totalWeight <= 0) {
    throw new Error('Total category weights must be greater than zero');
  }

  let allocatedSum = 0;
  const categories: BudgetCategory[] = specs.map((spec) => {
    const existing = existingMap.get(spec.id);
    const rawAllocated = Math.floor((spec.weight / totalWeight) * totalBudget);
    allocatedSum += rawAllocated;

    return {
      id: spec.id,
      name: spec.name,
      priorityTier: spec.priorityTier,
      allocatedAmount: rawAllocated,
      actualSpend: existing ? existing.actualSpend : 0,
      notes: spec.notes || existing?.notes,
      items: existing ? existing.items : [],
    };
  });

  // Remainder integer rupees goes to the contingency buffer or the largest category
  const remainder = totalBudget - allocatedSum;
  if (remainder !== 0) {
    let targetIndex = categories.findIndex((c) => c.id === 'contingency_buffer');
    if (targetIndex === -1) {
      targetIndex = 0;
    }
    categories[targetIndex].allocatedAmount += remainder;
  }

  return categories;
}
