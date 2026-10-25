import React, { useState, useEffect } from 'react';
import { useEvent } from '../../context/EventContext.tsx';
import { RiskAnalysisResult, RiskItem, RiskSeverity } from '../../../shared/types.ts';
import { api } from '../../api/client.ts';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  Lightbulb,
} from 'lucide-react';

export const RisksView: React.FC = () => {
  const { activeEvent } = useEvent();
  const [riskData, setRiskData] = useState<RiskAnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState<'all' | RiskSeverity>('all');

  const fetchRisks = async () => {
    if (!activeEvent) return;
    setIsLoading(true);
    try {
      const res = await api.getRisks(activeEvent.id);
      setRiskData(res.risks);
    } catch (err) {
      console.error('Failed to evaluate risks:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRisks();
  }, [activeEvent]);

  if (!activeEvent) return null;

  const score = riskData?.overallScore || 100;
  const risksList = riskData?.risks || [];

  const filteredRisks = risksList.filter((r) => {
    if (filterSeverity !== 'all' && r.severity !== filterSeverity) return false;
    return true;
  });

  const highCount = risksList.filter((r) => r.severity === 'high').length;
  const mediumCount = risksList.filter((r) => r.severity === 'medium').length;
  const lowCount = risksList.filter((r) => r.severity === 'low').length;

  return (
    <div className="space-y-6">
      {/* Header with Health Score Banner */}
      <div className="p-6 rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)]">
                <ShieldAlert className="w-5 h-5" />
              </span>
              <h2 className="font-serif font-bold text-2xl text-[var(--text-primary)]">
                Risk & Readiness Radar
              </h2>
            </div>
            <p className="text-xs text-[var(--text-secondary)] max-w-xl">
              Deterministic rule-based gap analysis auditing outdoor weather safeguards, vendor confirmation deadlines, contingency reserves, and guest capacity limits.
            </p>
          </div>

          {/* Health Score Pill */}
          <div className="flex items-center gap-4 bg-[var(--bg-subtle)] border border-[var(--border-subtle)] p-4 rounded-2xl">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <svg className="w-16 h-16 transform -rotate-90">
                <circle
                  cx="32"
                  cy="32"
                  r="26"
                  stroke="var(--border-subtle)"
                  strokeWidth="6"
                  fill="transparent"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="26"
                  stroke={score >= 80 ? '#16a34a' : score >= 60 ? '#d97706' : '#dc2626'}
                  strokeWidth="6"
                  strokeDasharray={2 * Math.PI * 26}
                  strokeDashoffset={2 * Math.PI * 26 * (1 - score / 100)}
                  fill="transparent"
                  className="transition-all duration-700"
                />
              </svg>
              <span className="absolute font-serif font-bold text-lg text-[var(--text-primary)]">
                {score}%
              </span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider block">
                Overall Plan Health
              </span>
              <span className="font-semibold text-sm text-[var(--text-primary)] block">
                {score >= 80 ? 'Robust & Prepared' : score >= 60 ? 'Moderate Caution' : 'High Priority Gaps'}
              </span>
              <span className="text-xs text-[var(--text-secondary)]">
                {highCount} High • {mediumCount} Med • {lowCount} Low
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Strip & Refresh */}
      <div className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-[var(--text-primary)] mr-1">Filter Severity:</span>
          {(['all', 'high', 'medium', 'low'] as const).map((sev) => (
            <button
              key={sev}
              onClick={() => setFilterSeverity(sev)}
              className={`px-3 py-1.5 rounded-lg font-semibold uppercase tracking-wider transition-colors ${
                filterSeverity === sev
                  ? 'bg-[var(--primary)] text-[var(--primary-contrast)] shadow-xs'
                  : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>

        <button
          onClick={fetchRisks}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] text-xs font-semibold hover:border-[var(--primary)] transition-colors cursor-pointer disabled:opacity-50"
        >
          <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Re-evaluate Risks</span>
        </button>
      </div>

      {/* Risk Cards List */}
      <div className="space-y-3.5">
        {filteredRisks.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
            <h3 className="font-serif font-bold text-base text-[var(--text-primary)]">
              No Outstanding Risks Detected
            </h3>
            <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto">
              Your budget buffer is healthy, key vendor contracts are locked, and no outdoor weather or capacity gaps were found.
            </p>
          </div>
        ) : (
          filteredRisks.map((risk) => {
            const isHigh = risk.severity === 'high';
            const isMedium = risk.severity === 'medium';

            return (
              <div
                key={risk.id}
                className={`p-5 rounded-2xl border transition-all ${
                  isHigh
                    ? 'border-red-500/30 bg-red-500/5 shadow-xs'
                    : isMedium
                    ? 'border-amber-500/30 bg-amber-500/5'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-card)]'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`p-2 rounded-xl mt-0.5 flex-shrink-0 ${
                      isHigh
                        ? 'bg-red-500/10 text-red-600'
                        : isMedium
                        ? 'bg-amber-500/10 text-amber-600'
                        : 'bg-stone-500/10 text-stone-600'
                    }`}
                  >
                    {isHigh ? <AlertTriangle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                  </div>

                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-[var(--text-primary)]">
                          {risk.title}
                        </h4>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                            isHigh
                              ? 'bg-red-600 text-white'
                              : isMedium
                              ? 'bg-amber-500 text-white'
                              : 'bg-stone-500 text-white'
                          }`}
                        >
                          {risk.severity} Severity
                        </span>
                      </div>
                      <span className="text-[10px] text-[var(--text-muted)] font-mono">
                        Rule: {risk.ruleId}
                      </span>
                    </div>

                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      {risk.description}
                    </p>

                    {/* Mitigation Advice Box */}
                    <div className="mt-2.5 p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] flex items-start gap-2 text-xs">
                      <Lightbulb className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-emerald-700 dark:text-emerald-400 block">
                          Actionable Mitigation:
                        </span>
                        <p className="text-[var(--text-primary)] mt-0.5">
                          {risk.mitigationSuggestion}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
