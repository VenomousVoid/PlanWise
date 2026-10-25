import React, { useState, useEffect } from 'react';
import { useEvent } from '../../context/EventContext.tsx';
import { formatINR, formatCompactINR } from '../../utils/currency.ts';
import { getDaysRemaining, formatDate } from '../../utils/dates.ts';
import { AccessibleChart } from '../common/AccessibleChart.tsx';
import { generateEventPlanPdf } from '../../utils/pdfExport.ts';
import { TabKey } from '../common/Navigation.tsx';
import { api } from '../../api/client.ts';
import { RiskAnalysisResult } from '../../../shared/types.ts';
import {
  Calendar,
  IndianRupee,
  Users,
  Store,
  CheckCircle2,
  Clock,
  ShieldCheck,
  TrendingUp,
  FileDown,
  Sparkles,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react';

interface DashboardViewProps {
  onNavigateTab: (tab: TabKey) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigateTab }) => {
  const { activeEvent } = useEvent();
  const [risks, setRisks] = useState<RiskAnalysisResult | null>(null);

  useEffect(() => {
    if (activeEvent) {
      api.getRisks(activeEvent.id).then((r) => setRisks(r.risks)).catch(console.error);
    }
  }, [activeEvent]);

  if (!activeEvent) {
    return (
      <div className="text-center py-20">
        <p className="text-[var(--text-muted)]">No active event selected.</p>
      </div>
    );
  }

  const daysLeft = getDaysRemaining(activeEvent.date);
  const totalSpent = activeEvent.budgetCategories.reduce((sum, c) => sum + c.actualSpend, 0);
  const budgetUtilization = activeEvent.totalBudget > 0 ? Math.round((totalSpent / activeEvent.totalBudget) * 100) : 0;

  const totalTasks = activeEvent.timelineTasks.length;
  const completedTasks = activeEvent.timelineTasks.filter((t) => t.status === 'done').length;

  const confirmedGuests = activeEvent.guests
    .filter((g) => g.rsvpStatus === 'yes')
    .reduce((sum, g) => sum + 1 + (g.plusOnes || 0), 0);

  const bookedVendors = activeEvent.vendors.filter((v) => v.status === 'booked' || v.status === 'paid').length;

  const healthScore = risks?.overallScore || 90;

  return (
    <div className="space-y-6">
      {/* Hero Event Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 sm:p-8 shadow-sm">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20">
                {activeEvent.type}
              </span>
              <span className="text-xs text-[var(--text-secondary)] font-medium">
                {formatDate(activeEvent.date)} • {activeEvent.city}
              </span>
            </div>
            <h1 className="font-serif font-bold text-2xl sm:text-3xl lg:text-4xl text-[var(--text-primary)] tracking-tight">
              {activeEvent.name}
            </h1>
            <p className="text-sm text-[var(--text-secondary)] max-w-2xl">
              {activeEvent.styleTheme} • {activeEvent.preferences.culturalTradition}
            </p>
          </div>

          {/* Countdown Pill & Health Badge */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
            <div className="p-4 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-center min-w-[120px]">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">
                Countdown
              </span>
              <span className="font-serif font-bold text-2xl sm:text-3xl text-[var(--primary)]">
                {daysLeft > 0 ? `${daysLeft}d` : 'Today!'}
              </span>
              <span className="text-[10px] text-[var(--text-secondary)] block">
                {daysLeft > 0 ? 'Remaining' : 'Celebration Day'}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-center min-w-[120px]">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">
                Plan Health
              </span>
              <span
                className={`font-serif font-bold text-2xl sm:text-3xl ${
                  healthScore >= 80 ? 'text-emerald-600' : healthScore >= 60 ? 'text-amber-600' : 'text-red-600'
                }`}
              >
                {healthScore}%
              </span>
              <span className="text-[10px] text-[var(--text-secondary)] block">
                {risks?.risks.length || 0} Gaps Flagged
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Budget Card */}
        <div
          onClick={() => onNavigateTab('budget')}
          className="p-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] hover:border-[var(--primary)] transition-all cursor-pointer shadow-xs group"
        >
          <div className="flex items-center justify-between text-[var(--text-muted)] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Budget</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 group-hover:scale-110 transition-transform">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="font-serif font-bold text-xl sm:text-2xl text-[var(--text-primary)]">
            {formatINR(activeEvent.totalBudget)}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-[var(--text-secondary)]">
            <span>Spent: {formatINR(totalSpent)}</span>
            <span className="font-semibold font-mono">{budgetUtilization}%</span>
          </div>
          <div className="mt-1.5 h-1.5 w-full bg-[var(--bg-subtle)] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                budgetUtilization > 100 ? 'bg-red-500' : 'bg-[var(--primary)]'
              }`}
              style={{ width: `${Math.min(100, budgetUtilization)}%` }}
            ></div>
          </div>
        </div>

        {/* Guests Card */}
        <div
          onClick={() => onNavigateTab('guests')}
          className="p-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] hover:border-[var(--primary)] transition-all cursor-pointer shadow-xs group"
        >
          <div className="flex items-center justify-between text-[var(--text-muted)] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Guest Headcount</span>
            <div className="p-2 rounded-lg bg-teal-500/10 text-teal-600 group-hover:scale-110 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="font-serif font-bold text-xl sm:text-2xl text-[var(--text-primary)]">
            {activeEvent.guestCount}
          </div>
          <div className="mt-2 text-xs text-[var(--text-secondary)] flex justify-between">
            <span>Confirmed RSVPs</span>
            <span className="font-semibold text-emerald-700 dark:text-emerald-400">
              {confirmedGuests} attendees
            </span>
          </div>
        </div>

        {/* Vendors Card */}
        <div
          onClick={() => onNavigateTab('vendors')}
          className="p-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] hover:border-[var(--primary)] transition-all cursor-pointer shadow-xs group"
        >
          <div className="flex items-center justify-between text-[var(--text-muted)] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Vendors Secured</span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 group-hover:scale-110 transition-transform">
              <Store className="w-4 h-4" />
            </div>
          </div>
          <div className="font-serif font-bold text-xl sm:text-2xl text-[var(--text-primary)]">
            {bookedVendors} / {activeEvent.vendors.length}
          </div>
          <div className="mt-2 text-xs text-[var(--text-secondary)] flex justify-between">
            <span>Categories covered</span>
            <span className="font-semibold text-[var(--text-primary)]">
              {new Set(activeEvent.vendors.map((v) => v.category)).size} categories
            </span>
          </div>
        </div>

        {/* Tasks Card */}
        <div
          onClick={() => onNavigateTab('timeline')}
          className="p-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] hover:border-[var(--primary)] transition-all cursor-pointer shadow-xs group"
        >
          <div className="flex items-center justify-between text-[var(--text-muted)] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Milestone Progress</span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="font-serif font-bold text-xl sm:text-2xl text-[var(--text-primary)]">
            {completedTasks} / {totalTasks}
          </div>
          <div className="mt-2 text-xs text-[var(--text-secondary)] flex justify-between">
            <span>Completed</span>
            <span className="font-semibold text-[var(--primary)]">
              {totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%
            </span>
          </div>
        </div>
      </div>

      {/* Accessible Budget Charts (F17) */}
      <AccessibleChart categories={activeEvent.budgetCategories} totalBudget={activeEvent.totalBudget} />

      {/* Quick Actions & High Priority Items */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Launch Tools */}
        <div className="p-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] space-y-3">
          <h3 className="font-serif font-bold text-base text-[var(--text-primary)]">
            Smart Planning Actions
          </h3>

          <div className="space-y-2">
            <button
              onClick={() => onNavigateTab('budget')}
              className="w-full p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:border-[var(--primary)] transition-all text-left flex items-center justify-between text-xs font-semibold text-[var(--text-primary)] cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-[var(--primary)]" />
                <span>Simulate 10% / 15% Budget Cuts</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={() => onNavigateTab('ideas')}
              className="w-full p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:border-[var(--primary)] transition-all text-left flex items-center justify-between text-xs font-semibold text-[var(--text-primary)] cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <TrendingUp className="w-4 h-4 text-[var(--accent)]" />
                <span>Explore Themed Ideas & Add to Budget</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={() => generateEventPlanPdf(activeEvent)}
              className="w-full p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:border-[var(--primary)] transition-all text-left flex items-center justify-between text-xs font-semibold text-[var(--text-primary)] cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <FileDown className="w-4 h-4 text-amber-600" />
                <span>Export Master Plan (Printable PDF)</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* Priority Risks Callout */}
        <div className="lg:col-span-2 p-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-serif font-bold text-base text-[var(--text-primary)] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[var(--primary)]" />
              <span>Risk & Readiness Radar</span>
            </h3>
            <button
              onClick={() => onNavigateTab('risks')}
              className="text-xs font-semibold text-[var(--primary)] hover:underline flex items-center gap-1 cursor-pointer"
            >
              All Risks ({risks?.risks.length || 0}) <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {risks?.risks && risks.risks.length > 0 ? (
            <div className="space-y-2.5">
              {risks.risks.slice(0, 2).map((risk) => (
                <div
                  key={risk.id}
                  className={`p-3 rounded-xl border text-xs flex items-start gap-3 ${
                    risk.severity === 'high'
                      ? 'border-red-500/20 bg-red-500/5'
                      : 'border-amber-500/20 bg-amber-500/5'
                  }`}
                >
                  <AlertTriangle
                    className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                      risk.severity === 'high' ? 'text-red-600' : 'text-amber-600'
                    }`}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[var(--text-primary)]">{risk.title}</span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold uppercase bg-[var(--bg-card)]">
                        {risk.severity}
                      </span>
                    </div>
                    <p className="text-[var(--text-secondary)] mt-0.5">{risk.description}</p>
                    <p className="text-emerald-700 dark:text-emerald-400 font-medium mt-1">
                      💡 Mitigation: {risk.mitigationSuggestion}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-xs text-[var(--text-muted)]">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-1" />
              All core logistics, vendor confirmations, and buffer requirements are on track!
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
