import React, { useState } from 'react';
import { useEvent } from '../../context/EventContext.tsx';
import { ShareSnapshot } from '../../../shared/types.ts';
import { api } from '../../api/client.ts';
import { generateEventPlanPdf } from '../../utils/pdfExport.ts';
import { formatINR } from '../../utils/currency.ts';
import { formatDate } from '../../utils/dates.ts';
import {
  Share2,
  FileDown,
  Copy,
  Check,
  ShieldCheck,
  Trash2,
  ExternalLink,
  Eye,
  Lock,
} from 'lucide-react';

export const ShareView: React.FC = () => {
  const { activeEvent } = useEvent();
  const [snapshot, setSnapshot] = useState<ShareSnapshot | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  if (!activeEvent) return null;

  const handleCreateShareLink = async () => {
    setIsGenerating(true);
    try {
      const res = await api.createShareLink(activeEvent.id);
      setSnapshot(res.snapshot);
    } catch (err) {
      console.error('Failed to create share link:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const shareUrl = snapshot
    ? `${window.location.origin}/#/share/${snapshot.token}`
    : '';

  const handleCopy = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleRevoke = async () => {
    if (!snapshot) return;
    if (confirm('Revoke this shared link? Anyone with this URL will immediately lose access.')) {
      setIsRevoking(true);
      try {
        await api.revokeShareLink(activeEvent.id, snapshot.token);
        setSnapshot(null);
        alert('Shared link has been revoked.');
      } finally {
        setIsRevoking(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)]">
        <h2 className="font-serif font-bold text-xl text-[var(--text-primary)]">
          Export Master Plan & Secure Sharing
        </h2>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
          Generate printable client-side PDF document summaries or create unguessable 24-hour read-only snapshot links
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* PDF Export Card (F9) */}
        <div className="p-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] flex flex-col justify-between space-y-4 shadow-xs">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
              <FileDown className="w-5 h-5" />
            </div>

            <h3 className="font-serif font-bold text-lg text-[var(--text-primary)]">
              Printable Master Plan (PDF)
            </h3>

            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Downloads a high-fidelity formatted PDF containing all logistical details: itemized budget allocations, milestone countdown timeline, booked vendor contracts, and guest attendance summary.
            </p>

            <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[11px] text-[var(--text-secondary)] space-y-1 font-mono">
              <div>• Event: {activeEvent.name}</div>
              <div>• Budget: {formatINR(activeEvent.totalBudget)} across {activeEvent.budgetCategories.length} categories</div>
              <div>• Timeline: {activeEvent.timelineTasks.length} milestones</div>
              <div>• Vendors: {activeEvent.vendors.length} recorded contacts</div>
            </div>
          </div>

          <button
            onClick={() => generateEventPlanPdf(activeEvent)}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[var(--primary)] text-[var(--primary-contrast)] font-semibold text-xs hover:opacity-90 transition-opacity cursor-pointer shadow-sm"
          >
            <FileDown className="w-4 h-4" />
            <span>Download Master Plan (PDF)</span>
          </button>
        </div>

        {/* 24-Hour Read-Only Link (F15) */}
        <div className="p-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] flex flex-col justify-between space-y-4 shadow-xs">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center font-bold">
              <Share2 className="w-5 h-5" />
            </div>

            <div className="flex items-center gap-2">
              <h3 className="font-serif font-bold text-lg text-[var(--text-primary)]">
                Read-Only Snapshot Link
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                192-bit Crypto
              </span>
            </div>

            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Creates a cryptographically unguessable, read-only snapshot for family elders, clients, or co-organizers. No database required. Expires in 24 hours and can be revoked at any time.
            </p>

            {snapshot ? (
              <div className="space-y-3 pt-2">
                <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-emerald-600 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> Link Active (24h TTL)
                    </span>
                    <span className="text-[var(--text-muted)]">
                      Expires: {new Date(snapshot.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={shareUrl}
                      className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-primary)] font-mono truncate"
                    />
                    <button
                      onClick={handleCopy}
                      className="px-3 py-1.5 rounded-lg bg-[var(--primary)] text-[var(--primary-contrast)] text-xs font-semibold hover:opacity-90 transition-opacity flex items-center gap-1 flex-shrink-0 cursor-pointer"
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied!' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <button
                    onClick={() => setPreviewOpen(!previewOpen)}
                    className="text-xs font-semibold text-[var(--primary)] hover:underline flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" /> {previewOpen ? 'Hide Preview' : 'Preview Read-Only View'}
                  </button>

                  <button
                    onClick={handleRevoke}
                    disabled={isRevoking}
                    className="text-xs font-semibold text-red-600 hover:underline flex items-center gap-1 disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Revoke Access Now
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-xs text-[var(--text-muted)] italic">
                No active share link generated yet. Click below to create a secure 24-hour token.
              </div>
            )}
          </div>

          {!snapshot && (
            <button
              onClick={handleCreateShareLink}
              disabled={isGenerating}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-teal-700 text-white font-semibold text-xs hover:bg-teal-800 transition-colors cursor-pointer shadow-sm disabled:opacity-50"
            >
              <Share2 className="w-4 h-4" />
              <span>{isGenerating ? 'Generating Crypto Token...' : 'Generate 24-Hour Share Link'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Snapshot Preview Container */}
      {previewOpen && snapshot && (
        <div className="p-6 rounded-2xl border-2 border-dashed border-[var(--border-subtle)] bg-[var(--bg-card)] space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-600" />
              <span className="font-serif font-bold text-base text-[var(--text-primary)]">
                Read-Only Snapshot Preview (What Recipients See)
              </span>
            </div>
            <span className="text-xs text-[var(--text-muted)] font-mono">
              Token: {snapshot.token.substring(0, 12)}...
            </span>
          </div>

          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-[var(--bg-subtle)] space-y-1">
              <h4 className="font-serif font-bold text-lg text-[var(--text-primary)]">
                {snapshot.event.name}
              </h4>
              <p className="text-[var(--text-secondary)]">
                {formatDate(snapshot.event.date)} • {snapshot.event.city} • Budget: {formatINR(snapshot.event.totalBudget)}
              </p>
            </div>

            <div>
              <h5 className="font-semibold text-[var(--text-primary)] mb-1.5 uppercase text-[10px] tracking-wider">
                Budget Allocation Breakdown
              </h5>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {snapshot.event.budgetCategories.map((c) => (
                  <div key={c.id} className="p-2 rounded-lg bg-[var(--bg-subtle)]">
                    <span className="font-medium text-[var(--text-primary)] block truncate">{c.name}</span>
                    <span className="font-mono text-[var(--primary)] font-semibold">{formatINR(c.allocatedAmount)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
