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
}

export interface HarnessBlueprint {
  workflowName: string;
  icp: string;
  signalHypothesis: string;
  productsAndServices: string;
  valueProposition: string;
  tone: string;
  emailMode: EmailMode;
  entryMode: EntryMode;
  targetRuntime: TargetRuntime;
  selectedTools: string[];
  batchSize: number;
  connectors: StepConnectorConfig;
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
  mode: EmailMode;
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
  makeBlueprintJson: string;
  gumloopFlowJson: string;
  composioCronTs: string;
  crontabSpec: string;
  graphLoopTs: string;
  skillPack: SkillPackFile[];
  popArtifacts: PopArtifactFile[];
}

export interface ToolCatalogItem {
  id: string;
  name: string;
  category: 'Orchestrator' | 'Signals & Data' | 'Outreach' | 'Agent SDK';
  summary: string;
  docQueryHint: string;
}
