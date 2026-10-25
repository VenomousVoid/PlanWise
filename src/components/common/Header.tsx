import React, { useState } from 'react';
import { useEvent } from '../../context/EventContext.tsx';
import { useTheme, Theme } from '../../context/ThemeContext.tsx';
import {
  Sparkles,
  Calendar,
  Plus,
  RotateCcw,
  Sun,
  Moon,
  Eye,
  ChevronDown,
  ShieldAlert,
} from 'lucide-react';
import { formatDate } from '../../utils/dates.ts';

interface HeaderProps {
  onOpenWizard: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenWizard }) => {
  const { events, activeEvent, setActiveEventId, resetDemoData, aiStatus, isLoading } = useEvent();
  const { theme, setTheme } = useTheme();
  const [isEventMenuOpen, setIsEventMenuOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleReset = async () => {
    if (confirm('Reset demo data? All events will return to realistic seed state.')) {
      setIsResetting(true);
      try {
        await resetDemoData();
      } finally {
        setIsResetting(false);
      }
    }
  };

  const cycleTheme = () => {
    const next: Record<Theme, Theme> = {
      light: 'dark',
      dark: 'high-contrast',
      'high-contrast': 'light',
    };
    setTheme(next[theme]);
  };

  return (
    <header className="border-b border-[var(--border-subtle)] bg-[var(--bg-card)] sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand & Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-orange-500 flex items-center justify-center text-white shadow-sm font-bold text-lg">
            PW
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif font-bold text-xl tracking-tight text-[var(--text-primary)]">
                PlanWise
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                v2.0
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)] hidden sm:block">
              GenAI Event Planning Assistant
            </p>
          </div>
        </div>

        {/* Center: Event Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsEventMenuOpen(!isEventMenuOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:border-[var(--primary)] transition-colors text-sm font-medium text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--border-focus)]"
            aria-expanded={isEventMenuOpen}
            aria-haspopup="true"
            aria-label="Select active event"
          >
            <Calendar className="w-4 h-4 text-[var(--primary)]" />
            <span className="max-w-[140px] sm:max-w-[220px] truncate text-left">
              {activeEvent ? activeEvent.name : 'Select Event'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          </button>

          {isEventMenuOpen && (
            <div
              className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-72 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-1"
              role="menu"
            >
              <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] border-b border-[var(--border-subtle)] mb-1">
                Your Events ({events.length})
              </div>
              <div className="max-h-60 overflow-y-auto">
                {events.map((ev) => (
                  <button
                    key={ev.id}
                    onClick={() => {
                      setActiveEventId(ev.id);
                      setIsEventMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors flex flex-col ${
                      activeEvent?.id === ev.id
                        ? 'bg-[var(--primary)]/10 text-[var(--primary)] font-semibold border-l-4 border-[var(--primary)]'
                        : 'text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
                    }`}
                    role="menuitem"
                  >
                    <span className="truncate">{ev.name}</span>
                    <span className="text-xs text-[var(--text-muted)] font-normal">
                      {formatDate(ev.date)} • {ev.city}
                    </span>
                  </button>
                ))}
              </div>
              <div className="border-t border-[var(--border-subtle)] pt-1 mt-1 px-2">
                <button
                  onClick={() => {
                    setIsEventMenuOpen(false);
                    onOpenWizard();
                  }}
                  className="w-full text-left px-2 py-1.5 text-xs font-semibold text-[var(--primary)] hover:bg-[var(--primary)]/10 rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Create New Event
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-2">
          {/* AI Status Indicator */}
          <div
            className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
              aiStatus?.mode === 'live_gemini'
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
            }`}
            title={
              aiStatus?.mode === 'live_gemini'
                ? `Active Gemini model: ${aiStatus.activeModel}`
                : 'Deterministic template fallback active (100% operational offline/free tier)'
            }
          >
            {aiStatus?.mode === 'live_gemini' ? (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Gemini Online</span>
              </>
            ) : (
              <>
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Fallback Mode</span>
              </>
            )}
          </div>

          {/* New Event Wizard Button */}
          <button
            onClick={onOpenWizard}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--primary)] text-[var(--primary-contrast)] font-medium text-sm hover:opacity-90 transition-opacity focus:ring-2 focus:ring-[var(--border-focus)] shadow-sm cursor-pointer"
            aria-label="Create new event"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Event</span>
          </button>

          {/* Theme Switcher */}
          <button
            onClick={cycleTheme}
            className="p-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--text-primary)] hover:border-[var(--border-focus)] transition-colors focus:ring-2 focus:ring-[var(--border-focus)]"
            title={`Current theme: ${theme}. Click to switch theme.`}
            aria-label={`Current theme: ${theme}. Click to switch theme.`}
          >
            {theme === 'light' && <Sun className="w-4 h-4" />}
            {theme === 'dark' && <Moon className="w-4 h-4" />}
            {theme === 'high-contrast' && <Eye className="w-4 h-4 text-yellow-400" />}
          </button>

          {/* Reset Demo Data Button */}
          <button
            onClick={handleReset}
            disabled={isResetting || isLoading}
            className="p-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-focus)] transition-colors focus:ring-2 focus:ring-[var(--border-focus)] disabled:opacity-50"
            title="Reset demo data to default Indian wedding, birthday & community event"
            aria-label="Reset demo data"
          >
            <RotateCcw className={`w-4 h-4 ${isResetting ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
    </header>
  );
};
