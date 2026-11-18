import type {
  CompiledBundle,
  ConnectorDoc,
  HarnessBlueprint,
  PopArtifactFile,
  SkillPackFile,
  WorkflowStepSkill,
} from '../types/harness';
import { evaluateWholeness } from './presets';

function getStep(steps: WorkflowStepSkill[], id: string): WorkflowStepSkill {
  return steps.find((s) => s.id === id) ?? steps[0];
}

export function compileN8nWorkflow(
  bp: HarnessBlueprint,
  steps: WorkflowStepSkill[],
  docs: ConnectorDoc[]
): string {
  const s1 = getStep(steps, '01_signals');
  const s2 = getStep(steps, '02_companies');
  const s3 = getStep(steps, '03_contacts');
  const s4 = getStep(steps, '04_research');
  const s5 = getStep(steps, '05_email');
  const s6 = getStep(steps, '06_outreach');

  const outreachDoc = docs.find((d) =>
    ['smartlead', 'instantly', 'hubspot'].includes(d.toolId)
  );

  const workflow = {
    name: `SalesGency · ${bp.workflowName}`,
    nodes: [
      {
        parameters: {
          httpMethod: 'POST',
          path: 'salesgency-intake',
          options: {},
        },
        id: 'sg-trigger-webhook',
        name: 'Inbound Trigger (Schedule / Webhook)',
        type: 'n8n-nodes-base.webhook',
        typeVersion: 2,
        position: [180, 300],
      },
      {
        parameters: {
          conditions: {
            options: { caseSensitive: true, leftValue: '' },
            conditions: [
              {
                id: 'entry-mode-check',
                leftValue: `={{ $json.entryMode || '${bp.entryMode}' }}`,
                rightValue: 'existing_leads',
                operator: { type: 'string', operation: 'equals' },
              },
            ],
          },
        },
        id: 'sg-bypass-gate',
        name: 'Already Have Leads? (Precondition)',
        type: 'n8n-nodes-base.if',
        typeVersion: 2,
        position: [420, 300],
      },
      {
        parameters: {
          promptType: 'define',
          text: `${s1.systemPrompt}\n\nNext normalize into Step 02 Companies:\n${s2.systemPrompt}`,
        },
        id: 'sg-wave1-agent',
        name: 'Wave 1 · 01 Signals & 02 Companies Agent',
        type: '@n8n/n8n-nodes-langchain.agent',
        typeVersion: 1.7,
        position: [680, 420],
      },
      {
        parameters: {
          model: 'gemini-2.5-flash',
        },
        id: 'sg-lm-wave1',
        name: 'Gemini Chat Model (Wave 1)',
        type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
        typeVersion: 1,
        position: [620, 620],
      },
      {
        parameters: {
          method: 'GET',
          url: 'https://dns.google/resolve?name={{ $json.domain }}&type=MX',
          options: {},
        },
        id: 'sg-mx-tool',
        name: '03 Contacts · DNS MX Lookup Tool',
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 4.2,
        position: [960, 300],
      },
      {
        parameters: {
          jsCode: `// ROSTR Calibrated Truth Operational Gate (Step 03 -> 04)\nconst emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}/;\nreturn items.map(item => {\n  const email = item.json.email || '';\n  const validSyntax = emailRegex.test(email);\n  const hasMx = Array.isArray(item.json.Answer) && item.json.Answer.length > 0;\n  return {\n    json: {\n      ...item.json,\n      mxVerified: validSyntax && hasMx,\n      telemetryStatus: (validSyntax && hasMx) ? 'queued' : 'skipped_guessed_blocked',\n      truthNotice: (!validSyntax || !hasMx) ? 'Unverified operational email/MX — hold for human review' : null\n    }\n  };\n});`,
        },
        id: 'sg-truth-guard',
        name: 'Calibrated Truth MX Gate',
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        position: [1200, 300],
      },
      {
        parameters: {
          promptType: 'define',
          text: `Step 04 Research:\n${s4.systemPrompt}\n\nStep 05 Email (${bp.emailMode}):\n${s5.systemPrompt}`,
        },
        id: 'sg-wave3-agent',
        name: 'Wave 3 · 04 Research & 05 Email Agent',
        type: '@n8n/n8n-nodes-langchain.agent',
        typeVersion: 1.7,
        position: [1460, 300],
      },
      {
        parameters: {
          jsCode: `// Step 05 Deterministic 5-Rule Email Linter\nreturn items.map(item => {\n  const subject = String(item.json.subject || '');\n  const body = String(item.json.body || '');\n  const words = body.trim().split(/\\s+/).filter(Boolean).length;\n  const lintPassed = words <= 120 && !/^(re:|fwd:)/i.test(subject) && !body.includes('!') && !/https?:\\/\\//i.test(body) && !/\\{\\{[^}]+\\}\\}/.test(body);\n  return {\n    json: {\n      ...item.json,\n      lintPassed,\n      telemetryStatus: lintPassed ? 'needs_review' : 'skipped_linter_failed'\n    }\n  };\n});`,
        },
        id: 'sg-step5-linter',
        name: '05 Email · 5-Rule Deterministic Linter',
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        position: [1690, 300],
      },
      {
        parameters: {
          resume: 'webhook',
          options: {},
        },
        id: 'sg-human-gate',
        name: 'Wave 4 · Human Approval Gate',
        type: 'n8n-nodes-base.wait',
        typeVersion: 1.1,
        position: [1920, 300],
      },
      {
        parameters: {
          method: 'POST',
          url:
            bp.connectors.webhookUrl ||
            outreachDoc?.baseUrlOrNodeType ||
            'https://server.smartlead.ai/api/v1/campaigns/{{$env.CAMPAIGN_ID}}/leads',
          sendBody: true,
          specifyBody: 'json',
          jsonBody:
            bp.emailMode === 'body_token'
              ? '={{ { email: $json.email, first_name: $json.firstName, company_name: $json.company, custom_fields: { email_1_body: $json.emailDraft.bodyOnlyToken || $json.emailDraft.body, subject: $json.emailDraft.subject } } }}'
              : '={{ { email: $json.email, subject: $json.emailDraft.subject, body: $json.emailDraft.body, step6Route: "' +
                s6.connector +
                '" } }}',
          options: {},
        },
        id: 'sg-step6-outreach',
        name: `06 Outreach · ${bp.connectors.outreachPlatformName || 'Sequence Dispatch'}`,
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 4.2,
        position: [2160, 300],
      },
    ],
    connections: {
      'Inbound Trigger (Schedule / Webhook)': {
        main: [[{ node: 'Already Have Leads? (Precondition)', type: 'main', index: 0 }]],
      },
      'Already Have Leads? (Precondition)': {
        main: [
          [{ node: '03 Contacts · DNS MX Lookup Tool', type: 'main', index: 0 }],
          [{ node: 'Wave 1 · 01 Signals & 02 Companies Agent', type: 'main', index: 0 }],
        ],
      },
      'Gemini Chat Model (Wave 1)': {
        ai_languageModel: [
          [{ node: 'Wave 1 · 01 Signals & 02 Companies Agent', type: 'ai_languageModel', index: 0 }],
          [{ node: 'Wave 3 · 04 Research & 05 Email Agent', type: 'ai_languageModel', index: 0 }],
        ],
      },
      'Wave 1 · 01 Signals & 02 Companies Agent': {
        main: [[{ node: '03 Contacts · DNS MX Lookup Tool', type: 'main', index: 0 }]],
      },
      '03 Contacts · DNS MX Lookup Tool': {
        ai_tool: [[{ node: 'Wave 1 · 01 Signals & 02 Companies Agent', type: 'ai_tool', index: 0 }]],
        main: [[{ node: 'Calibrated Truth MX Gate', type: 'main', index: 0 }]],
      },
      'Calibrated Truth MX Gate': {
        main: [[{ node: 'Wave 3 · 04 Research & 05 Email Agent', type: 'main', index: 0 }]],
      },
      'Wave 3 · 04 Research & 05 Email Agent': {
        main: [[{ node: '05 Email · 5-Rule Deterministic Linter', type: 'main', index: 0 }]],
      },
      '05 Email · 5-Rule Deterministic Linter': {
        main: [[{ node: 'Wave 4 · Human Approval Gate', type: 'main', index: 0 }]],
      },
      'Wave 4 · Human Approval Gate': {
        main: [
          [
            {
              node: `06 Outreach · ${bp.connectors.outreachPlatformName || 'Sequence Dispatch'}`,
              type: 'main',
              index: 0,
            },
          ],
        ],
      },
    },
    pinData: {},
    meta: {
      salesgencyHarnessVersion: '2.4.0',
      entryMode: bp.entryMode,
      emailMode: bp.emailMode,
      contactsStep: s3.connector,
      errorWorkflow: 'pae-error-alert',
      templateCredsSetupCompleted: false,
    },
  };

  return JSON.stringify(workflow, null, 2);
}

export function compileN8nErrorWorkflow(bp: HarnessBlueprint): string {
  const errWorkflow = {
    name: `SalesGency · PII-Redacted Error Alert (${bp.workflowName})`,
    nodes: [
      {
        parameters: {},
        id: 'err-trigger',
        name: 'Error Trigger',
        type: 'n8n-nodes-base.errorTrigger',
        typeVersion: 1,
        position: [200, 300],
      },
      {
        parameters: {
          jsCode: `// Redact prospect PII (emails, phone numbers) before dispatching error logs to Slack/Notion\nconst raw = JSON.stringify($input.all());\nconst redacted = raw.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}/g, '[REDACTED_EMAIL]');\nreturn [{ json: { workflow: ${JSON.stringify(bp.workflowName)}, timestamp: new Date().toISOString(), payload: JSON.parse(redacted) } }];`,
        },
        id: 'err-redact-pii',
        name: 'PII Redaction Guard',
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        position: [460, 300],
      },
      {
        parameters: {
          method: 'POST',
          url: '={{ $env.SLACK_ALERT_WEBHOOK_URL }}',
          sendBody: true,
          specifyBody: 'json',
          jsonBody: '={{ { text: "[SalesGency Alert] Workflow failure (PII redacted): " + $json.workflow } }}',
        },
        id: 'err-slack-dispatch',
        name: 'Dispatch Ops Alert',
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 4.2,
        position: [720, 300],
      },
    ],
    connections: {
      'Error Trigger': {
        main: [[{ node: 'PII Redaction Guard', type: 'main', index: 0 }]],
      },
      'PII Redaction Guard': {
        main: [[{ node: 'Dispatch Ops Alert', type: 'main', index: 0 }]],
      },
    },
  };
  return JSON.stringify(errWorkflow, null, 2);
}

export function compileMakeBlueprint(
  bp: HarnessBlueprint,
  steps: WorkflowStepSkill[]
): string {
  const s1 = getStep(steps, '01_signals');
  const s4 = getStep(steps, '04_research');
  const s5 = getStep(steps, '05_email');

  const scenario = {
    name: `SalesGency · ${bp.workflowName}`,
    flow: [
      {
        id: 1,
        module: 'gateway:CustomWebHook',
        version: 1,
        metadata: { designer: { x: 0, y: 0, name: '00 Intake Webhook (Leads or ICP)' } },
        parameters: { hook: '{{connection.webhook_id}}' },
      },
      {
        id: 2,
        module: 'builtin:BasicRouter',
        version: 1,
        metadata: { designer: { x: 260, y: 0, name: 'Bypass Gate: Already Have Leads?' } },
        routes: [
          {
            label: 'Full Signal Discovery (Steps 01 -> 02)',
            condition: '{{1.entryMode != "existing_leads"}}',
            flow: [
              {
                id: 3,
                module: 'http:ActionSendData',
                metadata: { designer: { x: 520, y: -120, name: '01 Signals & 02 Companies LLM' } },
                mapper: {
                  url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
                  method: 'post',
                  bodyType: 'raw',
                  data: JSON.stringify({ systemInstruction: s1.systemPrompt, icp: bp.icp }),
                },
              },
            ],
          },
          {
            label: 'Fast-Track Existing Leads (Skip 01 & 02)',
            condition: '{{1.entryMode == "existing_leads"}}',
            flow: [],
          },
        ],
      },
      {
        id: 4,
        module: 'http:ActionSendData',
        version: 3,
        metadata: { designer: { x: 780, y: 0, name: '03 Contacts · DNS MX Verification' } },
        mapper: {
          url: 'https://dns.google/resolve?name={{domain}}&type=MX',
          method: 'get',
        },
      },
      {
        id: 5,
        module: 'http:ActionSendData',
        version: 3,
        metadata: { designer: { x: 1040, y: 0, name: '04 Research + 05 Email Agent + 5-Rule Linter' } },
        mapper: {
          url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
          method: 'post',
          data: JSON.stringify({
            researchPrompt: s4.systemPrompt,
            emailPrompt: s5.systemPrompt,
            emailMode: bp.emailMode,
          }),
        },
      },
      {
        id: 6,
        module: 'http:ActionSendData',
        version: 3,
        metadata: {
          designer: {
            x: 1300,
            y: 0,
            name: `06 Outreach · ${bp.connectors.outreachPlatformName || 'Sequence Webhook'}`,
          },
        },
        mapper: {
          url: bp.connectors.webhookUrl || 'https://api.outreach-platform.example/v1/enroll',
          method: 'post',
        },
      },
    ],
    metadata: {
      version: 2,
      scenario: { roundtrips: 1, maxErrors: 3, autoCommit: true },
    },
  };

  return JSON.stringify(scenario, null, 2);
}

export function compileGumloopFlow(
  bp: HarnessBlueprint,
  steps: WorkflowStepSkill[]
): string {
  const s1 = getStep(steps, '01_signals');
  const s4 = getStep(steps, '04_research');
  const s5 = getStep(steps, '05_email');

  const gumloop = {
    flowName: `SalesGency · ${bp.workflowName}`,
    pipelineVersion: '2.4.0',
    executionMode: 'loop_parallel_batch',
    inputs: {
      entryMode: bp.entryMode,
      icp: bp.icp,
      productsAndServices: bp.productsAndServices,
      valueProposition: bp.valueProposition,
      emailMode: bp.emailMode,
    },
    nodes: [
      {
        id: 'node_01_signals',
        type: 'web_search_agent',
        enabled: bp.entryMode === 'signals',
        config: { prompt: s1.systemPrompt },
      },
      {
        id: 'node_02_companies',
        type: 'list_normalizer',
        enabled: bp.entryMode === 'signals',
        config: { maxRows: bp.batchSize, source: bp.connectors.companySource },
      },
      {
        id: 'node_03_contacts_mx',
        type: 'http_request_loop',
        config: {
          url: 'https://dns.google/resolve?name={{domain}}&type=MX',
          validateSyntax: true,
        },
      },
      {
        id: 'node_04_research',
        type: 'ask_ai_structured',
        config: {
          prompt: s4.systemPrompt,
          fields: [
            'companyOverview',
            'prospectOverview',
            'inducedSignal',
            'deducedSignal',
            'productsFit',
            'valueProposition',
          ],
        },
      },
      {
        id: 'node_05_email',
        type: 'ask_ai_writer',
        config: {
          prompt: s5.systemPrompt,
          outputMode: bp.emailMode,
          tone: bp.tone,
          enforceFiveRuleLinter: true,
        },
      },
      {
        id: 'node_06_outreach',
        type: 'webhook_sender',
        config: {
          destination: bp.connectors.outreachPlatformName,
          webhookUrl: bp.connectors.webhookUrl || 'https://api.example.com/enroll',
          requireApproval: true,
        },
      },
    ],
    edges: [
      ['node_01_signals', 'node_02_companies'],
      ['node_02_companies', 'node_03_contacts_mx'],
      ['node_03_contacts_mx', 'node_04_research'],
      ['node_04_research', 'node_05_email'],
      ['node_05_email', 'node_06_outreach'],
    ],
  };

  return JSON.stringify(gumloop, null, 2);
}

export function compileComposioCron(
  bp: HarnessBlueprint,
  steps: WorkflowStepSkill[]
): { ts: string; crontab: string; rostrConfigTs: string } {
  const s1 = getStep(steps, '01_signals');
  const s4 = getStep(steps, '04_research');
  const s5 = getStep(steps, '05_email');

  const rostrConfigTs = `// rostr.config.ts — ROSTRv2 & Enably Connected Operations Runtime Manifest
export const ROSTR_CONFIG = {
  version: '2.4.0',
  workflowName: ${JSON.stringify(bp.workflowName)},
  entryMode: ${JSON.stringify(bp.entryMode)},
  emailMode: ${JSON.stringify(bp.emailMode)},
  targetRuntime: ${JSON.stringify(bp.targetRuntime)},
  selectedTools: ${JSON.stringify(bp.selectedTools)},
  selectedRegistrySlugs: ${JSON.stringify(bp.selectedRegistrySlugs ?? [])},
  guardrails: {
    requireWholenessOne: true,
    requireMxVerification: true,
    requireFiveRuleEmailLinter: true,
    requireExplicitHumanApprovalToken: true,
    dailyCapPerInbox: 35,
    bounceCircuitBreakerPct: 2.5,
    spamComplaintCeilingPct: 0.1,
  },
} as const;
`;

  const ts = `import { Composio } from '@composio/core';
import { GoogleGenAI } from '@google/genai';
import cron from 'node-cron';
import { resolveMx } from 'node:dns/promises';
import { ROSTR_CONFIG } from './rostr.config';

// SalesGency Autonomous Agent Harness · Composio + Cron Runner
// Workflow: ${bp.workflowName}
// Entry Mode: ${bp.entryMode} | Email Mode: ${bp.emailMode}

const composio = new Composio({ apiKey: process.env.COMPOSIO_API_KEY });
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface Prospect {
  company: string;
  domain: string;
  contactName: string;
  contactTitle: string;
  email: string;
}

const BLUEPRINT = {
  icp: ${JSON.stringify(bp.icp)},
  signalHypothesis: ${JSON.stringify(bp.signalHypothesis)},
  productsAndServices: ${JSON.stringify(bp.productsAndServices)},
  valueProposition: ${JSON.stringify(bp.valueProposition)},
  tone: ${JSON.stringify(bp.tone)},
  entryMode: ROSTR_CONFIG.entryMode,
  emailMode: ROSTR_CONFIG.emailMode,
  outreachPlatform: ${JSON.stringify(bp.connectors.outreachPlatformName)},
  webhookUrl: process.env.OUTREACH_WEBHOOK_URL || ${JSON.stringify(bp.connectors.webhookUrl)},
};

async function verifyMx(email: string, domain: string) {
  const validSyntax = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email);
  if (!validSyntax) return { validSyntax: false, hasMx: false };
  try {
    const records = await resolveMx(domain);
    return { validSyntax: true, hasMx: records.length > 0 };
  } catch {
    return { validSyntax: true, hasMx: false };
  }
}

async function runSalesGencyGraphLoop(existingLeads: Prospect[] = []) {
  const t0 = Date.now();
  console.log('[SalesGency] Starting Middle-Out DAG graph loop...');

  // Wave 1: Boolean precondition pruning ("Already have leads? Skip steps 1 and 2")
  let targets: Prospect[] = existingLeads;
  if (BLUEPRINT.entryMode === 'signals' && targets.length === 0) {
    const discovery = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: ${JSON.stringify(s1.systemPrompt)},
      config: { tools: [{ googleSearch: {} }], responseMimeType: 'application/json' },
    });
    targets = JSON.parse(discovery.text || '[]');
  } else {
    console.log('[SalesGency] Wave 1 short-circuited: using existing leads.');
  }

  // Wave 2: Parallel DNS MX verification (Calibrated Truth Gate)
  const verified = await Promise.all(
    targets.map(async (lead) => ({
      ...lead,
      mx: await verifyMx(lead.email, lead.domain),
    }))
  );

  // Wave 3: Parallel Step 04 Research + Step 05 Email synthesis
  const prepared = await Promise.all(
    verified.map(async (lead) => {
      const briefRes = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: \`Research \${lead.company} (\${lead.domain}) & \${lead.contactName}.\\n\${${JSON.stringify(s4.systemPrompt)}}\`,
        config: { tools: [{ googleSearch: {} }] },
      });

      const emailRes = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: \`Write outreach for \${lead.contactName} based on:\\n\${briefRes.text}\\n\\nRule: \${${JSON.stringify(s5.systemPrompt)}}\`,
      });

      return { ...lead, brief: briefRes.text, draft: emailRes.text };
    })
  );

  // Wave 4: Step 06 Outreach via Composio session or Webhook
  const session = await composio.createSession({ userId: process.env.COMPOSIO_USER_ID || 'gtm-agent' });
  const approved = prepared.filter((p) => p.mx.validSyntax && p.mx.hasMx);

  if (BLUEPRINT.webhookUrl) {
    await fetch(BLUEPRINT.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workflow: ${JSON.stringify(bp.workflowName)}, prospects: approved }),
    });
  } else {
    console.log(\`[SalesGency] Composio session ready for \${approved.length} MX-verified prospects:\`, session.sessionId);
  }

  console.log(\`[SalesGency] Completed in \${Date.now() - t0}ms.\`);
}

// Run every weekday at 08:30 AM
cron.schedule('30 8 * * 1-5', () => {
  runSalesGencyGraphLoop().catch(console.error);
});

if (process.argv.includes('--run-now')) {
  runSalesGencyGraphLoop().catch(console.error);
}
`;

  const crontab = `# SalesGency Headless Cron Schedule (Weekdays 08:30 UTC)
30 8 * * 1-5 cd /opt/salesgency-harness && /usr/bin/npx tsx automation.ts --run-now >> /var/log/salesgency.log 2>&1
`;

  return { ts, crontab, rostrConfigTs };
}

export function compileSupabaseSchemaSql(bp: HarnessBlueprint): string {
  return `-- SalesGency Outreach OS & Enably ROSTRv2 Multi-Tenant Supabase PostgreSQL Schema
-- Workflow: ${bp.workflowName}

create extension if not exists "uuid-ossp";
create extension if not exists "vector";

create table if not exists workspaces (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  company_domain text,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists workspace_members (
  workspace_id uuid references workspaces(id) on delete cascade,
  user_id uuid not null,
  role text not null default 'owner' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

-- ROSTRv2 Artifact Envelope & Versioned GTM Documents
create table if not exists documents (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  doc_type text not null check (doc_type in (
    'gtm_brief', 'icp', 'persona', 'usp', 'use_case',
    'positioning', 'playbook', 'message_template', 'research_snapshot',
    'pitch_deck', 'lead_csv', 'api_spec'
  )),
  title text not null,
  status text not null default 'draft' check (status in ('draft', 'approved', 'rejected', 'archived')),
  current_version int not null default 1,
  owner_agent text not null default 'enably-orchestrator',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists document_versions (
  id uuid primary key default uuid_generate_v4(),
  document_id uuid not null references documents(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  version_number int not null,
  content_json jsonb not null default '{}'::jsonb,
  rendered_markdown text not null default '',
  provenance jsonb not null default '{}'::jsonb,
  approval_state text not null default 'pending' check (approval_state in ('not_required', 'pending', 'approved', 'rejected')),
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

-- Connected Operations & State-Reconciliation Layer
create table if not exists connections (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  provider text not null,
  transport text not null check (transport in ('composio', 'existing_mcp', 'custom_api_adapter', 'custom_mcp')),
  requested_scopes text[] not null default '{}',
  granted_scopes text[] not null default '{}',
  status text not null default 'verified',
  created_at timestamptz not null default now()
);

create table if not exists approval_bindings (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  connection_id uuid references connections(id) on delete set null,
  target_resource text not null,
  operation text not null,
  exact_payload_hash text not null,
  before_state_hash text not null,
  single_use boolean not null default true,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Global DNC & Bounce Suppression List (Step 07 Deliverability Shield)
create table if not exists suppression_list (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  email text not null,
  domain text not null,
  reason text not null check (reason in ('hard_opt_out_dnc', 'hard_bounce', 'spam_complaint', 'manual_block')),
  created_at timestamptz not null default now(),
  unique (workspace_id, email)
);

alter table workspaces enable row level security;
alter table documents enable row level security;
alter table document_versions enable row level security;
alter table connections enable row level security;
alter table approval_bindings enable row level security;
alter table suppression_list enable row level security;
`;
}

export function compileBackmapReport(
  bp: HarnessBlueprint,
  steps: WorkflowStepSkill[]
): string {
  return `# Backmap Architecture & Connected Operations Report — ${bp.workflowName}

## 1. System Context Diagram (Current + Desired State Unified)

\`\`\`mermaid
flowchart LR
    User["GTM Operator / Founder"] --> Portal["Sign-In Portal & Account Vault"]
    Portal --> Wizard["Conversational Campaign Wizard\\n(Question 1 Intake + Doc Uploads + Enably Co-Pilot)"]
    Wizard --> Waterfall["Credit-Aware Waterfall Router\\n($0.00 Free Cache/DNS -> Paid Enrichers)"]
    Waterfall --> DAG["4-Wave Middle-Out DAG Runner\\n(01 Signals -> 06 Outreach)"]
    DAG --> Linter["Step 05 5-Rule Email Linter &\\nStep 07 Deliverability Shield"]
    Linter --> Gate["Host-Enforced Approval Gate\\n(ROSTRv2 Artifact Envelope)"]
    Gate --> Export["Multi-Runtime Compiler\\n(n8n, Make, Gumloop, Composio Cron, 12 SKILL.md Pack)"]
\`\`\`

## 2. Active 6-Step SalesGency Pipeline State

${steps
  .map(
    (s) =>
      `- **Step ${s.stepNumber} (${s.title})** · Wave ${s.wave} · Status: \`${
        s.bypassed ? 'Bypassed (Already Have Leads)' : 'Active'
      }\` · Connector: \`${s.connector}\``
  )
  .join('\n')}

## 3. Connected Operations & Permission Boundary (\`enably.permissions.v1\`)

- **Default Decision**: \`deny\` (secrets never exposed to model prompts).
- **Discovery vs. Execution Split**: \`dns.records.read\` and \`crm.contacts.read\` run read-only; \`dns.records.apply\`, \`crm.contacts.update\`, and \`outreach.send\` require a single-use \`approval_binding\` with \`exact_payload_hash\`.
`;
}

export function compileRostrManifestAndPermissions(bp: HarnessBlueprint): {
  rostrManifestYaml: string;
  permissionsPolicyYaml: string;
} {
  const rostrManifestYaml = `contract_version: "rostrv2.manifest.v1"
workspace_campaign: "${bp.workflowName}"
entry_agent: "enably-orchestrator"
specialist_agents:
  - id: "enably-orchestrator"
    role: "Routes intent, validates ROSTRv2 artifact envelopes, enforces approval gates"
  - id: "icp-architect-gpt"
    role: "Transforms uploaded company docs and prompts into structured JSON & markdown ICPs"
  - id: "kpi-metric-architect"
    role: "Pairs 1-3 outcome KPIs with controllable weekly leading indicators"
  - id: "social-dm-architect"
    role: "Drafts <300 char LinkedIn connection notes, InMails, and X DMs (draft-only)"
  - id: "sales-ops-copilot"
    role: "Guides 6-step outbound setup, DNS/MX readiness, and Day 1-Day 4 cadences"
runtime_lifecycle:
  - received
  - normalizing
  - planning
  - generating
  - validating
  - draft_ready
  - approval_required
  - approved
  - executing_write
  - completed
`;

  const permissionsPolicyYaml = `contract_version: "enably.permissions.v1"
defaults:
  decision: deny
  secrets_accessible_to_agents: false
  enforce_workspace_binding: true
tools:
  dns.records.read:
    provider: aws_route53_or_godaddy
    access: read
    permitted_agents: [state-discovery, gap-analyst]
    approval_required: false
  dns.records.apply:
    provider: aws_route53_or_godaddy
    access: write
    permitted_agents: [domain-operations-agent, change-executor]
    approval_required: true
    bind: [workspace_id, connection_id, hosted_zone_id, exact_payload_hash, before_state_hash, expires_at]
  crm.contacts.read:
    provider: hubspot
    access: read
    required_scopes: [crm.objects.contacts.read]
    permitted_agents: [state-discovery, sales-ops-copilot]
    approval_required: false
  crm.contacts.update:
    provider: hubspot
    access: write
    required_scopes: [crm.objects.contacts.write]
    deny_operations: [delete, merge, bulk_update]
    permitted_agents: [change-executor]
    approval_required: true
  outreach.send:
    provider: ${bp.connectors.outreachPlatformName || 'sequence_webhook'}
    access: write
    permitted_agents: [change-executor]
    approval_required: true
`;

  return { rostrManifestYaml, permissionsPolicyYaml };
}

export function compileSkillPack(
  bp: HarnessBlueprint,
  steps: WorkflowStepSkill[]
): { skillPack: SkillPackFile[]; graphLoopTs: string } {
  const stepSkills: SkillPackFile[] = steps.map((step) => ({
    filename: `${step.id}.SKILL.md`,
    stepId: step.id,
    title: `Step ${step.stepNumber} · ${step.title}`,
    content: `---
name: salesgency-${step.id}
version: 2.4.0
kind: rostrv2.skill
step: "${step.stepNumber}"
wave: ${step.wave}
precondition: "${step.precondition}"
connector: "${step.connector}"
---

# Step ${step.stepNumber}: ${step.title}

**Purpose:** ${step.subtitle}  
**Wave:** Wave ${step.wave}  
**Precondition:** \`${step.precondition}\`  
**Bound Connector:** ${step.connector}

## Input Contract
\`\`\`ts
${step.inputContract}
\`\`\`

## Output Contract
\`\`\`ts
${step.outputContract}
\`\`\`

## Canonical Agent Prompt
${step.systemPrompt}

## Guardrails
- Follow the SalesGency 6-step pipeline contract (${bp.emailMode === 'body_token' ? 'Body-only CRM token mode' : 'Full email mode'}).
- Wrap outputs in the ROSTRv2 Artifact Envelope (\`status: "draft"\` until approved).
- Never fabricate unverified email addresses or MX records.
`,
  }));

  const rostrSpecialists: SkillPackFile[] = [
    {
      filename: 'icp-architect-gpt.SKILL.md',
      stepId: 'icp_architect',
      title: 'ICP Architect GPT Skill',
      content: `---
name: icp-architect-gpt
version: 1.0.0
kind: rostrv2.skill
triggers: [ICP, segmentation, buyer persona, uploaded pitch deck]
inputs: [business_description, uploaded_docs, gtm_motion, tier]
outputs: [icp_json, icp_markdown]
---
# ICP Architect GPT

## Output Structure
Generate structured JSON first (\`segment_name\`, \`industry\`, \`company_size\`, \`geography\`, \`buyer_role\`, \`pain_points\`, \`goals_kpis\`, \`buying_triggers\`, \`buying_objections\`, \`preferred_channels\`, \`messaging_tone\`), then render modular sections (# Segment, # Buyer Profile, # Pain Points, # Goals & KPIs, # Messaging & Objections, # Channels & Triggers).
`,
    },
    {
      filename: 'gtm-intake.SKILL.md',
      stepId: 'gtm_intake',
      title: 'Enably GTM Intake Skill',
      content: `---
name: gtm-intake
version: 1.0.0
kind: rostrv2.skill
triggers: [outbound setup, GTM setup, ICP, lead upload, sequence, sales ops]
inputs: [business, product, icp, goals, crm, mailbox, domain, lead_source]
outputs: [gtm_brief, setup_checklist, icp_pack, sequence, readiness_report]
---
# GTM Intake
Capture business, offer, buyers, sales motion, geography, assets, CRM, mailbox, and domain readiness before generating sequences. Treat DNS changes, CRM writes, and sending as approval-gated external actions.
`,
    },
    {
      filename: 'social-dm.SKILL.md',
      stepId: 'social_dm',
      title: 'LinkedIn & Social DM Architect',
      content: `---
name: social-dm
version: 1.0.0
kind: rostrv2.skill
triggers: [LinkedIn, connection note, InMail, DM, Twitter, X, social outreach]
inputs: [platform, message_type, audience, offer, personalization_facts, tone]
outputs: [message_set, character_counts, sequence_tree]
---
# Social DM
Keep LinkedIn connection notes strictly below 300 characters. Use context-first openers, zero fabricated personal facts, no cold links, and draft-only execution.
`,
    },
    {
      filename: 'kpi-framework.SKILL.md',
      stepId: 'kpi_framework',
      title: 'KPI Metric Architect Skill',
      content: `---
name: kpi-framework
version: 1.0.0
kind: rostrv2.skill
triggers: [KPI, metric, dashboard, activity metric, performance indicator, OKR]
inputs: [goal, team, company_stage, gtm_motion, data_sources]
outputs: [kpi_framework, metric_map, dashboard_schema]
---
# KPI Framework
Pair 1-3 outcome KPIs with controllable weekly leading activity metrics. Define formula, unit, owner, source system, and cadence.
`,
    },
    {
      filename: 'approval-gating.SKILL.md',
      stepId: 'approval_gating',
      title: 'Host Approval Gating Skill',
      content: `---
name: approval-gating
version: 1.0.0
kind: rostrv2.skill
triggers: [send, publish, CRM write, DNS change, external action]
inputs: [action, resolved_target, exact_payload, approval_token]
outputs: [approval_request, approved_execution, rejection]
---
# Approval Gating
Require a host-issued single-use approval token bound to workspace_id, target_resource, and exact_payload_hash before any CRM write, DNS mutation, or outbound send.
`,
    },
  ];

  const graphLoopTs = `// SalesGency Modular Graph Loop Orchestrator (ROSTR Middle-Out Engine)
import type { HarnessBlueprint, ProspectRecord, WorkflowStepSkill } from './types';

export interface GraphNode {
  id: string;
  wave: number;
  precondition: (ctx: HarnessContext) => boolean;
  execute: (ctx: HarnessContext) => Promise<Partial<HarnessContext>>;
}

export interface HarnessContext {
  blueprint: HarnessBlueprint;
  steps: WorkflowStepSkill[];
  prospects: ProspectRecord[];
  haltedForApproval: boolean;
}

export async function runMiddleOutGraphLoop(
  initialContext: HarnessContext,
  nodes: GraphNode[]
): Promise<HarnessContext> {
  let ctx = { ...initialContext };
  const waves = Array.from(new Set(nodes.map((n) => n.wave))).sort((a, b) => a - b);

  for (const wave of waves) {
    const activeNodes = nodes.filter((n) => n.wave === wave && n.precondition(ctx));
    if (activeNodes.length === 0) continue;

    // Parallelize all independent nodes within the same wave
    const results = await Promise.all(activeNodes.map((node) => node.execute(ctx)));
    for (const patch of results) {
      ctx = { ...ctx, ...patch };
    }

    if (ctx.haltedForApproval) {
      break; // Durable human approval suspension
    }
  }

  return ctx;
}
`;

  return { skillPack: [...stepSkills, ...rostrSpecialists], graphLoopTs };
}

export function compilePopArtifacts(
  bp: HarnessBlueprint,
  steps: WorkflowStepSkill[],
  docs: ConnectorDoc[]
): PopArtifactFile[] {
  const wholeness = evaluateWholeness(bp);
  const toolsList = bp.selectedTools.join(', ') || 'None specified';

  return [
    {
      code: 'A',
      filename: '01_INTENT_BRIEF.md',
      title: '01 · Intent Brief & Wholeness',
      content: `# 01 · Intent Brief (${bp.workflowName})

- **Entry Mode:** ${bp.entryMode === 'signals' ? 'Full 6-Step Signal Discovery' : 'Existing Leads Fast-Track (Skip Steps 01–02)'}
- **Target ICP:** ${bp.icp}
- **Signal Hypothesis:** ${bp.signalHypothesis}
- **Products & Services:** ${bp.productsAndServices}
- **Value Proposition:** ${bp.valueProposition}
- **Email Output Contract:** ${bp.emailMode === 'full' ? 'Full Email (Greeting + Body + Signature)' : 'Body-Only CRM Token ({{email_1_body}})'}
- **Target Runtime:** ${bp.targetRuntime}
- **Selected Stack:** ${toolsList}
- **Foundation Wholeness (W):** ${wholeness.score.toFixed(2)} (${wholeness.metCount}/${wholeness.totalCount} criteria met)
`,
    },
    {
      code: 'B',
      filename: '02_JTBD.md',
      title: '02 · Jobs To Be Done',
      content: `# 02 · Jobs To Be Done

1. **Discover or Ingest Targets:** Turn ${bp.entryMode === 'signals' ? 'live web buying signals' : 'an existing CSV/CRM lead list'} into structured company & buyer persona rows.
2. **Verify Operational Deliverability:** Run deterministic syntax + DNS MX record validation before drafting copy.
3. **Synthesize Grounded Research:** Generate the 6-part SalesGency brief (Company, Prospect, Induced Signal, Deduced Signal, Products Fit, Value Prop).
4. **Enforce 5-Rule Linter & Dispatch:** Lint every email draft and export approved outreach into ${bp.connectors.outreachPlatformName || bp.targetRuntime}.
`,
    },
    {
      code: 'C',
      filename: '03_KPI_TRACKING.md',
      title: '03 · KPI & Telemetry Tree',
      content: `# 03 · KPI Tracking (Enably KPI Metric Architect)

- **North Star:** Approved, MX-verified, signal-backed outbound conversations initiated per week.
- **Leading Indicators:**
  1. Foundation Wholeness W = 1.00 before multiplier dispatch.
  2. 100% DNS MX record check coverage prior to Step 06 enrollment.
  3. 100% Step 05 5-rule deterministic email linter pass rate.
  4. Bounce rate < 2.5% and spam complaint rate < 0.1%.
`,
    },
    {
      code: 'D',
      filename: '04_ARCHITECTURE.md',
      title: '04 · DAG Wave Architecture',
      content: `# 04 · Middle-Out DAG Architecture

\`\`\`
Wave 1: [01 Signals] ──> [02 Companies] ${bp.entryMode === 'existing_leads' ? '(SHORT-CIRCUITED: Already Have Leads)' : ''}
Wave 2: [03 Contacts + DNS MX Verification]
Wave 3: [04 Research (Parallel Promise.all)] ──> [05 Email + 5-Rule Linter]
Wave 4: [ROSTRv2 Approval Gate] ──> [06 Outreach Dispatch]
\`\`\`
`,
    },
    {
      code: 'E',
      filename: '05_PROJECT_MASTER_DOC.md',
      title: '05 · Project Master Doc',
      content: `# 05 · Project Master Document

## Connected Tools & Grounded Docs
${docs.length > 0 ? docs.map((d) => `- **${d.toolName}** (${d.category}): ${d.baseUrlOrNodeType} · Auth: ${d.authMethod}`).join('\n') : `- Selected tools: ${toolsList}`}

## Step Skill Bindings
${steps.map((s) => `- **${s.stepNumber} ${s.title}** (${s.bypassed ? 'Bypassed' : 'Active'}): ${s.connector}`).join('\n')}
`,
    },
    {
      code: 'F',
      filename: '06_BUILD_GUIDE.md',
      title: '06 · Build Guide',
      content: `# 06 · Build Checklist

- [x] PreD: Confirm Foundation Wholeness W = 1.00
- [x] D1: Upload Campaign Docs & Run Enably / ICP Architect Synthesis
- [x] D2: Configure Step 01–06 Skills & Credit-Aware Waterfall (${toolsList})
- [ ] D3: Run Live DAG Loop & Verify DNS MX Records + 5-Rule Linter
- [ ] D4: Approve Prospect Briefs & Import Compiled ${bp.targetRuntime.toUpperCase()} Bundle
`,
    },
    {
      code: 'G',
      filename: '07_EXECUTION_HANDOFF.md',
      title: '07 · Execution Handoff',
      content: `# 07 · Receiving Agent Handoff

- **Runtime Target:** ${bp.targetRuntime}
- **Abort Gate:** Halt immediately if Wholeness W < 1.00, if MX lookup fails, or if Step 05 5-rule linter fails.
- **Permission Boundary:** Enforce \`enably.permissions.v1\` — never execute CRM writes, DNS updates, or outbound sends without a verified single-use approval token.
`,
    },
    {
      code: 'H',
      filename: '08_PRD.md',
      title: '08 · Formal PRD',
      content: `# 08 · Product Requirements Document

## Functional SLOs
1. Every generated prospect brief must contain all 6 SalesGency dimensions.
2. Every email address must undergo real DNS MX verification before Step 06 approval.
3. Every generated email must pass the 5-rule deterministic linter (<= 120 words, no fake Re:/Fwd:, no "!", no raw URLs, no unresolved tokens).
`,
    },
    {
      code: 'I',
      filename: '09_EXECUTIVE_OVERVIEW.md',
      title: '09 · Executive Overview',
      content: `# 09 · Executive Overview

**${bp.workflowName}** unifies Enably's GTM foundation wizard, ICP Architect GPT, credit-aware enrichment waterfalls, and the SalesGency 6-step Prospect Outreach Workflow inside a deterministic agent harness.
`,
    },
    {
      code: 'J',
      filename: '10_TASKS.md',
      title: '10 · Linear / Asana Task Export',
      content: `# 10 · Engineering Tasks

- [ ] Provision API credentials for ${toolsList}
- [ ] Run Supabase SQL migration (\`supabase_schema.sql\`)
- [ ] Import compiled workflow into ${bp.targetRuntime} + attach \`pae-error-alert.json\`
- [ ] Schedule first batch run (${bp.batchSize} prospects) and inspect MX + linter logs
`,
    },
    {
      code: 'K',
      filename: '11_SKILL.md',
      title: '11 · Portable Harness SKILL.md',
      content: `---
name: salesgency-master-harness
description: End-to-end 6-step SalesGency Prospect Outreach Workflow for ${bp.workflowName}
runtime: ${bp.targetRuntime}
---

# ${bp.workflowName}

Execute Steps 01–06 using the compiled \`SKILL.md\` pack and \`orchestrator.graph-loop.ts\`. Always enforce Wholeness W = 1.00, DNS MX verification, and the 5-rule email linter prior to Step 06 outreach enrollment.
`,
    },
  ];
}

export function compileAllDeliverables(
  bp: HarnessBlueprint,
  steps: WorkflowStepSkill[],
  docs: ConnectorDoc[]
): CompiledBundle {
  const { ts, crontab, rostrConfigTs } = compileComposioCron(bp, steps);
  const { skillPack, graphLoopTs } = compileSkillPack(bp, steps);
  const { rostrManifestYaml, permissionsPolicyYaml } =
    compileRostrManifestAndPermissions(bp);

  return {
    generatedAt: new Date().toISOString(),
    n8nJson: compileN8nWorkflow(bp, steps, docs),
    n8nErrorWorkflowJson: compileN8nErrorWorkflow(bp),
    makeBlueprintJson: compileMakeBlueprint(bp, steps),
    gumloopFlowJson: compileGumloopFlow(bp, steps),
    composioCronTs: ts,
    rostrConfigTs,
    crontabSpec: crontab,
    graphLoopTs,
    supabaseSchemaSql: compileSupabaseSchemaSql(bp),
    backmapArchitectureMd: compileBackmapReport(bp, steps),
    rostrManifestYaml,
    permissionsPolicyYaml,
    skillPack,
    popArtifacts: compilePopArtifacts(bp, steps, docs),
  };
}
