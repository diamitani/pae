import { useState, type FormEvent } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  Code2,
  GitBranch,
  Globe,
  Loader2,
  MailCheck,
  Search,
  SkipForward,
  Sparkles,
} from 'lucide-react';
import { motion } from 'motion/react';
import { BLUEPRINT_PRESETS } from '../lib/presets';
import type { EntryMode, WebsiteTeardownResult } from '../types/harness';
import type { WorkspaceTab } from './TopBar';

interface OverviewLandingProps {
  onNavigate: (tab: WorkspaceTab) => void;
  onLoadPresetAndOpen: (presetId: string, targetTab: WorkspaceTab) => void;
  onApplyTeardownToBlueprint?: (teardown: WebsiteTeardownResult) => void;
}

const SIX_STEPS = [
  {
    num: '01',
    title: 'Signals',
    desc: 'Capture buying triggers from upstream workflows, live web search, general prompts, or pure ICP criteria.',
    connector: 'Factors.ai · ZoomInfo · Common Room',
    freeStack: 'Live Daily Web Search ($0.00)',
    feeds: '02 Companies',
  },
  {
    num: '02',
    title: 'Companies',
    desc: 'Consolidate targets into one clean organization list sourced from spreadsheets, CRM views, or webhooks.',
    connector: 'Apollo.io · Clay · HubSpot',
    freeStack: 'HubSpot CRM Cache + CSV ($0.00)',
    feeds: '03 Contacts',
  },
  {
    num: '03',
    title: 'Contacts',
    desc: 'Resolve buyer personas via LinkedIn + syntax patterns, data tools (Clay, ZoomInfo), and live DNS MX checks.',
    connector: 'Clay Waterfall · Apollo People',
    freeStack: 'Node DNS MX + Pattern Verifier ($0.00)',
    feeds: '04 Research',
  },
  {
    num: '04',
    title: 'Research',
    desc: 'Assemble the 6-part brief: Company, Prospect, Induced Signal, Deduced Signal, Products Fit, and Value Prop.',
    connector: 'Firecrawl · Exa · Perplexity',
    freeStack: 'DuckDuckGo + Jina Markdown ($0.00)',
    feeds: '05 Email',
  },
  {
    num: '05',
    title: 'Email',
    desc: 'Draft outreach as a complete email (greeting, body, signature) or a body-only CRM sequence merge token.',
    connector: 'Claude Sonnet + 5-Rule Linter',
    freeStack: 'Included Gemini + 5-Rule Linter ($0.00)',
    feeds: '06 Outreach',
  },
  {
    num: '06',
    title: 'Outreach',
    desc: 'Pause for human approval, then enroll verified contacts directly via mailbox mapping or sequence API.',
    connector: 'Smartlead · Instantly · Composio',
    freeStack: 'Approval-Gated Webhook / CSV ($0.00)',
    feeds: 'Enrolled & Sending',
  },
];

const FAQ_ITEMS = [
  {
    q: 'What if our team already has a lead list or bought contacts?',
    a: 'Toggle "Already Have Leads" anywhere in the Campaign Wizard or DAG Runner. The harness automatically short-circuits Steps 01 and 02 via boolean precondition pruning and routes your CSV or webhook rows straight into Step 03 DNS MX verification and Step 04 Research.',
  },
  {
    q: 'How does an n8n, Make.com, or Gumloop engineer deploy what is built here?',
    a: 'Every foundation config, custom step prompt, and grounded connector doc compiles deterministically in the Export tab into importable n8n Workflow JSON (plus PII-redacted error workflows), Make.com scenarios, Gumloop flows, Composio + Cron TypeScript runners, and modular ROSTRv2 SKILL.md packs.',
  },
  {
    q: 'How does the harness prevent unverified emails or robotic AI copy from sending?',
    a: 'Step 03 executes real server-side DNS MX record lookups against every prospect domain, and Step 05 runs a deterministic 5-rule email linter (<= 120 words, no fake Re:/Fwd:, zero exclamation marks, no raw cold links, and no unresolved {{tokens}}) before human approval.',
  },
  {
    q: 'Can I upload our pitch deck, ICP brief, and API docs to my account?',
    a: 'Yes. Step 01 of the Campaign Wizard and the Sign-In Portal let you upload campaign documents (.md, .txt, .csv, .json) directly into your workspace account so Enably and ICP Architect GPT ground every step in your actual offer.',
  },
];

export function OverviewLanding({
  onNavigate,
  onLoadPresetAndOpen,
  onApplyTeardownToBlueprint,
}: OverviewLandingProps) {
  const [previewMode, setPreviewMode] = useState<EntryMode>('signals');
  const [stackTier, setStackTier] = useState<'enterprise' | 'open_source'>('enterprise');
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const [teardownDomain, setTeardownDomain] = useState('linear.app');
  const [isTearingDown, setIsTearingDown] = useState(false);
  const [teardownError, setTeardownError] = useState<string | null>(null);
  const [teardownResult, setTeardownResult] = useState<WebsiteTeardownResult | null>(null);
  const [teardownEmailMode, setTeardownEmailMode] = useState<'full' | 'token'>('full');

  const handleRunTeardown = async (e: FormEvent) => {
    e.preventDefault();
    if (!teardownDomain.trim()) return;
    setIsTearingDown(true);
    setTeardownError(null);
    try {
      const res = await fetch('/api/teardown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: teardownDomain.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Teardown failed.');
      setTeardownResult(data.teardown);
    } catch (err) {
      setTeardownError(err instanceof Error ? err.message : 'Unable to run teardown.');
    } finally {
      setIsTearingDown(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="bg-white text-slate-900"
    >
      {/* Framed Architectural Canvas (Knotch Grid Infrastructure on Pure White) */}
      <div className="max-w-[1360px] mx-auto border-x border-slate-200">
        {/* SECTION 1: HERO */}
        <section className="px-6 md:px-14 pt-16 pb-14 border-b border-slate-200">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <p className="text-xs font-medium tracking-wide text-sky-600">
              SalesGency Prospect Automation System · Enably & ROSTRv2 GTM OS
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-semibold tracking-[-0.03em] leading-[1.08] text-slate-900">
              Six deterministic steps from live signal to outbound sequence.
            </h1>
            <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Start your campaign with who you reach out to and what you build, upload your GTM documents, connect Composio & APIs, and compile into n8n, Make.com, Gumloop, or modular agent skills.
            </p>

            <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => onNavigate('blueprint')}
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap cursor-pointer"
              >
                <span>Start Campaign Wizard</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate('runner')}
                className="inline-flex items-center gap-1.5 px-4 py-3 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors whitespace-nowrap cursor-pointer"
              >
                <span>Inspect Live DAG Loop</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Interactive 30-Second Live Website Outreach Teardown */}
          <div className="mt-12 bg-white border border-slate-200 rounded-2xl p-6 md:p-8 space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-200">
              <div>
                <div className="text-xs font-mono text-sky-600">
                  Interactive 30-Second Website Outreach Teardown
                </div>
                <div className="text-base font-semibold text-slate-900 mt-0.5">
                  Enter any company domain to extract live buying signals, ICP, and a 5-rule linted cold email
                </div>
              </div>

              <form onSubmit={handleRunTeardown} className="flex items-center gap-2 w-full lg:w-auto">
                <div className="relative flex-1 lg:w-72">
                  <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={teardownDomain}
                    onChange={(e) => setTeardownDomain(e.target.value)}
                    placeholder="e.g. linear.app, stripe.com, modal.com"
                    className="w-full pl-9 pr-3 py-2 text-sm font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isTearingDown}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {isTearingDown ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Analyzing...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Run 30s Teardown</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {teardownError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800">
                {teardownError}
              </div>
            )}

            {teardownResult && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
                <div className="lg:col-span-6 space-y-4">
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-semibold text-slate-900">
                        {teardownResult.companyName} ({teardownResult.domain})
                      </span>
                      <span className="text-sky-700 font-medium">
                        Buyer: {teardownResult.buyerPersona}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {teardownResult.icpSummary}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-slate-900">
                      5 Extracted Buying Signals & Triggers
                    </div>
                    <ul className="space-y-1.5 text-xs text-slate-600">
                      {teardownResult.signals.map((sig, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 p-2.5 bg-slate-50/70 border border-slate-200 rounded-lg"
                        >
                          <span className="font-mono text-sky-600 font-semibold tabular-nums">
                            0{i + 1}
                          </span>
                          <span>{sig}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="lg:col-span-6 bg-slate-50 border border-slate-200 rounded-xl p-5 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-xs font-semibold text-slate-900">
                        Step 05 · 5-Rule Linted Outreach ({teardownResult.lint.wordCount} words)
                      </div>
                      <div className="flex items-center gap-1 p-0.5 bg-slate-200/70 rounded-md text-[11px]">
                        <button
                          type="button"
                          onClick={() => setTeardownEmailMode('full')}
                          className={`px-2 py-1 rounded cursor-pointer ${
                            teardownEmailMode === 'full'
                              ? 'bg-white text-slate-900 font-medium'
                              : 'text-slate-600'
                          }`}
                        >
                          Full Email
                        </button>
                        <button
                          type="button"
                          onClick={() => setTeardownEmailMode('token')}
                          className={`px-2 py-1 rounded cursor-pointer ${
                            teardownEmailMode === 'token'
                              ? 'bg-white text-slate-900 font-medium'
                              : 'text-slate-600'
                          }`}
                        >
                          {'{{email_1_body}}'}
                        </button>
                      </div>
                    </div>

                    <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-2 text-xs">
                      <div className="font-mono text-slate-500 border-b border-slate-100 pb-1.5">
                        Subject: <span className="text-slate-900">{teardownResult.subject}</span>
                      </div>
                      <pre className="whitespace-pre-wrap font-sans text-slate-800 leading-relaxed">
                        {teardownEmailMode === 'full'
                          ? teardownResult.fullEmail
                          : teardownResult.bodyOnlyToken}
                      </pre>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200">
                    <div className="text-[11px] font-mono text-emerald-700">
                      5/5 Linter Rules Passed · Zero "!" · Zero Cold URLs
                    </div>
                    {onApplyTeardownToBlueprint && (
                      <button
                        type="button"
                        onClick={() => onApplyTeardownToBlueprint(teardownResult)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 cursor-pointer"
                      >
                        <span>Launch Campaign With Teardown</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Interactive 6-Step Pipeline Preview Bar */}
            <div className="pt-4 border-t border-slate-200 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs text-slate-600">
                  <span className="font-semibold text-slate-900">6-Step Pipeline Preview:</span>{' '}
                  Toggle Entry Mode or compare Paid Enterprise vs. $0.00 Open-Source Stack
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs">
                    <button
                      type="button"
                      onClick={() => setStackTier('enterprise')}
                      className={`px-2.5 py-1 rounded-md font-medium cursor-pointer ${
                        stackTier === 'enterprise'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600'
                      }`}
                    >
                      Paid Enterprise Stack
                    </button>
                    <button
                      type="button"
                      onClick={() => setStackTier('open_source')}
                      className={`px-2.5 py-1 rounded-md font-medium cursor-pointer ${
                        stackTier === 'open_source'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600'
                      }`}
                    >
                      $0.00 Open-Source Stack
                    </button>
                  </div>

                  <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs">
                    <button
                      type="button"
                      onClick={() => setPreviewMode('signals')}
                      className={`px-2.5 py-1 rounded-md font-medium cursor-pointer ${
                        previewMode === 'signals'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600'
                      }`}
                    >
                      Start From Signals
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewMode('existing_leads')}
                      className={`px-2.5 py-1 rounded-md font-medium cursor-pointer ${
                        previewMode === 'existing_leads'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600'
                      }`}
                    >
                      Already Have Leads
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {SIX_STEPS.map((step, idx) => {
                  const isBypassed = previewMode === 'existing_leads' && idx < 2;
                  return (
                    <div
                      key={step.num}
                      className={`p-4 rounded-xl border transition-all flex flex-col justify-between min-h-[132px] ${
                        isBypassed
                          ? 'bg-slate-100/80 border-slate-200 opacity-55'
                          : idx === 5
                            ? 'bg-white border-sky-600'
                            : 'bg-slate-50/60 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono font-semibold text-slate-900 tabular-nums">
                          {step.num}
                        </span>
                        {isBypassed ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                            <SkipForward className="w-3 h-3" />
                            <span>Skipped</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-sky-700 font-medium">
                            {stackTier === 'open_source' ? '$0.00' : 'Active'}
                          </span>
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="text-sm font-semibold text-slate-900">
                          {step.title}
                        </div>
                        <div className="text-[11px] text-slate-500 leading-snug">
                          {stackTier === 'open_source' ? step.freeStack : step.connector}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: ASYMMETRIC BENTO INFRASTRUCTURE (01. System Architecture) */}
        <section className="border-b border-slate-200">
          <div className="px-6 md:px-14 py-12 border-b border-slate-200 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2 max-w-2xl">
              <p className="text-xs font-medium text-sky-600">
                01. Core Infrastructure
              </p>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
                Built to eliminate brittle prompts and manual glue code.
              </h2>
            </div>
            <p className="text-sm text-slate-600 max-w-sm">
              Every outreach workflow shares the same six steps—everything else is a connector, prompt, or tool.
            </p>
          </div>

          {/* Row 1: 7 / 5 Asymmetric Split */}
          <div className="grid grid-cols-1 lg:grid-cols-12 border-b border-slate-200">
            <div className="lg:col-span-7 p-8 md:p-12 lg:border-r border-b lg:border-b-0 border-slate-200 space-y-6">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <Search className="w-4 h-4 text-sky-600" />
                <span>Campaign Intake · Account Document Vault · Enably Co-Pilot</span>
              </div>
              <div className="space-y-2 max-w-xl">
                <h3 className="text-xl font-semibold text-slate-900">
                  Start with who you reach out to, upload your docs, and synthesize your GTM brain.
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Upload pitch decks, ICP briefs, CSV lead lists, and API docs directly to your account. Enably and ICP Architect GPT synthesize structured JSON profiles, credit-aware tool waterfalls, and V1 test gates across all 6 steps.
                </p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                {['n8n', 'Make.com', 'Gumloop', 'Composio'].map((tool) => (
                  <div
                    key={tool}
                    className="bg-white border border-slate-200 rounded-lg px-3 py-2 font-medium text-slate-800 flex items-center justify-between"
                  >
                    <span>{tool}</span>
                    <Check className="w-3.5 h-3.5 text-sky-600" />
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-5 p-8 md:p-12 bg-slate-50/60 space-y-6">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <MailCheck className="w-4 h-4 text-sky-600" />
                <span>Step 03 & Step 05 · Operational Truth & 5-Rule Linter</span>
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-slate-900">
                  Real DNS MX verification + deterministic 5-rule copy linting.
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Every contact domain undergoes live server-side DNS MX verification, and every email draft is checked against the 5-rule linter (&le;120 words, no fake Re:, zero "!", no cold URLs, no unmerged tokens).
                </p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4 font-mono text-xs space-y-1.5 tabular-nums">
                <div className="flex items-center justify-between text-slate-500">
                  <span>vercel.com</span>
                  <span className="text-emerald-700 font-semibold">MX + 5/5 Linter Verified</span>
                </div>
                <div className="text-slate-700">1 · aspmx.l.google.com</div>
                <div className="text-slate-500">Mode: {'{{email_1_body}}'} or Full Email</div>
              </div>
            </div>
          </div>

          {/* Row 2: 5 / 7 Asymmetric Split */}
          <div className="grid grid-cols-1 lg:grid-cols-12">
            <div className="lg:col-span-5 p-8 md:p-12 bg-slate-50/60 lg:border-r border-b lg:border-b-0 border-slate-200 space-y-6">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <GitBranch className="w-4 h-4 text-sky-600" />
                <span>Connected Operations & State Reconciliation</span>
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-slate-900">
                  Compare current vs. desired state across DNS, CRM, and sequences.
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Inspect AWS Route 53, GoDaddy DNS, HubSpot CRM mappings, and sequence suppression in read-only mode first—and execute changes only with a single-use host approval binding.
                </p>
              </div>
              <div className="space-y-2 text-xs font-mono text-slate-700 tabular-nums">
                <div className="flex justify-between py-1.5 border-b border-slate-200">
                  <span>Wave 1 · Signals & Companies</span>
                  <span className="text-slate-500">$0.00 Cache First</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-200">
                  <span>Wave 2 · Contacts + MX Lookup</span>
                  <span className="text-slate-500">Parallel</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span>Wave 3 · 04 Research || 05 Email</span>
                  <span className="text-sky-700 font-semibold">Promise.all + Linter</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 p-8 md:p-12 space-y-6">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <Code2 className="w-4 h-4 text-sky-600" />
                <span>Multi-Target Production Compiler</span>
              </div>
              <div className="space-y-2 max-w-xl">
                <h3 className="text-xl font-semibold text-slate-900">
                  Export ready-to-import workflows, ROSTRv2 skill packs, and Supabase schemas.
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Compile your verified harness into importable n8n Workflow JSON (with PII-redacted error workflows), Make.com & Gumloop blueprints, Composio + Cron TypeScript runners, 11 ROSTRv2 SKILL.md files, and Supabase PostgreSQL migrations.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onNavigate('export')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-slate-900 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-200/70 transition-colors cursor-pointer"
                >
                  <span>Inspect Export Compiler</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 3: THE 6-STEP SYSTEM MATRIX */}
        <section className="px-6 md:px-14 py-14 border-b border-slate-200">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-10">
            <div className="space-y-2">
              <p className="text-xs font-medium text-sky-600">
                02. Canonical SalesGency Workflow
              </p>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
                Every outreach system maps to these six modules.
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('blueprint')}
              className="text-xs font-medium text-sky-600 hover:text-sky-700 inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Configure all 6 steps in Campaign Wizard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 border-t border-l border-slate-200">
            {SIX_STEPS.map((step) => (
              <div
                key={step.num}
                className="p-7 border-r border-b border-slate-200 flex flex-col justify-between gap-5 bg-white hover:bg-slate-50/70 transition-colors"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-semibold text-sky-600 tabular-nums">
                      Step {step.num}
                    </span>
                    <span className="text-slate-400">{step.connector}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">{step.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{step.desc}</p>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Feeds into {step.feeds}</span>
                  <button
                    type="button"
                    onClick={() => onNavigate('blueprint')}
                    className="font-medium text-slate-900 hover:text-sky-600 cursor-pointer"
                  >
                    Configure
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 4: QUANTIFIED ARCHITECTURE & READY BLUEPRINTS */}
        <section className="px-6 md:px-14 py-14 border-b border-slate-200 bg-slate-50/50">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 pb-12 border-b border-slate-200">
            {[
              { value: '24', label: 'Indexed /r/docs tool schemas' },
              { value: '$0.00', label: 'Free cache & open-source waterfall tier' },
              { value: '100%', label: 'DNS MX & 5-rule linter coverage' },
              { value: '11', label: 'Portable ROSTRv2 SKILL.md files' },
            ].map((stat) => (
              <div key={stat.label} className="space-y-1">
                <div className="font-mono text-3xl font-semibold text-slate-900 tabular-nums">
                  {stat.value}
                </div>
                <div className="text-xs text-slate-600">{stat.label}</div>
              </div>
            ))}
          </div>

          <div className="pt-12 space-y-6">
            <div className="space-y-1">
              <p className="text-xs font-medium text-sky-600">
                03. 1-Click GTM Playbooks
              </p>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                Start from a production playbook and adapt it to your stack.
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {BLUEPRINT_PRESETS.map((preset) => (
                <div
                  key={preset.id}
                  className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between gap-6"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono text-slate-500">
                      <span>{preset.blueprint.targetRuntime.toUpperCase()}</span>
                      <span className="text-emerald-700 font-semibold">
                        {preset.costPerLeadLabel}
                      </span>
                    </div>
                    <h3 className="text-base font-semibold text-slate-900">
                      {preset.name}
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {preset.tagline}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-500 truncate max-w-[180px]">
                      {preset.blueprint.selectedTools.join(' · ')}
                    </span>
                    <button
                      type="button"
                      onClick={() => onLoadPresetAndOpen(preset.id, 'blueprint')}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-700 whitespace-nowrap cursor-pointer"
                    >
                      <span>Load Playbook</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 5: TECHNICAL FAQ ACCORDION */}
        <section className="px-6 md:px-14 py-14 border-b border-slate-200">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-4 space-y-2">
              <p className="text-xs font-medium text-sky-600">
                04. Engineering Questions
              </p>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                How the harness fits your automation stack.
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Designed for GTM engineers, RevOps teams, and AI agency builders deploying deterministic outbound pipelines.
              </p>
            </div>

            <div className="lg:col-span-8 divide-y divide-slate-200 border-t border-b border-slate-200">
              {FAQ_ITEMS.map((item, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div key={item.q}>
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      className="w-full py-5 flex items-center justify-between gap-4 text-left cursor-pointer"
                    >
                      <span className="text-sm sm:text-base font-medium text-slate-900">
                        {item.q}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-500 shrink-0 transition-transform duration-150 ${
                          isOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <p className="pb-5 text-sm text-slate-600 leading-relaxed pr-8">
                        {item.a}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* SECTION 6: CONVERSION BLOCK & QUIET FOOTER */}
        <section className="px-6 md:px-14 py-16 text-center space-y-5 border-b border-slate-200 bg-slate-50/40">
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900 max-w-xl mx-auto">
            Ready to launch your prospect outreach campaign?
          </h2>
          <p className="text-sm text-slate-600 max-w-lg mx-auto">
            Describe who you are reaching out to, upload your GTM documents, verify prospect MX records, and compile your workflow in minutes.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => onNavigate('blueprint')}
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 transition-colors cursor-pointer"
            >
              <span>Open Campaign Wizard</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        </section>

        <footer className="px-6 md:px-14 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            <span className="font-semibold text-slate-900">SalesGency</span> · Prospect Automation System · Created by Patrick Diamitani · Diamitani Industries
          </div>
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => onNavigate('blueprint')}
              className="hover:text-slate-900 cursor-pointer"
            >
              Campaign
            </button>
            <button
              type="button"
              onClick={() => onNavigate('runner')}
              className="hover:text-slate-900 cursor-pointer"
            >
              Runner
            </button>
            <button
              type="button"
              onClick={() => onNavigate('prospects')}
              className="hover:text-slate-900 cursor-pointer"
            >
              Prospects
            </button>
            <button
              type="button"
              onClick={() => onNavigate('export')}
              className="hover:text-slate-900 cursor-pointer"
            >
              Export
            </button>
          </div>
        </footer>
      </div>
    </motion.div>
  );
}
