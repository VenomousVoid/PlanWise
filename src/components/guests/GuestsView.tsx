import React, { useState } from 'react';
import { useEvent } from '../../context/EventContext.tsx';
import { Guest, Dietary, RsvpStatus } from '../../../shared/types.ts';
import { calculateGuestMetrics } from '../../../server/logic/guestEngine.ts';
import { formatINR } from '../../utils/currency.ts';
import {
  Users,
  UserPlus,
  Utensils,
  CheckCircle,
  HelpCircle,
  XCircle,
  Clock,
  Trash2,
  TrendingUp,
} from 'lucide-react';

export const GuestsView: React.FC = () => {
  const { activeEvent, addOrUpdateGuest, deleteGuest } = useEvent();
  const [filterRsvp, setFilterRsvp] = useState<'all' | RsvpStatus>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formGroup, setFormGroup] = useState<'groom' | 'bride' | 'family' | 'friends' | 'colleagues' | 'general'>('general');
  const [formDietary, setFormDietary] = useState<Dietary>('veg');
  const [formRsvp, setFormRsvp] = useState<RsvpStatus>('pending');
  const [formPlusOnes, setFormPlusOnes] = useState<number>(0);
  const [formNotes, setFormNotes] = useState('');

  if (!activeEvent) return null;

  const metrics = calculateGuestMetrics(
    activeEvent.guests,
    activeEvent.guestCount,
    activeEvent.budgetCategories
  );

  const filteredGuests = activeEvent.guests.filter((g) => {
    if (filterRsvp !== 'all' && g.rsvpStatus !== filterRsvp) return false;
    return true;
  });

  const handleOpenAdd = (guest?: Guest) => {
    if (guest) {
      setEditingGuest(guest);
      setFormName(guest.name);
      setFormGroup(guest.groupSide || 'general');
      setFormDietary(guest.dietary);
      setFormRsvp(guest.rsvpStatus);
      setFormPlusOnes(guest.plusOnes || 0);
      setFormNotes(guest.notes || '');
    } else {
      setEditingGuest(null);
      setFormName('');
      setFormGroup('general');
      setFormDietary('veg');
      setFormRsvp('pending');
      setFormPlusOnes(0);
      setFormNotes('');
    }
    setIsAddModalOpen(true);
  };

  const handleSaveGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    await addOrUpdateGuest({
      id: editingGuest?.id,
      name: formName.trim(),
      groupSide: formGroup,
      dietary: formDietary,
      rsvpStatus: formRsvp,
      plusOnes: Number(formPlusOnes) || 0,
      notes: formNotes.trim() || undefined,
    });

    setIsAddModalOpen(false);
  };

  const handleDelete = async (gId: string) => {
    if (confirm('Remove guest from tracker?')) {
      await deleteGuest(gId);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-serif font-bold text-xl text-[var(--text-primary)]">
            Guest List & Live RSVP Tracker
          </h2>
          <p className="text-xs text-[var(--text-secondary)]">
            Live headcount projection calculating real-time catering and per-plate requirements
          </p>
        </div>

        <button
          onClick={() => handleOpenAdd()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--primary)] text-[var(--primary-contrast)] text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
        >
          <UserPlus className="w-3.5 h-3.5" /> Add Guest
        </button>
      </div>

      {/* Headcount Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">
            Target Capacity
          </span>
          <span className="font-serif font-bold text-xl text-[var(--text-primary)] font-mono">
            {metrics.expectedGuests}
          </span>
          <span className="text-[10px] text-[var(--text-muted)] block">Planned Venue Max</span>
        </div>

        <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block">
            Confirmed Attendees
          </span>
          <span className="font-serif font-bold text-xl text-emerald-700 dark:text-emerald-400 font-mono">
            {metrics.confirmedWithPlusOnes}
          </span>
          <span className="text-[10px] text-[var(--text-muted)] block">
            {metrics.confirmedGuests} guests + {metrics.confirmedWithPlusOnes - metrics.confirmedGuests} plus-ones
          </span>
        </div>

        <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 block">
            Pending Confirmation
          </span>
          <span className="font-serif font-bold text-xl text-amber-700 dark:text-amber-400 font-mono">
            {metrics.pendingGuests}
          </span>
          <span className="text-[10px] text-[var(--text-muted)] block">
            {metrics.maybeGuests} listed as maybe
          </span>
        </div>

        <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--primary)] block">
            Projected Catering
          </span>
          <span className="font-serif font-bold text-xl text-[var(--primary)] font-mono">
            {formatINR(metrics.adjustedCateringRequirement)}
          </span>
          <span className="text-[10px] text-[var(--text-muted)] block font-mono">
            Est. {formatINR(metrics.cateringPerHeadEstimate)} / head
          </span>
        </div>
      </div>

      {/* Dietary & Side Breakdown Strip */}
      <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] flex flex-wrap items-center justify-between gap-4 text-xs">
        {/* Dietary breakdown pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-[var(--text-primary)] flex items-center gap-1">
            <Utensils className="w-3.5 h-3.5 text-[var(--primary)]" />
            <span>Dietary Breakdown:</span>
          </span>
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-medium">
            Veg: {metrics.dietaryBreakdown.veg}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-700 dark:text-orange-300 font-medium">
            Non-Veg: {metrics.dietaryBreakdown.nonVeg}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 font-medium">
            Jain: {metrics.dietaryBreakdown.jain}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300 font-medium">
            Vegan: {metrics.dietaryBreakdown.vegan}
          </span>
        </div>

        {/* Group / Side breakdown */}
        <div className="flex items-center gap-2 flex-wrap text-[var(--text-secondary)]">
          <span className="font-semibold">Groups:</span>
          {Object.entries(metrics.groupBreakdown).map(([grp, count]) => (
            <span key={grp} className="capitalize">
              {grp} ({count})
            </span>
          ))}
        </div>
      </div>

      {/* RSVP Filter Bar */}
      <div className="flex items-center gap-1.5 text-xs">
        <span className="font-semibold text-[var(--text-primary)] mr-2">Status:</span>
        {(['all', 'yes', 'pending', 'maybe', 'no'] as const).map((st) => (
          <button
            key={st}
            onClick={() => setFilterRsvp(st)}
            className={`px-3 py-1.5 rounded-lg font-semibold capitalize transition-colors ${
              filterRsvp === st
                ? 'bg-[var(--primary)] text-[var(--primary-contrast)] shadow-xs'
                : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {st === 'yes' ? 'Confirmed (Yes)' : st}
          </button>
        ))}
      </div>

      {/* Guest Table */}
      <div className="overflow-x-auto rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)]">
        <table className="min-w-full divide-y divide-[var(--border-subtle)] text-xs">
          <thead className="bg-[var(--bg-subtle)] text-[var(--text-secondary)] font-semibold text-left">
            <tr>
              <th className="px-4 py-3">Guest Name</th>
              <th className="px-4 py-3">Affiliation / Side</th>
              <th className="px-4 py-3">Dietary</th>
              <th className="px-4 py-3 text-center">RSVP Status</th>
              <th className="px-4 py-3 text-center">Plus-Ones</th>
              <th className="px-4 py-3">Notes</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)]">
            {filteredGuests.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-10 text-[var(--text-muted)]">
                  No guests found matching selected filter.
                </td>
              </tr>
            ) : (
              filteredGuests.map((guest) => (
                <tr key={guest.id} className="hover:bg-[var(--bg-subtle)] transition-colors">
                  <td className="px-4 py-3 font-semibold text-[var(--text-primary)]">{guest.name}</td>
                  <td className="px-4 py-3 capitalize text-[var(--text-secondary)]">{guest.groupSide || 'general'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded font-medium ${
                        guest.dietary === 'veg'
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                          : guest.dietary === 'jain'
                          ? 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400'
                          : guest.dietary === 'vegan'
                          ? 'bg-teal-500/10 text-teal-700 dark:text-teal-400'
                          : 'bg-orange-500/10 text-orange-700 dark:text-orange-400'
                      }`}
                    >
                      {guest.dietary}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                        guest.rsvpStatus === 'yes'
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                          : guest.rsvpStatus === 'no'
                          ? 'bg-red-500/10 text-red-700 dark:text-red-400'
                          : guest.rsvpStatus === 'maybe'
                          ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                          : 'bg-stone-500/10 text-stone-700 dark:text-stone-300'
                      }`}
                    >
                      {guest.rsvpStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center font-mono font-semibold">
                    {guest.plusOnes > 0 ? `+${guest.plusOnes}` : '0'}
                  </td>
                  <td className="px-4 py-3 text-[var(--text-muted)] italic truncate max-w-xs">
                    {guest.notes || '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenAdd(guest)}
                        className="px-2 py-1 rounded border border-[var(--border-subtle)] hover:bg-[var(--bg-subtle)] text-[11px]"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(guest.id)}
                        className="p-1 rounded text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                        aria-label="Delete guest"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Guest Modal */}
      {isAddModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-subtle)] p-6 w-full max-w-md shadow-xl space-y-4">
            <h3 className="font-serif font-bold text-lg text-[var(--text-primary)]">
              {editingGuest ? 'Edit Guest' : 'Add Guest to List'}
            </h3>
            <form onSubmit={handleSaveGuest} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Guest Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Ramesh Patel"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Group / Affiliation
                  </label>
                  <select
                    value={formGroup}
                    onChange={(e) => setFormGroup(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)]"
                  >
                    <option value="groom">Groom Side</option>
                    <option value="bride">Bride Side</option>
                    <option value="family">Family / Relatives</option>
                    <option value="friends">Friends</option>
                    <option value="colleagues">Colleagues</option>
                    <option value="general">General</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Dietary
                  </label>
                  <select
                    value={formDietary}
                    onChange={(e) => setFormDietary(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)]"
                  >
                    <option value="veg">Vegetarian</option>
                    <option value="non-veg">Non-Vegetarian</option>
                    <option value="jain">Strict Jain</option>
                    <option value="vegan">Vegan</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    RSVP Status
                  </label>
                  <select
                    value={formRsvp}
                    onChange={(e) => setFormRsvp(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)]"
                  >
                    <option value="pending">Pending</option>
                    <option value="yes">Attending (Yes)</option>
                    <option value="no">Declined (No)</option>
                    <option value="maybe">Maybe</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Plus-Ones
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={formPlusOnes}
                    onChange={(e) => setFormPlusOnes(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Notes / Accommodations
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Ground floor room, airport pickup needed..."
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
                  Save Guest
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
