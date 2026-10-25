import React, { useState } from 'react';
import { useEvent } from '../../context/EventContext.tsx';
import { Vendor, VendorStatus } from '../../../shared/types.ts';
import { formatINR } from '../../utils/currency.ts';
import { api } from '../../api/client.ts';
import {
  Store,
  HelpCircle,
  Plus,
  Phone,
  Mail,
  CheckCircle2,
  Clock,
  Sparkles,
  X,
  Trash2,
} from 'lucide-react';

export const VendorsView: React.FC = () => {
  const { activeEvent, addOrUpdateVendor, deleteVendor } = useEvent();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);

  // AI Vendor Questions Drawer state
  const [isQuestionsOpen, setIsQuestionsOpen] = useState(false);
  const [questionsCategory, setQuestionsCategory] = useState<string>('venue');
  const [questions, setQuestions] = useState<string[]>([]);
  const [isQuestionsLoading, setIsQuestionsLoading] = useState(false);
  const [questionsIsAi, setQuestionsIsAi] = useState(false);

  // Vendor form state
  const [formCategory, setFormCategory] = useState('venue');
  const [formName, setFormName] = useState('');
  const [formContactPerson, setFormContactPerson] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formStatus, setFormStatus] = useState<VendorStatus>('to-contact');
  const [formQuoted, setFormQuoted] = useState<number>(0);
  const [formPaid, setFormPaid] = useState<number>(0);
  const [formNotes, setFormNotes] = useState('');

  if (!activeEvent) return null;

  const categories = Array.from(new Set(activeEvent.budgetCategories.map((c) => c.id)));

  const filteredVendors = activeEvent.vendors.filter((v) => {
    if (selectedCategory !== 'all' && v.category !== selectedCategory) return false;
    return true;
  });

  const handleOpenQuestions = async (category: string) => {
    setQuestionsCategory(category);
    setIsQuestionsOpen(true);
    setIsQuestionsLoading(true);
    try {
      const res = await api.getVendorQuestions(category, activeEvent.type);
      setQuestions(res.questions);
      setQuestionsIsAi(res.isAiGenerated);
    } catch (err) {
      console.error(err);
    } finally {
      setIsQuestionsLoading(false);
    }
  };

  const handleOpenAdd = (v?: Vendor) => {
    if (v) {
      setEditingVendor(v);
      setFormCategory(v.category);
      setFormName(v.name);
      setFormContactPerson(v.contactPerson || '');
      setFormPhone(v.phone || '');
      setFormEmail(v.email || '');
      setFormStatus(v.status);
      setFormQuoted(v.quotedAmount || 0);
      setFormPaid(v.paidAmount || 0);
      setFormNotes(v.notes || '');
    } else {
      setEditingVendor(null);
      setFormCategory(categories[0] || 'venue');
      setFormName('');
      setFormContactPerson('');
      setFormPhone('');
      setFormEmail('');
      setFormStatus('to-contact');
      setFormQuoted(0);
      setFormPaid(0);
      setFormNotes('');
    }
    setIsAddModalOpen(true);
  };

  const handleSaveVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    await addOrUpdateVendor({
      id: editingVendor?.id,
      category: formCategory,
      name: formName.trim(),
      contactPerson: formContactPerson.trim() || undefined,
      phone: formPhone.trim() || undefined,
      email: formEmail.trim() || undefined,
      status: formStatus,
      quotedAmount: Number(formQuoted) || 0,
      paidAmount: Number(formPaid) || 0,
      notes: formNotes.trim() || undefined,
    });

    setIsAddModalOpen(false);
  };

  const handleDelete = async (vId: string) => {
    if (confirm('Remove this vendor?')) {
      await deleteVendor(vId);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-serif font-bold text-xl text-[var(--text-primary)]">
            Vendor Directory & Checklist
          </h2>
          <p className="text-xs text-[var(--text-secondary)]">
            Track quotes, contracts, contact persons, and consultation vetting questions
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenQuestions('venue')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--primary)] transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-[var(--primary)]" />
            <span>AI Questions to Ask</span>
          </button>

          <button
            onClick={() => handleOpenAdd()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--primary)] text-[var(--primary-contrast)] text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" /> Add Vendor
          </button>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors ${
            selectedCategory === 'all'
              ? 'bg-[var(--primary)] text-[var(--primary-contrast)] shadow-xs'
              : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          All Categories ({activeEvent.vendors.length})
        </button>
        {categories.map((catId) => {
          const count = activeEvent.vendors.filter((v) => v.category === catId).length;
          return (
            <button
              key={catId}
              onClick={() => setSelectedCategory(catId)}
              className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap capitalize transition-colors ${
                selectedCategory === catId
                  ? 'bg-[var(--primary)] text-[var(--primary-contrast)] shadow-xs'
                  : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {catId} ({count})
            </button>
          );
        })}
      </div>

      {/* Vendor Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredVendors.length === 0 ? (
          <div className="col-span-full text-center py-12 text-xs text-[var(--text-muted)]">
            No vendors registered in this category. Click "+ Add Vendor" to add quotes and contacts.
          </div>
        ) : (
          filteredVendors.map((vendor) => {
            const isBooked = vendor.status === 'booked' || vendor.status === 'paid';
            return (
              <div
                key={vendor.id}
                className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-xs hover:border-[var(--primary)]/50 transition-all flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">
                        {vendor.category}
                      </span>
                      <h3 className="font-semibold text-sm text-[var(--text-primary)] line-clamp-1">
                        {vendor.name}
                      </h3>
                    </div>

                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                        vendor.status === 'paid'
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                          : vendor.status === 'booked'
                          ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20'
                          : vendor.status === 'quoted'
                          ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20'
                          : 'bg-stone-500/10 text-stone-700 dark:text-stone-300'
                      }`}
                    >
                      {vendor.status}
                    </span>
                  </div>

                  {/* Financials Strip */}
                  <div className="p-2.5 rounded-lg bg-[var(--bg-subtle)] text-xs flex justify-between font-mono">
                    <div>
                      <span className="text-[10px] text-[var(--text-muted)] block uppercase font-sans">Quoted</span>
                      <span className="font-bold text-[var(--text-primary)]">{formatINR(vendor.quotedAmount)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-[var(--text-muted)] block uppercase font-sans">Paid</span>
                      <span className="font-bold text-emerald-700 dark:text-emerald-400">{formatINR(vendor.paidAmount)}</span>
                    </div>
                  </div>

                  {/* Contacts & Notes */}
                  <div className="space-y-1 text-xs text-[var(--text-secondary)]">
                    {vendor.contactPerson && (
                      <p className="font-medium text-[var(--text-primary)]">Contact: {vendor.contactPerson}</p>
                    )}
                    {vendor.phone && (
                      <p className="flex items-center gap-1.5 font-mono">
                        <Phone className="w-3 h-3 text-[var(--text-muted)]" />
                        <span>{vendor.phone}</span>
                      </p>
                    )}
                    {vendor.email && (
                      <p className="flex items-center gap-1.5 truncate">
                        <Mail className="w-3 h-3 text-[var(--text-muted)]" />
                        <span>{vendor.email}</span>
                      </p>
                    )}
                    {vendor.notes && <p className="text-[11px] text-[var(--text-muted)] italic">{vendor.notes}</p>}
                  </div>
                </div>

                {/* Actions bottom bar */}
                <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs">
                  <button
                    onClick={() => handleOpenQuestions(vendor.category)}
                    className="text-[var(--primary)] hover:underline flex items-center gap-1 text-[11px] font-semibold cursor-pointer"
                  >
                    <HelpCircle className="w-3 h-3" /> Questions to Ask
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenAdd(vendor)}
                      className="px-2.5 py-1 rounded border border-[var(--border-subtle)] hover:bg-[var(--bg-subtle)] font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(vendor.id)}
                      className="p-1 rounded text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                      aria-label="Delete vendor"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* AI Questions Drawer */}
      {isQuestionsOpen && (
        <div
          className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end animate-in fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-[var(--bg-card)] border-l border-[var(--border-subtle)] h-full flex flex-col shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[var(--primary)]" />
                <h3 className="font-serif font-bold text-base text-[var(--text-primary)] capitalize">
                  {questionsCategory} Vendor Questions
                </h3>
              </div>
              <button
                onClick={() => setIsQuestionsOpen(false)}
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[var(--text-secondary)]">
              Crucial negotiation and due-diligence questions to ask before signing contracts or transferring advances:
            </p>

            <div className="flex-1 overflow-y-auto space-y-3">
              {isQuestionsLoading ? (
                <div className="py-12 text-center text-xs text-[var(--text-muted)]">
                  Consulting vendor knowledge base...
                </div>
              ) : (
                questions.map((q, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-xs text-[var(--text-primary)] space-y-1"
                  >
                    <span className="font-bold text-[var(--primary)] block">Q{idx + 1}:</span>
                    <p className="leading-relaxed">{q}</p>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs text-[var(--text-muted)]">
              <span>{questionsIsAi ? '✨ Powered by Gemini AI' : '🛡️ Rule-Based Template Guide'}</span>
              <button
                onClick={() => setIsQuestionsOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-[var(--primary)] text-[var(--primary-contrast)] font-semibold"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Vendor Modal */}
      {isAddModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-subtle)] p-6 w-full max-w-md shadow-xl space-y-4">
            <h3 className="font-serif font-bold text-lg text-[var(--text-primary)]">
              {editingVendor ? 'Edit Vendor Details' : 'Add New Vendor'}
            </h3>
            <form onSubmit={handleSaveVendor} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)]"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)]"
                  >
                    <option value="to-contact">To Contact</option>
                    <option value="contacted">Contacted</option>
                    <option value="quoted">Quoted</option>
                    <option value="booked">Booked</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Vendor / Business Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Royal Palace Banquets"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Quoted Amount (INR)
                  </label>
                  <input
                    type="number"
                    step="1000"
                    min="0"
                    value={formQuoted}
                    onChange={(e) => setFormQuoted(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Paid Amount (INR)
                  </label>
                  <input
                    type="number"
                    step="1000"
                    min="0"
                    value={formPaid}
                    onChange={(e) => setFormPaid(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    value={formContactPerson}
                    onChange={(e) => setFormContactPerson(e.target.value)}
                    placeholder="e.g. Mr. Sharma"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Phone
                  </label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="+91 98..."
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Notes
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Payment terms, stage dimensions, deliverable dates..."
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
                  Save Vendor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
