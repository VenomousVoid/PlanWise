import React, { useState } from 'react';
import { useEvent } from '../../context/EventContext.tsx';
import { formatINR } from '../../utils/currency.ts';
import { Idea } from '../../../shared/types.ts';
import {
  Lightbulb,
  Sparkles,
  RotateCw,
  PlusCircle,
  Filter,
  Tag,
  Check,
} from 'lucide-react';

export const IdeasView: React.FC = () => {
  const { activeEvent, generateIdeas, addBudgetItem } = useEvent();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [maxBudgetFilter, setMaxBudgetFilter] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [addedIdeaIds, setAddedIdeaIds] = useState<Set<string>>(new Set());

  if (!activeEvent) return null;

  const totalSpent = activeEvent.budgetCategories.reduce((sum, c) => sum + c.actualSpend, 0);
  const remainingBudget = Math.max(0, activeEvent.totalBudget - totalSpent);

  const categories = Array.from(new Set(activeEvent.ideas.map((i) => i.category)));

  // Filter ideas
  const filteredIdeas = activeEvent.ideas.filter((idea) => {
    if (selectedCategory !== 'all' && idea.category !== selectedCategory) return false;
    if (maxBudgetFilter > 0 && idea.estimatedCostMin > maxBudgetFilter) return false;
    return true;
  });

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await generateIdeas();
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePushToBudget = async (idea: Idea) => {
    // Add to budget as planned item with average cost
    const targetAmount = Math.round((idea.estimatedCostMin + idea.estimatedCostMax) / 2);
    // Find matching category or fallback to entertainment/miscellaneous
    const targetCat = activeEvent.budgetCategories.find((c) => c.id === idea.category) || activeEvent.budgetCategories[0];

    await addBudgetItem(targetCat.id, idea.title, targetAmount, true);
    setAddedIdeaIds((prev) => new Set(prev).add(idea.id));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-serif font-bold text-xl text-[var(--text-primary)]">
              Personalized Experiential Ideas
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold uppercase bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
              Budget-Aware
            </span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Curated themes, interactive stations, sensory experiences & foodie delights tailored for {activeEvent.styleTheme}
          </p>
        </div>

        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--primary)] text-[var(--primary-contrast)] text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs disabled:opacity-50"
        >
          <Sparkles className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
          <span>{isGenerating ? 'Brainstorming Concepts...' : 'Generate New Ideas'}</span>
        </button>
      </div>

      {/* Filter Strip */}
      <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] flex flex-wrap items-center justify-between gap-4 text-xs">
        {/* Category Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-[var(--text-primary)]">Category:</span>
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-2.5 py-1 rounded-md font-semibold capitalize transition-colors ${
              selectedCategory === 'all'
                ? 'bg-[var(--primary)] text-[var(--primary-contrast)] shadow-xs'
                : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            All Ideas ({activeEvent.ideas.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-md font-semibold capitalize transition-colors ${
                selectedCategory === cat
                  ? 'bg-[var(--primary)] text-[var(--primary-contrast)] shadow-xs'
                  : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Budget-Aware Filter */}
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[var(--text-primary)]">Affordability Filter:</span>
          <button
            onClick={() => setMaxBudgetFilter(maxBudgetFilter === remainingBudget ? 0 : remainingBudget)}
            className={`px-3 py-1 rounded-md border font-semibold transition-colors ${
              maxBudgetFilter > 0
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-[var(--bg-card)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--primary)]'
            }`}
          >
            Fits Remaining Budget ({formatINR(remainingBudget)})
          </button>
        </div>
      </div>

      {/* Ideas Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredIdeas.length === 0 ? (
          <div className="col-span-full text-center py-16 text-xs text-[var(--text-muted)]">
            <Lightbulb className="w-8 h-8 mx-auto mb-2 text-amber-500 opacity-60" />
            No ideas found under selected criteria. Click "Generate New Ideas" to explore fresh creative concepts!
          </div>
        ) : (
          filteredIdeas.map((idea) => {
            const isAdded = addedIdeaIds.has(idea.id);
            const isAffordable = idea.estimatedCostMax <= remainingBudget;

            return (
              <div
                key={idea.id}
                className="p-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-xs hover:border-[var(--primary)]/50 transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider bg-[var(--bg-subtle)] text-[var(--text-secondary)]">
                      {idea.category}
                    </span>

                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        isAffordable
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                          : 'bg-stone-500/10 text-stone-600 dark:text-stone-400'
                      }`}
                    >
                      {isAffordable ? 'Within Budget' : 'Stretch Item'}
                    </span>
                  </div>

                  <h3 className="font-serif font-bold text-base text-[var(--text-primary)]">
                    {idea.title}
                  </h3>

                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    {idea.description}
                  </p>

                  {/* Tags */}
                  {idea.tags && idea.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {idea.tags.map((t, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] px-2 py-0.5 rounded bg-[var(--bg-subtle)] text-[var(--text-muted)] flex items-center gap-1"
                        >
                          <Tag className="w-2.5 h-2.5" /> {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bottom Bar: Estimated Range & Add to Budget Button */}
                <div className="mt-5 pt-3.5 border-t border-[var(--border-subtle)] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-[var(--text-muted)] block uppercase">Est. Cost Range</span>
                    <span className="font-mono font-bold text-xs text-[var(--text-primary)]">
                      {formatINR(idea.estimatedCostMin)} - {formatINR(idea.estimatedCostMax)}
                    </span>
                  </div>

                  <button
                    onClick={() => handlePushToBudget(idea)}
                    disabled={isAdded}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      isAdded
                        ? 'bg-emerald-600 text-white cursor-default'
                        : 'bg-[var(--primary)] text-[var(--primary-contrast)] hover:opacity-90 shadow-xs'
                    }`}
                  >
                    {isAdded ? (
                      <>
                        <Check className="w-3.5 h-3.5" /> Added to Budget
                      </>
                    ) : (
                      <>
                        <PlusCircle className="w-3.5 h-3.5" /> Add to Budget
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
