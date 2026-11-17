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
  return (
    steps.find((s) => s.id === id) ??
    steps[0]
  );
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
          jsCode: `// ROSTR Calibrated Truth Operational Gate (Step 03 -> 04)\nconst emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}/;\nreturn items.map(item => {\n  const email = item.json.email || '';\n  const validSyntax = emailRegex.test(email);\n  const hasMx = Array.isArray(item.json.Answer) && item.json.Answer.length > 0;\n  return {\n    json: {\n      ...item.json,\n      mxVerified: validSyntax && hasMx,\n      truthNotice: (!validSyntax || !hasMx) ? 'Unverified operational email/MX — hold for human review' : null\n    }\n  };\n});`,
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
          resume: 'webhook',
          options: {},
        },
        id: 'sg-human-gate',
        name: 'Wave 4 · Human Approval Gate',
        type: 'n8n-nodes-base.wait',
        typeVersion: 1.1,
        position: [1720, 300],
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
              ? '={{ { email: $json.email, first_name: $json.firstName, company_name: $json.company, custom_fields: { email_1_body: $json.emailDraft.body, subject: $json.emailDraft.subject } } }}'
              : '={{ { email: $json.email, subject: $json.emailDraft.subject, body: $json.emailDraft.body, step6Route: "' +
                s6.connector +
                '" } }}',
          options: {},
        },
        id: 'sg-step6-outreach',
        name: `06 Outreach · ${bp.connectors.outreachPlatformName || 'Sequence Dispatch'}`,
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 4.2,
        position: [1980, 300],
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
        main: [[{ node: 'Wave 4 · Human Approval Gate', type: 'main', index: 0 }]],
      },
      'Wave 4 · Human Approval Gate': {
        main: [[{ node: `06 Outreach · ${bp.connectors.outreachPlatformName || 'Sequence Dispatch'}`, type: 'main', index: 0 }]],
      },
    },
    pinData: {},
    meta: {
      salesgencyHarnessVersion: '1.0.0',
      entryMode: bp.entryMode,
      emailMode: bp.emailMode,
      contactsStep: s3.connector,
      templateCredsSetupCompleted: false,
    },
  };

  return JSON.stringify(workflow, null, 2);
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
        metadata: { designer: { x: 1040, y: 0, name: '04 Research + 05 Email Agent' } },
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
      version: 1,
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
    pipelineVersion: '1.0.0',
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
): { ts: string; crontab: string } {
  const s1 = getStep(steps, '01_signals');
  const s4 = getStep(steps, '04_research');
  const s5 = getStep(steps, '05_email');

  const ts = `import { Composio } from '@composio/core';
import { GoogleGenAI, Type } from '@google/genai';
import cron from 'node-cron';
import { resolveMx } from 'node:dns/promises';

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
  entryMode: ${JSON.stringify(bp.entryMode)},
  emailMode: ${JSON.stringify(bp.emailMode)},
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
        contents: \`Write outreach for \${lead.contactName} based on:\\n\${briefRes.text}\\n\nRule: \${${JSON.stringify(s5.systemPrompt)}}\`,
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

  return { ts, crontab };
}

export function compileSkillPack(
  bp: HarnessBlueprint,
  steps: WorkflowStepSkill[]
): { skillPack: SkillPackFile[]; graphLoopTs: string } {
  const skillPack: SkillPackFile[] = steps.map((step) => ({
    filename: `${step.id}.SKILL.md`,
    stepId: step.id,
    title: `Step ${step.stepNumber} · ${step.title}`,
    content: `---
name: salesgency-${step.id}
description: ${step.subtitle}
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
- Never fabricate unverified email addresses or MX records.
`,
  }));

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

  return { skillPack, graphLoopTs };
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
- **Email Output Contract:** ${bp.emailMode === 'full' ? 'Full Email (Greeting + Body + Signature)' : 'Body-Only CRM Token'}
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
4. **Compile & Dispatch:** Export approved outreach into ${bp.connectors.outreachPlatformName || bp.targetRuntime} with zero manual reformatting.
`,
    },
    {
      code: 'C',
      filename: '03_KPI_TRACKING.md',
      title: '03 · KPI & Telemetry Tree',
      content: `# 03 · KPI Tracking

- **North Star:** Approved, MX-verified, signal-backed outbound conversations initiated per week.
- **Foundation Gate:** Wholeness W = 1.00 before multiplier dispatch.
- **Deliverability Gate:** 100% DNS MX record check coverage prior to Step 06 enrollment.
- **Output Mode:** ${bp.emailMode} · Target batch size: ${bp.batchSize} prospects/loop.
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
Wave 3: [04 Research (Parallel Promise.all)] ──> [05 Email + Calibrated Truth]
Wave 4: [Human Approval Gate] ──> [06 Outreach Dispatch]
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
- [x] D1: Configure Step 01–06 Skills & Connectors (${toolsList})
- [x] D2: Ground Tool Documentation (${docs.length} connector specs fetched)
- [ ] D3: Run Live DAG Loop & Verify DNS MX Records
- [ ] D4: Approve Prospect Briefs & Import Compiled ${bp.targetRuntime.toUpperCase()} Bundle
`,
    },
    {
      code: 'G',
      filename: '07_EXECUTION_HANDOFF.md',
      title: '07 · Execution Handoff',
      content: `# 07 · Receiving Agent Handoff

- **Runtime Target:** ${bp.targetRuntime}
- **Abort Gate:** Halt immediately if Wholeness W < 1.00 or if an unverified email fails DNS MX lookup without human override.
- **Creative vs. Operational Split:** Allow full tone freedom ("${bp.tone}") in Step 05 prose while strictly enforcing MX verification on Step 03 contact addresses.
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
3. All 5 automation export targets (n8n, Make, Gumloop, Composio+Cron, Skill Pack) remain synchronized with the active blueprint.
`,
    },
    {
      code: 'I',
      filename: '09_EXECUTIVE_OVERVIEW.md',
      title: '09 · Executive Overview',
      content: `# 09 · Executive Overview

**${bp.workflowName}** operationalizes the SalesGency 6-step Prospect Outreach Workflow inside a deterministic agent harness. Teams can run live signal-to-sequence experiments in the browser and immediately compile the verified pipeline into ${bp.targetRuntime} or modular SKILL.md agent packs.
`,
    },
    {
      code: 'J',
      filename: '10_TASKS.md',
      title: '10 · Linear / Asana Task Export',
      content: `# 10 · Engineering Tasks

- [ ] Provision API credentials for ${toolsList}
- [ ] Import compiled workflow into ${bp.targetRuntime}
- [ ] Bind webhook endpoint (${bp.connectors.webhookUrl || 'configure destination URL'})
- [ ] Schedule first batch run (${bp.batchSize} prospects) and inspect MX logs
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

Execute Steps 01–06 using the compiled \`SKILL.md\` pack and \`orchestrator.graph-loop.ts\`. Always enforce Wholeness W = 1.00 and DNS MX verification prior to Step 06 outreach enrollment.
`,
    },
  ];
}

export function compileAllDeliverables(
  bp: HarnessBlueprint,
  steps: WorkflowStepSkill[],
  docs: ConnectorDoc[]
): CompiledBundle {
  const { ts, crontab } = compileComposioCron(bp, steps);
  const { skillPack, graphLoopTs } = compileSkillPack(bp, steps);

  return {
    generatedAt: new Date().toISOString(),
    n8nJson: compileN8nWorkflow(bp, steps, docs),
    makeBlueprintJson: compileMakeBlueprint(bp, steps),
    gumloopFlowJson: compileGumloopFlow(bp, steps),
    composioCronTs: ts,
    crontabSpec: crontab,
    graphLoopTs,
    skillPack,
    popArtifacts: compilePopArtifacts(bp, steps, docs),
  };
}
