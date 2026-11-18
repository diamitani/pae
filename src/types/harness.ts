export type EntryMode = 'signals' | 'existing_leads';
export type EmailMode = 'full' | 'body_token';
export type TargetRuntime = 'n8n' | 'make' | 'gumloop' | 'composio_cron' | 'code_harness';

export type StepId =
  | '01_signals'
  | '02_companies'
  | '03_contacts'
  | '04_research'
  | '05_email'
  | '06_outreach';

export type StepStatus =
  | 'idle'
  | 'running'
  | 'completed'
  | 'bypassed'
  | 'awaiting_approval'
  | 'error';

export type LeadTelemetryStatus =
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

export type CampaignDocType =
  | 'pitch_deck'
  | 'icp_brief'
  | 'lead_csv'
  | 'api_spec'
  | 'case_study';

export interface UploadedCampaignDoc {
  id: string;
  name: string;
  docType: CampaignDocType;
  sizeBytes: number;
  uploadedAt: string;
  extractedSummary: string;
  contentSnippet: string;
}

export interface WorkspaceAccount {
  id: string;
  email: string;
  workspaceName: string;
  companyDomain: string;
  authProvider: 'workspace_portal' | 'google_firebase';
  createdAt: string;
  documents: UploadedCampaignDoc[];
  connectedProviders: string[];
}

export interface IcpArchitectProfile {
  segment_name: string;
  industry: string;
  company_size: string;
  geography: string;
  buyer_role: string;
  pain_points: string[];
  goals_kpis: string[];
  buying_triggers: string[];
  buying_objections: string[];
  preferred_channels: string[];
  messaging_tone: string;
  tier: 'minimal' | 'standard' | 'enriched';
}

export interface RostrV2ArtifactEnvelope<TPayload = Record<string, unknown>> {
  artifact_id: string;
  artifact_type: string;
  workspace_id: string;
  status: 'draft' | 'approved' | 'rejected' | 'archived';
  version: number;
  created_at: string;
  updated_at?: string;
  owner_agent: string;
  approval: {
    required: boolean;
    state: 'not_required' | 'pending' | 'approved' | 'rejected';
    approved_by?: string;
    approved_at?: string;
  };
  provenance: {
    input_refs: string[];
    agent_id: string;
    model?: string;
    prompt_version?: string;
    source_urls?: string[];
  };
  payload: TPayload;
}

export interface RegistryToolDoc {
  slug: string;
  name: string;
  stepId: StepId | 'ops_dns';
  tier: 'free' | 'paid';
  costPerLeadUsd: number;
  transport: 'composio' | 'mcp' | 'direct_api' | 'open_source';
  authType: string;
  endpointOrNode: string;
  requiredScopes: string[];
  summary: string;
  samplePayload: string;
}

export interface WaterfallTraceStep {
  providerSlug: string;
  providerName: string;
  tier: 'free' | 'paid';
  costUsd: number;
  confidence: number;
  status: 'hit_short_circuit' | 'queried_partial' | 'skipped_after_hit';
  note: string;
}

export interface EmailLintRuleCheck {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
}

export interface EmailLintResult {
  passed: boolean;
  wordCount: number;
  rules: EmailLintRuleCheck[];
  bodyOnlyToken: string;
}

export interface SectionV1TestResult {
  stepId: StepId;
  executedAt: string;
  approved: boolean;
  estimatedCostPerLeadUsd: number;
  waterfallTrace: WaterfallTraceStep[];
  sampleOutput: string;
  lintResult?: EmailLintResult;
  envelope: RostrV2ArtifactEnvelope;
}

export interface ConnectedOperationStateRow {
  id: string;
  area:
    | 'Domain & Authoritative DNS'
    | 'Email Authentication (SPF/DKIM/DMARC)'
    | 'CRM & HubSpot Sync'
    | 'Sequences & Reply Suppression'
    | 'Send-Health & KPI Reporting';
  provider: string;
  logicalTool: string;
  requiredScope: string;
  currentState: string;
  desiredState: string;
  gapStatus:
    | 'satisfied'
    | 'verified_mismatch'
    | 'inference_needs_confirm'
    | 'access_missing';
  proposedAction: string;
  approvalRequired: boolean;
  approved: boolean;
  approvalHash?: string;
}

export interface DeliverabilityShieldReport {
  domain: string;
  mxVerified: boolean;
  mxExchange: string;
  spfStatus: 'pass' | 'warn';
  dkimStatus: 'pass' | 'warn';
  dmarcStatus: 'pass' | 'warn';
  dailyCapPerInbox: number;
  bounceRateCeilingPct: number;
  spamComplaintCeilingPct: number;
  readyToSend: boolean;
  summary: string;
}

export interface ReplyTriageResult {
  classification:
    | 'positive_book_meeting'
    | 'objection_timing'
    | 'objection_budget'
    | 'referral_forwarded'
    | 'question_technical'
    | 'ooo_auto_reply'
    | 'hard_opt_out_dnc';
  confidence: number;
  crmAction: string;
  suppressionListAdded: boolean;
  suggestedFollowUp: string;
}

export interface WebsiteTeardownResult {
  domain: string;
  companyName: string;
  icpSummary: string;
  buyerPersona: string;
  signals: string[];
  researchHook: string;
  subject: string;
  fullEmail: string;
  bodyOnlyToken: string;
  lint: EmailLintResult;
}

export interface StepConnectorConfig {
  signalsSource: 'web_search' | 'other_workflow' | 'general_prompt' | 'icp_only';
  companySource: 'gemini_discovery' | 'spreadsheet_csv' | 'crm_webhook';
  contactSource: 'web_linkedin_mx' | 'data_tool_clay_zoominfo' | 'already_have_contacts';
  outreachRoute: 'mailbox_direct' | 'sequence_platform_api';
  outreachPlatformName: string;
  webhookUrl: string;
  senderName: string;
  senderRole: string;
  senderCompany: string;
  senderDomain?: string;
}

export interface HarnessBlueprint {
  workflowName: string;
  campaignBriefPrompt?: string;
  icp: string;
  signalHypothesis: string;
  productsAndServices: string;
  valueProposition: string;
  tone: string;
  emailMode: EmailMode;
  entryMode: EntryMode;
  targetRuntime: TargetRuntime;
  selectedTools: string[];
  selectedRegistrySlugs?: string[];
  batchSize: number;
  connectors: StepConnectorConfig;
  icpProfile?: IcpArchitectProfile;
}

export interface WholenessCriterion {
  id: string;
  label: string;
  met: boolean;
  hint: string;
}

export interface WholenessReport {
  score: number;
  metCount: number;
  totalCount: number;
  passed: boolean;
  criteria: WholenessCriterion[];
}

export interface WorkflowStepSkill {
  id: StepId;
  stepNumber: string;
  title: string;
  subtitle: string;
  wave: number;
  precondition: string;
  bypassed: boolean;
  connector: string;
  systemPrompt: string;
  inputContract: string;
  outputContract: string;
  status: StepStatus;
  latencyMs?: number;
  summary?: string;
  v1Approved?: boolean;
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface ConnectorDoc {
  toolId: string;
  toolName: string;
  category: string;
  authMethod: string;
  baseUrlOrNodeType: string;
  keyEndpointsOrModules: string[];
  rateLimits: string;
  mappingNotes: string;
  snippet: string;
  sources: GroundingSource[];
}

export interface MxExchange {
  exchange: string;
  priority: number;
}

export interface MxCheckResult {
  email: string;
  domain: string;
  validSyntax: boolean;
  hasMx: boolean;
  mxRecords: MxExchange[];
  status: 'verified' | 'no_mx' | 'invalid_syntax' | 'unchecked';
  checkedAt?: string;
}

export interface ResearchBrief {
  companyOverview: string;
  prospectOverview: string;
  inducedSignal: string;
  deducedSignal: string;
  productsFit: string;
  valueProposition: string;
  sources: GroundingSource[];
}

export interface EmailDraft {
  subject: string;
  body: string;
  bodyOnlyToken?: string;
  linkedinConnectionNote?: string;
  mode: EmailMode;
  lint?: EmailLintResult;
}

export interface ProspectRecord {
  id: string;
  company: string;
  domain: string;
  industry: string;
  employeeCount: string;
  contactName: string;
  contactTitle: string;
  email: string;
  linkedinHint: string;
  mx: MxCheckResult;
  brief: ResearchBrief;
  emailDraft: EmailDraft;
  truthNotice?: string;
  telemetryStatus: LeadTelemetryStatus;
  approvalStatus: 'pending' | 'approved' | 'dispatched' | 'flagged';
  dispatchedAt?: string;
}

export interface DagWaveLog {
  wave: number;
  label: string;
  steps: StepId[];
  parallelTasks: number;
  durationMs: number;
  status: 'completed' | 'bypassed' | 'paused';
  note: string;
}

export interface SkillPackFile {
  filename: string;
  stepId: string;
  title: string;
  content: string;
}

export interface PopArtifactFile {
  code: string;
  filename: string;
  title: string;
  content: string;
}

export interface CompiledBundle {
  generatedAt: string;
  n8nJson: string;
  n8nErrorWorkflowJson: string;
  makeBlueprintJson: string;
  gumloopFlowJson: string;
  composioCronTs: string;
  rostrConfigTs: string;
  crontabSpec: string;
  graphLoopTs: string;
  supabaseSchemaSql: string;
  backmapArchitectureMd: string;
  rostrManifestYaml: string;
  permissionsPolicyYaml: string;
  skillPack: SkillPackFile[];
  popArtifacts: PopArtifactFile[];
}

export interface ToolCatalogItem {
  id: string;
  name: string;
  category: 'Orchestrator' | 'Signals & Data' | 'Outreach' | 'Agent SDK' | 'DNS & Ops';
  summary: string;
  docQueryHint: string;
}
