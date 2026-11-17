import { useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Download,
  ExternalLink,
  Loader2,
  Mail,
  Search,
  Send,
  ShieldCheck,
  X,
} from 'lucide-react';
import { motion } from 'motion/react';
import type { HarnessBlueprint, ProspectRecord } from '../types/harness';

interface ProspectsViewProps {
  blueprint: HarnessBlueprint;
  prospects: ProspectRecord[];
  isVerifyingMx: boolean;
  isDispatching: boolean;
  dispatchFeedback: string | null;
  onUpdateProspect: (id: string, patch: Partial<ProspectRecord>) => void;
  onVerifyAllMx: () => void;
  onVerifySingleMx: (id: string) => void;
  onApproveAllVerified: () => void;
  onDispatchWebhook: (webhookUrl: string, selectedProspects: ProspectRecord[]) => Promise<void>;
  onGoToRunner: () => void;
}

type StatusFilter = 'all' | 'mx_verified' | 'flagged' | 'approved' | 'dispatched';

export function ProspectsView({
  blueprint,
  prospects,
  isVerifyingMx,
  isDispatching,
  dispatchFeedback,
  onUpdateProspect,
  onVerifyAllMx,
  onVerifySingleMx,
  onApproveAllVerified,
  onDispatchWebhook,
  onGoToRunner,
}: ProspectsViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [webhookTarget, setWebhookTarget] = useState(blueprint.connectors.webhookUrl);

  const selectedProspect = prospects.find((p) => p.id === selectedId) ?? null;

  const filtered = prospects.filter((p) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      p.company.toLowerCase().includes(q) ||
      p.contactName.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      p.domain.toLowerCase().includes(q);
    if (!matchesSearch) return false;
    if (filter === 'mx_verified') return p.mx.hasMx;
    if (filter === 'flagged') return p.approvalStatus === 'flagged' || !p.mx.hasMx;
    if (filter === 'approved') return p.approvalStatus === 'approved';
    if (filter === 'dispatched') return p.approvalStatus === 'dispatched';
    return true;
  });

  const approvedList = prospects.filter((p) => p.approvalStatus === 'approved');

  const handleExportCsv = () => {
    const rows = [
      [
        'Company',
        'Domain',
        'Contact Name',
        'Title',
        'Email',
        'MX Verified',
        'Email Mode',
        'Subject',
        'Body',
        'Induced Signal',
        'Deduced Signal',
        'Status',
      ],
      ...prospects.map((p) => [
        p.company,
        p.domain,
        p.contactName,
        p.contactTitle,
        p.email,
        p.mx.hasMx ? 'yes' : 'no',
        p.emailDraft.mode,
        p.emailDraft.subject,
        p.emailDraft.body.replace(/\n/g, ' '),
        p.brief.inducedSignal,
        p.brief.deducedSignal,
        p.approvalStatus,
      ]),
    ];

    const csv = rows
      .map((r) => r.map((cell) => `"${String(cell || '').replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${blueprint.workflowName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-prospects.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      className="max-w-[1440px] mx-auto px-6 py-8 space-y-6"
    >
      {/* Header & Bulk Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <p className="text-xs font-medium text-sky-600">
            Steps 03–06 · Research Briefs, Calibrated Truth & Approval Gate
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 mt-1">
            Verify MX deliverability, inspect briefs, and approve outreach.
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onVerifyAllMx}
            disabled={isVerifyingMx || prospects.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap cursor-pointer"
          >
            {isVerifyingMx ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-600" />
            ) : (
              <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
            )}
            <span>Verify All MX</span>
          </button>

          <button
            type="button"
            onClick={onApproveAllVerified}
            disabled={prospects.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap cursor-pointer"
          >
            <Check className="w-3.5 h-3.5 text-emerald-600" />
            <span>Approve Verified</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={prospects.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download CSV</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setWebhookTarget(blueprint.connectors.webhookUrl);
              setConfirmOpen(true);
            }}
            disabled={approvedList.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 disabled:opacity-50 whitespace-nowrap cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Dispatch Approved ({approvedList.length})</span>
          </button>
        </div>
      </div>

      {dispatchFeedback && (
        <div className="p-3.5 bg-sky-50 border border-sky-200 rounded-xl text-xs text-sky-900">
          {dispatchFeedback}
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit">
          {(
            [
              { id: 'all', label: `All (${prospects.length})` },
              {
                id: 'mx_verified',
                label: `MX Verified (${prospects.filter((p) => p.mx.hasMx).length})`,
              },
              {
                id: 'flagged',
                label: `Needs Review (${prospects.filter((p) => !p.mx.hasMx || p.approvalStatus === 'flagged').length})`,
              },
              {
                id: 'approved',
                label: `Approved (${approvedList.length})`,
              },
              {
                id: 'dispatched',
                label: `Dispatched (${prospects.filter((p) => p.approvalStatus === 'dispatched').length})`,
              },
            ] as Array<{ id: StatusFilter; label: string }>
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap tabular-nums cursor-pointer ${
                filter === tab.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by company, email, domain..."
            className="w-full pl-8 pr-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-600"
          />
        </div>
      </div>

      {/* Empty State or Dense Data Table */}
      {prospects.length === 0 ? (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-12 text-center space-y-3">
          <Mail className="w-8 h-8 text-slate-400 mx-auto" />
          <h2 className="text-base font-semibold text-slate-900">
            No prospects in the queue yet
          </h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            Run the 6-step DAG graph loop to discover live companies and generate research briefs, or ingest an existing CSV/Webhook lead list in the DAG Runner.
          </p>
          <button
            type="button"
            onClick={onGoToRunner}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 cursor-pointer"
          >
            <span>Open DAG Runner</span>
          </button>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
                  <th className="py-2.5 px-4">Company</th>
                  <th className="py-2.5 px-4">Buyer Persona</th>
                  <th className="py-2.5 px-4">Email & MX Status</th>
                  <th className="py-2.5 px-4">Induced Signal</th>
                  <th className="py-2.5 px-4">Draft Mode</th>
                  <th className="py-2.5 px-4 text-right">Gate Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filtered.map((p) => {
                  const isSelected = p.id === selectedId;
                  return (
                    <tr
                      key={p.id}
                      onClick={() => setSelectedId(p.id)}
                      className={`h-11 transition-colors cursor-pointer ${
                        isSelected ? 'bg-sky-50/70' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <div className="font-medium text-slate-900">{p.company}</div>
                        <div className="text-xs font-mono text-slate-500">{p.domain}</div>
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <div className="text-slate-900">{p.contactName}</div>
                        <div className="text-xs text-slate-500">{p.contactTitle}</div>
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <div className="font-mono text-xs text-slate-800">{p.email}</div>
                        <div className="text-[11px] mt-0.5 flex items-center gap-1.5">
                          {p.mx.status === 'verified' && (
                            <span className="text-emerald-700 font-medium">
                              MX Verified · {p.mx.mxRecords[0]?.exchange || 'Active'}
                            </span>
                          )}
                          {p.mx.status === 'no_mx' && (
                            <span className="text-amber-700 font-medium">
                              No MX Record
                            </span>
                          )}
                          {p.mx.status === 'invalid_syntax' && (
                            <span className="text-red-700 font-medium">Invalid Syntax</span>
                          )}
                          {p.mx.status === 'unchecked' && (
                            <span className="text-slate-500">Unchecked</span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 max-w-xs">
                        <div className="text-xs text-slate-600 truncate">
                          {p.brief.inducedSignal}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap text-xs text-slate-600">
                        {p.emailDraft.mode === 'full' ? 'Full Email' : 'Body Token'}
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap text-right text-xs font-medium">
                        {p.approvalStatus === 'approved' && (
                          <span className="text-emerald-700">Approved</span>
                        )}
                        {p.approvalStatus === 'dispatched' && (
                          <span className="text-sky-700">Dispatched</span>
                        )}
                        {p.approvalStatus === 'flagged' && (
                          <span className="text-amber-700">Needs Review</span>
                        )}
                        {p.approvalStatus === 'pending' && (
                          <span className="text-slate-600">Pending</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Slide-Over Prospect & 6-Part Research Brief Drawer */}
      {selectedProspect && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/20 flex justify-end"
          onClick={() => setSelectedId(null)}
        >
          <aside
            className="w-full max-w-2xl bg-white h-full border-l border-slate-200 overflow-y-auto p-6 space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <div className="text-xs font-mono text-slate-500">
                  {selectedProspect.domain} · {selectedProspect.industry}
                </div>
                <h2 className="text-xl font-semibold text-slate-900 mt-0.5">
                  {selectedProspect.company} — {selectedProspect.contactName}
                </h2>
                <p className="text-xs text-slate-500">{selectedProspect.contactTitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                aria-label="Close drawer"
                className="p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Calibrated Truth Notice */}
            {selectedProspect.truthNotice && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-semibold">Calibrated Truth Protocol Notice</div>
                  <p className="leading-relaxed">{selectedProspect.truthNotice}</p>
                </div>
              </div>
            )}

            {/* Editable Email + Real MX Check */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-slate-900">
                  Step 03 · Contact & Live DNS MX Check
                </span>
                <button
                  type="button"
                  onClick={() => onVerifySingleMx(selectedProspect.id)}
                  className="text-xs font-medium text-sky-600 hover:text-sky-700 cursor-pointer"
                >
                  Re-run MX Lookup
                </button>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="email"
                  value={selectedProspect.email}
                  onChange={(e) =>
                    onUpdateProspect(selectedProspect.id, { email: e.target.value })
                  }
                  className="flex-1 px-3 py-1.5 text-sm font-mono bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600"
                />
                <div className="px-3 py-1.5 text-xs font-mono bg-white border border-slate-200 rounded-lg flex items-center gap-1.5">
                  {selectedProspect.mx.hasMx ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">
                        MX: {selectedProspect.mx.mxRecords[0]?.exchange}
                      </span>
                    </>
                  ) : (
                    <span className="text-amber-700">No active MX verified</span>
                  )}
                </div>
              </div>
            </div>

            {/* 6-Part SalesGency Research Brief */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-900">
                Step 04 · 6-Part SalesGency Research Brief
              </h3>
              <div className="grid grid-cols-1 gap-3 text-xs">
                {(
                  [
                    ['1. Company Overview', selectedProspect.brief.companyOverview],
                    ['2. Prospect Overview', selectedProspect.brief.prospectOverview],
                    ['3. Signal: Induced (Direct Evidence)', selectedProspect.brief.inducedSignal],
                    ['4. Signal: Deduced (Inferred Need)', selectedProspect.brief.deducedSignal],
                    ['5. Products & Services Fit', selectedProspect.brief.productsFit],
                    ['6. Value Proposition', selectedProspect.brief.valueProposition],
                  ] as const
                ).map(([label, val]) => (
                  <div
                    key={label}
                    className="p-3 bg-white border border-slate-200 rounded-lg space-y-1"
                  >
                    <div className="font-semibold text-slate-800">{label}</div>
                    <p className="text-slate-600 leading-relaxed">{val}</p>
                  </div>
                ))}
              </div>

              {selectedProspect.brief.sources.length > 0 && (
                <div className="flex flex-wrap gap-3 pt-1">
                  {selectedProspect.brief.sources.map((src) => (
                    <a
                      key={src.uri}
                      href={src.uri}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-sky-600 hover:underline"
                    >
                      <span className="truncate max-w-[220px]">{src.title}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Step 05 Editable Email Draft */}
            <div className="space-y-3 pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">
                  Step 05 · Personalized Outreach ({selectedProspect.emailDraft.mode === 'full' ? 'Full Email' : 'Body-Only CRM Token'})
                </h3>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700">
                  Subject Line
                </label>
                <input
                  type="text"
                  value={selectedProspect.emailDraft.subject}
                  onChange={(e) =>
                    onUpdateProspect(selectedProspect.id, {
                      emailDraft: { ...selectedProspect.emailDraft, subject: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700">
                  {selectedProspect.emailDraft.mode === 'full'
                    ? 'Full Email Copy'
                    : 'CRM Body Token ({{Email_1_Body}})'}
                </label>
                <textarea
                  rows={7}
                  value={selectedProspect.emailDraft.body}
                  onChange={(e) =>
                    onUpdateProspect(selectedProspect.id, {
                      emailDraft: { ...selectedProspect.emailDraft, body: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 leading-relaxed focus:outline-none focus:ring-2 focus:ring-sky-600"
                />
              </div>
            </div>

            {/* Footer Gate Actions */}
            <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() =>
                  onUpdateProspect(selectedProspect.id, { approvalStatus: 'flagged' })
                }
                className="px-3.5 py-2 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 cursor-pointer"
              >
                Flag for Review
              </button>

              <button
                type="button"
                onClick={() => {
                  onUpdateProspect(selectedProspect.id, { approvalStatus: 'approved' });
                  setSelectedId(null);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Approve for Step 06 Outreach</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Explicit Confirmation Modal for Step 06 Webhook Dispatch */}
      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/30 flex items-center justify-center p-4"
          onClick={() => setConfirmOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-white border border-slate-200 rounded-xl p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-slate-900">
                Confirm Step 06 Webhook Dispatch
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                This will POST <strong className="font-mono tabular-nums">{approvedList.length}</strong> approved prospect record(s) and their generated outreach drafts to the endpoint below.
              </p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="confirm-webhook-url" className="block text-xs font-medium text-slate-700">
                Destination Webhook / Sequence API URL
              </label>
              <input
                id="confirm-webhook-url"
                type="url"
                value={webhookTarget}
                onChange={(e) => setWebhookTarget(e.target.value)}
                placeholder="https://n8n.yourdomain.com/webhook/salesgency"
                className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600"
              />
            </div>

            <div className="max-h-32 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 text-xs">
              {approvedList.map((p) => (
                <div key={p.id} className="px-3 py-2 flex items-center justify-between gap-2">
                  <span className="font-medium text-slate-900">{p.company}</span>
                  <span className="font-mono text-slate-500">{p.email}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDispatching || !webhookTarget.trim()}
                onClick={async () => {
                  await onDispatchWebhook(webhookTarget, approvedList);
                  setConfirmOpen(false);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 disabled:opacity-50 cursor-pointer"
              >
                {isDispatching ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>Confirm & Dispatch</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
