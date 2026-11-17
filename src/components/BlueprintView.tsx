import { useState, type KeyboardEvent } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ExternalLink,
  Loader2,
  Play,
  SkipForward,
  Sparkles,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type {
  ConnectorDoc,
  HarnessBlueprint,
  TargetRuntime,
  WholenessReport,
} from '../types/harness';
import { BLUEPRINT_PRESETS, TOOL_CATALOG } from '../lib/presets';

interface BlueprintViewProps {
  blueprint: HarnessBlueprint;
  wholeness: WholenessReport;
  connectorDocs: ConnectorDoc[];
  isGroundingDocs: boolean;
  docsError: string | null;
  onChangeBlueprint: (next: HarnessBlueprint) => void;
  onApplyPreset: (presetId: string) => void;
  onGroundDocs: () => void;
  onProceedToRunner: () => void;
}

const RUNTIME_OPTIONS: Array<{ id: TargetRuntime; label: string }> = [
  { id: 'n8n', label: 'n8n' },
  { id: 'make', label: 'Make.com' },
  { id: 'gumloop', label: 'Gumloop' },
  { id: 'composio_cron', label: 'Composio + Cron' },
  { id: 'code_harness', label: 'Skill Pack' },
];

const WIZARD_STEPS = [
  { id: 0, short: 'Identity', title: 'What outreach workflow are we building?' },
  { id: 1, short: 'Entry Mode', title: 'Where do your prospects come from?' },
  { id: 2, short: 'ICP & Signal', title: 'Who is your ideal buyer, and why now?' },
  { id: 3, short: 'Offer & Value', title: 'What do you sell, and what outcome do they get?' },
  { id: 4, short: 'Email & Tone', title: 'How should Step 05 format each message?' },
  { id: 5, short: 'Tools & Docs', title: 'Which tools are in your stack?' },
  { id: 6, short: 'Review & Launch', title: 'Foundation check complete. Ready to run.' },
];

export function BlueprintView({
  blueprint,
  wholeness,
  connectorDocs,
  isGroundingDocs,
  docsError,
  onChangeBlueprint,
  onApplyPreset,
  onGroundDocs,
  onProceedToRunner,
}: BlueprintViewProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);

  const totalSteps = WIZARD_STEPS.length;
  const currentMeta = WIZARD_STEPS[stepIndex];

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

  const updateConnector = <K extends keyof HarnessBlueprint['connectors']>(
    key: K,
    value: HarnessBlueprint['connectors'][K]
  ) => {
    onChangeBlueprint({
      ...blueprint,
      connectors: { ...blueprint.connectors, [key]: value },
    });
  };

  const canAdvanceCurrent = (): boolean => {
    if (stepIndex === 0) return blueprint.workflowName.trim().length >= 3;
    if (stepIndex === 2)
      return (
        blueprint.icp.trim().length >= 12 &&
        blueprint.signalHypothesis.trim().length >= 10
      );
    if (stepIndex === 3)
      return (
        blueprint.productsAndServices.trim().length >= 12 &&
        blueprint.valueProposition.trim().length >= 12
      );
    if (stepIndex === 4)
      return (
        blueprint.connectors.senderName.trim().length >= 2 &&
        blueprint.connectors.senderCompany.trim().length >= 2
      );
    if (stepIndex === 5) return blueprint.selectedTools.length >= 1;
    return true;
  };

  const progressPct = Math.round(((stepIndex + 1) / totalSteps) * 100);

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
        <div className="px-6 md:px-14 py-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="font-mono font-semibold text-slate-900 tabular-nums">
              Step {stepIndex + 1} of {totalSteps}
            </span>
            <span aria-hidden="true">·</span>
            <span>{currentMeta.short}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums text-slate-700">
              Wholeness W = {wholeness.score.toFixed(2)}
            </span>
          </div>

          {/* Step Jump Navigation */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {WIZARD_STEPS.map((s) => {
              const active = s.id === stepIndex;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => goTo(s.id)}
                  className={`px-2.5 py-1 text-xs rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-slate-900 text-white font-medium'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {s.id + 1}. {s.short}
                </button>
              );
            })}
          </div>
        </div>

        {/* Center Question Viewport */}
        <div className="flex-1 flex items-center justify-center px-6 md:px-14 py-10">
          <div className="w-full max-w-2xl">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={stepIndex}
                initial={{ opacity: 0, y: direction > 0 ? 14 : -14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: direction > 0 ? -14 : 14 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-8"
              >
                {/* Question Header */}
                <div className="space-y-2">
                  <div className="text-xs font-mono text-sky-600 tabular-nums">
                    0{stepIndex + 1} · {currentMeta.short}
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 leading-snug">
                    {currentMeta.title}
                  </h1>
                </div>

                {/* STEP 1: Workflow Identity & Presets */}
                {stepIndex === 0 && (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <input
                        type="text"
                        autoFocus
                        value={blueprint.workflowName}
                        onChange={(e) =>
                          onChangeBlueprint({ ...blueprint, workflowName: e.target.value })
                        }
                        onKeyDown={handleSingleLineEnter}
                        placeholder="Type a workflow name, e.g. RevOps Hiring Outreach..."
                        className="w-full px-0 py-3 text-xl sm:text-2xl bg-transparent border-0 border-b-2 border-slate-200 text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-sky-600 transition-colors"
                      />
                      <p className="text-xs text-slate-500">
                        Press <span className="font-mono text-slate-700">Enter</span> to continue, or load a pre-built GTM template below.
                      </p>
                    </div>

                    <div className="pt-4 border-t border-slate-200 space-y-3">
                      <div className="text-xs font-medium text-slate-500">
                        Quick-start blueprints
                      </div>
                      <div className="grid grid-cols-1 gap-2.5">
                        {BLUEPRINT_PRESETS.map((preset) => {
                          const isCurrent =
                            blueprint.workflowName === preset.blueprint.workflowName;
                          return (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() => onApplyPreset(preset.id)}
                              className={`text-left px-4 py-3 rounded-xl border transition-colors cursor-pointer flex items-center justify-between gap-4 ${
                                isCurrent
                                  ? 'bg-sky-50/60 border-sky-600'
                                  : 'bg-slate-50/70 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                              }`}
                            >
                              <div>
                                <div className="text-sm font-semibold text-slate-900">
                                  {preset.name}
                                </div>
                                <div className="text-xs text-slate-500 mt-0.5">
                                  {preset.tagline}
                                </div>
                              </div>
                              {isCurrent && (
                                <Check className="w-4 h-4 text-sky-600 shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 2: Entry Mode & Batch Size */}
                {stepIndex === 1 && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          onChangeBlueprint({ ...blueprint, entryMode: 'signals' })
                        }
                        className={`text-left p-5 rounded-xl border transition-colors cursor-pointer flex items-start justify-between gap-4 ${
                          blueprint.entryMode === 'signals'
                            ? 'bg-sky-50/50 border-sky-600'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2.5">
                            <span className="font-mono text-xs px-1.5 py-0.5 border border-slate-300 rounded text-slate-700">
                              A
                            </span>
                            <span className="text-base font-semibold text-slate-900">
                              Start from live signals (Steps 01–06)
                            </span>
                          </div>
                          <p className="text-sm text-slate-600 pl-7">
                            Discover companies showing buying intent via web search, resolve contacts, verify MX, research, and draft outreach.
                          </p>
                        </div>
                        {blueprint.entryMode === 'signals' && (
                          <Check className="w-4 h-4 text-sky-600 shrink-0 mt-1" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          onChangeBlueprint({ ...blueprint, entryMode: 'existing_leads' })
                        }
                        className={`text-left p-5 rounded-xl border transition-colors cursor-pointer flex items-start justify-between gap-4 ${
                          blueprint.entryMode === 'existing_leads'
                            ? 'bg-sky-50/50 border-sky-600'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2.5">
                            <span className="font-mono text-xs px-1.5 py-0.5 border border-slate-300 rounded text-slate-700">
                              B
                            </span>
                            <span className="text-base font-semibold text-slate-900 flex items-center gap-2">
                              <span>Already have leads (Skip Steps 01 & 02)</span>
                              <SkipForward className="w-4 h-4 text-sky-600" />
                            </span>
                          </div>
                          <p className="text-sm text-slate-600 pl-7">
                            Upload CSV rows or webhook JSON in the Runner and short-circuit straight to Step 03 DNS MX verification and Step 04 Research.
                          </p>
                        </div>
                        {blueprint.entryMode === 'existing_leads' && (
                          <Check className="w-4 h-4 text-sky-600 shrink-0 mt-1" />
                        )}
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-4 pt-4 border-t border-slate-200">
                      <div>
                        <div className="text-sm font-medium text-slate-900">
                          Prospects per loop run
                        </div>
                        <div className="text-xs text-slate-500">
                          Controls parallel Wave 3 batch size during live execution.
                        </div>
                      </div>
                      <select
                        value={blueprint.batchSize}
                        onChange={(e) =>
                          onChangeBlueprint({ ...blueprint, batchSize: Number(e.target.value) })
                        }
                        className="px-3 py-2 text-sm font-mono bg-white border border-slate-200 rounded-lg text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-sky-600"
                      >
                        <option value={2}>2 prospects</option>
                        <option value={3}>3 prospects</option>
                        <option value={4}>4 prospects</option>
                        <option value={5}>5 prospects</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* STEP 3: ICP & Signal Hypothesis */}
                {stepIndex === 2 && (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label htmlFor="wiz-icp" className="block text-xs font-medium text-slate-700">
                        Target ICP (Industry, size, geography, buyer persona)
                      </label>
                      <textarea
                        id="wiz-icp"
                        rows={3}
                        autoFocus
                        value={blueprint.icp}
                        onChange={(e) =>
                          onChangeBlueprint({ ...blueprint, icp: e.target.value })
                        }
                        placeholder="e.g. Series A–C B2B SaaS companies (50–350 employees) in North America hiring RevOps or GTM Engineers..."
                        className="w-full px-4 py-3 text-base bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-600"
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="wiz-signal" className="block text-xs font-medium text-slate-700">
                        Buying Signal Hypothesis (What trigger creates urgency?)
                      </label>
                      <textarea
                        id="wiz-signal"
                        rows={3}
                        value={blueprint.signalHypothesis}
                        onChange={(e) =>
                          onChangeBlueprint({ ...blueprint, signalHypothesis: e.target.value })
                        }
                        placeholder="e.g. Open RevOps roles, recent Series B funding, new product launch, or CRM migration announcements..."
                        className="w-full px-4 py-3 text-base bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-600"
                      />
                    </div>
                  </div>
                )}

                {/* STEP 4: Products & Value Proposition */}
                {stepIndex === 3 && (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label htmlFor="wiz-products" className="block text-xs font-medium text-slate-700">
                        Your Products & Services
                      </label>
                      <textarea
                        id="wiz-products"
                        rows={3}
                        autoFocus
                        value={blueprint.productsAndServices}
                        onChange={(e) =>
                          onChangeBlueprint({
                            ...blueprint,
                            productsAndServices: e.target.value,
                          })
                        }
                        placeholder="Describe what your company builds or delivers..."
                        className="w-full px-4 py-3 text-base bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-600"
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="wiz-valueprop" className="block text-xs font-medium text-slate-700">
                        Core Value Proposition
                      </label>
                      <textarea
                        id="wiz-valueprop"
                        rows={3}
                        value={blueprint.valueProposition}
                        onChange={(e) =>
                          onChangeBlueprint({ ...blueprint, valueProposition: e.target.value })
                        }
                        placeholder="State the measurable outcome or operational lift for the prospect..."
                        className="w-full px-4 py-3 text-base bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-600"
                      />
                    </div>
                  </div>
                )}

                {/* STEP 5: Email Output Mode, Tone & Attribution */}
                {stepIndex === 4 && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => onChangeBlueprint({ ...blueprint, emailMode: 'full' })}
                        className={`text-left p-4 rounded-xl border transition-colors cursor-pointer ${
                          blueprint.emailMode === 'full'
                            ? 'bg-sky-50/50 border-sky-600'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-slate-900">
                            Full Email
                          </span>
                          {blueprint.emailMode === 'full' && (
                            <Check className="w-4 h-4 text-sky-600" />
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                          Outputs Subject + &ldquo;Hi, First Name&rdquo; + Body + Signature. Ideal for direct mailbox sends.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          onChangeBlueprint({ ...blueprint, emailMode: 'body_token' })
                        }
                        className={`text-left p-4 rounded-xl border transition-colors cursor-pointer ${
                          blueprint.emailMode === 'body_token'
                            ? 'bg-sky-50/50 border-sky-600'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-slate-900">
                            Body-Only CRM Token
                          </span>
                          {blueprint.emailMode === 'body_token' && (
                            <Check className="w-4 h-4 text-sky-600" />
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                          No greeting or signature. Drops straight into Smartlead, Instantly, or HubSpot merge fields.
                        </p>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                      <div className="space-y-1.5">
                        <label htmlFor="wiz-sender-name" className="block text-xs font-medium text-slate-700">
                          Sender Name
                        </label>
                        <input
                          id="wiz-sender-name"
                          type="text"
                          value={blueprint.connectors.senderName}
                          onChange={(e) => updateConnector('senderName', e.target.value)}
                          onKeyDown={handleSingleLineEnter}
                          className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="wiz-sender-co" className="block text-xs font-medium text-slate-700">
                          Sender Company
                        </label>
                        <input
                          id="wiz-sender-co"
                          type="text"
                          value={blueprint.connectors.senderCompany}
                          onChange={(e) => updateConnector('senderCompany', e.target.value)}
                          onKeyDown={handleSingleLineEnter}
                          className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="wiz-tone" className="block text-xs font-medium text-slate-700">
                          Rep / Brand Tone
                        </label>
                        <input
                          id="wiz-tone"
                          type="text"
                          value={blueprint.tone}
                          onChange={(e) =>
                            onChangeBlueprint({ ...blueprint, tone: e.target.value })
                          }
                          onKeyDown={handleSingleLineEnter}
                          className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 6: Connected Tools & Live Documentation Grounding */}
                {stepIndex === 5 && (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-slate-700">
                        Primary Compilation Target
                      </label>
                      <div className="flex flex-wrap gap-1 p-1 bg-slate-100 rounded-lg w-fit">
                        {RUNTIME_OPTIONS.map((rt) => (
                          <button
                            key={rt.id}
                            type="button"
                            onClick={() =>
                              onChangeBlueprint({ ...blueprint, targetRuntime: rt.id })
                            }
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
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

                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-slate-700">
                        Tools to connect ({blueprint.selectedTools.length} selected)
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {TOOL_CATALOG.map((tool) => {
                          const selected = blueprint.selectedTools.includes(tool.id);
                          return (
                            <button
                              key={tool.id}
                              type="button"
                              onClick={() => toggleTool(tool.id)}
                              className={`text-left px-3 py-2.5 rounded-lg border transition-colors cursor-pointer ${
                                selected
                                  ? 'bg-sky-50/50 border-sky-600 text-slate-900'
                                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-semibold truncate">{tool.name}</span>
                                {selected && (
                                  <Check className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                                {tool.category}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label htmlFor="wiz-dest" className="block text-xs font-medium text-slate-700">
                          Step 06 Destination
                        </label>
                        <input
                          id="wiz-dest"
                          type="text"
                          value={blueprint.connectors.outreachPlatformName}
                          onChange={(e) =>
                            updateConnector('outreachPlatformName', e.target.value)
                          }
                          placeholder="Smartlead, Instantly, HubSpot..."
                          className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600"
                        />
                      </div>
                      <div className="space-y-1">
                        <label htmlFor="wiz-webhook" className="block text-xs font-medium text-slate-700">
                          Webhook Endpoint (Optional)
                        </label>
                        <input
                          id="wiz-webhook"
                          type="url"
                          value={blueprint.connectors.webhookUrl}
                          onChange={(e) => updateConnector('webhookUrl', e.target.value)}
                          placeholder="https://n8n.yourdomain/webhook/..."
                          className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600"
                        />
                      </div>
                    </div>

                    {/* Fetch Documentation Action */}
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="text-xs font-semibold text-slate-900">
                            Ground Official Tool Documentation
                          </div>
                          <div className="text-xs text-slate-500">
                            Pulls live API endpoints, auth schemes, and node schemas for your stack.
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
                              <span>Fetch Tool Docs ({connectorDocs.length} loaded)</span>
                            </>
                          )}
                        </button>
                      </div>

                      {docsError && (
                        <div className="text-xs text-red-700">{docsError}</div>
                      )}

                      {connectorDocs.length > 0 && (
                        <div className="divide-y divide-slate-200 border-t border-slate-200 pt-2">
                          {connectorDocs.map((doc) => (
                            <div key={doc.toolId} className="py-2.5 space-y-1 text-xs">
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
                  </div>
                )}

                {/* STEP 7: Foundation Review & Launch */}
                {stepIndex === 6 && (
                  <div className="space-y-6">
                    <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">
                            One Must Act · Foundation Wholeness
                          </div>
                          <div className="text-xs text-slate-500">
                            {wholeness.passed
                              ? 'All criteria verified. Multiplier tools are unlocked.'
                              : 'Click any incomplete item below to fill it in.'}
                          </div>
                        </div>
                        <div className="font-mono text-xl font-semibold text-slate-900 tabular-nums">
                          W = {wholeness.score.toFixed(2)}
                        </div>
                      </div>

                      <div className="divide-y divide-slate-200 border-t border-slate-200 text-xs">
                        {wholeness.criteria.map((c, idx) => (
                          <div
                            key={c.id}
                            className="py-2.5 flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-2">
                              {c.met ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              ) : (
                                <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              )}
                              <span className="font-medium text-slate-900">{c.label}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => goTo(Math.min(idx, 5))}
                              className="text-sky-600 hover:text-sky-700 font-medium cursor-pointer"
                            >
                              {c.met ? 'Edit' : 'Complete'}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-white border border-slate-200 rounded-xl p-4">
                      <div>
                        <div className="text-slate-500">Entry Mode</div>
                        <div className="font-semibold text-slate-900 mt-0.5">
                          {blueprint.entryMode === 'signals'
                            ? 'Full 01–06 Signals'
                            : 'Skip 01–02 (Leads)'}
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-500">Email Contract</div>
                        <div className="font-semibold text-slate-900 mt-0.5">
                          {blueprint.emailMode === 'full' ? 'Full Email' : 'Body-Only Token'}
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-500">Runtime & Docs</div>
                        <div className="font-semibold text-slate-900 mt-0.5">
                          {blueprint.targetRuntime.toUpperCase()} · {connectorDocs.length} grounded
                        </div>
                      </div>
                    </div>
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
                disabled={!canAdvanceCurrent()}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-40 transition-colors cursor-pointer"
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
