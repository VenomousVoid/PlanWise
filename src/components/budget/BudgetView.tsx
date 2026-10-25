import React, { useState } from 'react';
import { useEvent } from '../../context/EventContext.tsx';
import { formatINR } from '../../utils/currency.ts';
import { BudgetCategory, CutScenarioResult, PriorityTier } from '../../../shared/types.ts';
import { api } from '../../api/client.ts';
import {
  Sparkles,
  TrendingDown,
  Shield,
  AlertTriangle,
  Check,
  Plus,
  Save,
  RotateCcw,
  Sliders,
  ArrowRight,
  Info,
} from 'lucide-react';

export const BudgetView: React.FC = () => {
  const { activeEvent, updateBudgetCategories, addBudgetItem, refreshActiveEvent } = useEvent();
  const [isEditing, setIsEditing] = useState(false);
  const [editedCategories, setEditedCategories] = useState<BudgetCategory[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'advisor'>('overview');

  // Smart Budget Advisor & Cut Scenario State
  const [cutPercentage, setCutPercentage] = useState<number>(10);
  const [customSlider, setCustomSlider] = useState<number>(20);
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);
  const [cutResult, setCutResult] = useState<CutScenarioResult | null>(null);
  const [isCalculatingCut, setIsCalculatingCut] = useState(false);

  // New item drawer / modal state
  const [addItemCatId, setAddItemCatId] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [newItemAmount, setNewItemAmount] = useState<number>(15000);

  if (!activeEvent) return null;

  const totalSpent = activeEvent.budgetCategories.reduce((sum, c) => sum + c.actualSpend, 0);
  const totalAllocated = activeEvent.budgetCategories.reduce((sum, c) => sum + c.allocatedAmount, 0);
  const perGuestPlanned = Math.round(activeEvent.totalBudget / Math.max(1, activeEvent.guestCount));
  const perGuestActual = Math.round(totalSpent / Math.max(1, activeEvent.guestCount));

  // Handle start editing
  const handleStartEdit = () => {
    setEditedCategories(JSON.parse(JSON.stringify(activeEvent.budgetCategories)));
    setIsEditing(true);
  };

  // Handle save allocations
  const handleSaveEdit = async () => {
    await updateBudgetCategories(editedCategories);
    setIsEditing(false);
  };

  // Run Cut Scenario
  const handleRunCutScenario = async (percent: number) => {
    setIsCalculatingCut(true);
    setCutPercentage(percent);
    try {
      const res = await api.calculateCutScenario(activeEvent.id, percent, selectedPriorities);
      setCutResult(res.scenario);
      setActiveTab('advisor');
    } catch (err) {
      console.error('Failed to calculate cut scenario:', err);
    } finally {
      setIsCalculatingCut(false);
    }
  };

  // Apply cut scenario to current event budget
  const handleApplyCutScenario = async () => {
    if (!cutResult) return;
    const confirmed = confirm(
      `Apply this ${cutResult.requestedCutPercent}% cut scenario to your event budget? New total budget will be ${formatINR(
        cutResult.newTotalBudget
      )}.`
    );
    if (!confirmed) return;

    const newCategories: BudgetCategory[] = activeEvent.budgetCategories.map((cat) => {
      const cutCat = cutResult.categories.find((c) => c.categoryId === cat.id);
      return {
        ...cat,
        allocatedAmount: cutCat ? cutCat.afterAmount : cat.allocatedAmount,
      };
    });

    await updateBudgetCategories(newCategories);
    await refreshActiveEvent();
    alert('Optimized budget applied successfully!');
  };

  // Add Item to Category
  const handleAddItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addItemCatId || !newItemName.trim() || newItemAmount <= 0) return;

    await addBudgetItem(addItemCatId, newItemName.trim(), Number(newItemAmount), false);
    setAddItemCatId(null);
    setNewItemName('');
    setNewItemAmount(15000);
  };

  return (
    <div className="space-y-6">
      {/* View Header with Sub-tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)]">
        <div>
          <h2 className="font-serif font-bold text-xl text-[var(--text-primary)]">
            Budget Management & Smart Advisor
          </h2>
          <p className="text-xs text-[var(--text-secondary)]">
            Deterministic integer-rupee normalization, overspend tracking & AI budget cut scenario engine
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-[var(--primary)] text-[var(--primary-contrast)] shadow-xs'
                : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Category Allocations
          </button>
          <button
            onClick={() => setActiveTab('advisor')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'advisor'
                ? 'bg-[var(--primary)] text-[var(--primary-contrast)] shadow-xs'
                : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Smart Budget Advisor</span>
          </button>
        </div>
      </div>

      {/* Top Level Summary Metric Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">
            Total Budget
          </span>
          <span className="font-serif font-bold text-lg sm:text-xl text-[var(--text-primary)] font-mono">
            {formatINR(activeEvent.totalBudget)}
          </span>
          <span className="text-[10px] text-[var(--text-muted)] block mt-0.5">
            Planned per guest: {formatINR(perGuestPlanned)}
          </span>
        </div>

        <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">
            Actual Spent
          </span>
          <span
            className={`font-serif font-bold text-lg sm:text-xl font-mono ${
              totalSpent > activeEvent.totalBudget ? 'text-red-600' : 'text-emerald-700 dark:text-emerald-400'
            }`}
          >
            {formatINR(totalSpent)}
          </span>
          <span className="text-[10px] text-[var(--text-muted)] block mt-0.5">
            Actual per guest: {formatINR(perGuestActual)}
          </span>
        </div>

        <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">
            Remaining Cushion
          </span>
          <span
            className={`font-serif font-bold text-lg sm:text-xl font-mono ${
              activeEvent.totalBudget - totalSpent < 0 ? 'text-red-600' : 'text-[var(--primary)]'
            }`}
          >
            {formatINR(activeEvent.totalBudget - totalSpent)}
          </span>
          <span className="text-[10px] text-[var(--text-muted)] block mt-0.5">
            {Math.max(0, Math.round(((activeEvent.totalBudget - totalSpent) / activeEvent.totalBudget) * 100))}% free
          </span>
        </div>

        <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">
            Emergency Buffer
          </span>
          <span className="font-serif font-bold text-lg sm:text-xl text-amber-700 dark:text-amber-400 font-mono">
            {formatINR(activeEvent.budgetCategories.find((c) => c.id === 'contingency_buffer')?.allocatedAmount || 0)}
          </span>
          <span className="text-[10px] text-[var(--text-muted)] block mt-0.5">
            Protected against cuts
          </span>
        </div>
      </div>

      {/* TAB 1: CATEGORY ALLOCATIONS & EXPENSES */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif font-bold text-lg text-[var(--text-primary)]">
              Category Allocations & Items
            </h3>
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] text-xs font-semibold hover:bg-[var(--bg-subtle)] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--primary)] text-[var(--primary-contrast)] text-xs font-semibold hover:opacity-90 transition-opacity"
                  >
                    <Save className="w-3.5 h-3.5" /> Save Changes
                  </button>
                </>
              ) : (
                <button
                  onClick={handleStartEdit}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--primary)] transition-colors cursor-pointer"
                >
                  <Sliders className="w-3.5 h-3.5 text-[var(--primary)]" />
                  <span>Adjust Allocations</span>
                </button>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {(isEditing ? editedCategories : activeEvent.budgetCategories).map((cat, idx) => {
              const isOverspent = cat.actualSpend > cat.allocatedAmount && cat.allocatedAmount > 0;
              const overspentDiff = cat.actualSpend - cat.allocatedAmount;

              return (
                <div
                  key={cat.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isOverspent
                      ? 'border-red-500/30 bg-red-500/5'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-card)]'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-[var(--text-primary)]">{cat.name}</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                            cat.priorityTier === 'must-have'
                              ? 'bg-red-500/10 text-red-700 dark:text-red-400'
                              : cat.priorityTier === 'important'
                              ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                              : 'bg-blue-500/10 text-blue-700 dark:text-blue-400'
                          }`}
                        >
                          {cat.priorityTier}
                        </span>
                        {isOverspent && (
                          <span className="flex items-center gap-1 text-[11px] font-bold text-red-600 bg-red-100 dark:bg-red-950/50 px-2 py-0.5 rounded">
                            <AlertTriangle className="w-3 h-3" /> Overspent by {formatINR(overspentDiff)}
                          </span>
                        )}
                      </div>
                      {cat.notes && <p className="text-xs text-[var(--text-secondary)]">{cat.notes}</p>}
                    </div>

                    {/* Numeric Inputs / Values */}
                    <div className="flex items-center gap-4">
                      <div>
                        <span className="text-[10px] text-[var(--text-muted)] block text-right uppercase">Planned</span>
                        {isEditing ? (
                          <input
                            type="number"
                            step="1000"
                            min="0"
                            value={cat.allocatedAmount}
                            onChange={(e) => {
                              const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                              setEditedCategories((prev) =>
                                prev.map((c, i) => (i === idx ? { ...c, allocatedAmount: val } : c))
                              );
                            }}
                            className="w-28 px-2 py-1 text-right text-xs font-mono font-semibold rounded border border-[var(--border-subtle)] bg-[var(--bg-subtle)]"
                          />
                        ) : (
                          <span className="font-mono font-bold text-sm text-[var(--text-primary)]">
                            {formatINR(cat.allocatedAmount)}
                          </span>
                        )}
                      </div>

                      <div>
                        <span className="text-[10px] text-[var(--text-muted)] block text-right uppercase">Spent</span>
                        {isEditing ? (
                          <input
                            type="number"
                            step="1000"
                            min="0"
                            value={cat.actualSpend}
                            onChange={(e) => {
                              const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                              setEditedCategories((prev) =>
                                prev.map((c, i) => (i === idx ? { ...c, actualSpend: val } : c))
                              );
                            }}
                            className="w-28 px-2 py-1 text-right text-xs font-mono font-semibold rounded border border-[var(--border-subtle)] bg-[var(--bg-subtle)]"
                          />
                        ) : (
                          <span
                            className={`font-mono font-bold text-sm ${
                              isOverspent ? 'text-red-600' : 'text-emerald-700 dark:text-emerald-400'
                            }`}
                          >
                            {formatINR(cat.actualSpend)}
                          </span>
                        )}
                      </div>

                      {!isEditing && (
                        <button
                          onClick={() => setAddItemCatId(cat.id)}
                          className="p-1.5 rounded-lg border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--primary)] hover:border-[var(--primary)] transition-colors"
                          title={`Add planned or actual expense item to ${cat.name}`}
                          aria-label={`Add item to ${cat.name}`}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Itemized expenses if any */}
                  {cat.items && cat.items.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">
                        Committed Items ({cat.items.length})
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {cat.items.map((item) => (
                          <div
                            key={item.id}
                            className="px-2.5 py-1.5 rounded-lg bg-[var(--bg-subtle)] text-xs flex justify-between items-center"
                          >
                            <span className="text-[var(--text-primary)] truncate">{item.name}</span>
                            <span className="font-mono font-semibold text-[var(--text-secondary)]">
                              {formatINR(item.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: SMART BUDGET ADVISOR & CUT SCENARIOS (F6) */}
      {activeTab === 'advisor' && (
        <div className="space-y-6">
          {/* Controls Box */}
          <div className="p-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[var(--primary)]" />
              <div>
                <h3 className="font-serif font-bold text-base text-[var(--text-primary)]">
                  Smart Budget Optimizer & Cut Scenarios
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Need to trim costs? The server engine protects your contingency buffer and essential contracts while cascading cuts across non-critical categories.
                </p>
              </div>
            </div>

            {/* Quick Cut Buttons & Slider */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <span className="text-xs font-semibold text-[var(--text-primary)]">Quick Scenarios:</span>
              <button
                onClick={() => handleRunCutScenario(10)}
                disabled={isCalculatingCut}
                className="px-3.5 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:border-[var(--primary)] font-semibold text-xs text-[var(--text-primary)] flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                <TrendingDown className="w-3.5 h-3.5 text-amber-600" />
                <span>Cut 10% (Save {formatINR(activeEvent.totalBudget * 0.1)})</span>
              </button>

              <button
                onClick={() => handleRunCutScenario(15)}
                disabled={isCalculatingCut}
                className="px-3.5 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:border-[var(--primary)] font-semibold text-xs text-[var(--text-primary)] flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                <TrendingDown className="w-3.5 h-3.5 text-amber-600" />
                <span>Cut 15% (Save {formatINR(activeEvent.totalBudget * 0.15)})</span>
              </button>
            </div>

            {/* Custom Slider */}
            <div className="pt-3 border-t border-[var(--border-subtle)] flex flex-wrap items-center gap-4">
              <label htmlFor="custom-cut-slider" className="text-xs font-semibold text-[var(--text-primary)] min-w-[130px]">
                Custom Cut ({customSlider}%):
              </label>
              <input
                id="custom-cut-slider"
                type="range"
                min="1"
                max="50"
                value={customSlider}
                onChange={(e) => setCustomSlider(Number(e.target.value))}
                className="flex-1 max-w-xs accent-[var(--primary)]"
              />
              <button
                onClick={() => handleRunCutScenario(customSlider)}
                disabled={isCalculatingCut}
                className="px-4 py-1.5 rounded-lg bg-[var(--primary)] text-[var(--primary-contrast)] font-semibold text-xs hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
              >
                {isCalculatingCut ? 'Simulating...' : `Simulate ${customSlider}% Cut`}
              </button>
            </div>
          </div>

          {/* Results Display */}
          {cutResult && (
            <div className="p-6 rounded-2xl border border-[var(--primary)]/30 bg-[var(--bg-card)] space-y-6 animate-in fade-in">
              {/* Summary Stats */}
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[var(--border-subtle)]">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--primary)]">
                    {cutResult.requestedCutPercent}% Budget Cut Scenario Result
                  </span>
                  <div className="flex items-center gap-3 mt-1 font-mono">
                    <span className="text-sm line-through text-[var(--text-muted)]">
                      {formatINR(cutResult.originalTotalBudget)}
                    </span>
                    <ArrowRight className="w-4 h-4 text-[var(--text-muted)]" />
                    <span className="text-xl font-bold text-emerald-700 dark:text-emerald-400">
                      {formatINR(cutResult.newTotalBudget)}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold">
                      Total Saved: {formatINR(cutResult.totalSaved)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleApplyCutScenario}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 text-white font-semibold text-xs hover:bg-emerald-800 transition-colors shadow-sm cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  Apply This Scenario to Plan
                </button>
              </div>

              {/* AI vs Deterministic Trade-off Explanation Box */}
              <div className="p-4 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[var(--primary)]" />
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                      Trade-Off Analysis & Recommendations
                    </span>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-medium border ${
                      cutResult.isAiGenerated
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20'
                    }`}
                  >
                    {cutResult.isAiGenerated ? '✨ Gemini AI Analysis' : '🛡️ Deterministic Rule-Based Fallback'}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-primary)] leading-relaxed">
                  {cutResult.tradeOffExplanation}
                </p>

                {cutResult.alternativeSuggestions && cutResult.alternativeSuggestions.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-[var(--border-subtle)]">
                    <span className="text-[11px] font-semibold text-[var(--text-secondary)] block mb-1.5">
                      Suggested Smart Swaps:
                    </span>
                    <ul className="space-y-1 text-xs text-[var(--text-secondary)]">
                      {cutResult.alternativeSuggestions.map((sug, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-[var(--primary)] font-bold">•</span>
                          <span>{sug}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Before / After Category Breakdown Table */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                  Itemized Category Reductions
                </h4>
                <div className="overflow-x-auto rounded-xl border border-[var(--border-subtle)]">
                  <table className="min-w-full divide-y divide-[var(--border-subtle)] text-xs">
                    <thead className="bg-[var(--bg-subtle)] text-[var(--text-secondary)] font-semibold text-left">
                      <tr>
                        <th className="px-3 py-2.5">Category</th>
                        <th className="px-3 py-2.5">Priority</th>
                        <th className="px-3 py-2.5 text-right">Original</th>
                        <th className="px-3 py-2.5 text-right">New Budget</th>
                        <th className="px-3 py-2.5 text-right">Saved</th>
                        <th className="px-3 py-2.5 text-center">Floor Protection</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)]">
                      {cutResult.categories.map((c) => (
                        <tr key={c.categoryId} className="hover:bg-[var(--bg-subtle)] transition-colors">
                          <td className="px-3 py-2 font-medium text-[var(--text-primary)]">{c.categoryName}</td>
                          <td className="px-3 py-2">
                            <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-semibold bg-[var(--bg-subtle)] text-[var(--text-secondary)]">
                              {c.priorityTier}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-[var(--text-muted)]">
                            {formatINR(c.beforeAmount)}
                          </td>
                          <td className="px-3 py-2 text-right font-mono font-bold text-[var(--text-primary)]">
                            {formatINR(c.afterAmount)}
                          </td>
                          <td
                            className={`px-3 py-2 text-right font-mono font-semibold ${
                              c.savedAmount > 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-[var(--text-muted)]'
                            }`}
                          >
                            {c.savedAmount > 0 ? `-${formatINR(c.savedAmount)} (-${c.percentCut}%)` : 'Protected (0%)'}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {c.categoryId === 'contingency_buffer' ? (
                              <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 font-bold">
                                <Shield className="w-3 h-3" /> 100% Buffer Held
                              </span>
                            ) : c.floorApplied ? (
                              <span className="text-[10px] text-blue-600 font-medium">Floor Applied</span>
                            ) : (
                              <span className="text-[10px] text-[var(--text-muted)]">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Item Modal */}
      {addItemCatId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-subtle)] p-6 w-full max-w-sm shadow-xl space-y-4">
            <h3 className="font-serif font-bold text-base text-[var(--text-primary)]">
              Add Item to {activeEvent.budgetCategories.find((c) => c.id === addItemCatId)?.name}
            </h3>
            <form onSubmit={handleAddItemSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Item Description
                </label>
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="e.g. Saffron Marigold Garlands"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Amount (INR)
                </label>
                <input
                  type="number"
                  step="500"
                  min="1"
                  value={newItemAmount}
                  onChange={(e) => setNewItemAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] font-mono"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAddItemCatId(null)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-[var(--border-subtle)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-[var(--primary)] text-[var(--primary-contrast)]"
                >
                  Add Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
