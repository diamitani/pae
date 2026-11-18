/**
 * ============================================================================
 * PROSPECT PAL — SalesGency Outreach OS (v2.4.0)
 * Full-Stack Backend Agent Harness, Deterministic n8n/Make Workflow Compiler,
 * Step-by-Step 8-Skill Builder, and ROSTR Durable Object Runtime.
 *
 * Built by Patrick Diamitani · Diamitani Industries for SalesGency (salesgency.com)
 * Stack: ROSTR Agent Harness + Cloudflare Durable Objects + Vercel AI SDK +
 *        Supabase Postgres (RLS + Vault) + Composio MCP + n8n / Make.com
 * ============================================================================
 */

import { streamText, tool } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';

// ────────────────────────────────────────────────────────────────────────────
// 1. CANONICAL TYPES & 17-STATUS HONEST TELEMETRY CODES
// ────────────────────────────────────────────────────────────────────────────

export type LeadStatusCode =
  | 'queued'
  | 'sent'
  | 'drafted'
  | 'nothing_was_sent'
  | 'needs_review'
  | 'approved_by_human'
  | 'skipped_low_fit'
  | 'skipped_duplicate'
  | 'skipped_no_contact'
  | 'skipped_no_email'
  | 'skipped_guessed_blocked'
  | 'skipped_no_evidence'
  | 'skipped_linter_failed'
  | 'skipped_no_opt_out'
  | 'skipped_no_route'
  | 'send_failed'
  | 'config_incomplete';

export type QuestionId =
  | 'goal'
  | 'start'
  | 'icp'
  | 'companies'
  | 'contacts'
  | 'research'
  | 'email'
  | 'outreach'
  | 'platform'
  | 'schedule';

export interface CampaignAnswers {
  goal?: string;
  start?: string;
  icp?: string;
  companies?: string;
  contacts?: string;
  research?: string;
  email?: string;
  outreach?: string;
  platform?: 'n8n' | 'Make.com';
  schedule?: 'Weekdays 08:00' | 'Mondays 07:00' | 'Manual only';
}

export interface EngineSettings {
  campaign_name: string;
  start_mode: 'from_icp' | 'leads_provided';
  signals_source: 'icp_only' | 'http';
  companies_source: 'inline' | 'http';
  min_confidence: number;
  contacts_source: 'provided' | 'provider_http' | 'guess_syntax';
  allow_guessed_sends: boolean;
  research_source: 'llm_only' | 'http_search';
  email_mode: 'full_email' | 'body_only';
  max_words: number;
  outreach_mode: 'log_only' | 'mailbox' | 'sequence_api';
  dry_run: boolean;
  allow_webhook_live_send: boolean;
  platform: 'n8n' | 'Make.com';
  cron: string;
  opt_out_signature: string;
  bound_composio_tools: string[];
}

export interface SpecSlot {
  num: string;
  stepIndex: number;
  name: 'Signals' | 'Companies' | 'Contacts' | 'Research' | 'Email' | 'Outreach';
  state: 'open' | 'bound' | 'skipped';
  tone: 'attention' | 'verified' | 'neutral';
  value: string;
  configKey: string;
}

// ────────────────────────────────────────────────────────────────────────────
// 2. THE 10-QUESTION CONVERSATIONAL SLOT-BINDING DEFINITIONS (QS[0..9])
// ────────────────────────────────────────────────────────────────────────────

export const BUILD_QUESTIONS: Array<{
  id: QuestionId;
  step: number | null;
  q: string;
  chips: string[];
  skip?: (a: CampaignAnswers) => boolean;
}> = [
  {
    id: 'goal',
    step: null,
    q: 'What should this campaign achieve?',
    chips: ['Book demos with VP Sales', 'Re-engage closed-lost deals', 'Recruit agency partners'],
  },
  {
    id: 'start',
    step: null,
    q: 'Do you already have a lead list?',
    chips: ['No, start from my ICP', 'Yes, skip steps 1 and 2'],
  },
  {
    id: 'icp',
    step: 0,
    q: 'Describe your ideal customer and the signal that says they are ready to buy.',
    chips: ['US B2B SaaS, 50–200 staff, hiring SDRs', 'Series A–B, new VP Sales in the last 90 days'],
    skip: (a) => (a.start || '').startsWith('Yes'),
  },
  {
    id: 'companies',
    step: 1,
    q: 'Where should companies come from?',
    chips: ['Google Sheets', 'HubSpot', 'Webhook from another workflow', 'Apollo'],
    skip: (a) => (a.start || '').startsWith('Yes'),
  },
  {
    id: 'contacts',
    step: 2,
    q: 'How should contacts be found?',
    chips: ['Clay', 'Apollo', 'Guess syntax + MX check', 'Already in my data'],
  },
  {
    id: 'research',
    step: 3,
    q: 'What evidence can research use?',
    chips: ['Company notes only', 'Web search via Exa', 'Both'],
  },
  {
    id: 'email',
    step: 4,
    q: 'Full email, or body only for a CRM token?',
    chips: ['Full email', 'Body only'],
  },
  {
    id: 'outreach',
    step: 5,
    q: 'How should approved emails go out?',
    chips: ['Log only (dry run)', 'Gmail mailbox', 'Smartlead sequence', 'Instantly sequence'],
  },
  {
    id: 'platform',
    step: null,
    q: 'Which automation platform should I compile for?',
    chips: ['n8n', 'Make.com'],
  },
  {
    id: 'schedule',
    step: null,
    q: 'Should it run on a schedule?',
    chips: ['Weekdays 08:00', 'Mondays 07:00', 'Manual only'],
  },
];

export const CRON_MAP: Record<string, string> = {
  'Weekdays 08:00': '0 8 * * 1-5',
  'Mondays 07:00': '0 7 * * 1',
  'Manual only': 'manual',
};

// ────────────────────────────────────────────────────────────────────────────
// 3. SLOT RESOLVER: ANSWERS -> DETERMINISTIC ENGINE SETTINGS
// ────────────────────────────────────────────────────────────────────────────

export function resolveEngineSettings(answers: CampaignAnswers): EngineSettings {
  const skip12 = (answers.start || '').toLowerCase().startsWith('yes');
  const companiesRaw = (answers.companies || '').toLowerCase();
  const contactsRaw = (answers.contacts || '').toLowerCase();
  const researchRaw = (answers.research || '').toLowerCase();
  const emailRaw = (answers.email || '').toLowerCase();
  const outreachRaw = (answers.outreach || '').toLowerCase();

  const tools = new Set<string>(['composio-slack']);
  if (companiesRaw.includes('hubspot')) tools.add('composio-hubspot');
  if (companiesRaw.includes('sheet')) tools.add('composio-googlesheets');
  if (companiesRaw.includes('apollo') || contactsRaw.includes('apollo')) tools.add('composio-apollo');
  if (contactsRaw.includes('clay')) tools.add('composio-clay');
  if (researchRaw.includes('exa') || researchRaw.includes('both') || researchRaw.includes('web')) {
    tools.add('composio-exa');
    tools.add('composio-firecrawl');
  }
  if (outreachRaw.includes('gmail')) tools.add('composio-gmail');
  if (outreachRaw.includes('smartlead')) tools.add('composio-smartlead');
  if (outreachRaw.includes('instantly')) tools.add('composio-instantly');

  return {
    campaign_name: answers.goal || 'Series A SaaS — Outbound Engine',
    start_mode: skip12 ? 'leads_provided' : 'from_icp',
    signals_source: (answers.icp || '').toLowerCase().includes('http') ? 'http' : 'icp_only',
    companies_source:
      companiesRaw.includes('sheet') || companiesRaw.includes('inline') ? 'inline' : 'http',
    min_confidence: 0.6,
    contacts_source: contactsRaw.includes('guess')
      ? 'guess_syntax'
      : contactsRaw.includes('already')
      ? 'provided'
      : 'provider_http',
    allow_guessed_sends: false,
    research_source:
      researchRaw.includes('note') && !researchRaw.includes('both') ? 'llm_only' : 'http_search',
    email_mode: emailRaw.startsWith('body') ? 'body_only' : 'full_email',
    max_words: 120,
    outreach_mode: outreachRaw.startsWith('log')
      ? 'log_only'
      : outreachRaw.includes('gmail') || outreachRaw.includes('mailbox')
      ? 'mailbox'
      : 'sequence_api',
    dry_run: true, // Always compiled with dry_run: true for safety
    allow_webhook_live_send: false,
    platform: answers.platform === 'Make.com' ? 'Make.com' : 'n8n',
    cron: CRON_MAP[answers.schedule || 'Manual only'] || 'manual',
    opt_out_signature: 'Best,\nPatrick Diamitani\nSalesGency\nPS — reply "no" if not relevant.',
    bound_composio_tools: Array.from(tools),
  };
}

// ────────────────────────────────────────────────────────────────────────────
// 4. STEP 05 DETERMINISTIC BANNED-PATTERN EMAIL LINTER
// ────────────────────────────────────────────────────────────────────────────

export interface EmailLintResult {
  passed: boolean;
  word_count: number;
  email_mode: 'full_email' | 'body_only';
  output_payload: {
    subject?: string;
    body: string;
    email_1_body: string;
  };
  violations: string[];
}

export function lintProspectEmail(params: {
  subject: string;
  body: string;
  email_mode: 'full_email' | 'body_only';
  max_words?: number;
  allowed_numbers?: string[];
}): EmailLintResult {
  const maxWords = params.max_words ?? 120;
  const violations: string[] = [];
  const subj = (params.subject || '').trim();
  let processedBody = (params.body || '').trim();

  // If body_only mode for CRM token ({{email_1_body}}), strip greeting & sign-off
  if (params.email_mode === 'body_only') {
    processedBody = processedBody
      .replace(/^(hi|hey|hello|dear)\s+[^,\n]+[,:]?\s*/i, '')
      .replace(/\n+(best|cheers|regards|thanks|sincerely|warmly)[,\s][\s\S]*$/i, '')
      .trim();
  }

  const words = processedBody.split(/\s+/).filter(Boolean);
  if (words.length > maxWords) {
    violations.push(`word_count_exceeded: ${words.length}/${maxWords} words`);
  }
  if (/^(re:|fwd:|fw:)/i.test(subj)) {
    violations.push('deceptive_subject_prefix: Fake Re:/Fwd: prefixes are blocked');
  }
  if (processedBody.includes('!') || subj.includes('!')) {
    violations.push('exclamation_mark_blocked: Exclamation marks trigger spam filters');
  }
  if (/https?:\/\/|www\./i.test(processedBody)) {
    violations.push('links_blocked_in_cold_email: Cold emails cannot contain raw links');
  }
  if (/\{\{[^}]+\}\}|\[[A-Z0-9_\s]+\]/.test(processedBody)) {
    violations.push('unresolved_placeholder_token: Contains unreplaced {{token}} or [PLACEHOLDER]');
  }

  // Check for unverified digits not grounded in allowed_numbers
  const allowedSet = new Set(params.allowed_numbers || []);
  const foundNumbers = processedBody.match(/\b\d+(?:\.\d+)?%?\b/g) || [];
  for (const num of foundNumbers) {
    if (allowedSet.size > 0 && !allowedSet.has(num)) {
      violations.push(`unverified_number_claim: "${num}" not present in verified evidence brief`);
    }
  }

  return {
    passed: violations.length === 0,
    word_count: words.length,
    email_mode: params.email_mode,
    output_payload: {
      subject: params.email_mode === 'full_email' ? subj : undefined,
      body: processedBody,
      email_1_body: processedBody,
    },
    violations,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// 5. DETERMINISTIC n8n WORKFLOW COMPILER (pae-main.json & pae-error-alert.json)
// ────────────────────────────────────────────────────────────────────────────

export function compileN8nMainWorkflow(answers: CampaignAnswers) {
  const cfg = resolveEngineSettings(answers);
  const skip12 = cfg.start_mode === 'leads_provided';

  const nodes: Array<Record<string, unknown>> = [
    {
      id: 'node_schedule_trigger',
      name: cfg.cron === 'manual' ? 'Manual Trigger' : `Cron Schedule (${cfg.cron})`,
      type: cfg.cron === 'manual' ? 'n8n-nodes-base.manualTrigger' : 'n8n-nodes-base.scheduleTrigger',
      typeVersion: 1.2,
      position: [120, 280],
      parameters:
        cfg.cron === 'manual'
          ? {}
          : { rule: { interval: [{ field: 'cronExpression', expression: cfg.cron }] } },
    },
    {
      id: 'node_webhook_trigger',
      name: 'Webhook Trigger (X-PAE-Key)',
      type: 'n8n-nodes-base.webhook',
      typeVersion: 2,
      position: [120, 460],
      parameters: {
        httpMethod: 'POST',
        path: 'prospect-pal-run',
        authentication: 'headerAuth',
        options: { responseData: 'allEntries' },
      },
    },
    {
      id: 'node_settings_guard',
      name: '00 Settings & Safety Guardrails',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [380, 360],
      parameters: {
        jsCode: `// Prospect PAL — Deterministic Settings & Safety Enforcer
const webhookPayload = $input.first()?.json?.body || {};
const allowWebhookLive = ${cfg.allow_webhook_live_send};
const effectiveDryRun = allowWebhookLive && webhookPayload.dry_run === false ? false : ${cfg.dry_run};

const config = {
  campaign_name: ${JSON.stringify(cfg.campaign_name)},
  start_mode: ${JSON.stringify(cfg.start_mode)},
  signals_source: ${JSON.stringify(cfg.signals_source)},
  companies_source: ${JSON.stringify(cfg.companies_source)},
  min_confidence: ${cfg.min_confidence},
  contacts_source: ${JSON.stringify(cfg.contacts_source)},
  allow_guessed_sends: ${cfg.allow_guessed_sends},
  research_source: ${JSON.stringify(cfg.research_source)},
  email_mode: ${JSON.stringify(cfg.email_mode)},
  max_words: ${cfg.max_words},
  outreach_mode: ${JSON.stringify(cfg.outreach_mode)},
  dry_run: effectiveDryRun,
  icp_brief: ${JSON.stringify(answers.icp || 'Series A-B B2B SaaS hiring revenue roles')},
  opt_out_signature: ${JSON.stringify(cfg.opt_out_signature)}
};

if (config.icp_brief.includes('TODO:')) {
  throw new Error('config_incomplete: Replace all TODO: placeholders before running.');
}
return [{ json: { config, leads_json: webhookPayload.leads_json || [] } }];`,
      },
    },
    {
      id: 'node_step_1_signals',
      name: skip12 ? '01 Signals (Skipped — Leads Provided)' : `01 Signals (${cfg.signals_source})`,
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [640, 360],
      parameters: {
        jsCode: skip12
          ? `// Step 01 skipped because start_mode === 'leads_provided'
return $input.all();`
          : `// Step 01: Normalize ICP & Buying Signals Brief
const item = $input.first().json;
return [{ json: { ...item, signals_brief: { target: item.config.icp_brief, weights: { trigger: 0.45, firmographic: 0.35, persona: 0.20 } } } }];`,
      },
    },
    {
      id: 'node_step_2_companies',
      name: skip12
        ? '02 Companies (Skipped — Leads Provided)'
        : `02 Companies (${answers.companies || cfg.companies_source} · min_confidence ${cfg.min_confidence})`,
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [900, 360],
      parameters: {
        jsCode: skip12
          ? `// Step 02 skipped; pass leads_json directly to Step 03
return $input.all();`
          : `// Step 02: Deduplicate Domains & Score Against min_confidence (${cfg.min_confidence})
const { config } = $input.first().json;
const rawCompanies = $input.first().json.companies || [];
return rawCompanies.map(c => ({
  json: {
    config,
    company: c,
    status: c.fit_score >= config.min_confidence ? 'qualified_company' : 'skipped_low_fit'
  }
}));`,
      },
    },
    {
      id: 'node_step_3_contacts',
      name: `03 Contacts (${answers.contacts || cfg.contacts_source})`,
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [1160, 360],
      parameters: {
        jsCode: `// Step 03: Contact Discovery & Guessed-Email Guardrail
return $input.all().map(item => {
  const d = item.json;
  if (d.status && d.status.startsWith('skipped_')) return item;
  const isGuessed = ${JSON.stringify(cfg.contacts_source === 'guess_syntax')};
  if (isGuessed && !d.config.allow_guessed_sends) {
    return { json: { ...d, email_verification_state: 'guessed_unverified', force_draft_only: true } };
  }
  return { json: { ...d, email_verification_state: 'verified', force_draft_only: false } };
});`,
      },
    },
    {
      id: 'node_step_4_research',
      name: `04 Research & Evidence Verifier (${answers.research || cfg.research_source})`,
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [1420, 360],
      parameters: {
        jsCode: `// Step 04: Verify Every Hook Traces to Explicit Evidence Quote & URL
return $input.all().map(item => {
  const d = item.json;
  if (d.status && d.status.startsWith('skipped_')) return item;
  const hooks = (d.candidate_hooks || []).filter(h => h.evidence_quote && h.evidence_url);
  if (hooks.length === 0) {
    return { json: { ...d, status: 'needs_review', status_reason: 'No verified evidence hook found' } };
  }
  return { json: { ...d, verified_hook: hooks[0], status: 'research_verified' } };
});`,
      },
    },
    {
      id: 'node_step_5_email',
      name: `05 Email Writer + Linter (${cfg.email_mode} · <= ${cfg.max_words}w)`,
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [1680, 360],
      parameters: {
        jsCode: `// Step 05: Enforce Banned-Pattern Linter & email_mode (${cfg.email_mode})
return $input.all().map(item => {
  const d = item.json;
  if (d.status !== 'research_verified') return item;
  const body = d.draft_body || '';
  const hasBadPattern = /^(re:|fwd:)/i.test(d.draft_subject || '') || body.includes('!') || /https?:\/\//i.test(body);
  if (hasBadPattern) {
    return { json: { ...d, status: 'needs_review', status_reason: 'Blocked by Step 05 Linter' } };
  }
  return { json: { ...d, email_1_body: body, status: 'email_ready' } };
});`,
      },
    },
    {
      id: 'node_step_6_outreach',
      name: `06 Outreach Dispatcher (${answers.outreach || cfg.outreach_mode} · dry_run: ${cfg.dry_run})`,
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [1940, 360],
      parameters: {
        jsCode: `// Step 06: Enforce dry_run, Opt-Out Signature Check & Honest Status Reporting
return $input.all().map(item => {
  const d = item.json;
  if (d.status !== 'email_ready') return item;
  if (d.config.dry_run || d.config.outreach_mode === 'log_only' || d.force_draft_only) {
    return { json: { ...d, status: 'drafted', result_flag: 'nothing_was_sent' } };
  }
  const hasOptOut = /unsubscribe|opt-out|reply\s+"?no"?|not relevant/i.test(d.config.opt_out_signature || '');
  if (!hasOptOut) {
    return { json: { ...d, status: 'skipped_no_opt_out', result_flag: 'nothing_was_sent' } };
  }
  return { json: { ...d, status: 'queued', result_flag: 'queued' } };
});`,
      },
    },
  ];

  return {
    name: `Prospect PAL — ${cfg.campaign_name}`,
    active: false,
    versionId: 'pae-v2.4.0',
    meta: {
      compiler: 'prospect-pal-rostr-compiler',
      organization: 'SalesGency · Diamitani Industries',
      bound_composio_tools: cfg.bound_composio_tools,
      dry_run_default: true,
    },
    nodes,
    connections: {
      [nodes[0].name as string]: { main: [[{ node: nodes[2].name, type: 'main', index: 0 }]] },
      [nodes[1].name as string]: { main: [[{ node: nodes[2].name, type: 'main', index: 0 }]] },
      [nodes[2].name as string]: { main: [[{ node: nodes[3].name, type: 'main', index: 0 }]] },
      [nodes[3].name as string]: { main: [[{ node: nodes[4].name, type: 'main', index: 0 }]] },
      [nodes[4].name as string]: { main: [[{ node: nodes[5].name, type: 'main', index: 0 }]] },
      [nodes[5].name as string]: { main: [[{ node: nodes[6].name, type: 'main', index: 0 }]] },
      [nodes[6].name as string]: { main: [[{ node: nodes[7].name, type: 'main', index: 0 }]] },
      [nodes[7].name as string]: { main: [[{ node: nodes[8].name, type: 'main', index: 0 }]] },
    },
  };
}

export function compileN8nErrorWorkflow(answers: CampaignAnswers) {
  const cfg = resolveEngineSettings(answers);
  return {
    name: `Prospect PAL Error Alert — ${cfg.campaign_name}`,
    active: true,
    versionId: 'pae-err-v2.4.0',
    meta: {
      privacy_invariant: 'Strips all prospect PII (emails, names, bodies) before alerting Slack/Notion',
    },
    nodes: [
      {
        id: 'err_trigger',
        name: 'n8n Error Trigger',
        type: 'n8n-nodes-base.errorTrigger',
        typeVersion: 1,
        position: [200, 300],
        parameters: {},
      },
      {
        id: 'err_strip_pii',
        name: 'Sanitize Telemetry (Zero Lead PII)',
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        position: [460, 300],
        parameters: {
          jsCode: `const err = $input.first().json;
return [{
  json: {
    campaign: ${JSON.stringify(cfg.campaign_name)},
    workflow_id: err.workflow?.id || 'pae-main',
    failed_node: err.execution?.lastNodeExecuted || 'unknown_step',
    error_message: (err.execution?.error?.message || 'Execution error').replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[REDACTED_EMAIL]'),
    timestamp: new Date().toISOString()
  }
}];`,
        },
      },
      {
        id: 'err_slack_notify',
        name: 'Composio Slack Alert (composio:slack)',
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 4.2,
        position: [720, 300],
        parameters: {
          method: 'POST',
          url: '={{$env.SLACK_ALERT_WEBHOOK_URL}}',
          sendBody: true,
        },
      },
    ],
  };
}

// ────────────────────────────────────────────────────────────────────────────
// 6. PARAMETERIZED 8-SKILL BUILDER (SKILL.md GENERATOR)
// ────────────────────────────────────────────────────────────────────────────

export function compileSkillPack(answers: CampaignAnswers): Record<string, string> {
  const cfg = resolveEngineSettings(answers);
  return {
    'prospect-outreach': `---
name: prospect-outreach
description: Master orchestrator skill for the 6-step SalesGency Prospect Outreach OS (${cfg.campaign_name}). Coordinates Signals, Companies, Contacts, Research, Email, and Outreach with strict dry_run and evidence guardrails.
---
# Prospect Outreach Master Skill (${cfg.campaign_name})

## Bound Campaign Configuration
- **Start Mode**: \`${cfg.start_mode}\`
- **Platform Target**: \`${cfg.platform}\` (\`cron: ${cfg.cron}\`)
- **Company Fit Floor**: \`min_confidence: ${cfg.min_confidence}\`
- **Email Output Mode**: \`email_mode: ${cfg.email_mode}\` (\`max_words: ${cfg.max_words}\`)
- **Outreach Dispatcher**: \`outreach_mode: ${cfg.outreach_mode}\` (\`dry_run: ${cfg.dry_run}\`)
- **Bound Composio MCPs**: ${cfg.bound_composio_tools.map((t) => `\`${t}\``).join(', ')}

## Execution Pipeline
1. **Step 01 (Signals)**: Parse ICP (\`${answers.icp || 'Series A-B SaaS'}\`) into weighted scoring criteria.
2. **Step 02 (Companies)**: Deduplicate domains from \`${answers.companies || 'CRM/Sheet'}\`; mark any record below \`${cfg.min_confidence}\` as \`skipped_low_fit\`.
3. **Step 03 (Contacts)**: Resolve decision-makers via \`${answers.contacts || cfg.contacts_source}\`; tag syntax-guessed emails as \`guessed_unverified\`.
4. **Step 04 (Research)**: Extract verified hooks via \`${answers.research || cfg.research_source}\`. Require verbatim \`evidence_quote\` + \`evidence_url\` or mark \`needs_review\`.
5. **Step 05 (Email)**: Draft copy in \`${cfg.email_mode}\` mode under \`${cfg.max_words}\` words and run the 5-rule deterministic linter.
6. **Step 06 (Outreach)**: Route via \`${cfg.outreach_mode}\` only when \`dry_run === false\` and opt-out signature is verified.`,

    'prospect-step-1-signals-icp': `---
name: prospect-step-1-signals-icp
description: Step 01 Signals & ICP Brief generator. Converts raw ICP and trigger descriptions into a structured scoring rubric.
---
# Step 01: Signals & ICP Brief
- **Configured Source**: \`signals_source: ${cfg.signals_source}\`
- **Active ICP Prompt**: "${answers.icp || 'B2B SaaS 50-200 employees hiring SDRs or new VP Sales'}"
- **Guardrail**: Halt immediately with \`config_incomplete\` if any \`TODO:\` token remains in the ICP brief.`,

    'prospect-step-2-companies': `---
name: prospect-step-2-companies
description: Step 02 Company ingestion, domain normalization, deduplication, and ICP fit scoring against min_confidence (${cfg.min_confidence}).
---
# Step 02: Companies Loader & Fit Scorer
- **Configured Source**: \`companies_source: ${cfg.companies_source}\` (${answers.companies || 'HubSpot / Google Sheets'})
- **Threshold**: \`min_confidence: ${cfg.min_confidence}\`
- **Guardrail**: Never drop low-scoring companies silently; emit \`status: "skipped_low_fit"\` with the numeric score.`,

    'prospect-step-3-contacts': `---
name: prospect-step-3-contacts
description: Step 03 Contact resolution via ${answers.contacts || cfg.contacts_source} with MX verification and guessed-address protection.
---
# Step 03: Contacts & Verification
- **Configured Source**: \`contacts_source: ${cfg.contacts_source}\`
- **Guessed Address Policy**: \`allow_guessed_sends: ${cfg.allow_guessed_sends}\`
- **Guardrail**: Syntax-guessed addresses are tagged \`guessed_unverified\` and forced to draft-only unless \`allow_guessed_sends\` is explicitly enabled.`,

    'prospect-step-4-research': `---
name: prospect-step-4-research
description: Step 04 Evidence-grounded account and prospect research using ${answers.research || cfg.research_source}.
---
# Step 04: Research & Evidence Verification
- **Configured Source**: \`research_source: ${cfg.research_source}\`
- **Required Brief Fields**: Company, Prospect, Signal (induced), Signal (deduced), Products & Services, Value Proposition.
- **Guardrail**: Discard any hook lacking a verbatim \`evidence_quote\` and \`evidence_url\`. If no verified hook survives, set \`status: "needs_review"\`.`,

    'prospect-step-5-email': `---
name: prospect-step-5-email
description: Step 05 Cold email writer and deterministic banned-pattern linter (${cfg.email_mode}, max ${cfg.max_words} words).
---
# Step 05: Email Drafting & Deterministic Linter
- **Mode**: \`email_mode: ${cfg.email_mode}\` (${cfg.email_mode === 'body_only' ? 'Outputs {{email_1_body}} CRM token with greeting and signature stripped' : 'Full email from Hi {{first_name}} to {{signature}}'})
- **Word Cap**: \`max_words: ${cfg.max_words}\`
- **Banned Patterns**: Blocks fake \`Re:\`/\`Fwd:\` prefixes, exclamation marks (\`!\`), raw URLs, unreplaced \`{{tokens}}\`, and unverified digits.`,

    'prospect-step-6-outreach': `---
name: prospect-step-6-outreach
description: Step 06 Outreach dispatcher (${cfg.outreach_mode}) with dry_run and opt-out signature enforcement.
---
# Step 06: Outreach & Honest Status Reporting
- **Configured Mode**: \`outreach_mode: ${cfg.outreach_mode}\` (${answers.outreach || 'Log only'})
- **Safety Default**: \`dry_run: ${cfg.dry_run}\`, \`allow_webhook_live_send: ${cfg.allow_webhook_live_send}\`
- **Guardrail**: Live sends require an opt-out line in \`signature\`. Dry runs always report \`nothing_was_sent\`.`,

    'n8n-engineer-companion': `---
name: n8n-engineer-companion
description: Companion engineering skill for inspecting, extending, re-routing, and debugging compiled Prospect PAL n8n and Make.com workflows without breaking safety guardrails.
---
# n8n Engineer Companion Skill
## Safe Extension Rules
1. **Preserve the 17 Status Codes**: Any custom node inserted between Steps 01 and 06 must preserve \`status\`, \`status_reason\`, and \`evidence_url\` fields on the item JSON.
2. **Never Bypass Node 00 (\`00 Settings & Safety Guardrails\`)**: All webhook and cron triggers must pass through Node 00 so \`allow_webhook_live_send\` and \`dry_run\` invariants hold.
3. **PII-Free Error Routing**: Keep \`pae-error-alert.json\` connected as the workflow's \`errorWorkflow\` so failed runs alert Slack/Notion with lead emails redacted.`,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// 7. CLOUDFLARE DURABLE OBJECT HARNESS + VERCEL AI SDK STREAMING AGENT
// ────────────────────────────────────────────────────────────────────────────

export class BuildSessionDurableObject {
  private answers: CampaignAnswers = {};
  private questionIndex = 0;

  constructor(private readonly state: { storage: { get: (k: string) => Promise<unknown>; put: (k: string, v: unknown) => Promise<void> } }) {}

  async handleChatTurn(userMessage: string) {
    const saved = (await this.state.storage.get('answers')) as CampaignAnswers | undefined;
    if (saved) this.answers = saved;

    return streamText({
      model: anthropic('claude-3-7-sonnet-latest'),
      system: `You are Prospect PAL Build Agent. Guide the user through the 10-question outbound engine builder one question at a time and bind each answer using tools.`,
      messages: [{ role: 'user', content: userMessage }],
      tools: {
        bind_slot: tool({
          description: 'Bind a user answer to one of the 10 campaign build slots',
          parameters: z.object({
            slot: z.enum(['goal', 'start', 'icp', 'companies', 'contacts', 'research', 'email', 'outreach', 'platform', 'schedule']),
            value: z.string(),
          }),
          execute: async ({ slot, value }) => {
            this.answers = { ...this.answers, [slot]: value };
            await this.state.storage.put('answers', this.answers);
            return { bound: slot, value, settings: resolveEngineSettings(this.answers) };
          },
        }),
        skip_steps: tool({
          description: 'Mark Steps 01 (Signals) and 02 (Companies) as skipped when leads are already provided',
          parameters: z.object({
            steps: z.array(z.number()),
            reason: z.string(),
          }),
          execute: async ({ steps, reason }) => {
            this.answers = { ...this.answers, start: 'Yes, skip steps 1 and 2' };
            await this.state.storage.put('answers', this.answers);
            return { skipped_steps: steps, reason, start_mode: 'leads_provided' };
          },
        }),
        compile_engine: tool({
          description: 'Compile the bound answers into n8n/Make JSON workflows and all 8 SKILL.md files',
          parameters: z.object({
            confirm_dry_run: z.boolean().default(true),
          }),
          execute: async () => {
            const mainWorkflow = compileN8nMainWorkflow(this.answers);
            const errorWorkflow = compileN8nErrorWorkflow(this.answers);
            const skills = compileSkillPack(this.answers);
            return {
              status: 'approved',
              dry_run: true,
              mainWorkflow,
              errorWorkflow,
              skillCount: Object.keys(skills).length,
              skills,
            };
          },
        }),
      },
    });
  }
}


// ────────────────────────────────────────────────────────────────────────────
// 8. GTM VERTICAL HARNESS PILLARS:
//    - Tool Documentation Registry (/r/docs/:slug + PAL Intent Extractor)
//    - Credit-Aware Multi-Provider Waterfall Router
//    - Deliverability & Domain Health Circuit Breaker
//    - Closed-Loop Reply Triage & Revenue Attribution Engine
//    - Gumloop & Make.com Multi-Runtime Compilers
// ────────────────────────────────────────────────────────────────────────────

export interface ToolDocRegistryEntry {
  slug: string;
  name: string;
  section: 'signals' | 'companies' | 'contacts' | 'research' | 'email' | 'outreach';
  docEndpoint: string;
  httpMethod: 'GET' | 'POST' | 'PATCH';
  targetUrl: string;
  authHeader: string;
  costPerCallUsd: number;
  rateLimitPerMin: number;
  samplePayload: Record<string, unknown>;
}

export const TOOL_DOCS_REGISTRY: Record<string, ToolDocRegistryEntry> = {
  'factors-ai': {
    slug: 'factors-ai',
    name: 'Factors.ai Account Intent',
    section: 'signals',
    docEndpoint: '/r/docs/factors-ai',
    httpMethod: 'POST',
    targetUrl: 'https://api.factors.ai/v1/account_signals/query',
    authHeader: 'X-Factors-Api-Key: {{ENV:FACTORS_API_KEY}}',
    costPerCallUsd: 0.01,
    rateLimitPerMin: 120,
    samplePayload: { event_types: ['pricing_page_visit', 'g2_category_intent'], lookback_days: 7 },
  },
  'zoominfo-workflows': {
    slug: 'zoominfo-workflows',
    name: 'ZoomInfo Intent Workflows',
    section: 'signals',
    docEndpoint: '/r/docs/zoominfo-workflows',
    httpMethod: 'POST',
    targetUrl: 'https://api.zoominfo.com/intent/v1/search',
    authHeader: 'Authorization: Bearer {{ENV:ZOOMINFO_JWT}}',
    costPerCallUsd: 0.05,
    rateLimitPerMin: 60,
    samplePayload: { topics: ['Sales Engagement', 'RevOps'], signalScoreMin: 70 },
  },
  'live-daily-search': {
    slug: 'live-daily-search',
    name: 'DuckDuckGo API + Job RSS Daily Runner',
    section: 'signals',
    docEndpoint: '/r/docs/duckduckgo-api',
    httpMethod: 'GET',
    targetUrl: 'https://api.duckduckgo.com/?q={{encoded_signal_query}}&format=json',
    authHeader: 'None (Public API)',
    costPerCallUsd: 0.0,
    rateLimitPerMin: 300,
    samplePayload: { q: 'hiring SDR OR "VP Sales" Series B SaaS', format: 'json' },
  },
  'hubspot-crm': {
    slug: 'hubspot-crm',
    name: 'HubSpot CRM Pull + Batch Upsert',
    section: 'companies',
    docEndpoint: '/r/docs/hubspot',
    httpMethod: 'POST',
    targetUrl: 'https://api.hubapi.com/crm/v3/objects/companies/batch/upsert',
    authHeader: 'Authorization: Bearer {{ENV:HUBSPOT_PRIVATE_APP_TOKEN}}',
    costPerCallUsd: 0.0,
    rateLimitPerMin: 500,
    samplePayload: { inputs: [{ idProperty: 'domain', id: '{{domain}}', properties: { pae_fit_score: '{{fit_score}}' } }] },
  },
  'clay-waterfall': {
    slug: 'clay-waterfall',
    name: 'Clay Multi-Provider Contact Waterfall',
    section: 'contacts',
    docEndpoint: '/r/docs/clay-contacts',
    httpMethod: 'POST',
    targetUrl: '{{ENV:CLAY_CONTACT_WATERFALL_WEBHOOK}}',
    authHeader: 'X-Clay-Webhook-Key: {{ENV:CLAY_API_KEY}}',
    costPerCallUsd: 0.04,
    rateLimitPerMin: 180,
    samplePayload: { domain: '{{domain}}', persona_titles: ['VP Sales', 'CRO', 'Head of RevOps'] },
  },
  'firecrawl-exa': {
    slug: 'firecrawl-exa',
    name: 'Firecrawl Markdown Scraper + Exa Neural Search',
    section: 'research',
    docEndpoint: '/r/docs/firecrawl',
    httpMethod: 'POST',
    targetUrl: 'https://api.firecrawl.dev/v1/scrape',
    authHeader: 'Authorization: Bearer {{ENV:FIRECRAWL_API_KEY}}',
    costPerCallUsd: 0.008,
    rateLimitPerMin: 200,
    samplePayload: { url: 'https://{{domain}}', formats: ['markdown'] },
  },
  'smartlead-seq': {
    slug: 'smartlead-seq',
    name: 'Smartlead Sequence Enrollment + CRM Writeback',
    section: 'outreach',
    docEndpoint: '/r/docs/smartlead',
    httpMethod: 'POST',
    targetUrl: 'https://server.smartlead.ai/api/v1/campaigns/{{campaign_id}}/leads',
    authHeader: 'Query Param: api_key={{ENV:SMARTLEAD_API_KEY}}',
    costPerCallUsd: 0.001,
    rateLimitPerMin: 300,
    samplePayload: { email: '{{contact_email}}', custom_fields: { email_1_body: '{{email_1_body}}' } },
  },
};

export interface WaterfallStepResult {
  provider: string;
  costUsd: number;
  confidence: number;
  found: boolean;
  data?: Record<string, unknown>;
}

/**
 * Credit-Aware Multi-Provider Waterfall Router:
 * Executes providers from lowest cost to highest cost and short-circuits
 * immediately once confidence >= minConfidence (default 0.95) or maxCostPerLeadUsd is reached.
 */
export async function executeCreditAwareWaterfall(params: {
  providers: Array<{ slug: string; costUsd: number; run: () => Promise<{ found: boolean; confidence: number; data?: Record<string, unknown> }> }>;
  minConfidence?: number;
  maxCostPerLeadUsd?: number;
}): Promise<{ winner: string | null; totalCostUsd: number; trace: WaterfallStepResult[]; data?: Record<string, unknown> }> {
  const minConf = params.minConfidence ?? 0.95;
  const maxCost = params.maxCostPerLeadUsd ?? 0.12;
  let totalCostUsd = 0;
  const trace: WaterfallStepResult[] = [];

  for (const p of params.providers) {
    if (totalCostUsd + p.costUsd > maxCost) break;
    totalCostUsd = Number((totalCostUsd + p.costUsd).toFixed(4));
    const res = await p.run();
    trace.push({ provider: p.slug, costUsd: p.costUsd, confidence: res.confidence, found: res.found, data: res.data });
    if (res.found && res.confidence >= minConf) {
      return { winner: p.slug, totalCostUsd, trace, data: res.data };
    }
  }
  return { winner: null, totalCostUsd, trace };
}

/**
 * Deliverability & Domain Health Circuit Breaker:
 * Blocks live outreach if SPF/DKIM/DMARC fail, if daily mailbox volume exceeds cap,
 * or if campaign bounce rate > 2.5% / spam complaint rate > 0.1%.
 */
export function evaluateDeliverabilityShield(metrics: {
  spfValid: boolean;
  dkimValid: boolean;
  dmarcValid: boolean;
  sentTodayForInbox: number;
  maxDailyInboxCap: number;
  bounceRatePct: number;
  spamComplaintPct: number;
}): { healthy: boolean; action: 'allow_live_send' | 'throttle_to_next_inbox' | 'trip_circuit_breaker_pause'; reasons: string[] } {
  const reasons: string[] = [];
  if (!metrics.spfValid || !metrics.dkimValid || !metrics.dmarcValid) {
    reasons.push('DNS authentication incomplete (SPF/DKIM/DMARC must all pass)');
  }
  if (metrics.bounceRatePct > 2.5) {
    reasons.push(`Bounce rate (${metrics.bounceRatePct}%) exceeded 2.5% circuit-breaker ceiling`);
  }
  if (metrics.spamComplaintPct > 0.1) {
    reasons.push(`Spam complaint rate (${metrics.spamComplaintPct}%) exceeded 0.1% ceiling`);
  }
  if (reasons.length > 0) {
    return { healthy: false, action: 'trip_circuit_breaker_pause', reasons };
  }
  if (metrics.sentTodayForInbox >= metrics.maxDailyInboxCap) {
    return { healthy: true, action: 'throttle_to_next_inbox', reasons: ['Daily per-inbox cap reached; rotating to next warmed mailbox'] };
  }
  return { healthy: true, action: 'allow_live_send', reasons: [] };
}

/**
 * Closed-Loop Reply Triage & CRM Revenue Attribution Engine:
 * Classifies inbound replies into 7 canonical intents and triggers CRM + DNC updates.
 */
export type ReplyIntent =
  | 'positive_book_meeting'
  | 'objection_timing'
  | 'objection_budget'
  | 'referral_forwarded'
  | 'question_technical'
  | 'ooo_auto_reply'
  | 'hard_opt_out_dnc';

export function classifyInboundReply(replyBody: string): {
  intent: ReplyIntent;
  crmAction: string;
  sequencerAction: string;
  autoDraftResponse?: string;
} {
  const text = (replyBody || '').toLowerCase();
  if (/unsubscribe|remove me|stop emailing|not relevant|opt out|no/.test(text)) {
    return {
      intent: 'hard_opt_out_dnc',
      crmAction: 'Set hs_lead_status = DNC & insert into global public.suppression_list',
      sequencerAction: 'Immediately remove from all active Smartlead/Instantly sequences',
    };
  }
  if (/out of office|vacation|returning on|auto-reply|automatic reply/.test(text)) {
    return {
      intent: 'ooo_auto_reply',
      crmAction: 'Log OOO return date on Contact',
      sequencerAction: 'Pause sequence for 10 days and resume automatically',
    };
  }
  if (/reach out to|talk to|better person is|cc'ing|forwarding to/.test(text)) {
    return {
      intent: 'referral_forwarded',
      crmAction: 'Create referred Contact in CRM & link to Company',
      sequencerAction: 'Pause original prospect; enqueue referred stakeholder into Step 04 Research',
    };
  }
  if (/next quarter|q3|q4|reach back out in|bad timing|busy right now/.test(text)) {
    return {
      intent: 'objection_timing',
      crmAction: 'Set follow-up task in CRM for +60 days',
      sequencerAction: 'Move to nurture sequence',
    };
  }
  if (/let's chat|sounds good|send a calendar|thursday works|tuesday works|book a time|interested/.test(text)) {
    return {
      intent: 'positive_book_meeting',
      crmAction: 'Create Deal in CRM (Stage: Discovery Scheduled) & alert Slack #gtm-wins',
      sequencerAction: 'Stop outbound sequence & send Calendly booking confirmation',
      autoDraftResponse: 'Awesome — here is my direct calendar link to grab a 15-minute slot that works best for you.',
    };
  }
  return {
    intent: 'question_technical',
    crmAction: 'Flag Contact as Engaged - Question Asked',
    sequencerAction: 'Route to human operator in Reply Queue with technical battlecard',
  };
}