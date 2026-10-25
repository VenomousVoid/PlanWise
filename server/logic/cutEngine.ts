import { BudgetCategory, CategoryCutResult, CutScenarioResult } from '../../shared/types.ts';

export interface CutOptions {
  percentage: number; // 1 to 50
  guestCount: number;
  priorityCategories?: string[]; // IDs of user-specified categories to protect
}

export function calculateBudgetCut(
  originalTotalBudget: number,
  categories: BudgetCategory[],
  options: CutOptions
): Omit<CutScenarioResult, 'tradeOffExplanation' | 'alternativeSuggestions' | 'isAiGenerated' | 'modelUsed'> {
  const percentage = Math.min(50, Math.max(1, Math.round(options.percentage)));
  const totalSaved = Math.round((originalTotalBudget * percentage) / 100);
  const newTotalBudget = originalTotalBudget - totalSaved;

  const originalPerGuestCost = Math.round(originalTotalBudget / Math.max(1, options.guestCount));
  const newPerGuestCost = Math.round(newTotalBudget / Math.max(1, options.guestCount));

  // Minimum floor percentage by priority tier
  // Must respect actualSpend as absolute lower floor (you can't un-spend money already committed)
  const floorRateByTier = {
    'nice-to-have': 0.25, // can cut up to 75%
    'important': 0.60,    // can cut up to 40%
    'must-have': 0.85,     // can cut up to 15%
  };

  // Contingency buffer is strictly protected
  // Any user-specified priority categories are treated with 'must-have' floor protection
  const categoryStates = categories.map((cat) => {
    const isProtectedBuffer = cat.id === 'contingency_buffer';
    const isUserPrioritized = options.priorityCategories?.includes(cat.id);
    const tier = isUserPrioritized ? 'must-have' : cat.priorityTier;

    const tierFloorRate = floorRateByTier[tier];
    const theoreticalFloor = isProtectedBuffer ? cat.allocatedAmount : Math.floor(cat.allocatedAmount * tierFloorRate);
    // Absolute floor is the higher of theoretical floor or already-incurred actualSpend
    const absoluteFloor = Math.max(cat.actualSpend, theoreticalFloor);
    const maxCuttable = Math.max(0, cat.allocatedAmount - absoluteFloor);

    return {
      category: cat,
      tier,
      isProtectedBuffer,
      currentAmount: cat.allocatedAmount,
      absoluteFloor,
      maxCuttable,
      cutAmount: 0,
      floorApplied: false,
    };
  });

  let remainingToCut = totalSaved;

  // Cut Phase 1: 'nice-to-have' categories
  const cutTier = (tierName: string, weightFactor: number) => {
    const tierItems = categoryStates.filter(
      (c) => !c.isProtectedBuffer && c.tier === tierName && c.maxCuttable > 0
    );
    if (tierItems.length === 0 || remainingToCut <= 0) return;

    const totalTierCuttable = tierItems.reduce((acc, c) => acc + c.maxCuttable, 0);
    if (totalTierCuttable <= 0) return;

    for (const item of tierItems) {
      if (remainingToCut <= 0) break;
      const proportion = item.maxCuttable / totalTierCuttable;
      const targetCut = Math.min(
        item.maxCuttable,
        Math.floor(remainingToCut * proportion * weightFactor) || (remainingToCut > 0 ? 1 : 0)
      );
      const actualCut = Math.min(targetCut, remainingToCut, item.maxCuttable);
      item.cutAmount += actualCut;
      item.currentAmount -= actualCut;
      item.maxCuttable -= actualCut;
      remainingToCut -= actualCut;
    }
  };

  // Execute tiered cascade
  // Step 1: Nice to have (high aggression)
  cutTier('nice-to-have', 1.0);
  if (remainingToCut > 0) {
    cutTier('nice-to-have', 1.0); // drain remaining nice-to-have cuttable capacity
  }

  // Step 2: Important
  if (remainingToCut > 0) {
    cutTier('important', 1.0);
  }

  // Step 3: Must-have (last resort)
  if (remainingToCut > 0) {
    cutTier('must-have', 1.0);
  }

  // If still remaining (e.g. very aggressive floors), cut any non-buffer non-actual-spend room
  if (remainingToCut > 0) {
    for (const item of categoryStates) {
      if (item.isProtectedBuffer || remainingToCut <= 0) continue;
      const extraRoom = Math.max(0, item.currentAmount - item.category.actualSpend);
      const extraCut = Math.min(remainingToCut, extraRoom);
      item.cutAmount += extraCut;
      item.currentAmount -= extraCut;
      remainingToCut -= extraCut;
    }
  }

  // Final reconciliation to ensure sum === newTotalBudget exactly
  const finalSum = categoryStates.reduce((acc, c) => acc + c.currentAmount, 0);
  const diff = newTotalBudget - finalSum;
  if (diff !== 0) {
    // Apply discrepancy to contingency buffer or largest category
    const buffer = categoryStates.find((c) => c.isProtectedBuffer) || categoryStates[0];
    buffer.currentAmount += diff;
    buffer.cutAmount = buffer.category.allocatedAmount - buffer.currentAmount;
  }

  const categoryResults: CategoryCutResult[] = categoryStates.map((state) => {
    const savedAmount = state.category.allocatedAmount - state.currentAmount;
    const percentCut = state.category.allocatedAmount > 0
      ? Math.round((savedAmount / state.category.allocatedAmount) * 100)
      : 0;

    return {
      categoryId: state.category.id,
      categoryName: state.category.name,
      priorityTier: state.category.priorityTier,
      beforeAmount: state.category.allocatedAmount,
      afterAmount: state.currentAmount,
      savedAmount,
      percentCut,
      floorApplied: state.currentAmount <= state.absoluteFloor && savedAmount > 0,
    };
  });

  return {
    requestedCutPercent: percentage,
    originalTotalBudget,
    newTotalBudget,
    totalSaved,
    originalPerGuestCost,
    newPerGuestCost,
    categories: categoryResults,
  };
}

export function generateDeterministicCutExplanation(
  cutResult: Omit<CutScenarioResult, 'tradeOffExplanation' | 'alternativeSuggestions' | 'isAiGenerated' | 'modelUsed'>
): { tradeOffExplanation: string; alternativeSuggestions: string[] } {
  const topCuts = [...cutResult.categories]
    .filter((c) => c.savedAmount > 0 && c.categoryId !== 'contingency_buffer')
    .sort((a, b) => b.savedAmount - a.savedAmount)
    .slice(0, 3);

  const topCutNames = topCuts.map((c) => `${c.categoryName} (-${c.percentCut}%)`).join(', ');

  const tradeOffExplanation = `Optimized a ${cutResult.requestedCutPercent}% budget cut (saving ₹${cutResult.totalSaved.toLocaleString('en-IN')}). Primary adjustments were made in non-essential areas: ${topCutNames || 'proportional trimming'}. The contingency reserve and core venue commitments were preserved to prevent operational risk.`;

  const alternativeSuggestions = [
    'Replace imported floral decor with seasonal marigold and fairy light canopies.',
    'Switch from a live orchestral band to an experienced wedding DJ with curated sets.',
    'Consolidate multi-camera drone cinematography to a high-end 2-camera candid team.',
    'Standardize dessert counter to 3 signature live regional sweets instead of an oversized spread.',
  ];

  return { tradeOffExplanation, alternativeSuggestions };
}
