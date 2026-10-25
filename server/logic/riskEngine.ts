import { Event, RiskItem, RiskAnalysisResult } from '../../shared/types.ts';

export function evaluateEventRisks(event: Event, currentDateStr?: string): RiskAnalysisResult {
  const risks: RiskItem[] = [];
  const today = currentDateStr ? new Date(currentDateStr + 'T00:00:00Z') : new Date();
  const eventDate = new Date(event.date + 'T00:00:00Z');
  const daysLeft = Math.round((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  // Check 1: Outdoor Venue without Rain/Weather contingency
  const isOutdoor = event.preferences.venueType === 'outdoor' || event.preferences.venueType === 'both';
  if (isOutdoor) {
    const hasTentDecor = event.budgetCategories.some(
      (c) => c.id === 'decor' && c.items.some((i) => /tent|canopy|waterproof|pandal/i.test(i.name))
    );
    if (!hasTentDecor) {
      risks.push({
        id: 'risk-outdoor-weather',
        ruleId: 'RULE_OUTDOOR_WEATHER_BACKUP',
        severity: 'high',
        title: 'Outdoor Venue Lacks Rain & Weather Contingency',
        description: `The event includes outdoor arrangements (${event.preferences.venueType}), but neither a waterproof canopy nor an indoor standby agreement was detected in the plan.`,
        mitigationSuggestion: 'Contract a high-grade German pagoda or waterproof tensile canopy, and secure an adjacent indoor banquet hold with the venue manager.',
        isAiEnhanced: false,
      });
    }
  }

  // Check 2: Contingency Buffer Health
  const bufferCat = event.budgetCategories.find((c) => c.id === 'contingency_buffer');
  const bufferAllocated = bufferCat?.allocatedAmount || 0;
  const bufferRatio = event.totalBudget > 0 ? bufferAllocated / event.totalBudget : 0;

  if (bufferAllocated === 0) {
    risks.push({
      id: 'risk-zero-buffer',
      ruleId: 'RULE_ZERO_CONTINGENCY_BUFFER',
      severity: 'high',
      title: 'Zero Contingency Buffer Allocated',
      description: 'Your budget has no allocated emergency cushion. Any unanticipated vendor overtime, guest surge, or tax changes will trigger a direct deficit.',
      mitigationSuggestion: 'Reallocate at least 3% to 5% of your total budget into the Contingency Buffer by trimming nice-to-have categories.',
      isAiEnhanced: false,
    });
  } else if (bufferRatio < 0.02) {
    risks.push({
      id: 'risk-low-buffer',
      ruleId: 'RULE_LOW_CONTINGENCY_BUFFER',
      severity: 'medium',
      title: 'Contingency Buffer Below Recommended Safe Margin',
      description: `Current contingency is ${(bufferRatio * 100).toFixed(1)}% of total budget (recommended: 3% to 5%).`,
      mitigationSuggestion: 'Increase buffer allocation by at least ₹15,000 to cover emergency logistics or extra meal plates.',
      isAiEnhanced: false,
    });
  }

  // Check 3: Unconfirmed Key Vendors Close to Event Date
  const keyCategories = ['venue', 'catering'];
  for (const catId of keyCategories) {
    const categoryVendors = event.vendors.filter((v) => v.category === catId);
    const hasBookedVendor = categoryVendors.some((v) => v.status === 'booked' || v.status === 'paid');

    if (!hasBookedVendor && daysLeft <= 60) {
      risks.push({
        id: `risk-unconfirmed-${catId}`,
        ruleId: 'RULE_UNCONFIRMED_KEY_VENDOR',
        severity: daysLeft <= 30 ? 'high' : 'medium',
        title: `Crucial Vendor for ${catId.toUpperCase()} Not Finalized`,
        description: `With only ${daysLeft} days until the event, no ${catId} vendor is confirmed or booked in your vendor checklist.`,
        mitigationSuggestion: `Immediately lock down and issue token advance payment for your ${catId} vendor to secure date exclusivity.`,
        isAiEnhanced: false,
      });
    }
  }

  // Check 4: Category Overspending
  for (const cat of event.budgetCategories) {
    if (cat.actualSpend > cat.allocatedAmount && cat.allocatedAmount > 0) {
      const overspendAmount = cat.actualSpend - cat.allocatedAmount;
      const overspendPercent = Math.round((overspendAmount / cat.allocatedAmount) * 100);

      risks.push({
        id: `risk-overspend-${cat.id}`,
        ruleId: 'RULE_CATEGORY_OVERSPEND',
        severity: overspendPercent > 20 ? 'high' : 'medium',
        title: `Budget Overrun in ${cat.name}`,
        description: `Actual spend of ₹${cat.actualSpend.toLocaleString('en-IN')} exceeds planned allocation of ₹${cat.allocatedAmount.toLocaleString('en-IN')} by ₹${overspendAmount.toLocaleString('en-IN')} (+${overspendPercent}%).`,
        mitigationSuggestion: `Audit pending ${cat.name} deliverables and offset the ₹${overspendAmount.toLocaleString('en-IN')} overrun from entertainment or decor allocations.`,
        isAiEnhanced: false,
      });
    }
  }

  // Check 5: Guest RSVP Uncertainty & Headcount Mismatch
  if (event.guests.length > 0) {
    const totalConfirmedGuests = event.guests
      .filter((g) => g.rsvpStatus === 'yes')
      .reduce((sum, g) => sum + 1 + (g.plusOnes || 0), 0);

    const pendingCount = event.guests.filter((g) => g.rsvpStatus === 'pending').length;

    if (totalConfirmedGuests > event.guestCount * 1.1) {
      risks.push({
        id: 'risk-headcount-over-capacity',
        ruleId: 'RULE_HEADCOUNT_EXCEEDED',
        severity: 'high',
        title: 'Confirmed Headcount Exceeds Planned Venue Capacity',
        description: `Confirmed guests (${totalConfirmedGuests}) exceed planned event guest count (${event.guestCount}) by ${totalConfirmedGuests - event.guestCount} attendees.`,
        mitigationSuggestion: 'Notify your caterer and venue manager to arrange additional seating clusters and meal plates immediately.',
        isAiEnhanced: false,
      });
    } else if (daysLeft <= 15 && pendingCount > 0) {
      risks.push({
        id: 'risk-pending-rsvps',
        ruleId: 'RULE_PENDING_RSVPS_NEAR_DATE',
        severity: 'medium',
        title: 'Unconfirmed RSVPs Less Than 15 Days Out',
        description: `There are still ${pendingCount} guests with pending RSVPs. Final catering guarantees require fixed counts.`,
        mitigationSuggestion: 'Send a prompt WhatsApp reminder asking guests to confirm attendance within 48 hours for food arrangement.',
        isAiEnhanced: false,
      });
    }
  }

  // Calculate Health Score (100 baseline, -20 per high risk, -10 per medium risk, -5 per low risk)
  let scoreDeduction = 0;
  for (const r of risks) {
    if (r.severity === 'high') scoreDeduction += 20;
    else if (r.severity === 'medium') scoreDeduction += 10;
    else scoreDeduction += 5;
  }
  const overallScore = Math.max(10, Math.min(100, 100 - scoreDeduction));

  return {
    eventId: event.id,
    overallScore,
    risks,
    checkedAt: new Date().toISOString(),
    isAiEnhanced: false,
  };
}
