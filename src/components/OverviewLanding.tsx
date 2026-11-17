import { useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  Code2,
  GitBranch,
  MailCheck,
  Search,
  SkipForward,
} from 'lucide-react';
import { motion } from 'motion/react';
import { BLUEPRINT_PRESETS } from '../lib/presets';
import type { EntryMode } from '../types/harness';
import type { WorkspaceTab } from './TopBar';

interface OverviewLandingProps {
  onNavigate: (tab: WorkspaceTab) => void;
  onLoadPresetAndOpen: (presetId: string, targetTab: WorkspaceTab) => void;
}

const SIX_STEPS = [
  {
    num: '01',
    title: 'Signals',
    desc: 'Capture buying triggers from upstream workflows, live web search, general prompts, or pure ICP criteria.',
    connector: 'Web Search · Webhook · ICP',
    feeds: '02 Companies',
  },
  {
    num: '02',
    title: 'Companies',
    desc: 'Consolidate targets into one clean organization list sourced from spreadsheets, CRM views, or webhooks.',
    connector: 'Spreadsheet · CRM · Webhook',
    feeds: '03 Contacts',
  },
  {
    num: '03',
    title: 'Contacts',
    desc: 'Resolve buyer personas via LinkedIn + syntax patterns, data tools (Clay, ZoomInfo), and live DNS MX checks.',
    connector: 'LinkedIn · Clay · DNS MX',
    feeds: '04 Research',
  },
  {
    num: '04',
    title: 'Research',
    desc: 'Assemble the 6-part brief: Company, Prospect, Induced Signal, Deduced Signal, Products Fit, and Value Prop.',
    connector: 'Search + Scraping Grounding',
    feeds: '05 Email',
  },
  {
    num: '05',
    title: 'Email',
    desc: 'Draft outreach as a complete email (greeting, body, signature) or a body-only CRM sequence merge token.',
    connector: 'Full Email · Body-Only Token',
    feeds: '06 Outreach',
  },
  {
    num: '06',
    title: 'Outreach',
    desc: 'Pause for human approval, then enroll verified contacts directly via mailbox mapping or sequence API.',
    connector: 'Mailbox · Smartlead · Instantly',
    feeds: 'Enrolled & Sending',
  },
];

const FAQ_ITEMS = [
  {
    q: 'What if our team already has a lead list or bought contacts?',
    a: 'Toggle "Already Have Leads" anywhere in the Blueprint or DAG Runner. The harness automatically short-circuits Steps 01 and 02 via boolean precondition pruning and routes your CSV or webhook rows straight into Step 03 DNS MX verification and Step 04 Research.',
  },
  {
    q: 'How does an n8n, Make.com, or Gumloop engineer deploy what is built here?',
    a: 'Every foundation config, custom step prompt, and grounded connector doc compiles deterministically in the Export tab into importable n8n Workflow JSON (with AI Agent and HTTP Request tool nodes), Make.com scenarios, Gumloop flows, Composio + Cron TypeScript runners, and modular SKILL.md packs.',
  },
  {
    q: 'How does the harness prevent unverified emails from entering outreach?',
    a: 'Step 03 executes real server-side DNS MX record lookups against every prospect domain before outreach approval. If a domain lacks active MX records or fails syntax checks, the Calibrated Truth gate flags the row for review without breaking creative copy flow.',
  },
  {
    q: 'When should I pick Full Email vs. Body-Only CRM Token in Step 05?',
    a: 'Choose Full Email when sending row-by-row directly from a mailbox or webhook integration. Choose Body-Only Token when enrolling into an existing Smartlead, Instantly, or HubSpot sequence that already wraps {{First_Name}} and your signature template.',
  },
];

export function OverviewLanding({
  onNavigate,
  onLoadPresetAndOpen,
}: OverviewLandingProps) {
  const [previewMode, setPreviewMode] = useState<EntryMode>('signals');
  const [openFaq, setOpenFaq] = useState<number | null>(0);

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
              SalesGency Prospect Automation System · Vertical GTM Harness
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-semibold tracking-[-0.03em] leading-[1.08] text-slate-900">
              Six deterministic steps from live signal to outbound sequence.
            </h1>
            <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Design your GTM foundation, ground real connector documentation, run live MX-verified prospect research, and compile the pipeline into n8n, Make.com, Gumloop, or modular agent skill packs.
            </p>

            <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => onNavigate('blueprint')}
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap cursor-pointer"
              >
                <span>Build Your Outreach Harness</span>
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

          {/* Interactive Knotch-Style Product Showcase Window */}
          <div className="mt-12 bg-slate-50 border border-slate-200 rounded-2xl p-6 md:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
              <div>
                <div className="text-xs font-medium text-slate-500">
                  Interactive Pipeline Preview · Middle-Out DAG Compression
                </div>
                <div className="text-sm font-semibold text-slate-900 mt-0.5">
                  Toggle entry mode to preview how Steps 01–02 bypass automatically
                </div>
              </div>

              <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg w-fit shrink-0">
                <button
                  type="button"
                  onClick={() => setPreviewMode('signals')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    previewMode === 'signals'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Start From Signals
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('existing_leads')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    previewMode === 'existing_leads'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Already Have Leads
                </button>
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
                          : 'bg-white border-slate-200'
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
                          Active
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="text-sm font-semibold text-slate-900">
                        {step.title}
                      </div>
                      <div className="text-[11px] text-slate-500 leading-snug">
                        {step.connector}
                      </div>
                    </div>
                  </div>
                );
              })}
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
                <span>Foundation Intake · Live Tool Doc Grounding</span>
              </div>
              <div className="space-y-2 max-w-xl">
                <h3 className="text-xl font-semibold text-slate-900">
                  Enforce completeness before a single token or webhook runs.
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Capture your ICP, buying signal hypothesis, products, value proposition, and email output format first. The harness verifies Foundation Wholeness (W = 1.00), then fetches live API & node documentation for the exact tools in your stack.
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
                <span>Step 03 · Operational Truth Gate</span>
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-slate-900">
                  Real DNS MX verification on every prospect domain.
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Creative copywriting runs unrestricted in your rep tone, while contact emails and domains pass live server-side DNS MX record checks before human approval.
                </p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4 font-mono text-xs space-y-1.5 tabular-nums">
                <div className="flex items-center justify-between text-slate-500">
                  <span>vercel.com</span>
                  <span className="text-emerald-700 font-semibold">MX Verified</span>
                </div>
                <div className="text-slate-700">1 · aspmx.l.google.com</div>
                <div className="text-slate-500">5 · alt1.aspmx.l.google.com</div>
              </div>
            </div>
          </div>

          {/* Row 2: 5 / 7 Asymmetric Split */}
          <div className="grid grid-cols-1 lg:grid-cols-12">
            <div className="lg:col-span-5 p-8 md:p-12 bg-slate-50/60 lg:border-r border-b lg:border-b-0 border-slate-200 space-y-6">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <GitBranch className="w-4 h-4 text-sky-600" />
                <span>Middle-Out DAG Execution</span>
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-slate-900">
                  Parallelized research waves & human approval gate.
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Wave 3 generates all six SalesGency brief fields (Company, Prospect, Induced Signal, Deduced Signal, Products Fit, Value Prop) concurrently across leads, then pauses before Step 06 dispatch.
                </p>
              </div>
              <div className="space-y-2 text-xs font-mono text-slate-700 tabular-nums">
                <div className="flex justify-between py-1.5 border-b border-slate-200">
                  <span>Wave 1 · Signals & Companies</span>
                  <span className="text-slate-500">Bypassable</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-200">
                  <span>Wave 2 · Contacts + MX Lookup</span>
                  <span className="text-slate-500">Parallel</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span>Wave 3 · 04 Research || 05 Email</span>
                  <span className="text-sky-700 font-semibold">Promise.all</span>
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
                  Export ready-to-import workflows, skill packs, and cron runners.
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Stop translating diagrams by hand. Compile your verified harness into importable n8n Workflow JSON, Make.com & Gumloop blueprints, Composio + Cron TypeScript scripts, modular SKILL.md playbooks, and the 11-artifact POP specification.
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
              onClick={() => onNavigate('runner')}
              className="text-xs font-medium text-sky-600 hover:text-sky-700 inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Customize skill prompts in Runner</span>
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
                    onClick={() => onNavigate('runner')}
                    className="font-medium text-slate-900 hover:text-sky-600 cursor-pointer"
                  >
                    Configure
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 4: QUANTIFIED ARCHITECTURE & READY BLUEPRINTS (Claim-to-Proof Adjacency) */}
        <section className="px-6 md:px-14 py-14 border-b border-slate-200 bg-slate-50/50">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 pb-12 border-b border-slate-200">
            {[
              { value: '6', label: 'Modular SKILL.md steps' },
              { value: '4', label: 'Compressed DAG waves' },
              { value: '100%', label: 'DNS MX pre-dispatch checks' },
              { value: '5', label: 'Exportable automation runtimes' },
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
                03. Ready-to-Run GTM Blueprints
              </p>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                Start from a production template and adapt it to your stack.
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {BLUEPRINT_PRESETS.map((preset) => (
                <div
                  key={preset.id}
                  className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between gap-6"
                >
                  <div className="space-y-2">
                    <div className="text-xs font-mono text-slate-500">
                      {preset.blueprint.targetRuntime.toUpperCase()} ·{' '}
                      {preset.blueprint.entryMode === 'signals'
                        ? 'Full 6-Step'
                        : 'Skip 01–02 Fast-Track'}
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
                      <span>Load Blueprint</span>
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
            Ready to compile your prospect outreach harness?
          </h2>
          <p className="text-sm text-slate-600 max-w-lg mx-auto">
            Configure your ICP, ground your tool documentation, verify prospect MX records, and export your workflow in minutes.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => onNavigate('blueprint')}
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 transition-colors cursor-pointer"
            >
              <span>Open Blueprint Studio</span>
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
              Blueprint
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
