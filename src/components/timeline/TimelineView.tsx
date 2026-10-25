import React, { useState } from 'react';
import { useEvent } from '../../context/EventContext.tsx';
import { TimelineTask, TaskStatus, TaskPriority } from '../../../shared/types.ts';
import { formatDate, getDaysRemaining } from '../../utils/dates.ts';
import { api } from '../../api/client.ts';
import {
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  Plus,
  RotateCw,
  Sparkles,
  Filter,
} from 'lucide-react';

export const TimelineView: React.FC = () => {
  const { activeEvent, updateTimelineTask, addTimelineTask, refreshActiveEvent } = useEvent();
  const [statusFilter, setStatusFilter] = useState<'all' | TaskStatus>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | TaskPriority>('all');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New task form state
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newCategory, setNewCategory] = useState('venue');
  const [newPriority, setNewPriority] = useState<TaskPriority>('medium');
  const [newDesc, setNewDesc] = useState('');

  if (!activeEvent) return null;

  const totalDays = getDaysRemaining(activeEvent.date);
  const isShortNotice = totalDays <= 30;

  // Filter tasks
  const filteredTasks = activeEvent.timelineTasks.filter((t) => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
    return true;
  });

  const handleStatusCycle = async (task: TimelineTask) => {
    const nextStatus: Record<TaskStatus, TaskStatus> = {
      todo: 'doing',
      doing: 'done',
      done: 'todo',
    };
    await updateTimelineTask(task.id, { status: nextStatus[task.status] });
  };

  const handleRegenerate = async () => {
    if (confirm('Regenerate timeline countdown schedule? Any custom tasks will be refreshed.')) {
      setIsRegenerating(true);
      try {
        await api.generateTimeline(activeEvent.id);
        await refreshActiveEvent();
      } finally {
        setIsRegenerating(false);
      }
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDate) return;

    const daysBefore = Math.max(1, getDaysRemaining(activeEvent.date) - getDaysRemaining(newDate));
    await addTimelineTask({
      title: newTitle.trim(),
      dueDate: newDate,
      daysBeforeEvent: daysBefore,
      category: newCategory,
      status: 'todo',
      priority: newPriority,
      description: newDesc.trim() || undefined,
    });

    setIsAddModalOpen(false);
    setNewTitle('');
    setNewDate('');
    setNewDesc('');
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-serif font-bold text-xl text-[var(--text-primary)]">
              Countdown Timeline & Milestones
            </h2>
            {isShortNotice && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-red-500/10 text-red-600 border border-red-500/20 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Short Notice Compressed (&lt;30d)
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Synchronized milestone countdown to {formatDate(activeEvent.date)} ({totalDays} days remaining)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--primary)] text-[var(--primary-contrast)] text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" /> Add Milestone
          </button>

          <button
            onClick={handleRegenerate}
            disabled={isRegenerating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--primary)] transition-colors cursor-pointer disabled:opacity-50"
            title="Recalculate milestone schedule based on remaining days"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin text-[var(--primary)]' : ''}`} />
            <span>Recalculate Schedule</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          <span className="font-semibold text-[var(--text-primary)]">Filters:</span>

          {/* Status filter pills */}
          <div className="flex items-center gap-1">
            {(['all', 'todo', 'doing', 'done'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-2.5 py-1 rounded-md font-medium capitalize transition-colors ${
                  statusFilter === s
                    ? 'bg-[var(--primary)] text-[var(--primary-contrast)] shadow-xs'
                    : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Priority filter */}
        <div className="flex items-center gap-1">
          <span className="text-[var(--text-muted)] font-medium">Priority:</span>
          {(['all', 'urgent', 'high', 'medium', 'low'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPriorityFilter(p)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium uppercase tracking-wider transition-colors ${
                priorityFilter === p
                  ? 'bg-[var(--text-primary)] text-[var(--bg-card)] font-bold'
                  : 'bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline Milestones List */}
      <div className="relative pl-6 sm:pl-8 border-l-2 border-[var(--border-subtle)] space-y-4">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-12 text-xs text-[var(--text-muted)]">
            No milestones match current filters.
          </div>
        ) : (
          filteredTasks.map((task) => {
            const daysToTask = getDaysRemaining(task.dueDate);
            const isOverdue = task.status !== 'done' && daysToTask < 0;

            return (
              <div
                key={task.id}
                className={`relative p-4 rounded-xl border transition-all ${
                  task.status === 'done'
                    ? 'border-emerald-500/20 bg-emerald-500/5 opacity-80'
                    : isOverdue
                    ? 'border-red-500/30 bg-red-500/5 shadow-xs'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-xs'
                }`}
              >
                {/* Timeline node icon on the left vertical track */}
                <div
                  onClick={() => handleStatusCycle(task)}
                  className={`absolute -left-[33px] sm:-left-[41px] top-4 w-6 h-6 rounded-full flex items-center justify-center cursor-pointer transition-transform hover:scale-110 shadow-xs ${
                    task.status === 'done'
                      ? 'bg-emerald-600 text-white'
                      : task.status === 'doing'
                      ? 'bg-amber-500 text-white'
                      : 'bg-[var(--bg-card)] border-2 border-[var(--border-subtle)] text-[var(--text-muted)]'
                  }`}
                  title="Click to cycle status: todo -> doing -> done"
                  aria-label={`Cycle status for ${task.title}`}
                >
                  {task.status === 'done' && <CheckCircle2 className="w-4 h-4" />}
                  {task.status === 'doing' && <Clock className="w-3.5 h-3.5" />}
                  {task.status === 'todo' && <Circle className="w-3.5 h-3.5" />}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`font-semibold text-sm ${
                          task.status === 'done' ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]'
                        }`}
                      >
                        {task.title}
                      </span>

                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                          task.priority === 'urgent'
                            ? 'bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20'
                            : task.priority === 'high'
                            ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20'
                            : 'bg-stone-500/10 text-stone-700 dark:text-stone-300'
                        }`}
                      >
                        {task.priority}
                      </span>

                      <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--bg-subtle)] text-[var(--text-muted)] font-medium capitalize">
                        {task.category}
                      </span>
                    </div>

                    {task.description && (
                      <p className="text-xs text-[var(--text-secondary)]">{task.description}</p>
                    )}
                  </div>

                  {/* Due Date & Action */}
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-xs font-mono font-semibold text-[var(--text-primary)] block">
                        {formatDate(task.dueDate)}
                      </span>
                      <span
                        className={`text-[10px] font-medium block ${
                          isOverdue ? 'text-red-600 font-bold' : 'text-[var(--text-muted)]'
                        }`}
                      >
                        {isOverdue
                          ? `Overdue by ${Math.abs(daysToTask)} days`
                          : daysToTask === 0
                          ? 'Due today'
                          : `${daysToTask} days left`}
                      </span>
                    </div>

                    <button
                      onClick={() => handleStatusCycle(task)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                        task.status === 'done'
                          ? 'bg-emerald-600 text-white'
                          : task.status === 'doing'
                          ? 'bg-amber-600 text-white'
                          : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {task.status.toUpperCase()}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Task Modal */}
      {isAddModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-subtle)] p-6 w-full max-w-md shadow-xl space-y-4">
            <h3 className="font-serif font-bold text-lg text-[var(--text-primary)]">
              Add New Milestone Task
            </h3>
            <form onSubmit={handleCreateTask} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Task Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Schedule Bridal Mehndi Artist"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Due Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Priority
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)]"
                  >
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Category
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)]"
                >
                  <option value="venue">Venue</option>
                  <option value="catering">Catering</option>
                  <option value="decor">Decor</option>
                  <option value="photography">Photography</option>
                  <option value="entertainment">Entertainment</option>
                  <option value="attire">Attire</option>
                  <option value="invitations">Invitations</option>
                  <option value="miscellaneous">Miscellaneous</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Notes, contacts, or deliverables..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-[var(--border-subtle)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-[var(--primary)] text-[var(--primary-contrast)]"
                >
                  Save Milestone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
