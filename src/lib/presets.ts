import type {
  HarnessBlueprint,
  ProspectRecord,
  ToolCatalogItem,
  WholenessCriterion,
  WholenessReport,
  WorkflowStepSkill,
} from '../types/harness';

export const TOOL_CATALOG: ToolCatalogItem[] = [
  {
    id: 'n8n',
    name: 'n8n',
    category: 'Orchestrator',
    summary: 'Self-hosted or cloud DAG workflow engine with LangChain AI Agent & HTTP Request tool nodes.',
    docQueryHint: 'n8n AI Agent node ai_tool HTTP Request webhook workflow JSON API',
  },
  {
    id: 'make',
    name: 'Make.com',
    category: 'Orchestrator',
    summary: 'Visual scenario router with webhook triggers, HTTP modules, and JSON iterators.',
    docQueryHint: 'Make.com HTTP make a request module webhook scenario blueprint API',
  },
  {
    id: 'gumloop',
    name: 'Gumloop',
    category: 'Orchestrator',
    summary: 'AI-native node pipeline with web scraping, LLM subflows, and batch list loops.',
    docQueryHint: 'Gumloop AI workflow automation custom node webhook trigger API',
  },
  {
    id: 'composio',
    name: 'Composio',
    category: 'Agent SDK',
    summary: 'Managed OAuth & tool-calling SDK for agent harnesses connecting CRM, mail, and webhooks.',
    docQueryHint: 'Composio TypeScript SDK @composio/core createSession tools execute',
  },
  {
    id: 'cron',
    name: 'Cron / Worker',
    category: 'Agent SDK',
    summary: 'Scheduled headless runner executing daily signal sweeps and batch outreach loops.',
    docQueryHint: 'node-cron TypeScript scheduled agent job queue best practices',
  },
  {
    id: 'clay',
    name: 'Clay',
    category: 'Signals & Data',
    summary: 'Waterfall enrichment tables, Claygent research, and inbound webhook triggers.',
    docQueryHint: 'Clay webhook source HTTP API enrichment waterfall documentation',
  },
  {
    id: 'zoominfo',
    name: 'ZoomInfo',
    category: 'Signals & Data',
    summary: 'B2B contact directory, intent signals, and buyer persona lookup API.',
    docQueryHint: 'ZoomInfo Contact Search API authentication intent signals endpoints',
  },
  {
    id: 'hubspot',
    name: 'HubSpot',
    category: 'Signals & Data',
    summary: 'CRM company lists, custom contact tokens, and sequence enrollment endpoints.',
    docQueryHint: 'HubSpot CRM v3 contacts companies API and sequence enrollment',
  },
  {
    id: 'smartlead',
    name: 'Smartlead',
    category: 'Outreach',
    summary: 'Multi-inbox cold outreach campaigns with custom merge fields and API lead enrollment.',
    docQueryHint: 'Smartlead API add leads to campaign custom fields endpoint',
  },
  {
    id: 'instantly',
    name: 'Instantly',
    category: 'Outreach',
    summary: 'Automated email sequencing with variable personalization tokens and v2 REST API.',
    docQueryHint: 'Instantly.ai API v2 add lead to campaign custom variables endpoint',
  },
];

export interface BlueprintPreset {
  id: string;
  name: string;
  tagline: string;
  blueprint: HarnessBlueprint;
}

export const BLUEPRINT_PRESETS: BlueprintPreset[] = [
  {
    id: 'saas-signal-n8n',
    name: 'B2B SaaS Signal-to-Sequence',
    tagline: 'Full 6-step web signal discovery into Smartlead via n8n AI Agent.',
    blueprint: {
      workflowName: 'RevOps Hiring & AI Stack Outreach',
      icp: 'Series A–C B2B SaaS companies (50–350 employees) in North America hiring RevOps or GTM Engineers.',
      signalHypothesis: 'Companies posting RevOps / GTM Engineering roles or announcing CRM migrations in the last 60 days need automated prospect enrichment.',
      productsAndServices: 'SalesGency Agent Harness — deterministic 6-step outbound automation pipelines with MX verification and signal-grounded copy.',
      valueProposition: 'Cut outbound research time by 85% while raising reply rates using verified induced/deduced signals instead of generic templates.',
      tone: 'Direct, peer-level GTM operator, concise under 110 words, zero fluff',
      emailMode: 'full',
      entryMode: 'signals',
      targetRuntime: 'n8n',
      selectedTools: ['n8n', 'clay', 'smartlead', 'composio'],
      batchSize: 3,
      connectors: {
        signalsSource: 'web_search',
        companySource: 'gemini_discovery',
        contactSource: 'web_linkedin_mx',
        outreachRoute: 'sequence_platform_api',
        outreachPlatformName: 'Smartlead',
        webhookUrl: '',
        senderName: 'Patrick Diamitani',
        senderRole: 'Founder, SalesGency',
        senderCompany: 'Diamitani Industries',
      },
    },
  },
  {
    id: 'agency-fast-track',
    name: 'Fast-Track CSV-to-CRM Token',
    tagline: 'Skip Steps 01–02 with an existing lead list and output body-only CRM tokens.',
    blueprint: {
      workflowName: 'Existing Leads Enrichment & Body Token Loop',
      icp: 'Mid-market B2B logistics and supply-chain software vendors with active enterprise sales teams.',
      signalHypothesis: 'Recent warehouse automation partnerships, ERP integrations, or Series B expansions.',
      productsAndServices: 'AI outbound personalization middleware that injects verified account research directly into HubSpot & Instantly custom tokens.',
      valueProposition: 'Turn raw CSV lead lists into signal-backed first-line and body messaging tokens without changing existing CRM sequences.',
      tone: 'Crisp, consultative, analytical, zero exclamation marks',
      emailMode: 'body_token',
      entryMode: 'existing_leads',
      targetRuntime: 'make',
      selectedTools: ['make', 'hubspot', 'instantly'],
      batchSize: 3,
      connectors: {
        signalsSource: 'icp_only',
        companySource: 'spreadsheet_csv',
        contactSource: 'already_have_contacts',
        outreachRoute: 'sequence_platform_api',
        outreachPlatformName: 'Instantly',
        webhookUrl: '',
        senderName: 'Alex Rivera',
        senderRole: 'Head of Growth',
        senderCompany: 'Northstar GTM',
      },
    },
  },
  {
    id: 'composio-cron-loop',
    name: 'Composio + Cron Autonomous SDR',
    tagline: 'Headless scheduled agent harness running Gumloop/Composio skills on a cron loop.',
    blueprint: {
      workflowName: 'Daily Signal Sweep & Composio Dispatch',
      icp: 'Developer tools and API infrastructure startups (20–150 employees) launching usage-based pricing or enterprise tiers.',
      signalHypothesis: 'Changelog announcements, enterprise SOC2 posts, or Developer Advocate hiring.',
      productsAndServices: 'Autonomous GTM skill packs and scheduled verification agents that populate daily outbound queues.',
      valueProposition: 'Run deterministic daily signal sweeps with zero manual spreadsheet prep and automated MX validation.',
      tone: 'Technical, builder-to-builder, brief and evidence-led',
      emailMode: 'full',
      entryMode: 'signals',
      targetRuntime: 'composio_cron',
      selectedTools: ['composio', 'cron', 'gumloop', 'zoominfo'],
      batchSize: 3,
      connectors: {
        signalsSource: 'web_search',
        companySource: 'gemini_discovery',
        contactSource: 'web_linkedin_mx',
        outreachRoute: 'mailbox_direct',
        outreachPlatformName: 'Composio Mailer',
        webhookUrl: '',
        senderName: 'Jordan Chen',
        senderRole: 'GTM Systems Architect',
        senderCompany: 'SalesGency Labs',
      },
    },
  },
];

export function evaluateWholeness(bp: HarnessBlueprint): WholenessReport {
  const criteria: WholenessCriterion[] = [
    {
      id: 'workflow_name',
      label: 'Workflow Identity',
      met: bp.workflowName.trim().length >= 3,
      hint: 'Name this outreach harness.',
    },
    {
      id: 'icp',
      label: 'Target ICP & Signal',
      met: bp.icp.trim().length >= 12 && bp.signalHypothesis.trim().length >= 10,
      hint: 'Define who to target and the buying signal.',
    },
    {
      id: 'offer',
      label: 'Products & Value Prop',
      met: bp.productsAndServices.trim().length >= 12 && bp.valueProposition.trim().length >= 12,
      hint: 'Specify your offer and measurable value proposition.',
    },
    {
      id: 'tools',
      label: 'Connected Stack',
      met: bp.selectedTools.length >= 1,
      hint: 'Select at least one orchestrator, data, or outreach tool.',
    },
    {
      id: 'email_contract',
      label: 'Email Output Contract',
      met: bp.emailMode === 'full' || bp.emailMode === 'body_token',
      hint: 'Choose Full Email or Body-Only CRM Token.',
    },
    {
      id: 'sender',
      label: 'Sender Attribution',
      met: bp.connectors.senderName.trim().length >= 2 && bp.connectors.senderCompany.trim().length >= 2,
      hint: 'Provide sender name and company for email attribution.',
    },
  ];

  const metCount = criteria.filter((c) => c.met).length;
  const score = Number((metCount / criteria.length).toFixed(2));
  return {
    score,
    metCount,
    totalCount: criteria.length,
    passed: metCount === criteria.length,
    criteria,
  };
}

export function createDefaultSteps(bp: HarnessBlueprint): WorkflowStepSkill[] {
  const bypassDiscovery = bp.entryMode === 'existing_leads';

  return [
    {
      id: '01_signals',
      stepNumber: '01',
      title: 'Signals',
      subtitle: 'Identify signals & ICP triggers',
      wave: 1,
      precondition: 'entryMode === "signals"',
      bypassed: bypassDiscovery,
      connector:
        bp.connectors.signalsSource === 'web_search'
          ? 'Gemini Web Search Grounding'
          : bp.connectors.signalsSource === 'other_workflow'
            ? 'Upstream Workflow Webhook'
            : bp.connectors.signalsSource === 'general_prompt'
              ? 'General Signal Prompt'
              : 'ICP Definition Only',
      systemPrompt: `Monitor buying signals matching ICP: "${bp.icp}". Prioritize: "${bp.signalHypothesis}". Return verifiable company triggers with source citations.`,
      inputContract: '{ icp, signalHypothesis, tools }',
      outputContract: '{ signals: SignalEvent[] }',
      status: bypassDiscovery ? 'bypassed' : 'idle',
    },
    {
      id: '02_companies',
      stepNumber: '02',
      title: 'Companies',
      subtitle: 'Build target organization list',
      wave: 1,
      precondition: 'entryMode === "signals"',
      bypassed: bypassDiscovery,
      connector:
        bp.connectors.companySource === 'gemini_discovery'
          ? 'Search Grounding + Target List'
          : bp.connectors.companySource === 'spreadsheet_csv'
            ? 'CSV / Spreadsheet Import'
            : 'CRM / Webhook Payload',
      systemPrompt: `Normalize discovered or imported targets into a deduplicated list of ${bp.batchSize} companies matching the ICP with clean root domains.`,
      inputContract: '{ signals, batchSize }',
      outputContract: '{ companies: { name, domain, industry, employeeCount }[] }',
      status: bypassDiscovery ? 'bypassed' : 'idle',
    },
    {
      id: '03_contacts',
      stepNumber: '03',
      title: 'Contacts',
      subtitle: 'Buyer persona + email syntax & MX check',
      wave: 2,
      precondition: 'companies.length > 0',
      bypassed: false,
      connector:
        bp.connectors.contactSource === 'web_linkedin_mx'
          ? 'Web + LinkedIn + DNS MX Verify'
          : bp.connectors.contactSource === 'data_tool_clay_zoominfo'
            ? 'Clay / ZoomInfo + MX Guard'
            : 'Existing Leads + DNS MX Verify',
      systemPrompt: `Identify the decision-maker persona for each target company, derive standard corporate email syntax, and run live DNS MX record verification before research.`,
      inputContract: '{ companies }',
      outputContract: '{ contacts: { name, title, email, mxVerified, mxRecords }[] }',
      status: 'idle',
    },
    {
      id: '04_research',
      stepNumber: '04',
      title: 'Research',
      subtitle: '6-part account & signal brief',
      wave: 3,
      precondition: 'contacts.length > 0',
      bypassed: false,
      connector: 'Parallel Gemini Search Briefs',
      systemPrompt: `Produce a 6-part SalesGency brief per prospect: (1) Company overview, (2) Prospect overview, (3) Induced signal (direct evidence), (4) Deduced signal (strategic inference), (5) Relevance to "${bp.productsAndServices}", and (6) "${bp.valueProposition}".`,
      inputContract: '{ contact, company, productsAndServices, valueProposition }',
      outputContract: '{ brief: ResearchBrief }',
      status: 'idle',
    },
    {
      id: '05_email',
      stepNumber: '05',
      title: 'Email',
      subtitle:
        bp.emailMode === 'full'
          ? 'Full email (greeting, body, signature)'
          : 'Body-only CRM messaging token',
      wave: 3,
      precondition: 'brief !== null',
      bypassed: false,
      connector:
        bp.emailMode === 'full' ? 'Full Email Composer + Truth Guard' : 'CRM Token Composer + Truth Guard',
      systemPrompt:
        bp.emailMode === 'full'
          ? `Write a complete outbound email in tone "${bp.tone}" including Subject, "Hi {FirstName},", concise signal-backed body, and signature for ${bp.connectors.senderName}.`
          : `Write ONLY the personalized body paragraph in tone "${bp.tone}" with NO greeting and NO signature so it maps directly into a CRM token like {{Email_1_Body}}.`,
      inputContract: '{ brief, tone, emailMode }',
      outputContract: '{ subject, body, truthNotice? }',
      status: 'idle',
    },
    {
      id: '06_outreach',
      stepNumber: '06',
      title: 'Outreach',
      subtitle: 'Human gate & sequence enrollment',
      wave: 4,
      precondition: 'approvalStatus === "approved"',
      bypassed: false,
      connector:
        bp.connectors.outreachRoute === 'mailbox_direct'
          ? 'Direct Mailbox / Webhook Row Map'
          : `${bp.connectors.outreachPlatformName || 'Sequence Tool'} API Enroll`,
      systemPrompt: `Hold execution at durable human approval gate until MX verification and copy review pass. On approval, dispatch to ${bp.connectors.outreachPlatformName || 'configured webhook/CSV'}.`,
      inputContract: '{ approvedProspects, webhookUrl }',
      outputContract: '{ dispatchedCount, exportBundle }',
      status: 'idle',
    },
  ];
}

export const SAMPLE_CSV_LEADS = `company,domain,contactName,contactTitle,email,industry,employeeCount
Vercel,vercel.com,Lee Robinson,VP of Product,lee@vercel.com,Developer Infrastructure,450
Linear,linear.app,Karri Saarinen,CEO,karri@linear.app,Software Productivity,120
PostHog,posthog.com,James Hawkins,Co-Founder & CEO,james@posthog.com,Product Analytics,85`;

export const SAMPLE_WEBHOOK_PAYLOAD = JSON.stringify(
  {
    source: 'clay_waterfall_table',
    receivedAt: '2026-11-17T14:00:00Z',
    leads: [
      {
        company: 'Supabase',
        domain: 'supabase.com',
        contactName: 'Paul Copplestone',
        contactTitle: 'CEO & Co-Founder',
        email: 'paul@supabase.com',
        industry: 'Cloud Database',
        employeeCount: '180',
        signalHint: 'Expanding enterprise SOC2 & Postgres AI vector features',
      },
      {
        company: 'Modal',
        domain: 'modal.com',
        contactName: 'Erik Bernhardsson',
        contactTitle: 'CEO',
        email: 'erik@modal.com',
        industry: 'Serverless GPU Cloud',
        employeeCount: '70',
        signalHint: 'Hiring GTM & Solutions Engineering roles for enterprise inference',
      },
    ],
  },
  null,
  2
);

export function createPlaceholderProspect(
  partial: Partial<ProspectRecord> & { company: string; domain: string }
): ProspectRecord {
  const email = partial.email ?? '';
  const validSyntax = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  return {
    id: partial.id ?? `${partial.domain}-${Math.random().toString(36).slice(2, 7)}`,
    company: partial.company,
    domain: partial.domain,
    industry: partial.industry ?? 'B2B Technology',
    employeeCount: partial.employeeCount ?? '50–250',
    contactName: partial.contactName ?? 'Pending Contact',
    contactTitle: partial.contactTitle ?? 'VP Revenue',
    email,
    linkedinHint: partial.linkedinHint ?? `site:linkedin.com/in ${partial.company}`,
    mx: partial.mx ?? {
      email,
      domain: partial.domain,
      validSyntax,
      hasMx: false,
      mxRecords: [],
      status: email ? 'unchecked' : 'invalid_syntax',
    },
    brief: partial.brief ?? {
      companyOverview: 'Pending Step 04 research execution.',
      prospectOverview: 'Pending Step 04 research execution.',
      inducedSignal: 'Pending Step 04 research execution.',
      deducedSignal: 'Pending Step 04 research execution.',
      productsFit: 'Pending Step 04 research execution.',
      valueProposition: 'Pending Step 04 research execution.',
      sources: [],
    },
    emailDraft: partial.emailDraft ?? {
      subject: '',
      body: '',
      mode: 'full',
    },
    truthNotice: partial.truthNotice,
    approvalStatus: partial.approvalStatus ?? 'pending',
  };
}
