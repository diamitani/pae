import { useMemo, useState } from 'react';
import { Check, Copy, Download, FileCode2, Layers } from 'lucide-react';
import { motion } from 'motion/react';
import type { ConnectorDoc, HarnessBlueprint, WorkflowStepSkill } from '../types/harness';
import { compileAllDeliverables } from '../lib/compilers';

interface ExportStudioViewProps {
  blueprint: HarnessBlueprint;
  steps: WorkflowStepSkill[];
  connectorDocs: ConnectorDoc[];
}

type ExportTab =
  | 'n8n'
  | 'make_gumloop'
  | 'composio_cron'
  | 'skill_pack'
  | 'pop_11'
  | 'supabase_backmap';

export function ExportStudioView({
  blueprint,
  steps,
  connectorDocs,
}: ExportStudioViewProps) {
  const [activeTab, setActiveTab] = useState<ExportTab>(() => {
    if (blueprint.targetRuntime === 'make' || blueprint.targetRuntime === 'gumloop') {
      return 'make_gumloop';
    }
    if (blueprint.targetRuntime === 'composio_cron') return 'composio_cron';
    if (blueprint.targetRuntime === 'code_harness') return 'skill_pack';
    return 'n8n';
  });

  const [n8nVariant, setN8nVariant] = useState<'main' | 'error'>('main');
  const [makeOrGumloop, setMakeOrGumloop] = useState<'make' | 'gumloop'>(
    blueprint.targetRuntime === 'gumloop' ? 'gumloop' : 'make'
  );
  const [supabaseOrBackmap, setSupabaseOrBackmap] = useState<
    'supabase' | 'backmap' | 'manifest' | 'permissions'
  >('supabase');
  const [selectedSkillIdx, setSelectedSkillIdx] = useState(0);
  const [selectedPopIdx, setSelectedPopIdx] = useState(0);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const bundle = useMemo(
    () => compileAllDeliverables(blueprint, steps, connectorDocs),
    [blueprint, steps, connectorDocs]
  );

  const currentFile = useMemo(() => {
    if (activeTab === 'n8n') {
      return n8nVariant === 'main'
        ? {
            filename: 'salesgency-n8n-workflow.json',
            label: 'n8n Importable Workflow JSON',
            content: bundle.n8nJson,
          }
        : {
            filename: 'pae-error-alert.json',
            label: 'n8n PII-Redacted Error Alert Workflow',
            content: bundle.n8nErrorWorkflowJson,
          };
    }
    if (activeTab === 'make_gumloop') {
      return makeOrGumloop === 'make'
        ? {
            filename: 'salesgency-make-blueprint.json',
            label: 'Make.com Scenario Blueprint JSON',
            content: bundle.makeBlueprintJson,
          }
        : {
            filename: 'salesgency-gumloop-flow.json',
            label: 'Gumloop AI Flow JSON',
            content: bundle.gumloopFlowJson,
          };
    }
    if (activeTab === 'composio_cron') {
      return {
        filename: 'automation.ts',
        label: 'Composio + node-cron Runner & rostr.config.ts',
        content: `${bundle.rostrConfigTs}\n// --- automation.ts ---\n${bundle.composioCronTs}\n// --- crontab ---\n${bundle.crontabSpec}`,
      };
    }
    if (activeTab === 'skill_pack') {
      if (selectedSkillIdx === bundle.skillPack.length) {
        return {
          filename: 'orchestrator.graph-loop.ts',
          label: 'Middle-Out Graph Loop Orchestrator',
          content: bundle.graphLoopTs,
        };
      }
      const skill = bundle.skillPack[selectedSkillIdx] ?? bundle.skillPack[0];
      return {
        filename: skill.filename,
        label: skill.title,
        content: skill.content,
      };
    }
    if (activeTab === 'supabase_backmap') {
      if (supabaseOrBackmap === 'supabase') {
        return {
          filename: 'supabase_schema.sql',
          label: 'Supabase Multi-Tenant PostgreSQL + RLS Migration',
          content: bundle.supabaseSchemaSql,
        };
      }
      if (supabaseOrBackmap === 'backmap') {
        return {
          filename: 'BACKMAP_ARCHITECTURE.md',
          label: 'Backmap Architecture & State Reconciliation Report',
          content: bundle.backmapArchitectureMd,
        };
      }
      if (supabaseOrBackmap === 'manifest') {
        return {
          filename: 'rostrv2.manifest.yaml',
          label: 'ROSTRv2 Agent Runtime Manifest',
          content: bundle.rostrManifestYaml,
        };
      }
      return {
        filename: 'enably.permissions.v1.yaml',
        label: 'Enably Connected Operations Permission Policy',
        content: bundle.permissionsPolicyYaml,
      };
    }
    const pop = bundle.popArtifacts[selectedPopIdx] ?? bundle.popArtifacts[0];
    return {
      filename: pop.filename,
      label: pop.title,
      content: pop.content,
    };
  }, [
    activeTab,
    bundle,
    makeOrGumloop,
    n8nVariant,
    selectedPopIdx,
    selectedSkillIdx,
    supabaseOrBackmap,
  ]);

  const handleCopy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1600);
  };

  const downloadFile = (filename: string, content: string, mime = 'text/plain;charset=utf-8') => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadFullBundle = () => {
    downloadFile(
      `${blueprint.workflowName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-harness-bundle.json`,
      JSON.stringify(bundle, null, 2),
      'application/json'
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      className="max-w-[1440px] mx-auto px-6 py-8 space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <p className="text-xs font-medium text-sky-600">
            Production Harness Compiler · {blueprint.workflowName}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 mt-1">
            Export ready-to-import workflows, ROSTRv2 skill packs, Supabase SQL, and POP blueprints.
          </h1>
        </div>

        <button
          type="button"
          onClick={handleDownloadFullBundle}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download Complete Bundle (.json)</span>
        </button>
      </div>

      {/* Compiler Target Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
          {(
            [
              { id: 'n8n', label: 'n8n + Error Alert' },
              { id: 'make_gumloop', label: 'Make & Gumloop' },
              { id: 'composio_cron', label: 'Composio + Cron' },
              { id: 'skill_pack', label: 'ROSTRv2 Skill Pack (11)' },
              { id: 'pop_11', label: 'POP 11-Artifact Pack' },
              { id: 'supabase_backmap', label: 'Supabase SQL & Backmap' },
            ] as Array<{ id: ExportTab; label: string }>
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'n8n' && (
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setN8nVariant('main')}
              className={`px-3 py-1 text-xs font-medium rounded-md cursor-pointer ${
                n8nVariant === 'main' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Main Workflow JSON
            </button>
            <button
              type="button"
              onClick={() => setN8nVariant('error')}
              className={`px-3 py-1 text-xs font-medium rounded-md cursor-pointer ${
                n8nVariant === 'error' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              PII-Redacted Error Alert
            </button>
          </div>
        )}

        {activeTab === 'make_gumloop' && (
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setMakeOrGumloop('make')}
              className={`px-3 py-1 text-xs font-medium rounded-md cursor-pointer ${
                makeOrGumloop === 'make' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Make.com Blueprint
            </button>
            <button
              type="button"
              onClick={() => setMakeOrGumloop('gumloop')}
              className={`px-3 py-1 text-xs font-medium rounded-md cursor-pointer ${
                makeOrGumloop === 'gumloop'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600'
              }`}
            >
              Gumloop Flow
            </button>
          </div>
        )}

        {activeTab === 'supabase_backmap' && (
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(
              [
                { id: 'supabase', label: 'supabase_schema.sql' },
                { id: 'backmap', label: 'BACKMAP_ARCHITECTURE.md' },
                { id: 'manifest', label: 'rostrv2.manifest.yaml' },
                { id: 'permissions', label: 'enably.permissions.v1.yaml' },
              ] as const
            ).map((sub) => (
              <button
                key={sub.id}
                type="button"
                onClick={() => setSupabaseOrBackmap(sub.id)}
                className={`px-2.5 py-1 text-xs font-mono rounded-md cursor-pointer ${
                  supabaseOrBackmap === sub.id
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600'
                }`}
              >
                {sub.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Split Workspace: Optional File Tree Sidebar + Code Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {(activeTab === 'skill_pack' || activeTab === 'pop_11') && (
          <aside className="lg:col-span-4 bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1">
            <div className="px-2 pb-2 mb-2 border-b border-slate-200 flex items-center gap-2 text-xs font-semibold text-slate-700">
              <Layers className="w-3.5 h-3.5 text-sky-600" />
              <span>
                {activeTab === 'skill_pack'
                  ? 'ROSTRv2 Skills & Graph Loop'
                  : 'POP 11-Artifact Package'}
              </span>
            </div>

            {activeTab === 'skill_pack' && (
              <>
                {bundle.skillPack.map((item, idx) => (
                  <button
                    key={item.filename}
                    type="button"
                    onClick={() => setSelectedSkillIdx(idx)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer ${
                      selectedSkillIdx === idx
                        ? 'bg-white text-slate-900 font-semibold border border-slate-200'
                        : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
                    }`}
                  >
                    <div>{item.title}</div>
                    <div className="font-mono text-[11px] text-slate-400 mt-0.5">
                      {item.filename}
                    </div>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setSelectedSkillIdx(bundle.skillPack.length)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer ${
                    selectedSkillIdx === bundle.skillPack.length
                      ? 'bg-white text-slate-900 font-semibold border border-slate-200'
                      : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
                  }`}
                >
                  <div>Graph Loop Orchestrator</div>
                  <div className="font-mono text-[11px] text-slate-400 mt-0.5">
                    orchestrator.graph-loop.ts
                  </div>
                </button>
              </>
            )}

            {activeTab === 'pop_11' &&
              bundle.popArtifacts.map((item, idx) => (
                <button
                  key={item.filename}
                  type="button"
                  onClick={() => setSelectedPopIdx(idx)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer ${
                    selectedPopIdx === idx
                      ? 'bg-white text-slate-900 font-semibold border border-slate-200'
                      : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
                  }`}
                >
                  <div>{item.title}</div>
                  <div className="font-mono text-[11px] text-slate-400 mt-0.5">
                    {item.filename}
                  </div>
                </button>
              ))}
          </aside>
        )}

        <section
          className={`${
            activeTab === 'skill_pack' || activeTab === 'pop_11'
              ? 'lg:col-span-8'
              : 'lg:col-span-12'
          } bg-white border border-slate-200 rounded-xl overflow-hidden`}
        >
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <FileCode2 className="w-4 h-4 text-sky-600" />
              <span className="text-xs font-semibold text-slate-900">
                {currentFile.label}
              </span>
              <span className="text-xs text-slate-400">·</span>
              <span className="font-mono text-xs text-slate-500">{currentFile.filename}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleCopy(currentFile.content, currentFile.filename)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                {copiedKey === currentFile.filename ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => downloadFile(currentFile.filename, currentFile.content)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download File</span>
              </button>
            </div>
          </div>

          <pre className="p-5 text-xs font-mono text-slate-800 bg-white overflow-x-auto max-h-[640px] leading-relaxed">
            {currentFile.content}
          </pre>
        </section>
      </div>
    </motion.div>
  );
}
