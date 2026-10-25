import React, { useState } from 'react';
import { Event } from '../../../shared/types.ts';
import { getDaysRemaining, formatDate } from '../../utils/dates.ts';
import { formatINR } from '../../utils/currency.ts';
import {
  Bell,
  Clock,
  AlertTriangle,
  CreditCard,
  X,
  CheckCircle2,
} from 'lucide-react';

interface NotificationBannerProps {
  event: Event;
}

export const NotificationBanner: React.FC<NotificationBannerProps> = ({ event }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(() => {
    return typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default';
  });

  // 1. Overdue tasks
  const overdueTasks = event.timelineTasks.filter((t) => {
    return t.status !== 'done' && getDaysRemaining(t.dueDate) < 0;
  });

  // 2. Upcoming tasks (next 7 days)
  const upcomingTasks = event.timelineTasks.filter((t) => {
    const days = getDaysRemaining(t.dueDate);
    return t.status !== 'done' && days >= 0 && days <= 7;
  });

  // 3. Pending vendor payments (booked/paid with remaining balance)
  const pendingVendorPayments = event.vendors.filter((v) => {
    return (v.status === 'booked' || v.status === 'quoted') && v.quotedAmount > v.paidAmount;
  });

  const totalAlertCount = overdueTasks.length + upcomingTasks.length + pendingVendorPayments.length;

  const requestBrowserNotification = async () => {
    if (!('Notification' in window)) return;
    try {
      const perm = await Notification.requestPermission();
      setNotificationPermission(perm);
      if (perm === 'granted') {
        new Notification('PlanWise Reminders Activated', {
          body: `You will receive timely countdown milestones for "${event.name}".`,
          icon: '/favicon.ico',
        });
      }
    } catch (err) {
      console.warn('Notification permission error:', err);
    }
  };

  return (
    <div className="relative">
      {/* Alert Bar Ticker */}
      {totalAlertCount > 0 && (
        <aside
          aria-label="Event Reminders Bar"
          className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2"
        >
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 text-xs text-amber-900 dark:text-amber-200">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
              <span className="font-semibold">Action Items:</span>
              <span>
                {overdueTasks.length > 0 && `${overdueTasks.length} overdue task(s) • `}
                {upcomingTasks.length > 0 && `${upcomingTasks.length} due in the next 7 days • `}
                {pendingVendorPayments.length > 0 && `${pendingVendorPayments.length} pending vendor payment(s)`}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsOpen(true)}
                className="underline font-semibold hover:text-[var(--primary)] transition-colors focus:ring-2 focus:ring-[var(--border-focus)] rounded"
              >
                View Reminders Panel ({totalAlertCount})
              </button>

              {'Notification' in window && notificationPermission !== 'granted' && (
                <button
                  onClick={requestBrowserNotification}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-600 text-white font-medium hover:bg-amber-700 transition-colors cursor-pointer"
                  title="Enable browser milestone reminders"
                >
                  <Bell className="w-3 h-3" />
                  Enable Alerts
                </button>
              )}
            </div>
          </div>
        </aside>
      )}

      {/* Slide-over Reminders Drawer */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end animate-in fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reminders-drawer-title"
        >
          <div className="w-full max-w-md bg-[var(--bg-card)] border-l border-[var(--border-subtle)] h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-[var(--primary)]" />
                <h2 id="reminders-drawer-title" className="font-serif font-bold text-lg text-[var(--text-primary)]">
                  Reminders & Action Items
                </h2>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
                aria-label="Close reminders drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Overdue Section */}
              {overdueTasks.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-red-600 mb-2">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Overdue Milestones ({overdueTasks.length})</span>
                  </div>
                  <div className="space-y-2">
                    {overdueTasks.map((task) => (
                      <div
                        key={task.id}
                        className="p-3 rounded-xl border border-red-500/20 bg-red-500/5 text-xs flex justify-between items-start gap-2"
                      >
                        <div>
                          <p className="font-semibold text-[var(--text-primary)]">{task.title}</p>
                          <p className="text-[var(--text-secondary)] mt-0.5">
                            Was due: {formatDate(task.dueDate)} ({Math.abs(getDaysRemaining(task.dueDate))} days ago)
                          </p>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-700 dark:text-red-400">
                          {task.priority.toUpperCase()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Next 7 Days Section */}
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-600 mb-2">
                  <Clock className="w-4 h-4" />
                  <span>Due in the Next 7 Days ({upcomingTasks.length})</span>
                </div>
                {upcomingTasks.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)] italic">No tasks due this week.</p>
                ) : (
                  <div className="space-y-2">
                    {upcomingTasks.map((task) => (
                      <div
                        key={task.id}
                        className="p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-xs flex justify-between items-start gap-2"
                      >
                        <div>
                          <p className="font-semibold text-[var(--text-primary)]">{task.title}</p>
                          <p className="text-[var(--text-secondary)] mt-0.5">
                            Due: {formatDate(task.dueDate)} ({getDaysRemaining(task.dueDate)} days left)
                          </p>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-secondary)]">
                          {task.category}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Vendor Payments Section */}
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--primary)] mb-2">
                  <CreditCard className="w-4 h-4" />
                  <span>Pending Vendor Payments ({pendingVendorPayments.length})</span>
                </div>
                {pendingVendorPayments.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)] italic">All booked vendors are fully settled.</p>
                ) : (
                  <div className="space-y-2">
                    {pendingVendorPayments.map((v) => {
                      const balance = v.quotedAmount - v.paidAmount;
                      return (
                        <div
                          key={v.id}
                          className="p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] text-xs flex justify-between items-start"
                        >
                          <div>
                            <p className="font-semibold text-[var(--text-primary)]">{v.name}</p>
                            <p className="text-[var(--text-muted)] capitalize">{v.category} • Status: {v.status}</p>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-bold text-amber-600 block">{formatINR(balance)}</span>
                            <span className="text-[10px] text-[var(--text-muted)]">Remaining Balance</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-subtle)]">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--text-muted)]">
                  {notificationPermission === 'granted' ? (
                    <span className="flex items-center gap-1 text-emerald-600 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Browser alerts active
                    </span>
                  ) : (
                    'Browser notifications optional'
                  )}
                </span>
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--primary-contrast)] text-xs font-semibold hover:opacity-90 transition-opacity"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
