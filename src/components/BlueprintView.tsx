import { useState, type ChangeEvent, type KeyboardEvent } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Play,
  SkipForward,
  Sparkles,
  Upload,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type {
  CampaignDocType,
  ConnectorDoc,
  HarnessBlueprint,
  SectionV1TestResult,
  StepId,
  TargetRuntime,
  WholenessReport,
  WorkflowStepSkill,
  WorkspaceAccount,
} from '../types/harness';
import { BLUEPRINT_PRESETS, R_DOCS_REGISTRY, TOOL_CATALOG } from '../lib/presets';

interface BlueprintViewProps {
  blueprint: HarnessBlueprint;
  wholeness: WholenessReport;
  steps: WorkflowStepSkill[];
  account: WorkspaceAccount;
  connectorDocs: ConnectorDoc[];
  isGroundingDocs: boolean;
  docsError: string | null;
  isUploadingDoc: boolean;
  onChangeBlueprint: (next: HarnessBlueprint) => void;
  onUpdateStep: (stepId: StepId, patch: Partial<WorkflowStepSkill>) => void;
  onApplyPreset: (presetId: string) => void;
  onGroundDocs: () => void;
  onUploadDocument: (
    name: string,
    docType: CampaignDocType,
    content: string
  ) => Promise<void>;
  onOpenAuthModal: () => void;
  onProceedToRunner: () => void;
}

const RUNTIME_OPTIONS: Array<{ id: TargetRuntime; label: string }> = [
  { id: 'n8n', label: 'n8n' },
  { id: 'make', label: 'Make.com' },
  { id: 'gumloop', label: 'Gumloop' },
  { id: 'composio_cron', label: 'Composio + Cron' },
  { id: 'code_harness', label: 'ROSTRv2 Skill Pack' },
];

const WIZARD_STEPS: Array<{
  id: number;
  short: string;
  stepId?: StepId;
  title: string;
  subtitle: string;
}> = [
  {
    id: 0,
    short: '00 · Start Campaign',
    title: 'Who are you reaching out to, what do you build, and why is it relevant?',
    subtitle:
      'Describe your campaign, upload your pitch deck / ICP / API docs to your account, and connect your tools or Composio.',
  },
  {
    id: 1,
    short: '01 · Signals',
    stepId: '01_signals',
    title: 'Step 01 Signals — What buying triggers create urgency right now?',
    subtitle:
      'Configure your signal hypothesis, choose $0.00 web search or intent tools, and run the V1 section test.',
  },
  {
    id: 2,
    short: '02 · Companies',
    stepId: '02_companies',
    title: 'Step 02 Companies — Where do target organizations come from?',
    subtitle:
      'Start from live signal discovery or bypass Steps 01–02 with an existing CSV / CRM lead list.',
  },
  {
    id: 3,
    short: '03 · Contacts',
    stepId: '03_contacts',
    title: 'Step 03 Contacts — Buyer personas & DNS MX verification.',
    subtitle:
      'Define the decision-maker roles to resolve and enforce $0.00 RFC 5322 + DNS MX mail server checks.',
  },
  {
    id: 4,
    short: '04 · Research',
    stepId: '04_research',
    title: 'Step 04 Research — 6-part SalesGency brief & offer fit.',
    subtitle:
      'Configure how the agent connects your products and value proposition to each prospect’s induced and deduced signals.',
  },
  {
    id: 5,
    short: '05 · Email',
    stepId: '05_email',
    title: 'Step 05 Email — Full Email vs. {{email_1_body}} Token & 5-Rule Linter.',
    subtitle:
      'Choose your sequencer output mode, rep attribution, and test against the 5-rule deterministic email linter.',
  },
  {
    id: 6,
    short: '06 · Outreach',
    stepId: '06_outreach',
    title: 'Step 06 Outreach — Approval gate, destination & launch.',
    subtitle:
      'Confirm Foundation Wholeness (W = 1.00), ground live API docs, and launch the 4-wave DAG loop.',
  },
];

export function BlueprintView({
  blueprint,
  wholeness,
  steps,
  account,
  connectorDocs,
  isGroundingDocs,
  docsError,
  isUploadingDoc,
  onChangeBlueprint,
  onUpdateStep,
  onApplyPreset,
  onGroundDocs,
  onUploadDocument,
  onOpenAuthModal,
  onProceedToRunner,
}: BlueprintViewProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [docType, setDocType] = useState<CampaignDocType>('pitch_deck');
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);

  const [icpTier, setIcpTier] = useState<'minimal' | 'standard' | 'enriched'>('enriched');
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [synthNotice, setSynthNotice] = useState<string | null>(null);

  const [v1Results, setV1Results] = useState<Record<string, SectionV1TestResult>>({});
  const [testingStepId, setTestingStepId] = useState<StepId | null>(null);

  const totalSteps = WIZARD_STEPS.length;
  const currentMeta = WIZARD_STEPS[stepIndex];
  const currentStepSkill = currentMeta.stepId
    ? steps.find((s) => s.id === currentMeta.stepId)
    : undefined;

  const goTo = (nextIndex: number) => {
    const clamped = Math.max(0, Math.min(totalSteps - 1, nextIndex));
    setDirection(clamped >= stepIndex ? 1 : -1);
    setStepIndex(clamped);
  };

  const handleNext = () => {
    if (stepIndex < totalSteps - 1) {
      goTo(stepIndex + 1);
    } else {
      onProceedToRunner();
    }
  };

  const handlePrev = () => {
    if (stepIndex > 0) {
      goTo(stepIndex - 1);
    }
  };

  const handleSingleLineEnter = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleNext();
    }
  };

  const toggleTool = (toolId: string) => {
    const exists = blueprint.selectedTools.includes(toolId);
    const nextTools = exists
      ? blueprint.selectedTools.filter((id) => id !== toolId)
      : [...blueprint.selectedTools, toolId];
    onChangeBlueprint({ ...blueprint, selectedTools: nextTools });
  };

  const toggleRegistrySlug = (slug: string) => {
    const current = blueprint.selectedRegistrySlugs ?? [];
    const exists = current.includes(slug);
    const next = exists ? current.filter((s) => s !== slug) : [...current, slug];
    onChangeBlueprint({ ...blueprint, selectedRegistrySlugs: next });
  };

  const updateConnector = <K extends keyof HarnessBlueprint['connectors']>(
    key: K,
    value: HarnessBlueprint['connectors'][K]
  ) => {
    onChangeBlueprint({
      ...blueprint,
      connectors: { ...blueprint.connectors, [key]: value },
    });
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const content = await file.text();
    await onUploadDocument(file.name, docType, content);
    setUploadNotice(`Uploaded "${file.name}" and saved to account ${account.email}.`);
    e.target.value = '';
  };

  const handleSynthesizeWithEnably = async () => {
    setIsSynthesizing(true);
    setSynthNotice(null);
    try {
      const res = await fetch('/api/enably/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignBriefPrompt:
            blueprint.campaignBriefPrompt ||
            `${blueprint.icp} — ${blueprint.productsAndServices} — ${blueprint.valueProposition}`,
          blueprint,
          tier: icpTier,
          documents: account.documents,
          workspaceId: account.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Synthesis failed.');
      const payload = data.envelope?.payload;
      if (payload) {
        onChangeBlueprint({
          ...blueprint,
          workflowName: payload.workflowName || blueprint.workflowName,
          icp: payload.icp || blueprint.icp,
          signalHypothesis: payload.signalHypothesis || blueprint.signalHypothesis,
          productsAndServices: payload.productsAndServices || blueprint.productsAndServices,
          valueProposition: payload.valueProposition || blueprint.valueProposition,
          tone: payload.tone || blueprint.tone,
          icpProfile: payload.icpProfile,
        });
        setSynthNotice(
          `Synthesized ${icpTier.toUpperCase()} ICP Architect Profile & 6-step blueprint (Artifact ID: ${data.envelope.artifact_id}).`
        );
      }
    } catch (err) {
      setSynthNotice(err instanceof Error ? err.message : 'Unable to run Enably synthesis.');
    } finally {
      setIsSynthesizing(false);
    }
  };

  const handleRunSectionV1Test = async (stepId: StepId) => {
    setTestingStepId(stepId);
    try {
      const res = await fetch('/api/section/test-v1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stepId,
          blueprint,
          selectedRegistrySlugs: blueprint.selectedRegistrySlugs,
        }),
      });
      const data = await res.json();
      if (res.ok && data.result) {
        setV1Results((prev) => ({ ...prev, [stepId]: data.result }));
        onUpdateStep(stepId, { v1Approved: true });
      }
    } finally {
      setTestingStepId(null);
    }
  };

  const handleDownloadSectionSpec = (step: WorkflowStepSkill) => {
    const v1 = v1Results[step.id];
    const md = `# SECTION-${step.stepNumber}-SPEC.md — ${step.title}

- **Campaign:** ${blueprint.workflowName}
- **Wave:** Wave ${step.wave}
- **Precondition:** \`${step.precondition}\`
- **Connector:** ${step.connector}
- **V1 Gate Status:** ${step.v1Approved ? 'APPROVED' : 'DRAFT'}
- **Estimated Waterfall Cost / Lead:** $${(v1?.estimatedCostPerLeadUsd ?? 0).toFixed(4)}

## Canonical Skill Prompt
${step.systemPrompt}

## Credit-Aware Waterfall Trace
${
  v1
    ? v1.waterfallTrace
        .map(
          (w, i) =>
            `${i + 1}. **${w.providerName}** (${w.tier.toUpperCase()} · $${w.costUsd.toFixed(
              3
            )}) — ${w.note}`
        )
        .join('\n')
    : 'Run V1 Section Test to populate trace.'
}
`;
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SECTION-${step.stepNumber}-SPEC.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const progressPct = Math.round(((stepIndex + 1) / totalSteps) * 100);
  const stepRegistryTools = currentMeta.stepId
    ? R_DOCS_REGISTRY.filter((r) => r.stepId === currentMeta.stepId)
    : [];

  return (
    <div className="bg-white min-h-[calc(100vh-4rem)] flex flex-col justify-between">
      {/* Top Progress Hairline */}
      <div className="w-full h-0.5 bg-slate-100">
        <div
          className="h-full bg-sky-600 transition-all duration-200"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Main Conversational Stage */}
      <div className="max-w-[1360px] w-full mx-auto flex-1 border-x border-slate-200 flex flex-col justify-between">
        {/* Minimal Wizard Header Bar */}
        <div className="px-6 md:px-14 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="font-mono font-semibold text-slate-900 tabular-nums">
              Page {stepIndex + 1} of {totalSteps}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums text-slate-700">
              Wholeness W = {wholeness.score.toFixed(2)}
            </span>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={onOpenAuthModal}
              className="text-sky-600 hover:underline font-medium cursor-pointer"
            >
              Account Vault ({account.documents.length} docs)
            </button>
          </div>

          {/* Step Jump Navigation */}
          <div className="flex items-center gap-1 overflow-x-auto">
            {WIZARD_STEPS.map((s) => {
              const active = s.id === stepIndex;
              const v1Done = s.stepId ? Boolean(v1Results[s.stepId]) : false;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => goTo(s.id)}
                  className={`px-2.5 py-1 text-xs rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1 ${
                    active
                      ? 'bg-slate-900 text-white font-medium'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <span>{s.short}</span>
                  {v1Done && <Check className="w-3 h-3 text-emerald-500" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Center Question Viewport */}
        <div className="flex-1 flex items-center justify-center px-6 md:px-14 py-10">
          <div className="w-full max-w-3xl">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={stepIndex}
                initial={{ opacity: 0, y: direction > 0 ? 14 : -14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: direction > 0 ? -14 : 14 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-7"
              >
                {/* Question Header */}
                <div className="space-y-2">
                  <div className="text-xs font-mono text-sky-600 tabular-nums">
                    {currentMeta.short}
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 leading-snug">
                    {currentMeta.title}
                  </h1>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {currentMeta.subtitle}
                  </p>
                </div>

                {/* PAGE 0: Streamlined Campaign Launchpad, Document Upload & Tool/Composio Stack */}
                {stepIndex === 0 && (
                  <div className="space-y-6">
                    {/* 1-Click Playbooks */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {BLUEPRINT_PRESETS.map((preset) => {
                        const isCurrent =
                          blueprint.workflowName === preset.blueprint.workflowName;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => onApplyPreset(preset.id)}
                            className={`text-left p-3.5 rounded-xl border transition-colors cursor-pointer flex flex-col justify-between gap-2 ${
                              isCurrent
                                ? 'bg-sky-50/60 border-sky-600'
                                : 'bg-slate-50/70 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                                <span>{preset.blueprint.targetRuntime.toUpperCase()}</span>
                                <span className="text-emerald-700 font-semibold">
                                  {preset.costPerLeadLabel}
                                </span>
                              </div>
                              <div className="text-xs font-semibold text-slate-900 mt-1">
                                {preset.name}
                              </div>
                            </div>
                            <div className="text-[11px] text-slate-500 line-clamp-2">
                              {preset.tagline}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Unified Campaign Prompt + Campaign Name */}
                    <div className="space-y-4 p-5 bg-white border border-slate-200 rounded-xl">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="block text-xs font-medium text-slate-700">
                            Campaign Name
                          </label>
                          <input
                            type="text"
                            value={blueprint.workflowName}
                            onChange={(e) =>
                              onChangeBlueprint({ ...blueprint, workflowName: e.target.value })
                            }
                            onKeyDown={handleSingleLineEnter}
                            placeholder="e.g. Q4 RevOps Hiring Surge Outreach"
                            className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-xs font-medium text-slate-700">
                            Your Company Domain & Sender
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={blueprint.connectors.senderName}
                              onChange={(e) => updateConnector('senderName', e.target.value)}
                              placeholder="Your Name"
                              className="w-1/2 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                            />
                            <input
                              type="text"
                              value={blueprint.connectors.senderCompany}
                              onChange={(e) => updateConnector('senderCompany', e.target.value)}
                              placeholder="Company"
                              className="w-1/2 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-medium text-slate-700">
                          Campaign Brief — Who are you reaching out to, what do you do/build, and why is it relevant right now?
                        </label>
                        <textarea
                          rows={3}
                          value={
                            blueprint.campaignBriefPrompt ??
                            `${blueprint.icp} — We build: ${blueprint.productsAndServices} — Value: ${blueprint.valueProposition}`
                          }
                          onChange={(e) => {
                            const text = e.target.value;
                            onChangeBlueprint({
                              ...blueprint,
                              campaignBriefPrompt: text,
                              icp: text.length >= 12 ? text : blueprint.icp,
                            });
                          }}
                          placeholder="e.g. Reaching out to VP Revenue & Heads of RevOps at Series A–C SaaS companies (50–350 employees) hiring GTM Engineers. We build deterministic 6-step outreach pipelines that cut prospect research time by 85%..."
                          className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 leading-relaxed focus:outline-none focus:ring-2 focus:ring-sky-600"
                        />
                      </div>

                      {/* Enably + ICP Architect GPT One-Click Synthesis Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-slate-600">
                            ICP Architect Depth:
                          </span>
                          {(['minimal', 'standard', 'enriched'] as const).map((tier) => (
                            <button
                              key={tier}
                              type="button"
                              onClick={() => setIcpTier(tier)}
                              className={`px-2 py-1 text-[11px] font-medium rounded capitalize cursor-pointer ${
                                icpTier === tier
                                  ? 'bg-slate-900 text-white'
                                  : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              {tier} ICP
                            </button>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={handleSynthesizeWithEnably}
                          disabled={isSynthesizing}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 disabled:opacity-50 cursor-pointer"
                        >
                          {isSynthesizing ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Synthesizing ICP & 6 Steps...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>Auto-Fill Campaign With Enably & ICP Architect</span>
                            </>
                          )}
                        </button>
                      </div>

                      {synthNotice && (
                        <div className="text-xs text-sky-700 font-medium">{synthNotice}</div>
                      )}

                      {blueprint.icpProfile && (
                        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-900">
                              ICP Architect GPT Output · {blueprint.icpProfile.segment_name}
                            </span>
                            <span className="font-mono text-[11px] text-sky-700 uppercase">
                              {blueprint.icpProfile.tier}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600">
                            <div>
                              <strong className="text-slate-800">Buyer Roles:</strong>{' '}
                              {blueprint.icpProfile.buyer_role}
                            </div>
                            <div>
                              <strong className="text-slate-800">Size & Geo:</strong>{' '}
                              {blueprint.icpProfile.company_size} · {blueprint.icpProfile.geography}
                            </div>
                            <div>
                              <strong className="text-slate-800">Pain Points:</strong>{' '}
                              {blueprint.icpProfile.pain_points.slice(0, 2).join('; ')}
                            </div>
                            <div>
                              <strong className="text-slate-800">Triggers:</strong>{' '}
                              {blueprint.icpProfile.buying_triggers.slice(0, 2).join('; ')}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Inline Document Uploader (Saves directly to User Account) */}
                    <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="text-xs font-semibold text-slate-900">
                            Upload Campaign Documents to Account ({account.email})
                          </div>
                          <div className="text-xs text-slate-500">
                            Attach pitch decks, ICP docs, CSV lead lists, or API specs (.md, .txt, .csv, .json).
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <select
                            value={docType}
                            onChange={(e) => setDocType(e.target.value as CampaignDocType)}
                            className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800"
                          >
                            <option value="pitch_deck">Pitch Deck / Offer</option>
                            <option value="icp_brief">ICP / Persona Brief</option>
                            <option value="case_study">Case Study</option>
                            <option value="lead_csv">CSV Lead List</option>
                            <option value="api_spec">Tool / API Spec</option>
                          </select>

                          <label className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-slate-900 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 cursor-pointer">
                            {isUploadingDoc ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-600" />
                            ) : (
                              <Upload className="w-3.5 h-3.5 text-sky-600" />
                            )}
                            <span>Upload to Account</span>
                            <input
                              type="file"
                              accept=".md,.txt,.csv,.json"
                              onChange={handleFileChange}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </div>

                      {uploadNotice && (
                        <div className="text-xs text-emerald-700 font-medium">{uploadNotice}</div>
                      )}

                      {account.documents.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {account.documents.map((d) => (
                            <span
                              key={d.id}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-md text-slate-700"
                            >
                              <FileText className="w-3 h-3 text-sky-600" />
                              <span className="font-medium">{d.name}</span>
                              <span className="font-mono text-[10px] text-slate-400">
                                ({d.docType})
                              </span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Fluid Tools, Composio & Target Runtime Selector */}
                    <div className="p-5 bg-white border border-slate-200 rounded-xl space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="text-xs font-semibold text-slate-900">
                          Connect Tools, Composio & Target Export Runtime
                        </div>
                        <div className="flex flex-wrap gap-1 p-1 bg-slate-100 rounded-lg">
                          {RUNTIME_OPTIONS.map((rt) => (
                            <button
                              key={rt.id}
                              type="button"
                              onClick={() =>
                                onChangeBlueprint({ ...blueprint, targetRuntime: rt.id })
                              }
                              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                                blueprint.targetRuntime === rt.id
                                  ? 'bg-white text-slate-900 shadow-xs'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              {rt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {TOOL_CATALOG.map((tool) => {
                          const selected = blueprint.selectedTools.includes(tool.id);
                          return (
                            <button
                              key={tool.id}
                              type="button"
                              onClick={() => toggleTool(tool.id)}
                              className={`text-left px-3 py-2 rounded-lg border transition-colors cursor-pointer ${
                                selected
                                  ? 'bg-sky-50/50 border-sky-600 text-slate-900'
                                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-xs font-semibold truncate">{tool.name}</span>
                                {selected && (
                                  <Check className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400 truncate">
                                {tool.category}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* PAGES 1–6: The 6 SalesGency Workflow Sections (01 Signals -> 06 Outreach) */}
                {stepIndex >= 1 && currentStepSkill && (
                  <div className="space-y-6">
                    {/* Step-Specific Core Controls */}
                    {currentStepSkill.id === '01_signals' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="block text-xs font-medium text-slate-700">
                            Target ICP Segment
                          </label>
                          <textarea
                            rows={3}
                            value={blueprint.icp}
                            onChange={(e) =>
                              onChangeBlueprint({ ...blueprint, icp: e.target.value })
                            }
                            className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-900"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="block text-xs font-medium text-slate-700">
                            Buying Signal Hypothesis
                          </label>
                          <textarea
                            rows={3}
                            value={blueprint.signalHypothesis}
                            onChange={(e) =>
                              onChangeBlueprint({
                                ...blueprint,
                                signalHypothesis: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-900"
                          />
                        </div>
                      </div>
                    )}

                    {currentStepSkill.id === '02_companies' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            onChangeBlueprint({ ...blueprint, entryMode: 'signals' })
                          }
                          className={`text-left p-4 rounded-xl border cursor-pointer ${
                            blueprint.entryMode === 'signals'
                              ? 'bg-sky-50/50 border-sky-600'
                              : 'bg-white border-slate-200'
                          }`}
                        >
                          <div className="text-sm font-semibold text-slate-900">
                            Full Signal Discovery (Steps 01–06)
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            Discover target companies from live web signals and check HubSpot CRM cache first.
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            onChangeBlueprint({ ...blueprint, entryMode: 'existing_leads' })
                          }
                          className={`text-left p-4 rounded-xl border cursor-pointer ${
                            blueprint.entryMode === 'existing_leads'
                              ? 'bg-sky-50/50 border-sky-600'
                              : 'bg-white border-slate-200'
                          }`}
                        >
                          <div className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                            <span>Already Have Leads (Skip 01–02)</span>
                            <SkipForward className="w-3.5 h-3.5 text-sky-600" />
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            Short-circuit Steps 01–02 and route uploaded CSV/webhook leads straight to Step 03.
                          </p>
                        </button>
                      </div>
                    )}

                    {currentStepSkill.id === '04_research' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="block text-xs font-medium text-slate-700">
                            What You Build (Products & Services)
                          </label>
                          <textarea
                            rows={3}
                            value={blueprint.productsAndServices}
                            onChange={(e) =>
                              onChangeBlueprint({
                                ...blueprint,
                                productsAndServices: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-900"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="block text-xs font-medium text-slate-700">
                            Why It Is Relevant (Value Proposition)
                          </label>
                          <textarea
                            rows={3}
                            value={blueprint.valueProposition}
                            onChange={(e) =>
                              onChangeBlueprint({
                                ...blueprint,
                                valueProposition: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-900"
                          />
                        </div>
                      </div>
                    )}

                    {currentStepSkill.id === '05_email' && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() =>
                              onChangeBlueprint({ ...blueprint, emailMode: 'full' })
                            }
                            className={`text-left p-4 rounded-xl border cursor-pointer ${
                              blueprint.emailMode === 'full'
                                ? 'bg-sky-50/50 border-sky-600'
                                : 'bg-white border-slate-200'
                            }`}
                          >
                            <div className="text-sm font-semibold text-slate-900">
                              Full Email Mode
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                              Subject + &ldquo;Hi FirstName,&rdquo; + Body + Signature.
                            </p>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              onChangeBlueprint({ ...blueprint, emailMode: 'body_token' })
                            }
                            className={`text-left p-4 rounded-xl border cursor-pointer ${
                              blueprint.emailMode === 'body_token'
                                ? 'bg-sky-50/50 border-sky-600'
                                : 'bg-white border-slate-200'
                            }`}
                          >
                            <div className="text-sm font-semibold text-slate-900">
                              Body-Only CRM Token ({'{{email_1_body}}'})
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                              Strips greeting & signature automatically for Smartlead / Instantly / HubSpot.
                            </p>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* /r/docs Registry & Credit-Aware Waterfall Tool Picker for This Step */}
                    <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs font-semibold text-slate-900">
                            Connected Tools & Credit-Aware Waterfall (/r/docs/{currentStepSkill.id})
                          </div>
                          <div className="text-xs text-slate-500">
                            $0.00 free/cache sources always execute first before paid enrichment credits.
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        {stepRegistryTools.map((tool) => {
                          const selected = (blueprint.selectedRegistrySlugs ?? []).includes(
                            tool.slug
                          );
                          return (
                            <button
                              key={tool.slug}
                              type="button"
                              onClick={() => toggleRegistrySlug(tool.slug)}
                              className={`text-left p-3 rounded-lg border transition-colors cursor-pointer flex flex-col justify-between gap-2 ${
                                selected
                                  ? 'bg-white border-sky-600 ring-1 ring-sky-600'
                                  : 'bg-white border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-[11px] font-mono">
                                  <span
                                    className={
                                      tool.tier === 'free'
                                        ? 'text-emerald-700 font-semibold'
                                        : 'text-slate-600'
                                    }
                                  >
                                    {tool.tier === 'free'
                                      ? '$0.00 FREE'
                                      : `$${tool.costPerLeadUsd.toFixed(3)}/lead`}
                                  </span>
                                  <span className="text-slate-400">{tool.transport}</span>
                                </div>
                                <div className="text-xs font-semibold text-slate-900">
                                  {tool.name}
                                </div>
                              </div>
                              <div className="text-[11px] text-slate-500 line-clamp-2">
                                {tool.summary}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Editable Step Skill Prompt */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-slate-700">
                        Step {currentStepSkill.stepNumber} Skill Prompt ({currentStepSkill.title})
                      </label>
                      <textarea
                        rows={3}
                        value={currentStepSkill.systemPrompt}
                        onChange={(e) =>
                          onUpdateStep(currentStepSkill.id, { systemPrompt: e.target.value })
                        }
                        className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 leading-relaxed focus:outline-none focus:ring-2 focus:ring-sky-600"
                      />
                    </div>

                    {/* V1 Section Test & Approval Gate */}
                    <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="text-xs font-semibold text-slate-900">
                            V1 Section Test & Approval Gate
                          </div>
                          <div className="text-xs text-slate-500">
                            Verify the credit waterfall trace and ROSTRv2 artifact envelope for Step {currentStepSkill.stepNumber}.
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleDownloadSectionSpec(currentStepSkill)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>SECTION-{currentStepSkill.stepNumber}-SPEC.md</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRunSectionV1Test(currentStepSkill.id)}
                            disabled={testingStepId === currentStepSkill.id}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
                          >
                            {testingStepId === currentStepSkill.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            )}
                            <span>Run V1 Test & Approve</span>
                          </button>
                        </div>
                      </div>

                      {v1Results[currentStepSkill.id] && (
                        <div className="pt-3 border-t border-slate-100 space-y-2.5 text-xs">
                          <div className="flex items-center justify-between font-mono text-[11px]">
                            <span className="text-emerald-700 font-semibold">
                              V1 Gate Approved · Envelope: {v1Results[currentStepSkill.id].envelope.artifact_id}
                            </span>
                            <span className="text-slate-600 tabular-nums">
                              Est. Cost: ${v1Results[currentStepSkill.id].estimatedCostPerLeadUsd.toFixed(4)} / lead
                            </span>
                          </div>

                          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700">
                            {v1Results[currentStepSkill.id].sampleOutput}
                          </div>

                          {v1Results[currentStepSkill.id].lintResult && (
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                              {v1Results[currentStepSkill.id].lintResult!.rules.map((rule) => (
                                <div
                                  key={rule.id}
                                  className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-[11px]"
                                >
                                  <div className="font-semibold text-slate-900 flex items-center gap-1">
                                    <Check className="w-3 h-3 text-emerald-600" />
                                    <span className="truncate">{rule.label}</span>
                                  </div>
                                  <div className="text-slate-500 truncate">{rule.detail}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Step 06 Final Wholeness Check & Live Doc Grounding */}
                    {currentStepSkill.id === '06_outreach' && (
                      <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <div className="text-xs font-semibold text-slate-900">
                              One Must Act Wholeness (W = {wholeness.score.toFixed(2)}) & Live API Doc Grounding
                            </div>
                            <div className="text-xs text-slate-500">
                              Pull official developer docs for your selected stack before launching the 4-wave DAG loop.
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={onGroundDocs}
                            disabled={isGroundingDocs || blueprint.selectedTools.length === 0}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-900 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-50 cursor-pointer"
                          >
                            {isGroundingDocs ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-600" />
                                <span>Fetching Docs...</span>
                              </>
                            ) : (
                              <>
                                <BookOpen className="w-3.5 h-3.5 text-sky-600" />
                                <span>Fetch Live Tool Docs ({connectorDocs.length})</span>
                              </>
                            )}
                          </button>
                        </div>

                        {docsError && <div className="text-xs text-red-700">{docsError}</div>}

                        {connectorDocs.length > 0 && (
                          <div className="divide-y divide-slate-200 border-t border-slate-200 pt-2">
                            {connectorDocs.map((doc) => (
                              <div key={doc.toolId} className="py-2 space-y-1 text-xs">
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold text-slate-900">{doc.toolName}</span>
                                  <span className="font-mono text-sky-700">{doc.baseUrlOrNodeType}</span>
                                </div>
                                <p className="text-slate-600">{doc.mappingNotes}</p>
                                {doc.sources.length > 0 && (
                                  <div className="flex flex-wrap gap-3">
                                    {doc.sources.slice(0, 2).map((s) => (
                                      <a
                                        key={s.uri}
                                        href={s.uri}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1 text-[11px] text-sky-600 hover:underline"
                                      >
                                        <span className="truncate max-w-[180px]">{s.title}</span>
                                        <ExternalLink className="w-2.5 h-2.5" />
                                      </a>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Bottom Wizard Navigation Bar */}
        <div className="px-6 md:px-14 py-5 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={handlePrev}
            disabled={stepIndex === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 disabled:opacity-30 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <div className="flex items-center gap-3">
            {stepIndex < totalSteps - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onProceedToRunner}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 transition-colors cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Open DAG Graph Loop</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
