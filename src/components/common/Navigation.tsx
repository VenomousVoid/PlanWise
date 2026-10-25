import React from 'react';
import {
  LayoutDashboard,
  PieChart,
  CalendarDays,
  Store,
  Users,
  Lightbulb,
  ShieldCheck,
  Share2,
} from 'lucide-react';

export type TabKey =
  | 'dashboard'
  | 'budget'
  | 'timeline'
  | 'vendors'
  | 'guests'
  | 'ideas'
  | 'risks'
  | 'share';

interface NavigationProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  riskCount?: number;
  unconfirmedVendorCount?: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onTabChange,
  riskCount = 0,
  unconfirmedVendorCount = 0,
}) => {
  const tabs = [
    { key: 'dashboard' as TabKey, label: 'Dashboard', icon: LayoutDashboard },
    { key: 'budget' as TabKey, label: 'Budget & Advisor', icon: PieChart },
    { key: 'timeline' as TabKey, label: 'Timeline', icon: CalendarDays },
    {
      key: 'vendors' as TabKey,
      label: 'Vendors',
      icon: Store,
      badge: unconfirmedVendorCount > 0 ? unconfirmedVendorCount : undefined,
    },
    { key: 'guests' as TabKey, label: 'Guests & RSVPs', icon: Users },
    { key: 'ideas' as TabKey, label: 'Ideas & Themes', icon: Lightbulb },
    {
      key: 'risks' as TabKey,
      label: 'Risk Radar',
      icon: ShieldCheck,
      badge: riskCount > 0 ? riskCount : undefined,
      badgeColor: 'bg-red-500/20 text-red-600 dark:text-red-400',
    },
    { key: 'share' as TabKey, label: 'Export & Share', icon: Share2 },
  ];

  return (
    <nav
      className="border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)]/70 backdrop-blur-sm sticky top-16 z-30 overflow-x-auto no-scrollbar"
      aria-label="Main Navigation"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-1 sm:space-x-2 py-2" role="tablist">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.key;

            return (
              <button
                key={tab.key}
                role="tab"
                id={`tab-${tab.key}`}
                aria-selected={isSelected}
                aria-controls={`panel-${tab.key}`}
                tabIndex={isSelected ? 0 : -1}
                onClick={() => onTabChange(tab.key)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all focus:ring-2 focus:ring-[var(--border-focus)] ${
                  isSelected
                    ? 'bg-[var(--bg-card)] text-[var(--primary)] shadow-sm font-semibold border border-[var(--border-subtle)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isSelected ? 'text-[var(--primary)]' : 'text-[var(--text-muted)]'}`} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span
                    className={`ml-1 px-1.5 py-0.2 rounded-full text-xs font-bold ${
                      tab.badgeColor || 'bg-[var(--primary)]/10 text-[var(--primary)]'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
