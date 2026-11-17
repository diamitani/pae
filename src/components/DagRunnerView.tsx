import { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  GitBranch,
  Loader2,
  PauseCircle,
  Play,
  RotateCcw,
  SkipForward,
  Upload,
} from 'lucide-react';
import { motion } from 'motion/react';
import type {
  DagWaveLog,
  HarnessBlueprint,
  ProspectRecord,
  StepId,
  WholenessReport,
  WorkflowStepSkill,
} from '../types/harness';
import { SAMPLE_CSV_LEADS, SAMPLE_WEBHOOK_PAYLOAD } from '../lib/presets';

interface DagRunnerViewProps {
  blueprint: HarnessBlueprint;
  wholeness: WholenessReport;
  steps: WorkflowStepSkill[];
  waveLogs: DagWaveLog[];
  existingLeads: ProspectRecord[];
  isRunning: boolean;
  runError: string | null;
  onToggleEntryMode: (mode: HarnessBlueprint['entryMode']) => void;
  onUpdateStep: (stepId: StepId, patch: Partial<WorkflowStepSkill>) => void;
  onResetSteps: () => void;
  onIngestCsvText: (csvText: string) => void;
  onIngestWebhookJson: (jsonText: string) => void;
  onRunHarness: () => void;
  onOpenProspects: () => void;
}

const STEP_BADGE_MAP: Record<WorkflowStepSkill['status'], string> = {
  idle: 'text-slate-500',
  running: 'text-sky-600 font-medium',
  completed: 'text-emerald-700 font-medium',
  bypassed: 'text-slate-400',
  awaiting_approval: 'text-amber-700 font-medium',
  error: 'text-red-700 font-medium',
};

const STEP_STATUS_LABEL: Record<WorkflowStepSkill['status'], string> = {
  idle: 'Ready',
  running: 'Executing',
  completed: 'Done',
  bypassed: 'Skipped',
  awaiting_approval: 'Approval Gate',
  error: 'Failed',
};

export function DagRunnerView({
  blueprint,
  wholeness,
  steps,
  waveLogs,
  existingLeads,
  isRunning,
  runError,
  onToggleEntryMode,
  onUpdateStep,
  onResetSteps,
  onIngestCsvText,
  onIngestWebhookJson,
  onRunHarness,
  onOpenProspects,
}: DagRunnerViewProps) {
  const [selectedStepId, setSelectedStepId] = useState<StepId>('01_signals');
  const [ingestTab, setIngestTab] = useState<'csv' | 'webhook'>('csv');
  const [rawInput, setRawInput] = useState(SAMPLE_CSV_LEADS);
  const [ingestNotice, setIngestNotice] = useState<string | null>(null);

  const selectedStep = steps.find((s) => s.id === selectedStepId) ?? steps[0];

  const handleLoadSample = () => {
    const sample = ingestTab === 'csv' ? SAMPLE_CSV_LEADS : SAMPLE_WEBHOOK_PAYLOAD;
    setRawInput(sample);
    setIngestNotice(null);
  };

  const handleIngest = () => {
    try {
      if (ingestTab === 'csv') {
        onIngestCsvText(rawInput);
        setIngestNotice('CSV leads loaded into Wave 2 and entry mode switched to Already Have Leads.');
      } else {
        onIngestWebhookJson(rawInput);
        setIngestNotice('Webhook payload parsed into Wave 2 and entry mode switched to Already Have Leads.');
      }
    } catch (err) {
      setIngestNotice(err instanceof Error ? err.message : 'Unable to parse input.');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      className="max-w-[1440px] mx-auto px-6 py-8 space-y-8"
    >
      {/* Top Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <p className="text-xs font-medium text-sky-600">
            Middle-Out DAG Graph Loop · {blueprint.workflowName}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 mt-1">
            Inspect skills, short-circuit preconditions, and run the 6-step loop.
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => onToggleEntryMode('signals')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                blueprint.entryMode === 'signals'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              01–06 Full Signals
            </button>
            <button
              type="button"
              onClick={() => onToggleEntryMode('existing_leads')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                blueprint.entryMode === 'existing_leads'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Already Have Leads (Skip 01–02)
            </button>
          </div>

          <button
            type="button"
            onClick={onRunHarness}
            disabled={isRunning || !wholeness.passed}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Executing Waves...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Execute Graph Loop</span>
              </>
            )}
          </button>
        </div>
      </div>

      {!wholeness.passed && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center justify-between gap-4">
          <span>
            Foundation Wholeness is currently <strong className="font-mono">W = {wholeness.score.toFixed(2)}</strong>. Complete all required intake fields in Blueprint before executing the live loop.
          </span>
        </div>
      )}

      {runError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800">
          {runError}
        </div>
      )}

      {/* 6-Step Horizontal Pipeline Canvas */}
      <section className="bg-slate-50 border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <GitBranch className="w-4 h-4 text-sky-600" />
            <span className="font-medium text-slate-900">SalesGency 6-Step Workflow</span>
            <span aria-hidden="true">·</span>
            <span>Click any node to edit its skill prompt and connector contract</span>
          </div>
          {blueprint.entryMode === 'existing_leads' && (
            <div className="inline-flex items-center gap-1.5 text-xs font-medium text-sky-700">
              <SkipForward className="w-3.5 h-3.5" />
              <span>
                Bypass active: {existingLeads.length} lead(s) queued directly into Step 03 Contacts
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3">
          {steps.map((step) => {
            const isSelected = step.id === selectedStepId;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => setSelectedStepId(step.id)}
                className={`text-left p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between min-h-[164px] ${
                  step.bypassed
                    ? isSelected
                      ? 'bg-slate-100 border-slate-400 opacity-80'
                      : 'bg-slate-100/70 border-slate-200 opacity-65 hover:opacity-90'
                    : isSelected
                      ? 'bg-white border-sky-600 ring-1 ring-sky-600'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-mono font-semibold text-slate-900 tabular-nums">
                      {step.stepNumber} · Wave {step.wave}
                    </span>
                    <span className={`text-[11px] tabular-nums ${STEP_BADGE_MAP[step.status]}`}>
                      {STEP_STATUS_LABEL[step.status]}
                    </span>
                  </div>

                  <div>
                    <div className="text-sm font-semibold text-slate-900">{step.title}</div>
                    <div className="text-xs text-slate-500 mt-0.5 leading-snug">
                      {step.subtitle}
                    </div>
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-slate-100 space-y-1">
                  <div className="text-[11px] text-slate-600 truncate">{step.connector}</div>
                  {step.summary ? (
                    <div className="text-[11px] font-mono text-sky-700 truncate tabular-nums">
                      {step.summary}
                      {typeof step.latencyMs === 'number' && step.latencyMs > 0
                        ? ` · ${step.latencyMs}ms`
                        : ''}
                    </div>
                  ) : (
                    <div className="text-[11px] font-mono text-slate-400 truncate">
                      {step.bypassed ? 'Short-circuited' : 'Click to inspect skill'}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Split Inspector: Left = Step Skill Editor, Right = Lead Ingestion & Wave Execution Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Step Skill Inspector */}
        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <div className="text-xs font-mono text-sky-600">
                Step {selectedStep.stepNumber} Skill Specification · Wave {selectedStep.wave}
              </div>
              <h2 className="text-lg font-semibold text-slate-900 mt-0.5">
                {selectedStep.title} — {selectedStep.subtitle}
              </h2>
            </div>
            <button
              type="button"
              onClick={onResetSteps}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:text-slate-900 hover:bg-slate-100 transition-colors whitespace-nowrap cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Prompts</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="step-connector" className="block text-xs font-medium text-slate-700">
                Bound Connector / Tool
              </label>
              <input
                id="step-connector"
                type="text"
                value={selectedStep.connector}
                onChange={(e) =>
                  onUpdateStep(selectedStep.id, { connector: e.target.value })
                }
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="step-precondition" className="block text-xs font-medium text-slate-700">
                Boolean Precondition
              </label>
              <input
                id="step-precondition"
                type="text"
                value={selectedStep.precondition}
                onChange={(e) =>
                  onUpdateStep(selectedStep.id, { precondition: e.target.value })
                }
                className="w-full px-3 py-2 text-sm font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-600"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="step-prompt" className="block text-xs font-medium text-slate-700">
              Executable Skill Prompt
            </label>
            <textarea
              id="step-prompt"
              rows={4}
              value={selectedStep.systemPrompt}
              onChange={(e) =>
                onUpdateStep(selectedStep.id, { systemPrompt: e.target.value })
              }
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 leading-relaxed focus:outline-none focus:ring-2 focus:ring-sky-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div>
              <div className="text-xs font-medium text-slate-500 mb-1">Input Schema</div>
              <pre className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-700 overflow-x-auto">
                {selectedStep.inputContract}
              </pre>
            </div>
            <div>
              <div className="text-xs font-medium text-slate-500 mb-1">Output Schema</div>
              <pre className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-700 overflow-x-auto">
                {selectedStep.outputContract}
              </pre>
            </div>
          </div>
        </section>

        {/* Right: Lead Ingestion & Wave Execution Telemetry */}
        <section className="lg:col-span-5 space-y-6">
          {/* Fast-Track Lead Ingestion */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Lead Ingestion (Bypass Steps 01–02)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Load CSV rows or an upstream webhook JSON payload directly into Step 03.
                </p>
              </div>
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setIngestTab('csv');
                    setRawInput(SAMPLE_CSV_LEADS);
                  }}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md cursor-pointer ${
                    ingestTab === 'csv' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  CSV
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIngestTab('webhook');
                    setRawInput(SAMPLE_WEBHOOK_PAYLOAD);
                  }}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md cursor-pointer ${
                    ingestTab === 'webhook'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600'
                  }`}
                >
                  Webhook JSON
                </button>
              </div>
            </div>

            <textarea
              rows={5}
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              className="w-full p-3 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-600"
            />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleLoadSample}
                className="text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Load sample {ingestTab === 'csv' ? 'CSV' : 'Clay webhook'}
              </button>

              <button
                type="button"
                onClick={handleIngest}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Queue Leads into Wave 2</span>
              </button>
            </div>

            {ingestNotice && (
              <p className="text-xs text-sky-700 font-medium">{ingestNotice}</p>
            )}
          </div>

          {/* Wave Execution Trace */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                Wave Execution Log
              </h3>
              {waveLogs.length > 0 && (
                <button
                  type="button"
                  onClick={onOpenProspects}
                  className="inline-flex items-center gap-1 text-xs font-medium text-sky-600 hover:text-sky-700 cursor-pointer"
                >
                  <span>Review Prospects</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {waveLogs.length === 0 ? (
              <p className="text-xs text-slate-500">
                No waves executed yet. Click <span className="font-medium text-slate-700">Execute Graph Loop</span> to run live Gemini discovery, parallel DNS MX verification, and 6-part research briefs.
              </p>
            ) : (
              <div className="divide-y divide-slate-200">
                {waveLogs.map((log) => (
                  <div key={log.wave} className="py-3 first:pt-0 last:pb-0 space-y-1">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                        {log.status === 'completed' && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        )}
                        {log.status === 'bypassed' && (
                          <SkipForward className="w-3.5 h-3.5 text-slate-400" />
                        )}
                        {log.status === 'paused' && (
                          <PauseCircle className="w-3.5 h-3.5 text-amber-600" />
                        )}
                        <span>
                          Wave {log.wave} · {log.label}
                        </span>
                      </span>
                      <span className="font-mono text-slate-500 tabular-nums">
                        {log.durationMs}ms
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{log.note}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </motion.div>
  );
}
