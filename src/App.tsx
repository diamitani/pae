import { useEffect, useMemo, useState } from 'react';
import { TopBar, type WorkspaceTab } from './components/TopBar';
import { OverviewLanding } from './components/OverviewLanding';
import { BlueprintView } from './components/BlueprintView';
import { DagRunnerView } from './components/DagRunnerView';
import { ProspectsView } from './components/ProspectsView';
import { ExportStudioView } from './components/ExportStudioView';
import {
  BLUEPRINT_PRESETS,
  TOOL_CATALOG,
  createDefaultSteps,
  createPlaceholderProspect,
  evaluateWholeness,
} from './lib/presets';
import type {
  ConnectorDoc,
  DagWaveLog,
  HarnessBlueprint,
  MxCheckResult,
  ProspectRecord,
  StepId,
  WorkflowStepSkill,
} from './types/harness';

const STORAGE_BLUEPRINT_KEY = 'salesgency_blueprint_v1';

function parseCsvLeads(csvText: string): ProspectRecord[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) {
    throw new Error('CSV must include a header row and at least one prospect row.');
  }

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const idx = (names: string[]) => headers.findIndex((h) => names.includes(h));

  const iCompany = idx(['company', 'companyname', 'organization', 'account']);
  const iDomain = idx(['domain', 'website', 'url']);
  const iName = idx(['contactname', 'name', 'fullname', 'contact']);
  const iTitle = idx(['contacttitle', 'title', 'role']);
  const iEmail = idx(['email', 'workemail']);
  const iIndustry = idx(['industry', 'sector']);
  const iSize = idx(['employeecount', 'employees', 'size']);

  const leads: ProspectRecord[] = [];
  for (const line of lines.slice(1)) {
    const cols = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
    const company = (iCompany >= 0 ? cols[iCompany] : cols[0]) || 'Unknown Company';
    const email = iEmail >= 0 ? cols[iEmail] : '';
    const rawDomain = iDomain >= 0 ? cols[iDomain] : email.split('@')[1] || '';
    const domain = rawDomain.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!domain && !email) continue;
    leads.push(
      createPlaceholderProspect({
        company,
        domain: domain || 'example.com',
        contactName: (iName >= 0 ? cols[iName] : undefined) || 'Decision Maker',
        contactTitle: (iTitle >= 0 ? cols[iTitle] : undefined) || 'VP Operations',
        email,
        industry: iIndustry >= 0 ? cols[iIndustry] : undefined,
        employeeCount: iSize >= 0 ? cols[iSize] : undefined,
      })
    );
  }

  if (leads.length === 0) {
    throw new Error('No valid company/domain rows found in CSV.');
  }
  return leads;
}

function parseWebhookLeads(jsonText: string): ProspectRecord[] {
  const parsed = JSON.parse(jsonText);
  const rawList = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.leads)
      ? parsed.leads
      : Array.isArray(parsed?.prospects)
        ? parsed.prospects
        : [parsed];

  const leads: ProspectRecord[] = [];
  for (const item of rawList) {
    if (!item || typeof item !== 'object') continue;
    const company = String(item.company || item.organization || item.companyName || '').trim();
    const email = String(item.email || item.workEmail || '').trim();
    const domain = String(item.domain || item.website || email.split('@')[1] || '')
      .replace(/^https?:\/\//, '')
      .replace(/\/.*$/, '')
      .trim();
    if (!company && !domain) continue;
    leads.push(
      createPlaceholderProspect({
        company: company || domain,
        domain: domain || 'example.com',
        contactName: String(item.contactName || item.name || 'Decision Maker'),
        contactTitle: String(item.contactTitle || item.title || 'Revenue Leader'),
        email,
        industry: item.industry ? String(item.industry) : undefined,
        employeeCount: item.employeeCount ? String(item.employeeCount) : undefined,
      })
    );
  }

  if (leads.length === 0) {
    throw new Error('Webhook JSON did not contain recognizable lead objects.');
  }
  return leads;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('overview');
  const [blueprint, setBlueprint] = useState<HarnessBlueprint>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_BLUEPRINT_KEY);
      if (saved) return JSON.parse(saved) as HarnessBlueprint;
    } catch {
      // Ignore storage errors
    }
    return BLUEPRINT_PRESETS[0].blueprint;
  });

  const [steps, setSteps] = useState<WorkflowStepSkill[]>(() =>
    createDefaultSteps(blueprint)
  );
  const [connectorDocs, setConnectorDocs] = useState<ConnectorDoc[]>([]);
  const [isGroundingDocs, setIsGroundingDocs] = useState(false);
  const [docsError, setDocsError] = useState<string | null>(null);

  const [prospects, setProspects] = useState<ProspectRecord[]>([]);
  const [waveLogs, setWaveLogs] = useState<DagWaveLog[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);

  const [isVerifyingMx, setIsVerifyingMx] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchFeedback, setDispatchFeedback] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_BLUEPRINT_KEY, JSON.stringify(blueprint));
    } catch {
      // Ignore storage errors
    }
  }, [blueprint]);

  const wholeness = useMemo(() => evaluateWholeness(blueprint), [blueprint]);

  const syncStepsWithBlueprint = (nextBp: HarnessBlueprint) => {
    const fresh = createDefaultSteps(nextBp);
    setSteps((prev) =>
      fresh.map((f) => {
        const existing = prev.find((p) => p.id === f.id);
        return existing
          ? {
              ...f,
              systemPrompt: existing.systemPrompt,
              precondition: existing.precondition,
              status: f.bypassed ? 'bypassed' : 'idle',
            }
          : f;
      })
    );
  };

  const handleChangeBlueprint = (next: HarnessBlueprint) => {
    setBlueprint(next);
    if (
      next.entryMode !== blueprint.entryMode ||
      next.emailMode !== blueprint.emailMode ||
      next.connectors.outreachPlatformName !== blueprint.connectors.outreachPlatformName
    ) {
      syncStepsWithBlueprint(next);
    }
  };

  const handleApplyPreset = (presetId: string) => {
    const found = BLUEPRINT_PRESETS.find((p) => p.id === presetId);
    if (!found) return;
    setBlueprint(found.blueprint);
    setSteps(createDefaultSteps(found.blueprint));
    setRunError(null);
  };

  const handleGroundDocs = async () => {
    setIsGroundingDocs(true);
    setDocsError(null);
    try {
      const selectedToolObjects = TOOL_CATALOG.filter((t) =>
        blueprint.selectedTools.includes(t.id)
      );
      const res = await fetch('/api/docs/ground', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tools: selectedToolObjects, blueprint }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to ground tool documentation.');
      }
      setConnectorDocs(data.docs || []);
    } catch (err) {
      setDocsError(err instanceof Error ? err.message : 'Unable to fetch tool documentation.');
    } finally {
      setIsGroundingDocs(false);
    }
  };

  const handleRunHarness = async () => {
    if (!wholeness.passed) {
      setActiveTab('blueprint');
      return;
    }

    setActiveTab('runner');
    setIsRunning(true);
    setRunError(null);
    setDispatchFeedback(null);

    setSteps((prev) =>
      prev.map((s) => ({
        ...s,
        status: s.bypassed ? 'bypassed' : 'running',
        summary: undefined,
        latencyMs: undefined,
      }))
    );

    try {
      const res = await fetch('/api/harness/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blueprint,
          steps,
          existingLeads: blueprint.entryMode === 'existing_leads' ? prospects : [],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Agent harness run failed.');
      }

      const stepMetrics: Record<string, { latencyMs: number; summary: string }> =
        data.stepMetrics || {};

      setSteps((prev) =>
        prev.map((s) => {
          const metric = stepMetrics[s.id];
          if (s.bypassed) {
            return { ...s, status: 'bypassed', latencyMs: 0, summary: metric?.summary };
          }
          if (s.id === '06_outreach') {
            return {
              ...s,
              status: 'awaiting_approval',
              latencyMs: metric?.latencyMs ?? 0,
              summary: metric?.summary || 'Awaiting human approval',
            };
          }
          return {
            ...s,
            status: 'completed',
            latencyMs: metric?.latencyMs,
            summary: metric?.summary,
          };
        })
      );

      setProspects(data.prospects || []);
      setWaveLogs(data.waveLogs || []);
    } catch (err) {
      setRunError(err instanceof Error ? err.message : 'Harness execution failed.');
      setSteps((prev) =>
        prev.map((s) => ({
          ...s,
          status: s.bypassed ? 'bypassed' : 'error',
        }))
      );
    } finally {
      setIsRunning(false);
    }
  };

  const handleUpdateStep = (stepId: StepId, patch: Partial<WorkflowStepSkill>) => {
    setSteps((prev) => prev.map((s) => (s.id === stepId ? { ...s, ...patch } : s)));
  };

  const handleResetSteps = () => {
    setSteps(createDefaultSteps(blueprint));
  };

  const handleIngestCsv = (csvText: string) => {
    const parsed = parseCsvLeads(csvText);
    setProspects(parsed);
    const nextBp: HarnessBlueprint = { ...blueprint, entryMode: 'existing_leads' };
    setBlueprint(nextBp);
    setSteps(createDefaultSteps(nextBp));
  };

  const handleIngestWebhook = (jsonText: string) => {
    const parsed = parseWebhookLeads(jsonText);
    setProspects(parsed);
    const nextBp: HarnessBlueprint = { ...blueprint, entryMode: 'existing_leads' };
    setBlueprint(nextBp);
    setSteps(createDefaultSteps(nextBp));
  };

  const handleUpdateProspect = (id: string, patch: Partial<ProspectRecord>) => {
    setProspects((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  const runMxVerification = async (targetList: ProspectRecord[]) => {
    if (targetList.length === 0) return;
    setIsVerifyingMx(true);
    try {
      const res = await fetch('/api/verify/mx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: targetList.map((p) => ({ email: p.email, domain: p.domain })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'MX check failed.');
      const results: MxCheckResult[] = data.results || [];
      setProspects((prev) =>
        prev.map((p) => {
          const idx = targetList.findIndex((t) => t.id === p.id);
          if (idx === -1 || !results[idx]) return p;
          const mx = results[idx];
          const truthNotice = !mx.validSyntax
            ? `Operational Truth Gate: "${p.email}" failed email syntax validation.`
            : !mx.hasMx
              ? `Operational Truth Gate: "${mx.domain}" returned no active DNS MX records.`
              : undefined;
          return {
            ...p,
            mx,
            truthNotice,
            approvalStatus: truthNotice ? 'flagged' : p.approvalStatus === 'flagged' ? 'pending' : p.approvalStatus,
          };
        })
      );
    } catch (err) {
      setDispatchFeedback(
        err instanceof Error ? err.message : 'Unable to verify DNS MX records.'
      );
    } finally {
      setIsVerifyingMx(false);
    }
  };

  const handleApproveAllVerified = () => {
    setProspects((prev) =>
      prev.map((p) =>
        p.mx.hasMx && p.approvalStatus !== 'dispatched'
          ? { ...p, approvalStatus: 'approved' }
          : p
      )
    );
  };

  const handleDispatchWebhook = async (
    webhookUrl: string,
    selectedProspects: ProspectRecord[]
  ) => {
    setIsDispatching(true);
    setDispatchFeedback(null);
    try {
      const res = await fetch('/api/outreach/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookUrl,
          prospects: selectedProspects,
          workflowName: blueprint.workflowName,
          emailMode: blueprint.emailMode,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Webhook dispatch failed.');
      }

      const dispatchedIds = new Set(selectedProspects.map((p) => p.id));
      const now = new Date().toISOString();
      setProspects((prev) =>
        prev.map((p) =>
          dispatchedIds.has(p.id) ? { ...p, approvalStatus: 'dispatched', dispatchedAt: now } : p
        )
      );
      setSteps((prev) =>
        prev.map((s) =>
          s.id === '06_outreach'
            ? {
                ...s,
                status: 'completed',
                summary: `Dispatched ${selectedProspects.length} prospect(s)`,
              }
            : s
        )
      );
      setDispatchFeedback(
        `Dispatched ${data.dispatchedCount} approved prospect(s) to webhook (HTTP ${data.status}).`
      );
    } catch (err) {
      setDispatchFeedback(
        err instanceof Error ? err.message : 'Webhook dispatch failed.'
      );
    } finally {
      setIsDispatching(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col">
      <TopBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onPrimaryAction={() => {
          if (activeTab === 'overview') {
            setActiveTab('blueprint');
          } else {
            handleRunHarness();
          }
        }}
        isRunning={isRunning}
        wholenessPassed={wholeness.passed}
      />

      <main className="flex-1">
        {activeTab === 'overview' && (
          <OverviewLanding
            onNavigate={setActiveTab}
            onLoadPresetAndOpen={(presetId, targetTab) => {
              handleApplyPreset(presetId);
              setActiveTab(targetTab);
            }}
          />
        )}

        {activeTab === 'blueprint' && (
          <BlueprintView
            blueprint={blueprint}
            wholeness={wholeness}
            connectorDocs={connectorDocs}
            isGroundingDocs={isGroundingDocs}
            docsError={docsError}
            onChangeBlueprint={handleChangeBlueprint}
            onApplyPreset={handleApplyPreset}
            onGroundDocs={handleGroundDocs}
            onProceedToRunner={() => setActiveTab('runner')}
          />
        )}

        {activeTab === 'runner' && (
          <DagRunnerView
            blueprint={blueprint}
            wholeness={wholeness}
            steps={steps}
            waveLogs={waveLogs}
            existingLeads={prospects}
            isRunning={isRunning}
            runError={runError}
            onToggleEntryMode={(mode) =>
              handleChangeBlueprint({ ...blueprint, entryMode: mode })
            }
            onUpdateStep={handleUpdateStep}
            onResetSteps={handleResetSteps}
            onIngestCsvText={handleIngestCsv}
            onIngestWebhookJson={handleIngestWebhook}
            onRunHarness={handleRunHarness}
            onOpenProspects={() => setActiveTab('prospects')}
          />
        )}

        {activeTab === 'prospects' && (
          <ProspectsView
            blueprint={blueprint}
            prospects={prospects}
            isVerifyingMx={isVerifyingMx}
            isDispatching={isDispatching}
            dispatchFeedback={dispatchFeedback}
            onUpdateProspect={handleUpdateProspect}
            onVerifyAllMx={() => runMxVerification(prospects)}
            onVerifySingleMx={(id) => {
              const target = prospects.find((p) => p.id === id);
              if (target) runMxVerification([target]);
            }}
            onApproveAllVerified={handleApproveAllVerified}
            onDispatchWebhook={handleDispatchWebhook}
            onGoToRunner={() => setActiveTab('runner')}
          />
        )}

        {activeTab === 'export' && (
          <ExportStudioView
            blueprint={blueprint}
            steps={steps}
            connectorDocs={connectorDocs}
          />
        )}
      </main>
    </div>
  );
}
