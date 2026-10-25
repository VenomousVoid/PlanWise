import React, { useState } from 'react';
import { BudgetCategory } from '../../../shared/types.ts';
import { formatINR } from '../../utils/currency.ts';
import { Table, BarChart3, AlertCircle } from 'lucide-react';

interface AccessibleChartProps {
  categories: BudgetCategory[];
  totalBudget: number;
}

export const AccessibleChart: React.FC<AccessibleChartProps> = ({ categories, totalBudget }) => {
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');
  const [hoveredCategory, setHoveredCategory] = useState<BudgetCategory | null>(null);

  const totalSpent = categories.reduce((sum, c) => sum + c.actualSpend, 0);
  const remainingBudget = Math.max(0, totalBudget - totalSpent);
  const isOverBudget = totalSpent > totalBudget;

  // Colors for donut segments
  const palette = [
    '#c2410c', // amber-rust
    '#0f766e', // teal
    '#2563eb', // blue
    '#7c3aed', // purple
    '#db2777', // pink
    '#d97706', // amber
    '#059669', // emerald
    '#4b5563', // gray
    '#0284c7', // sky
    '#dc2626', // red (contingency)
  ];

  // Donut SVG calculations
  const radius = 70;
  const strokeWidth = 26;
  const circumference = 2 * Math.PI * radius;
  let accumulatedOffset = 0;

  const donutSegments = categories.map((cat, idx) => {
    const fraction = totalBudget > 0 ? cat.allocatedAmount / totalBudget : 0;
    const strokeDasharray = `${fraction * circumference} ${circumference}`;
    const strokeDashoffset = -accumulatedOffset;
    accumulatedOffset += fraction * circumference;
    const color = palette[idx % palette.length];

    return {
      category: cat,
      color,
      strokeDasharray,
      strokeDashoffset,
      fraction,
    };
  });

  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h3 className="font-serif font-bold text-lg text-[var(--text-primary)]">
            Budget Distribution & Actual Spend
          </h3>
          <p className="text-xs text-[var(--text-secondary)]">
            Planned vs actual expenditures across all event categories
          </p>
        </div>

        {/* View Mode Toggle */}
        <button
          onClick={() => setViewMode(viewMode === 'chart' ? 'table' : 'chart')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--primary)] transition-colors focus:ring-2 focus:ring-[var(--border-focus)] cursor-pointer"
          aria-label={viewMode === 'chart' ? 'Switch to accessible data table' : 'Switch to chart visualization'}
        >
          {viewMode === 'chart' ? (
            <>
              <Table className="w-3.5 h-3.5 text-[var(--primary)]" />
              <span>Table View</span>
            </>
          ) : (
            <>
              <BarChart3 className="w-3.5 h-3.5 text-[var(--primary)]" />
              <span>Chart View</span>
            </>
          )}
        </button>
      </div>

      {viewMode === 'chart' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Donut Chart */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div className="relative w-48 h-48 sm:w-56 sm:h-56">
              <svg
                viewBox="0 0 200 200"
                className="w-full h-full transform -rotate-90"
                aria-label={`Donut chart representing allocation share. Total budget ${formatINR(totalBudget)}, actual spend ${formatINR(totalSpent)}.`}
                role="img"
              >
                <circle
                  cx="100"
                  cy="100"
                  r={radius}
                  fill="transparent"
                  stroke="var(--bg-subtle)"
                  strokeWidth={strokeWidth}
                />
                {donutSegments.map((seg, idx) => (
                  <circle
                    key={seg.category.id}
                    cx="100"
                    cy="100"
                    r={radius}
                    fill="transparent"
                    stroke={seg.color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={seg.strokeDasharray}
                    strokeDashoffset={seg.strokeDashoffset}
                    className="transition-all duration-300 hover:opacity-80 cursor-pointer"
                    onMouseEnter={() => setHoveredCategory(seg.category)}
                    onMouseLeave={() => setHoveredCategory(null)}
                  />
                ))}
              </svg>

              {/* Center Donut Label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2 pointer-events-none">
                <span className="text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                  {hoveredCategory ? hoveredCategory.name : 'Total Budget'}
                </span>
                <span className="font-serif font-bold text-base sm:text-lg text-[var(--text-primary)]">
                  {hoveredCategory ? formatINR(hoveredCategory.allocatedAmount) : formatINR(totalBudget)}
                </span>
                <span className="text-[10px] text-[var(--text-secondary)]">
                  {hoveredCategory
                    ? `Spend: ${formatINR(hoveredCategory.actualSpend)}`
                    : `Spent: ${formatINR(totalSpent)}`}
                </span>
              </div>
            </div>

            {/* Overall Spend Status Pill */}
            <div className="mt-4 flex items-center gap-2">
              <div
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                  isOverBudget
                    ? 'bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20'
                    : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                }`}
              >
                {isOverBudget && <AlertCircle className="w-3.5 h-3.5" />}
                <span>
                  {isOverBudget
                    ? `Over budget by ${formatINR(totalSpent - totalBudget)}`
                    : `Remaining: ${formatINR(remainingBudget)}`}
                </span>
              </div>
            </div>
          </div>

          {/* Bar Chart: Planned vs Actual by Category */}
          <div className="lg:col-span-7 space-y-3.5">
            <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-muted)] pb-1 border-b border-[var(--border-subtle)]">
              <span>Category & Priority</span>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[var(--primary)]"></span> Planned
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[var(--accent)]"></span> Actual
                </span>
              </div>
            </div>

            <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
              {categories.map((cat, idx) => {
                const maxVal = Math.max(cat.allocatedAmount, cat.actualSpend, 1);
                const plannedWidth = Math.min(100, Math.round((cat.allocatedAmount / maxVal) * 100));
                const actualWidth = Math.min(100, Math.round((cat.actualSpend / maxVal) * 100));
                const isOverspent = cat.actualSpend > cat.allocatedAmount && cat.allocatedAmount > 0;

                return (
                  <div
                    key={cat.id}
                    className="p-2 rounded-lg hover:bg-[var(--bg-subtle)] transition-colors text-xs"
                    onMouseEnter={() => setHoveredCategory(cat)}
                    onMouseLeave={() => setHoveredCategory(null)}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: palette[idx % palette.length] }}
                        ></span>
                        <span className="font-semibold text-[var(--text-primary)]">{cat.name}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded font-medium bg-[var(--bg-subtle)] text-[var(--text-muted)]">
                          {cat.priorityTier}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 font-mono">
                        <span className="text-[var(--text-secondary)]">{formatINR(cat.allocatedAmount)}</span>
                        <span className={isOverspent ? 'text-red-600 font-bold' : 'text-emerald-700 dark:text-emerald-400 font-medium'}>
                          {formatINR(cat.actualSpend)}
                        </span>
                      </div>
                    </div>

                    {/* Progress Track */}
                    <div className="space-y-1">
                      {/* Planned Bar */}
                      <div className="h-1.5 w-full bg-[var(--bg-subtle)] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[var(--primary)] rounded-full transition-all duration-300"
                          style={{ width: `${plannedWidth}%` }}
                        ></div>
                      </div>
                      {/* Actual Spend Bar */}
                      <div className="h-1.5 w-full bg-[var(--bg-subtle)] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isOverspent ? 'bg-red-500' : 'bg-[var(--accent)]'
                          }`}
                          style={{ width: `${actualWidth}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* Accessible Table Alternative */
        <div className="overflow-x-auto">
          <table
            className="min-w-full divide-y divide-[var(--border-subtle)] text-sm"
            aria-label="Itemized Budget Table"
          >
            <thead>
              <tr className="bg-[var(--bg-subtle)] text-[var(--text-secondary)] text-left text-xs uppercase tracking-wider font-semibold">
                <th scope="col" className="px-4 py-3">Category</th>
                <th scope="col" className="px-4 py-3">Priority Tier</th>
                <th scope="col" className="px-4 py-3 text-right">Planned (INR)</th>
                <th scope="col" className="px-4 py-3 text-right">Actual Spend (INR)</th>
                <th scope="col" className="px-4 py-3 text-right">Variance</th>
                <th scope="col" className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)] bg-[var(--bg-card)]">
              {categories.map((cat) => {
                const variance = cat.allocatedAmount - cat.actualSpend;
                const isOver = variance < 0;

                return (
                  <tr key={cat.id} className="hover:bg-[var(--bg-subtle)] transition-colors">
                    <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{cat.name}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-[var(--bg-subtle)] text-[var(--text-secondary)]">
                        {cat.priorityTier}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{formatINR(cat.allocatedAmount)}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold">{formatINR(cat.actualSpend)}</td>
                    <td className={`px-4 py-3 text-right font-mono font-semibold ${isOver ? 'text-red-600' : 'text-emerald-600'}`}>
                      {formatINR(variance)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          isOver
                            ? 'bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20'
                            : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                        }`}
                      >
                        {isOver ? 'Over budget' : 'On Track'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-[var(--bg-subtle)] font-bold text-[var(--text-primary)]">
                <td className="px-4 py-3">Total</td>
                <td className="px-4 py-3">—</td>
                <td className="px-4 py-3 text-right font-mono">{formatINR(totalBudget)}</td>
                <td className="px-4 py-3 text-right font-mono">{formatINR(totalSpent)}</td>
                <td
                  className={`px-4 py-3 text-right font-mono ${
                    totalBudget - totalSpent < 0 ? 'text-red-600' : 'text-emerald-600'
                  }`}
                >
                  {formatINR(totalBudget - totalSpent)}
                </td>
                <td className="px-4 py-3">
                  {totalSpent <= totalBudget ? 'Within Budget' : 'Deficit'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
};
