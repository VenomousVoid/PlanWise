import React, { useEffect, useState } from 'react';
import { api } from '../../api/client.ts';
import { ShareSnapshot } from '../../../shared/types.ts';
import { formatINR } from '../../utils/currency.ts';
import { formatDate } from '../../utils/dates.ts';
import {
  Calendar,
  IndianRupee,
  Users,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Lock,
} from 'lucide-react';

interface PublicShareViewProps {
  token: string;
  onExit: () => void;
}

export const PublicShareView: React.FC<PublicShareViewProps> = ({ token, onExit }) => {
  const [snapshot, setSnapshot] = useState<ShareSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api
      .getPublicShareSnapshot(token)
      .then((res) => {
        setSnapshot(res.snapshot);
      })
      .catch((err) => {
        setError(err.message || 'This share link is expired or invalid.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-surface)] p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-[var(--text-secondary)]">Loading shared event plan...</p>
        </div>
      </div>
    );
  }

  if (error || !snapshot) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-surface)] p-4">
        <div className="max-w-md w-full p-8 rounded-3xl border border-red-500/20 bg-[var(--bg-card)] text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-600 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="font-serif font-bold text-xl text-[var(--text-primary)]">
            Share Link Unavailable
          </h2>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            {error || 'This snapshot has expired (24h limit) or was revoked by the event owner.'}
          </p>
          <button
            onClick={onExit}
            className="px-5 py-2 rounded-xl bg-[var(--primary)] text-[var(--primary-contrast)] text-xs font-semibold hover:opacity-90 transition-opacity"
          >
            Return to PlanWise Home
          </button>
        </div>
      </div>
    );
  }

  const { event } = snapshot;

  return (
    <div className="min-h-screen bg-[var(--bg-surface)] text-[var(--text-primary)] pb-16">
      {/* Read-Only Banner */}
      <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 text-xs text-amber-900 dark:text-amber-200">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-semibold">
            <Lock className="w-3.5 h-3.5" /> Read-Only Shared Snapshot (Expires in 24 hours)
          </span>
          <button
            onClick={onExit}
            className="underline font-semibold hover:text-[var(--primary)] transition-colors cursor-pointer"
          >
            Open PlanWise App
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 space-y-8">
        {/* Event Header Banner */}
        <div className="p-6 sm:p-8 rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] space-y-3 shadow-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-[var(--primary)]/10 text-[var(--primary)]">
              {event.type}
            </span>
            <span className="text-xs text-[var(--text-secondary)]">
              {formatDate(event.date)} • {event.city}
            </span>
          </div>

          <h1 className="font-serif font-bold text-3xl sm:text-4xl text-[var(--text-primary)]">
            {event.name}
          </h1>

          <p className="text-sm text-[var(--text-secondary)]">
            Theme: {event.styleTheme} • Tradition: {event.preferences.culturalTradition}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4 border-t border-[var(--border-subtle)]">
            <div className="p-3 rounded-xl bg-[var(--bg-subtle)]">
              <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Total Budget</span>
              <span className="font-serif font-bold text-lg text-[var(--primary)] font-mono">
                {formatINR(event.totalBudget)}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-[var(--bg-subtle)]">
              <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Expected Guests</span>
              <span className="font-serif font-bold text-lg text-[var(--text-primary)] font-mono">
                {event.guestCount} Attendees
              </span>
            </div>
            <div className="p-3 rounded-xl bg-[var(--bg-subtle)] col-span-2 sm:col-span-1">
              <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Venue Layout</span>
              <span className="font-semibold text-sm capitalize text-[var(--text-primary)]">
                {event.preferences.venueType}
              </span>
            </div>
          </div>
        </div>

        {/* Budget Allocation Breakdown */}
        <div className="p-6 rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] space-y-4">
          <h2 className="font-serif font-bold text-lg text-[var(--text-primary)]">
            Budget Allocations
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {event.budgetCategories.map((cat) => (
              <div
                key={cat.id}
                className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] flex justify-between items-center text-xs"
              >
                <div>
                  <span className="font-semibold text-[var(--text-primary)] block">{cat.name}</span>
                  <span className="text-[10px] text-[var(--text-muted)] uppercase">{cat.priorityTier}</span>
                </div>
                <span className="font-mono font-bold text-sm text-[var(--primary)]">
                  {formatINR(cat.allocatedAmount)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline Milestones */}
        <div className="p-6 rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] space-y-4">
          <h2 className="font-serif font-bold text-lg text-[var(--text-primary)]">
            Countdown Schedule & Milestones
          </h2>
          <div className="space-y-2">
            {event.timelineTasks.map((task) => (
              <div
                key={task.id}
                className="p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      task.status === 'done' ? 'bg-emerald-600' : 'bg-amber-500'
                    }`}
                  ></span>
                  <span className="font-semibold text-[var(--text-primary)]">{task.title}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[var(--text-muted)] font-mono">{formatDate(task.dueDate)}</span>
                  <span className="px-2 py-0.5 rounded font-bold uppercase text-[10px] bg-[var(--bg-card)]">
                    {task.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
