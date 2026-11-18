import type {
  ConnectedOperationStateRow,
  EmailLintResult,
  EmailMode,
  HarnessBlueprint,
  ProspectRecord,
  RegistryToolDoc,
  StepId,
  ToolCatalogItem,
  WaterfallTraceStep,
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
    id: 'apollo',
    name: 'Apollo.io',
    category: 'Signals & Data',
    summary: 'B2B company search, decision-maker resolution, and verified work email enrichment.',
    docQueryHint: 'Apollo.io REST API v1 mixed_people search organizations enrich',
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
  {
    id: 'route53',
    name: 'AWS Route 53',
    category: 'DNS & Ops',
    summary: 'Authoritative DNS zone inspection and transactional SPF/DKIM/DMARC record change batches.',
    docQueryHint: 'AWS Route 53 ChangeResourceRecordSets ListResourceRecordSets IAM conditions',
  },
  {
    id: 'godaddy',
    name: 'GoDaddy DNS',
    category: 'DNS & Ops',
    summary: 'Single-domain DNS API for reading zone records and applying approved sending TXT/CNAME records.',
    docQueryHint: 'GoDaddy Domains API v1 domains records SPF DKIM CNAME authentication',
  },
];

export const R_DOCS_REGISTRY: RegistryToolDoc[] = [
  // Step 01 Signals
  {
    slug: 'live-daily-search',
    name: 'Live Daily Web Search (Gemini + DuckDuckGo)',
    stepId: '01_signals',
    tier: 'free',
    costPerLeadUsd: 0.0,
    transport: 'open_source',
    authType: 'Server Proxy (No Lead Credit Cost)',
    endpointOrNode: 'POST /api/harness/run · googleSearch grounding',
    requiredScopes: ['research.fetch'],
    summary: 'Zero-cost daily signal sweep scanning job boards, funding announcements, and changelogs.',
    samplePayload: '{ "query": "Series B SaaS hiring RevOps", "recencyDays": 30 }',
  },
  {
    slug: 'factors-ai',
    name: 'Factors.ai Website Intent',
    stepId: '01_signals',
    tier: 'paid',
    costPerLeadUsd: 0.015,
    transport: 'direct_api',
    authType: 'Bearer API Key',
    endpointOrNode: 'POST https://api.factors.ai/v1/account_alerts',
    requiredScopes: ['signals.intent.read'],
    summary: 'De-anonymizes high-intent pricing and docs page visits into company domain webhooks.',
    samplePayload: '{ "domain": "linear.app", "intent_score": 88, "pages_viewed": ["/pricing", "/security"] }',
  },
  {
    slug: 'common-room',
    name: 'Common Room Community Signals',
    stepId: '01_signals',
    tier: 'paid',
    costPerLeadUsd: 0.012,
    transport: 'composio',
    authType: 'Composio OAuth / API Token',
    endpointOrNode: 'GET https://api.commonroom.io/v1/segments/signals',
    requiredScopes: ['community.signals.read'],
    summary: 'Captures GitHub stars, Slack/Discord questions, and OSS contributor activity.',
    samplePayload: '{ "organization": "Supabase", "signal_type": "repo_star_surge" }',
  },
  {
    slug: 'zoominfo-workflows',
    name: 'ZoomInfo Intent Workflows',
    stepId: '01_signals',
    tier: 'paid',
    costPerLeadUsd: 0.025,
    transport: 'direct_api',
    authType: 'JWT Bearer Token',
    endpointOrNode: 'POST https://api.zoominfo.com/search/intent',
    requiredScopes: ['intent.search.read'],
    summary: 'Enterprise B2B buying topic spikes and executive scoop triggers.',
    samplePayload: '{ "topics": ["SOC2 Automation", "RevOps"], "signalScoreMin": 75 }',
  },
  // Step 02 Companies
  {
    slug: 'hubspot-crm',
    name: 'HubSpot CRM Cache & Lists',
    stepId: '02_companies',
    tier: 'free',
    costPerLeadUsd: 0.0,
    transport: 'composio',
    authType: 'Composio OAuth2 (hubspot)',
    endpointOrNode: 'POST https://api.hubapi.com/crm/v3/objects/companies/search',
    requiredScopes: ['crm.objects.companies.read', 'crm.objects.contacts.read'],
    summary: 'Checks existing CRM accounts first ($0.00) to prevent duplicate enrichment charges.',
    samplePayload: '{ "filterGroups": [{ "filters": [{ "propertyName": "domain", "operator": "EQ", "value": "vercel.com" }] }] }',
  },
  {
    slug: 'apollo-companies',
    name: 'Apollo.io Organization Search',
    stepId: '02_companies',
    tier: 'paid',
    costPerLeadUsd: 0.01,
    transport: 'direct_api',
    authType: 'X-Api-Key Header',
    endpointOrNode: 'POST https://api.apollo.io/v1/mixed_companies/search',
    requiredScopes: ['companies.search.read'],
    summary: 'Filters target organizations by employee count, revenue band, and tech stack tags.',
    samplePayload: '{ "organization_num_employees_ranges": ["51,200", "201,500"], "q_organization_keyword_tags": ["b2b saas"] }',
  },
  {
    slug: 'clay-companies',
    name: 'Clay Company Table Webhook',
    stepId: '02_companies',
    tier: 'paid',
    costPerLeadUsd: 0.014,
    transport: 'direct_api',
    authType: 'Clay Webhook Token',
    endpointOrNode: 'POST https://api.clay.com/v3/sources/webhook',
    requiredScopes: ['tables.rows.write'],
    summary: 'Pushes normalized company domains into a Clay firmographic scoring table.',
    samplePayload: '{ "company_name": "PostHog", "domain": "posthog.com", "fit_rubric_min": 70 }',
  },
  // Step 03 Contacts
  {
    slug: 'custom-mx-verifier',
    name: 'Node DNS MX + Pattern Verifier',
    stepId: '03_contacts',
    tier: 'free',
    costPerLeadUsd: 0.0,
    transport: 'open_source',
    authType: 'Built-in Server DNS Resolver',
    endpointOrNode: 'POST /api/verify/mx (node:dns/promises resolveMx)',
    requiredScopes: ['dns.mx.read'],
    summary: 'Zero-cost RFC 5322 syntax validation and live DNS MX mail server exchange lookup.',
    samplePayload: '{ "items": [{ "email": "lee@vercel.com", "domain": "vercel.com" }] }',
  },
  {
    slug: 'apollo-people',
    name: 'Apollo.io People & Email Enrich',
    stepId: '03_contacts',
    tier: 'paid',
    costPerLeadUsd: 0.015,
    transport: 'composio',
    authType: 'Composio / X-Api-Key',
    endpointOrNode: 'POST https://api.apollo.io/api/v1/mixed_people/search',
    requiredScopes: ['people.search.read', 'emails.unlock'],
    summary: 'Finds VP/C-level decision makers by title and unlocks verified corporate emails.',
    samplePayload: '{ "q_organization_domains": "vercel.com", "person_titles": ["VP Revenue", "Head of Growth"] }',
  },
  {
    slug: 'clay-waterfall',
    name: 'Clay Multi-Provider Email Waterfall',
    stepId: '03_contacts',
    tier: 'paid',
    costPerLeadUsd: 0.022,
    transport: 'direct_api',
    authType: 'Clay API Bearer Key',
    endpointOrNode: 'POST https://api.clay.com/v3/enrichment/waterfall',
    requiredScopes: ['waterfall.contacts.enrich'],
    summary: 'Cascades across Prospeo, Dropcontact, Hunter, and ZeroBounce until a valid email is confirmed.',
    samplePayload: '{ "full_name": "Karri Saarinen", "domain": "linear.app", "require_catch_all_check": true }',
  },
  // Step 04 Research
  {
    slug: 'duckduckgo-jina',
    name: 'DuckDuckGo + Jina Reader Markdown',
    stepId: '04_research',
    tier: 'free',
    costPerLeadUsd: 0.0,
    transport: 'open_source',
    authType: 'Zero-Cost Public Reader',
    endpointOrNode: 'GET https://r.jina.ai/https://{{domain}}',
    requiredScopes: ['research.fetch'],
    summary: 'Converts target company websites and press pages into clean LLM-ready markdown for $0.00.',
    samplePayload: '{ "targetUrl": "https://supabase.com/customers", "format": "markdown" }',
  },
  {
    slug: 'firecrawl-exa',
    name: 'Firecrawl + Exa Neural Search',
    stepId: '04_research',
    tier: 'paid',
    costPerLeadUsd: 0.008,
    transport: 'mcp',
    authType: 'MCP Server / Bearer Key',
    endpointOrNode: 'POST https://api.firecrawl.dev/v1/scrape + https://api.exa.ai/search',
    requiredScopes: ['web.research'],
    summary: 'Deep crawls documentation, security pages, and executive podcast interviews with source URLs.',
    samplePayload: '{ "url": "https://modal.com", "formats": ["markdown"], "onlyMainContent": true }',
  },
  {
    slug: 'perplexity-sonar',
    name: 'Perplexity Sonar Grounded Research',
    stepId: '04_research',
    tier: 'paid',
    costPerLeadUsd: 0.005,
    transport: 'direct_api',
    authType: 'Bearer API Key',
    endpointOrNode: 'POST https://api.perplexity.ai/chat/completions',
    requiredScopes: ['web.research'],
    summary: 'Synthesizes cited 6-part account briefs with induced and deduced buying signals.',
    samplePayload: '{ "model": "sonar-pro", "messages": [{ "role": "user", "content": "6-part brief for Vercel" }] }',
  },
  // Step 05 Email
  {
    slug: 'ollama-local',
    name: 'Local / Open-Weights Writer + 5-Rule Linter',
    stepId: '05_email',
    tier: 'free',
    costPerLeadUsd: 0.0,
    transport: 'open_source',
    authType: 'Local / Included Gemini Harness',
    endpointOrNode: 'POST /api/section/test-v1 (lintProspectEmail)',
    requiredScopes: ['messages.draft'],
    summary: 'Drafts full emails or {{email_1_body}} CRM tokens and enforces the deterministic 5-rule linter.',
    samplePayload: '{ "mode": "body_token", "maxWords": 120, "forbidExclamation": true }',
  },
  {
    slug: 'claude-3-7-sonnet',
    name: 'Anthropic Claude Copywriter Node',
    stepId: '05_email',
    tier: 'paid',
    costPerLeadUsd: 0.003,
    transport: 'direct_api',
    authType: 'x-api-key Header',
    endpointOrNode: 'POST https://api.anthropic.com/v1/messages',
    requiredScopes: ['messages.draft'],
    summary: 'High-nuance peer-to-peer copywriting calibrated to executive personas and 5-rule linting.',
    samplePayload: '{ "model": "claude-3-7-sonnet-latest", "max_tokens": 350 }',
  },
  // Step 06 Outreach
  {
    slug: 'custom-webhook-outreach',
    name: 'Approval-Gated Webhook / CSV Export',
    stepId: '06_outreach',
    tier: 'free',
    costPerLeadUsd: 0.0,
    transport: 'open_source',
    authType: 'Signed Host Approval Token',
    endpointOrNode: 'POST /api/outreach/dispatch',
    requiredScopes: ['outreach.send'],
    summary: 'Zero-cost dispatch to any n8n, Make.com, or custom HTTP endpoint after explicit human approval.',
    samplePayload: '{ "workflowName": "RevOps Outreach", "approvedProspects": 3 }',
  },
  {
    slug: 'smartlead-seq',
    name: 'Smartlead Campaign API',
    stepId: '06_outreach',
    tier: 'paid',
    costPerLeadUsd: 0.002,
    transport: 'direct_api',
    authType: 'Query Param api_key',
    endpointOrNode: 'POST https://server.smartlead.ai/api/v1/campaigns/{id}/leads',
    requiredScopes: ['outreach.send', 'campaigns.leads.write'],
    summary: 'Enrolls MX-verified prospects with custom {{email_1_body}} merge fields and inbox rotation.',
    samplePayload: '{ "lead_list": [{ "email": "lee@vercel.com", "custom_fields": { "email_1_body": "..." } }] }',
  },
  {
    slug: 'instantly-seq',
    name: 'Instantly.ai v2 Campaign API',
    stepId: '06_outreach',
    tier: 'paid',
    costPerLeadUsd: 0.002,
    transport: 'direct_api',
    authType: 'Bearer API v2 Key',
    endpointOrNode: 'POST https://api.instantly.ai/api/v2/leads',
    requiredScopes: ['outreach.send', 'leads.write'],
    summary: 'Injects approved leads into warmed multi-inbox sequences with bounce circuit-breaker protection.',
    samplePayload: '{ "campaign": "camp_123", "email": "karri@linear.app", "custom_variables": { "email_1_body": "..." } }',
  },
  // DNS & Connected Operations
  {
    slug: 'aws-route53-dns',
    name: 'AWS Route 53 Domain Operations Adapter',
    stepId: 'ops_dns',
    tier: 'free',
    costPerLeadUsd: 0.0,
    transport: 'mcp',
    authType: 'Scoped IAM Role (Zone-Restricted)',
    endpointOrNode: 'AWS route53:ChangeResourceRecordSets',
    requiredScopes: ['dns.records.read', 'dns.records.apply'],
    summary: 'Inspects authoritative hosted zones and applies approved SPF/DKIM/DMARC CNAME & TXT batches.',
    samplePayload: '{ "HostedZoneId": "Z0192837465", "ChangeBatch": { "Changes": [{ "Action": "UPSERT", "ResourceRecordSet": { "Type": "CNAME" } }] } }',
  },
  {
    slug: 'godaddy-dns',
    name: 'GoDaddy Single-Domain DNS Adapter',
    stepId: 'ops_dns',
    tier: 'free',
    costPerLeadUsd: 0.0,
    transport: 'direct_api',
    authType: 'Scoped Personal Access Token (sso-key)',
    endpointOrNode: 'PATCH https://api.godaddy.com/v1/domains/{domain}/records',
    requiredScopes: ['dns.records.read', 'dns.records.apply'],
    summary: 'Verifies authoritative nameservers and updates approved sending records without touching MX/A roots.',
    samplePayload: '[{ "type": "TXT", "name": "_dmarc", "data": "v=DMARC1; p=quarantine; pct=100", "ttl": 3600 }]',
  },
];

export interface BlueprintPreset {
  id: string;
  name: string;
  tagline: string;
  costPerLeadLabel: string;
  blueprint: HarnessBlueprint;
}

export const BLUEPRINT_PRESETS: BlueprintPreset[] = [
  {
    id: 'saas-signal-n8n',
    name: 'Signal-Led Hiring Surge (n8n)',
    tagline: 'Full 6-step web signal discovery into Smartlead via n8n AI Agent.',
    costPerLeadLabel: '$0.038 / lead',
    blueprint: {
      workflowName: 'RevOps Hiring & AI Stack Outreach',
      campaignBriefPrompt:
        'We reach out to VP Revenue and Heads of RevOps at Series A–C B2B SaaS companies (50–350 employees) hiring RevOps or migrating CRMs. We build deterministic 6-step outbound automation pipelines that cut manual prospect research by 85%.',
      icp: 'Series A–C B2B SaaS companies (50–350 employees) in North America hiring RevOps or GTM Engineers.',
      signalHypothesis: 'Companies posting RevOps / GTM Engineering roles or announcing CRM migrations in the last 60 days need automated prospect enrichment.',
      productsAndServices: 'SalesGency Agent Harness — deterministic 6-step outbound automation pipelines with MX verification and signal-grounded copy.',
      valueProposition: 'Cut outbound research time by 85% while raising reply rates using verified induced/deduced signals instead of generic templates.',
      tone: 'Direct, peer-level GTM operator, concise under 110 words, zero fluff',
      emailMode: 'full',
      entryMode: 'signals',
      targetRuntime: 'n8n',
      selectedTools: ['n8n', 'clay', 'smartlead', 'composio'],
      selectedRegistrySlugs: [
        'live-daily-search',
        'hubspot-crm',
        'custom-mx-verifier',
        'duckduckgo-jina',
        'ollama-local',
        'smartlead-seq',
      ],
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
        senderDomain: 'salesgency.ai',
      },
    },
  },
  {
    id: 'agency-fast-track',
    name: 'Closed-Lost Revival & CRM Token (Make.com)',
    tagline: 'Skip Steps 01–02 with an existing lead list and output {{email_1_body}} CRM tokens.',
    costPerLeadLabel: '$0.014 / lead',
    blueprint: {
      workflowName: 'Existing Leads Enrichment & Body Token Loop',
      campaignBriefPrompt:
        'We target mid-market logistics and supply-chain software vendors where a former champion changed jobs or an enterprise deal stalled. We inject verified 6-part research directly into HubSpot & Instantly merge tokens.',
      icp: 'Mid-market B2B logistics and supply-chain software vendors with active enterprise sales teams.',
      signalHypothesis: 'Recent warehouse automation partnerships, ERP integrations, or Series B expansions.',
      productsAndServices: 'AI outbound personalization middleware that injects verified account research directly into HubSpot & Instantly custom tokens.',
      valueProposition: 'Turn raw CSV lead lists into signal-backed first-line and body messaging tokens without changing existing CRM sequences.',
      tone: 'Crisp, consultative, analytical, zero exclamation marks',
      emailMode: 'body_token',
      entryMode: 'existing_leads',
      targetRuntime: 'make',
      selectedTools: ['make', 'hubspot', 'instantly'],
      selectedRegistrySlugs: [
        'hubspot-crm',
        'custom-mx-verifier',
        'duckduckgo-jina',
        'ollama-local',
        'instantly-seq',
      ],
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
        senderDomain: 'northstargtm.io',
      },
    },
  },
  {
    id: 'zero-cost-open-source',
    name: 'Zero-Cost Open-Source Stack (Composio + Cron)',
    tagline: '100% free tier using Live Web Search, Node DNS MX, Jina Reader, and 5-Rule Linter.',
    costPerLeadLabel: '$0.000 / lead',
    blueprint: {
      workflowName: 'Zero-Cost Daily Signal Sweep & Dispatch',
      campaignBriefPrompt:
        'We reach out to CTOs and Founders at developer tools and AI infrastructure startups (20–150 employees) launching enterprise tiers or SOC2 compliance. We provide an open-source, credit-free GTM agent harness.',
      icp: 'Developer tools and API infrastructure startups (20–150 employees) launching usage-based pricing or enterprise tiers.',
      signalHypothesis: 'Changelog announcements, enterprise SOC2 posts, or Developer Advocate hiring.',
      productsAndServices: 'Autonomous GTM skill packs and scheduled verification agents that populate daily outbound queues at zero enrichment cost.',
      valueProposition: 'Run deterministic daily signal sweeps with zero paid API credits and 100% automated DNS MX validation.',
      tone: 'Technical, builder-to-builder, brief and evidence-led',
      emailMode: 'full',
      entryMode: 'signals',
      targetRuntime: 'composio_cron',
      selectedTools: ['composio', 'cron', 'n8n', 'route53'],
      selectedRegistrySlugs: [
        'live-daily-search',
        'hubspot-crm',
        'custom-mx-verifier',
        'duckduckgo-jina',
        'ollama-local',
        'custom-webhook-outreach',
      ],
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
        senderDomain: 'salesgencylabs.dev',
      },
    },
  },
];

export function stripGreetingAndSignoff(rawBody: string): string {
  const lines = rawBody
    .split(/\r?\n/)
    .map((l) => l.trim());
  const filtered = lines.filter((line, idx) => {
    if (idx === 0 && /^(hi|hey|hello|dear)\b/i.test(line)) return false;
    if (
      idx >= lines.length - 3 &&
      /^(best|cheers|regards|sincerely|warmly|thanks|thank you|—|-)\b/i.test(line)
    ) {
      return false;
    }
    return true;
  });
  return filtered.join('\n').trim() || rawBody.trim();
}

export function lintProspectEmail(
  subject: string,
  body: string,
  mode: EmailMode = 'full'
): EmailLintResult {
  const cleanBody = body.trim();
  const words = cleanBody ? cleanBody.split(/\s+/).length : 0;
  const wordLimitPassed = words > 0 && words <= 120;
  const noFakeReplyPassed = !/^(re:|fwd:|fw:)/i.test(subject.trim());
  const noExclamationPassed = !cleanBody.includes('!') && !subject.includes('!');
  const noRawUrlPassed = !/https?:\/\/[^\s]+/i.test(cleanBody);
  const noUnresolvedTokensPassed =
    !/\{\{[^}]+\}\}/.test(cleanBody) && !/\[[A-Z0-9_ -]{3,}\]/.test(cleanBody);

  const rules = [
    {
      id: 'word_ceiling',
      label: 'Word Count <= 120',
      passed: wordLimitPassed,
      detail: `${words} / 120 words`,
    },
    {
      id: 'no_fake_re',
      label: 'No Fake Re: / Fwd:',
      passed: noFakeReplyPassed,
      detail: noFakeReplyPassed ? 'Clean subject prefix' : 'Blocked deceptive Re:/Fwd: prefix',
    },
    {
      id: 'no_exclamation',
      label: 'Zero Exclamation Marks',
      passed: noExclamationPassed,
      detail: noExclamationPassed ? 'Calm executive tone' : 'Contains "!" punctuation',
    },
    {
      id: 'no_raw_urls',
      label: 'No Raw Cold Links',
      passed: noRawUrlPassed,
      detail: noRawUrlPassed ? 'Deliverability-safe (0 URLs)' : 'Raw http(s) link hurts cold inbox placement',
    },
    {
      id: 'no_unresolved_tokens',
      label: 'No Unresolved {{Tokens}}',
      passed: noUnresolvedTokensPassed,
      detail: noUnresolvedTokensPassed ? 'All variables resolved' : 'Found unmerged placeholder token',
    },
  ];

  const bodyOnlyToken =
    mode === 'body_token' ? cleanBody : stripGreetingAndSignoff(cleanBody);

  return {
    passed: rules.every((r) => r.passed),
    wordCount: words,
    rules,
    bodyOnlyToken,
  };
}

export function executeCreditAwareWaterfall(
  stepId: StepId,
  selectedSlugs?: string[]
): { trace: WaterfallTraceStep[]; estimatedCostUsd: number } {
  const candidates = R_DOCS_REGISTRY.filter((d) => d.stepId === stepId);
  const active =
    selectedSlugs && selectedSlugs.length > 0
      ? candidates.filter((c) => selectedSlugs.includes(c.slug))
      : candidates;
  const list = (active.length > 0 ? active : candidates).sort(
    (a, b) => a.costPerLeadUsd - b.costPerLeadUsd
  );

  let cumulativeConfidence = 0;
  let totalCost = 0;
  const trace: WaterfallTraceStep[] = [];

  for (const item of list) {
    if (cumulativeConfidence >= 0.95) {
      trace.push({
        providerSlug: item.slug,
        providerName: item.name,
        tier: item.tier,
        costUsd: 0,
        confidence: cumulativeConfidence,
        status: 'skipped_after_hit',
        note: 'Short-circuited ($0.00 spent) — confidence threshold >= 0.95 already met by upstream free/cache tier.',
      });
      continue;
    }

    const boost = item.tier === 'free' ? 0.96 : 0.98;
    cumulativeConfidence = Math.min(0.99, Math.max(cumulativeConfidence, boost));
    totalCost += item.costPerLeadUsd;

    trace.push({
      providerSlug: item.slug,
      providerName: item.name,
      tier: item.tier,
      costUsd: item.costPerLeadUsd,
      confidence: cumulativeConfidence,
      status: cumulativeConfidence >= 0.95 ? 'hit_short_circuit' : 'queried_partial',
      note:
        item.tier === 'free'
          ? `Resolved via $0.00 tier (${item.endpointOrNode}) with confidence ${cumulativeConfidence.toFixed(2)}.`
          : `Queried paid provider (${item.endpointOrNode}) at $${item.costPerLeadUsd.toFixed(3)}/lead.`,
    });
  }

  return {
    trace,
    estimatedCostUsd: Number(totalCost.toFixed(4)),
  };
}

export const DEFAULT_CONNECTED_OPS_STATE: ConnectedOperationStateRow[] = [
  {
    id: 'ops-domain-dns',
    area: 'Domain & Authoritative DNS',
    provider: 'AWS Route 53 / GoDaddy',
    logicalTool: 'dns.records.read',
    requiredScope: 'route53:ListResourceRecordSets',
    currentState: 'Registrar identified; authoritative DNS zone inspected (read-only).',
    desiredState: 'Verified writable zone control with protected root A/MX records.',
    gapStatus: 'satisfied',
    proposedAction: 'Keep root MX and website A records locked; scope writes strictly to DKIM/DMARC.',
    approvalRequired: false,
    approved: true,
  },
  {
    id: 'ops-email-auth',
    area: 'Email Authentication (SPF/DKIM/DMARC)',
    provider: 'AWS Route 53 / SES',
    logicalTool: 'dns.records.apply',
    requiredScope: 'route53:ChangeResourceRecordSets',
    currentState: 'SPF & MX active; _dmarc policy set to p=none without rotation selector2.',
    desiredState: 'Approved sending config: SPF + DKIM selector1/selector2 + DMARC p=quarantine.',
    gapStatus: 'verified_mismatch',
    proposedAction: 'UPSERT selector2._domainkey CNAME and _dmarc TXT record batch after explicit approval.',
    approvalRequired: true,
    approved: false,
  },
  {
    id: 'ops-crm-hubspot',
    area: 'CRM & HubSpot Sync',
    provider: 'HubSpot (via Composio)',
    logicalTool: 'crm.contacts.update',
    requiredScope: 'crm.objects.contacts.write',
    currentState: 'Connection active (read-only); {{email_1_body}} custom property unmapped.',
    desiredState: 'Approved lead/contact field mapping with delete/merge operations blocked.',
    gapStatus: 'verified_mismatch',
    proposedAction: 'Map {{email_1_body}} and {{induced_signal}} on selected contact IDs (deny delete/bulk).',
    approvalRequired: true,
    approved: false,
  },
  {
    id: 'ops-sequences',
    area: 'Sequences & Reply Suppression',
    provider: 'Smartlead / Instantly',
    logicalTool: 'outreach.send',
    requiredScope: 'campaigns.leads.write',
    currentState: 'Day 1–Day 4 sequence templates drafted; bounce circuit-breaker at 2.5%.',
    desiredState: 'Skip-if-replied, skip-if-bounced, and automatic global DNC suppression active.',
    gapStatus: 'satisfied',
    proposedAction: 'Enforce 5-rule email linter and human approval token before any lead enrollment.',
    approvalRequired: true,
    approved: true,
  },
  {
    id: 'ops-reporting',
    area: 'Send-Health & KPI Reporting',
    provider: 'Enably KPI Metric Architect',
    logicalTool: 'state.read',
    requiredScope: 'workspace.telemetry.read',
    currentState: 'Tracking 17-status lead outcomes (sent, drafted, needs_review, skipped_*).',
    desiredState: 'Weekly leading activity metrics paired with verified positive reply KPIs.',
    gapStatus: 'satisfied',
    proposedAction: 'Sync daily send-health (sent, delivered, bounced, replied) to workspace dashboard.',
    approvalRequired: false,
    approved: true,
  },
];

export function evaluateWholeness(bp: HarnessBlueprint): WholenessReport {
  const criteria: WholenessCriterion[] = [
    {
      id: 'workflow_name',
      label: 'Campaign Identity',
      met: bp.workflowName.trim().length >= 3,
      hint: 'Name this outreach campaign.',
    },
    {
      id: 'icp',
      label: 'Who You Reach Out To & Signal',
      met: bp.icp.trim().length >= 12 && bp.signalHypothesis.trim().length >= 10,
      hint: 'Define who you are reaching out to and why now.',
    },
    {
      id: 'offer',
      label: 'What You Build & Why Relevant',
      met: bp.productsAndServices.trim().length >= 12 && bp.valueProposition.trim().length >= 12,
      hint: 'Specify what you build and the measurable outcome.',
    },
    {
      id: 'tools',
      label: 'Connected Stack & Composio/API',
      met: bp.selectedTools.length >= 1,
      hint: 'Select at least one orchestrator, data, or outreach tool.',
    },
    {
      id: 'email_contract',
      label: 'Step 05 Email Output Contract',
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
        bp.emailMode === 'full' ? 'Full Email Composer + 5-Rule Linter' : 'CRM Token Composer + 5-Rule Linter',
      systemPrompt:
        bp.emailMode === 'full'
          ? `Write a complete outbound email in tone "${bp.tone}" (<= 120 words, zero exclamation marks, no raw URLs) including Subject, "Hi {FirstName},", concise signal-backed body, and signature for ${bp.connectors.senderName}.`
          : `Write ONLY the personalized body paragraph in tone "${bp.tone}" (<= 120 words, zero exclamation marks, no raw URLs) with NO greeting and NO signature so it maps directly into {{email_1_body}}.`,
      inputContract: '{ brief, tone, emailMode }',
      outputContract: '{ subject, body, bodyOnlyToken, lint }',
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
      systemPrompt: `Hold execution at durable human approval gate until MX verification and 5-rule copy linter pass. On approval, dispatch to ${bp.connectors.outreachPlatformName || 'configured webhook/CSV'}.`,
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
    telemetryStatus: partial.telemetryStatus ?? 'queued',
    approvalStatus: partial.approvalStatus ?? 'pending',
  };
}
