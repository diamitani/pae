import 'dotenv/config';
import { resolveMx } from 'node:dns/promises';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, Type } from '@google/genai';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import type {
  ConnectorDoc,
  DagWaveLog,
  GroundingSource,
  HarnessBlueprint,
  MxCheckResult,
  ProspectRecord,
  ToolCatalogItem,
  WorkflowStepSkill,
} from './src/types/harness.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const MODEL_NAME = 'gemini-4-hydrogen';

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not configured. Please add your Gemini API key in Settings > Secrets.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function extractGroundingSources(response: unknown): GroundingSource[] {
  const res = response as {
    candidates?: Array<{
      groundingMetadata?: {
        groundingChunks?: Array<{
          web?: { uri?: string; title?: string };
        }>;
      };
    }>;
  };
  const chunks = res?.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  const seen = new Set<string>();
  const sources: GroundingSource[] = [];
  for (const chunk of chunks) {
    const uri = chunk?.web?.uri;
    const title = chunk?.web?.title;
    if (uri && !seen.has(uri)) {
      seen.add(uri);
      sources.push({ title: title || uri, uri });
    }
  }
  return sources.slice(0, 6);
}

function extractDomain(emailOrDomain: string): string {
  const trimmed = emailOrDomain.trim().toLowerCase();
  if (trimmed.includes('@')) {
    return trimmed.split('@')[1] || '';
  }
  return trimmed.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
}

async function performMxCheck(email: string, domainHint?: string): Promise<MxCheckResult> {
  const cleanEmail = email.trim();
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const validSyntax = emailRegex.test(cleanEmail);
  const domain = extractDomain(domainHint || cleanEmail);

  if (!validSyntax || !domain) {
    return {
      email: cleanEmail,
      domain,
      validSyntax,
      hasMx: false,
      mxRecords: [],
      status: 'invalid_syntax',
      checkedAt: new Date().toISOString(),
    };
  }

  try {
    const records = await resolveMx(domain);
    const sorted = [...records]
      .sort((a, b) => a.priority - b.priority)
      .slice(0, 5)
      .map((r) => ({ exchange: r.exchange, priority: r.priority }));
    return {
      email: cleanEmail,
      domain,
      validSyntax: true,
      hasMx: sorted.length > 0,
      mxRecords: sorted,
      status: sorted.length > 0 ? 'verified' : 'no_mx',
      checkedAt: new Date().toISOString(),
    };
  } catch {
    return {
      email: cleanEmail,
      domain,
      validSyntax: true,
      hasMx: false,
      mxRecords: [],
      status: 'no_mx',
      checkedAt: new Date().toISOString(),
    };
  }
}

function buildCalibratedTruthNotice(mx: MxCheckResult, email: string): string | undefined {
  if (!mx.validSyntax) {
    return `Operational Truth Gate: "${email}" failed email syntax validation. Verify the recipient address via LinkedIn or CRM before Step 06 dispatch.`;
  }
  if (!mx.hasMx) {
    return `Operational Truth Gate: Domain "${mx.domain}" returned no active DNS MX records. Confirm deliverability via direct search or data tool before sending.`;
  }
  return undefined;
}

function evaluateServerWholeness(bp: HarnessBlueprint): { passed: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!bp.workflowName || bp.workflowName.trim().length < 3) missing.push('Workflow Name');
  if (!bp.icp || bp.icp.trim().length < 12) missing.push('Target ICP');
  if (!bp.signalHypothesis || bp.signalHypothesis.trim().length < 10) missing.push('Signal Hypothesis');
  if (!bp.productsAndServices || bp.productsAndServices.trim().length < 12)
    missing.push('Products & Services');
  if (!bp.valueProposition || bp.valueProposition.trim().length < 12)
    missing.push('Value Proposition');
  if (!bp.selectedTools || bp.selectedTools.length === 0) missing.push('Connected Stack');
  if (!bp.connectors?.senderName?.trim() || !bp.connectors?.senderCompany?.trim())
    missing.push('Sender Attribution');
  return { passed: missing.length === 0, missing };
}

function formatErrorMessage(err: unknown): { status: number; message: string } {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes('GEMINI_API_KEY')) {
    return { status: 400, message: msg };
  }
  if (msg.includes('403') || msg.includes('PERMISSION_DENIED') || msg.includes('API_KEY_INVALID')) {
    return {
      status: 403,
      message: 'Gemini API key permission error. Please check your key in Settings > Secrets.',
    };
  }
  if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
    return {
      status: 429,
      message: 'Gemini API rate limit reached. Please retry in a few seconds.',
    };
  }
  return { status: 500, message: msg || 'Unexpected server error.' };
}

function isSafeWebhookUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
    const host = parsed.hostname.toLowerCase();
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host === '::1' ||
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      host.startsWith('169.254.')
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '4mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, hasGeminiKey: Boolean(process.env.GEMINI_API_KEY) });
  });

  // 1. Live DNS MX Record Verification
  app.post('/api/verify/mx', async (req, res) => {
    try {
      const items = Array.isArray(req.body?.items) ? req.body.items : [];
      if (items.length === 0) {
        res.status(400).json({ error: 'Provide at least one email or domain to verify.' });
        return;
      }
      const results = await Promise.all(
        items.slice(0, 25).map((item: { email?: string; domain?: string }) =>
          performMxCheck(item.email || '', item.domain)
        )
      );
      res.json({ results });
    } catch (err) {
      const formatted = formatErrorMessage(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  // 2. Connector Documentation Grounding via Gemini + Google Search
  app.post('/api/docs/ground', async (req, res) => {
    try {
      const ai = getGeminiClient();
      const tools: ToolCatalogItem[] = Array.isArray(req.body?.tools) ? req.body.tools : [];
      const blueprint: HarnessBlueprint = req.body?.blueprint;
      if (tools.length === 0) {
        res.status(400).json({ error: 'Select at least one tool in your stack to ground docs.' });
        return;
      }

      const docs = await Promise.all(
        tools.slice(0, 6).map(async (tool) => {
          const searchRes = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: `Look up current official developer documentation for "${tool.name}" (${tool.docQueryHint}) for building an automated B2B outreach workflow (${blueprint?.workflowName || 'SalesGency'}). Summarize its authentication method, primary API endpoint or workflow node type, key parameters/modules, rate limits, and a short integration config snippet.`,
            config: {
              tools: [{ googleSearch: {} }],
            },
          });

          const sources = extractGroundingSources(searchRes);
          const groundedText = searchRes.text || '';

          const structuredRes = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: `Convert the following grounded tool documentation notes for "${tool.name}" into structured JSON.\n\nNotes:\n${groundedText}`,
            config: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  authMethod: { type: Type.STRING },
                  baseUrlOrNodeType: { type: Type.STRING },
                  keyEndpointsOrModules: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  rateLimits: { type: Type.STRING },
                  mappingNotes: { type: Type.STRING },
                  snippet: { type: Type.STRING },
                },
                required: [
                  'authMethod',
                  'baseUrlOrNodeType',
                  'keyEndpointsOrModules',
                  'rateLimits',
                  'mappingNotes',
                  'snippet',
                ],
              },
            },
          });

          const parsed = JSON.parse(structuredRes.text || '{}');
          const doc: ConnectorDoc = {
            toolId: tool.id,
            toolName: tool.name,
            category: tool.category,
            authMethod: parsed.authMethod || 'API Key / Bearer Token',
            baseUrlOrNodeType: parsed.baseUrlOrNodeType || tool.name,
            keyEndpointsOrModules: Array.isArray(parsed.keyEndpointsOrModules)
              ? parsed.keyEndpointsOrModules
              : [],
            rateLimits: parsed.rateLimits || 'Check provider tier limits',
            mappingNotes: parsed.mappingNotes || tool.summary,
            snippet: parsed.snippet || '{}',
            sources,
          };
          return doc;
        })
      );

      res.json({ docs });
    } catch (err) {
      const formatted = formatErrorMessage(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  // 3. Live Middle-Out 6-Step DAG Runner
  app.post('/api/harness/run', async (req, res) => {
    try {
      const ai = getGeminiClient();
      const blueprint: HarnessBlueprint = req.body?.blueprint;
      const steps: WorkflowStepSkill[] = Array.isArray(req.body?.steps) ? req.body.steps : [];
      const existingLeads: ProspectRecord[] = Array.isArray(req.body?.existingLeads)
        ? req.body.existingLeads
        : [];

      if (!blueprint) {
        res.status(400).json({ error: 'Blueprint configuration is required.' });
        return;
      }

      const wholeness = evaluateServerWholeness(blueprint);
      if (!wholeness.passed) {
        res.status(400).json({
          error: `One Must Act Foundation Gate blocked run (W < 1.00). Missing: ${wholeness.missing.join(', ')}`,
        });
        return;
      }

      const waveLogs: DagWaveLog[] = [];
      const stepMetrics: Record<string, { latencyMs: number; summary: string }> = {};
      const batchSize = Math.min(Math.max(Number(blueprint.batchSize) || 3, 1), 6);

      const s1 = steps.find((s) => s.id === '01_signals');
      const s2 = steps.find((s) => s.id === '02_companies');
      const s3 = steps.find((s) => s.id === '03_contacts');
      const s4 = steps.find((s) => s.id === '04_research');
      const s5 = steps.find((s) => s.id === '05_email');

      // WAVE 1: Signals & Companies (or short-circuit if existing leads provided)
      let seedTargets: Array<{
        company: string;
        domain: string;
        industry: string;
        employeeCount: string;
        contactName: string;
        contactTitle: string;
        email: string;
        linkedinHint: string;
        signalHint?: string;
      }> = [];

      const wave1Start = Date.now();
      if (blueprint.entryMode === 'existing_leads' && existingLeads.length > 0) {
        seedTargets = existingLeads.slice(0, batchSize).map((l) => ({
          company: l.company,
          domain: l.domain || extractDomain(l.email),
          industry: l.industry || 'B2B Technology',
          employeeCount: l.employeeCount || 'Unknown',
          contactName: l.contactName,
          contactTitle: l.contactTitle,
          email: l.email,
          linkedinHint: l.linkedinHint || `site:linkedin.com/in ${l.contactName} ${l.company}`,
        }));
        waveLogs.push({
          wave: 1,
          label: 'Discovery (01 Signals -> 02 Companies)',
          steps: ['01_signals', '02_companies'],
          parallelTasks: 0,
          durationMs: Date.now() - wave1Start,
          status: 'bypassed',
          note: `Short-circuited via "Already have leads" precondition (${seedTargets.length} leads ingested).`,
        });
        stepMetrics['01_signals'] = { latencyMs: 0, summary: 'Bypassed (existing leads mode)' };
        stepMetrics['02_companies'] = {
          latencyMs: 0,
          summary: `Ingested ${seedTargets.length} provided rows`,
        };
      } else {
        // Live Signal Discovery + Company List + Persona Synthesis using Search Grounding
        const discoverySearch = await ai.models.generateContent({
          model: MODEL_NAME,
          contents: `Find ${batchSize} real, currently operating companies matching this ICP and buying signal.\n\nStep 01 Signals Prompt: ${s1?.systemPrompt || blueprint.signalHypothesis}\nStep 02 Companies Prompt: ${s2?.systemPrompt || blueprint.icp}\nStep 03 Buyer Persona Prompt: ${s3?.systemPrompt || 'Identify a real executive or relevant decision-maker and their likely corporate email format.'}\n\nReturn real company names, real root domains, real recent signals found via search, and realistic executive/department leader names & corporate email guesses (e.g. first@domain).`,
          config: {
            tools: [{ googleSearch: {} }],
          },
        });

        const discoverySources = extractGroundingSources(discoverySearch);
        const structuredDiscovery = await ai.models.generateContent({
          model: MODEL_NAME,
          contents: `Extract exactly ${batchSize} prospect targets into JSON from these grounded search findings. Include each company's real domain and signal summary.\n\nFindings:\n${discoverySearch.text || ''}`,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  company: { type: Type.STRING },
                  domain: { type: Type.STRING },
                  industry: { type: Type.STRING },
                  employeeCount: { type: Type.STRING },
                  contactName: { type: Type.STRING },
                  contactTitle: { type: Type.STRING },
                  email: { type: Type.STRING },
                  linkedinHint: { type: Type.STRING },
                  signalHint: { type: Type.STRING },
                },
                required: [
                  'company',
                  'domain',
                  'industry',
                  'employeeCount',
                  'contactName',
                  'contactTitle',
                  'email',
                  'linkedinHint',
                  'signalHint',
                ],
              },
            },
          },
        });

        seedTargets = JSON.parse(structuredDiscovery.text || '[]').slice(0, batchSize);
        const wave1Ms = Date.now() - wave1Start;
        waveLogs.push({
          wave: 1,
          label: 'Discovery (01 Signals -> 02 Companies)',
          steps: ['01_signals', '02_companies'],
          parallelTasks: 1,
          durationMs: wave1Ms,
          status: 'completed',
          note: `Grounded ${seedTargets.length} targets across ${discoverySources.length} web sources.`,
        });
        stepMetrics['01_signals'] = {
          latencyMs: Math.round(wave1Ms * 0.55),
          summary: `Found ${seedTargets.length} signal triggers`,
        };
        stepMetrics['02_companies'] = {
          latencyMs: Math.round(wave1Ms * 0.45),
          summary: `Normalized ${seedTargets.length} target domains`,
        };
      }

      if (seedTargets.length === 0) {
        res.status(400).json({
          error: 'No target companies or leads were produced in Wave 1. Check your ICP or uploaded leads.',
        });
        return;
      }

      // WAVE 2: Step 03 Contacts & Parallel DNS MX Verification
      const wave2Start = Date.now();
      const targetsWithMx = await Promise.all(
        seedTargets.map(async (target) => {
          const cleanDomain = extractDomain(target.domain || target.email);
          const candidateEmail =
            target.email && target.email.includes('@')
              ? target.email.trim()
              : `${(target.contactName.split(' ')[0] || 'team').toLowerCase()}@${cleanDomain}`;
          const mx = await performMxCheck(candidateEmail, cleanDomain);
          return {
            ...target,
            domain: cleanDomain,
            email: candidateEmail,
            mx,
          };
        })
      );
      const wave2Ms = Date.now() - wave2Start;
      const mxVerifiedCount = targetsWithMx.filter((t) => t.mx.hasMx).length;

      waveLogs.push({
        wave: 2,
        label: 'Resolution & MX Gate (03 Contacts)',
        steps: ['03_contacts'],
        parallelTasks: targetsWithMx.length,
        durationMs: wave2Ms,
        status: 'completed',
        note: `Verified DNS MX records in parallel (${mxVerifiedCount}/${targetsWithMx.length} active mail domains).`,
      });
      stepMetrics['03_contacts'] = {
        latencyMs: wave2Ms,
        summary: `${mxVerifiedCount}/${targetsWithMx.length} MX verified`,
      };

      // WAVE 3: Parallel Step 04 Research + Step 05 Email Synthesis
      const wave3Start = Date.now();
      const prospects: ProspectRecord[] = await Promise.all(
        targetsWithMx.map(async (target, idx) => {
          const researchSearch = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: `Conduct live account & signal research on "${target.company}" (${target.domain}) and buyer persona "${target.contactName}" (${target.contactTitle}).\n\nExisting hint: ${target.signalHint || 'None'}\nOur Products & Services: ${blueprint.productsAndServices}\nOur Value Proposition: ${blueprint.valueProposition}\nCustom Research Instruction: ${s4?.systemPrompt || ''}\n\nCover all 6 SalesGency brief points: Company overview, Prospect overview, Induced signal (direct evidence/quote/news), Deduced signal (strategic need inferred), How our products fit, and Tailored value proposition.`,
            config: {
              tools: [{ googleSearch: {} }],
            },
          });

          const researchSources = extractGroundingSources(researchSearch);

          const emailPromptRule =
            blueprint.emailMode === 'full'
              ? `Output mode is FULL EMAIL: include greeting ("Hi ${target.contactName.split(' ')[0] || 'there'},"), concise personalized body, and signature for ${blueprint.connectors.senderName} (${blueprint.connectors.senderRole}, ${blueprint.connectors.senderCompany}).`
              : `Output mode is BODY-ONLY CRM TOKEN: output ONLY the core personalized email body paragraphs with NO greeting ("Hi ...") and NO sign-off/signature, ready for a CRM sequence merge token.`;

          const structuredPackage = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: `Using the grounded research below, produce the structured 6-part SalesGency brief AND the personalized email draft.\n\nTone: ${blueprint.tone}\n${emailPromptRule}\nCustom Email Skill Prompt: ${s5?.systemPrompt || ''}\n\nResearch Notes:\n${researchSearch.text || ''}`,
            config: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  companyOverview: { type: Type.STRING },
                  prospectOverview: { type: Type.STRING },
                  inducedSignal: { type: Type.STRING },
                  deducedSignal: { type: Type.STRING },
                  productsFit: { type: Type.STRING },
                  valueProposition: { type: Type.STRING },
                  subject: { type: Type.STRING },
                  body: { type: Type.STRING },
                },
                required: [
                  'companyOverview',
                  'prospectOverview',
                  'inducedSignal',
                  'deducedSignal',
                  'productsFit',
                  'valueProposition',
                  'subject',
                  'body',
                ],
              },
            },
          });

          const parsed = JSON.parse(structuredPackage.text || '{}');
          const truthNotice = buildCalibratedTruthNotice(target.mx, target.email);

          return {
            id: `${target.domain}-${idx}-${Date.now()}`,
            company: target.company,
            domain: target.domain,
            industry: target.industry,
            employeeCount: target.employeeCount,
            contactName: target.contactName,
            contactTitle: target.contactTitle,
            email: target.email,
            linkedinHint: target.linkedinHint,
            mx: target.mx,
            brief: {
              companyOverview: parsed.companyOverview || '',
              prospectOverview: parsed.prospectOverview || '',
              inducedSignal: parsed.inducedSignal || '',
              deducedSignal: parsed.deducedSignal || '',
              productsFit: parsed.productsFit || '',
              valueProposition: parsed.valueProposition || '',
              sources: researchSources,
            },
            emailDraft: {
              subject: parsed.subject || `Quick question for ${target.company}`,
              body: parsed.body || '',
              mode: blueprint.emailMode,
            },
            truthNotice,
            approvalStatus: truthNotice ? 'flagged' : 'pending',
          };
        })
      );

      const wave3Ms = Date.now() - wave3Start;
      waveLogs.push({
        wave: 3,
        label: 'Synthesis (04 Research || 05 Email)',
        steps: ['04_research', '05_email'],
        parallelTasks: prospects.length,
        durationMs: wave3Ms,
        status: 'completed',
        note: `Compiled ${prospects.length} 6-part briefs and ${blueprint.emailMode === 'full' ? 'full emails' : 'CRM body tokens'} concurrently.`,
      });
      stepMetrics['04_research'] = {
        latencyMs: Math.round(wave3Ms * 0.65),
        summary: `${prospects.length} grounded 6-part briefs`,
      };
      stepMetrics['05_email'] = {
        latencyMs: Math.round(wave3Ms * 0.35),
        summary: `${prospects.length} ${blueprint.emailMode === 'full' ? 'full drafts' : 'CRM tokens'}`,
      };

      // WAVE 4: Durable Human Approval Gate
      waveLogs.push({
        wave: 4,
        label: 'Approval Gate -> 06 Outreach',
        steps: ['06_outreach'],
        parallelTasks: prospects.length,
        durationMs: 0,
        status: 'paused',
        note: 'Suspended with zero idle tokens awaiting human review & approval before Step 06 dispatch.',
      });
      stepMetrics['06_outreach'] = {
        latencyMs: 0,
        summary: 'Awaiting human approval',
      };

      res.json({ prospects, waveLogs, stepMetrics });
    } catch (err) {
      const formatted = formatErrorMessage(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  // 4. Outgoing Webhook Dispatch (Step 06 Execution after Explicit User Confirmation)
  app.post('/api/outreach/dispatch', async (req, res) => {
    try {
      const webhookUrl = String(req.body?.webhookUrl || '').trim();
      const prospects: ProspectRecord[] = Array.isArray(req.body?.prospects)
        ? req.body.prospects
        : [];
      const workflowName = String(req.body?.workflowName || 'SalesGency Harness');

      if (!webhookUrl || !isSafeWebhookUrl(webhookUrl)) {
        res.status(400).json({
          error: 'Provide a valid public http(s) webhook URL for outreach dispatch.',
        });
        return;
      }
      if (prospects.length === 0) {
        res.status(400).json({ error: 'Select at least one approved prospect to dispatch.' });
        return;
      }

      const payload = {
        source: 'salesgency-agent-harness',
        workflowName,
        dispatchedAt: new Date().toISOString(),
        count: prospects.length,
        prospects: prospects.map((p) => ({
          company: p.company,
          domain: p.domain,
          contactName: p.contactName,
          contactTitle: p.contactTitle,
          email: p.email,
          mxVerified: p.mx.hasMx,
          emailMode: p.emailDraft.mode,
          subject: p.emailDraft.subject,
          body: p.emailDraft.body,
          inducedSignal: p.brief.inducedSignal,
          deducedSignal: p.brief.deducedSignal,
        })),
      };

      const upstream = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const responseText = await upstream.text();
      if (!upstream.ok) {
        res.status(502).json({
          error: `Webhook returned HTTP ${upstream.status}: ${responseText.slice(0, 200)}`,
        });
        return;
      }

      res.json({
        ok: true,
        status: upstream.status,
        dispatchedCount: prospects.length,
        responsePreview: responseText.slice(0, 300),
      });
    } catch (err) {
      const formatted = formatErrorMessage(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  // Vite dev middleware or production static assets
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      const indexHtml = path.join(distPath, 'index.html');
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).send('Build not found. Run npm run build.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SalesGency Agent Harness listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
