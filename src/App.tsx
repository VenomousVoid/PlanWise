/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext.tsx';
import { EventProvider, useEvent } from './context/EventContext.tsx';
import { Header } from './components/common/Header.tsx';
import { Navigation, TabKey } from './components/common/Navigation.tsx';
import { NotificationBanner } from './components/common/NotificationBanner.tsx';
import { EventWizardModal } from './components/wizard/EventWizardModal.tsx';
import { DashboardView } from './components/dashboard/DashboardView.tsx';
import { BudgetView } from './components/budget/BudgetView.tsx';
import { TimelineView } from './components/timeline/TimelineView.tsx';
import { VendorsView } from './components/vendors/VendorsView.tsx';
import { GuestsView } from './components/guests/GuestsView.tsx';
import { IdeasView } from './components/ideas/IdeasView.tsx';
import { RisksView } from './components/risks/RisksView.tsx';
import { ShareView } from './components/share/ShareView.tsx';
import { PublicShareView } from './components/share/PublicShareView.tsx';

function MainApp() {
  const { activeEvent, isLoading, error, announcement } = useEvent();
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);

  // Check URL hash for public read-only share token e.g. #/share/:token
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#/share/')) {
        const token = hash.replace('#/share/', '').trim();
        if (token) setShareToken(token);
      } else {
        setShareToken(null);
      }
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  if (shareToken) {
    return (
      <PublicShareView
        token={shareToken}
        onExit={() => {
          window.location.hash = '';
          setShareToken(null);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-surface)] text-[var(--text-primary)]">
      {/* WCAG 2.2 AA: Skip to main content landmark */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-[var(--primary)] focus:text-[var(--primary-contrast)] focus:rounded-lg focus:font-semibold focus:shadow-lg"
      >
        Skip to main content
      </a>

      {/* Screen reader live updates announcement region */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      {/* Top Header */}
      <Header onOpenWizard={() => setIsWizardOpen(true)} />

      {/* Reminders & Action Items Banner */}
      {activeEvent && <NotificationBanner event={activeEvent} />}

      {/* Main Tabs Navigation */}
      <Navigation
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        unconfirmedVendorCount={activeEvent?.vendors.filter((v) => v.status === 'to-contact').length}
      />

      {/* Main Landmark Area */}
      <main id="main-content" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {isLoading && !activeEvent ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-3">
            <div className="w-10 h-10 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-[var(--text-secondary)] font-medium">Loading event data...</p>
          </div>
        ) : error && !activeEvent ? (
          <div className="p-8 rounded-2xl border border-red-500/20 bg-red-500/5 text-center space-y-3 max-w-md mx-auto">
            <p className="text-sm font-semibold text-red-600">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-xs font-semibold"
            >
              Reload Application
            </button>
          </div>
        ) : !activeEvent ? (
          <div className="p-12 text-center rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] space-y-4 max-w-md mx-auto">
            <h2 className="font-serif font-bold text-xl">Welcome to PlanWise</h2>
            <p className="text-xs text-[var(--text-secondary)]">
              No events found. Start by launching your first Indian wedding, birthday, or community celebration.
            </p>
            <button
              onClick={() => setIsWizardOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-[var(--primary)] text-white font-semibold text-xs"
            >
              Create New Event
            </button>
          </div>
        ) : (
          <div role="tabpanel" id={`panel-${activeTab}`} aria-labelledby={`tab-${activeTab}`}>
            {activeTab === 'dashboard' && <DashboardView onNavigateTab={(tab) => setActiveTab(tab)} />}
            {activeTab === 'budget' && <BudgetView />}
            {activeTab === 'timeline' && <TimelineView />}
            {activeTab === 'vendors' && <VendorsView />}
            {activeTab === 'guests' && <GuestsView />}
            {activeTab === 'ideas' && <IdeasView />}
            {activeTab === 'risks' && <RisksView />}
            {activeTab === 'share' && <ShareView />}
          </div>
        )}
      </main>

      {/* Footer Landmark */}
      <footer className="border-t border-[var(--border-subtle)] bg-[var(--bg-card)] py-6 text-xs text-[var(--text-muted)] mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-serif font-bold text-[var(--text-primary)]">PlanWise</span>
            <span>•</span>
            <span>GenAI Event Planning Assistant</span>
          </div>
          <div>
            Built with React, Express, TypeScript & Google Gemini
          </div>
        </div>
      </footer>

      {/* Event Setup Wizard Modal */}
      <EventWizardModal isOpen={isWizardOpen} onClose={() => setIsWizardOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <EventProvider>
        <MainApp />
      </EventProvider>
    </ThemeProvider>
  );
}
