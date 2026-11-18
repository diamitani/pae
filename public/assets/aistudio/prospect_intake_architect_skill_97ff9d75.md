---
name: prospect-intake-architect
description: Interactive section-by-section intake and architecture agent for outbound prospecting engines. Use when the user wants to design, intake, configure, test, or compile an outbound automation across Make.com, n8n, Gumloop, portable skills, or a cron job agent backend through the 6-section pipeline (Signals, Companies, Contacts, Research, Email, Outreach) with Enably ICP/persona generation, tool documentation registry lookups, per-section spec docs, and V1 test-and-edit gates.
---

# Prospect Intake Architect

## Summary

Guides users through building a production outbound automation one section at a time across five supported runtimes (`Make.com`, `n8n`, `Gumloop`, `Portable Skills`, or `Cron Job + Agent Backend`). For each of the six pipeline sections (`01 Signals`, `02 Companies`, `03 Contacts`, `04 Research`, `05 Email`, `06 Outreach`), it extracts user intent, optionally invokes the Enably co-pilot to synthesize ICPs or buyer personas, resolves API schemas from the backend Tool Documentation Registry (`/r` endpoint), generates a section architecture preview and spec doc (`SECTION-0X-SPEC.md`), and runs a V1 test with an edit gate before advancing.

## When to Use

- The user wants to build, configure, or intake an outbound sales or prospecting workflow step by step.
- The user names an automation target (`Make.com`, `n8n`, `Gumloop`, `Skills`, or `Cron Agent`) and needs to wire tools for signals, companies, contacts, research, email drafting, or sequence outreach.
- The user wants an intake agent that checks connected tools vs. building custom scrapers/endpoints, looks up tool documentation via `/r` endpoints, drafts per-section docs, and runs V1 section tests before compiling.

## Steps

### Step 0: Select the Automation Runtime Target

Ask the user which primary runtime they want to compile for before starting Section 01:

- `Make.com`: Compiles a scenario blueprint (`pae-main.blueprint.json`) with routers, HTTP modules, and CRM writebacks.
- `n8n`: Compiles a node graph (`pae-main.json` and `pae-error-alert.json`) with `n8n-nodes-base` and deterministic JavaScript Code gates.
- `Gumloop`: Compiles a modular AI pipeline (`pae-gumloop-flow.json`) with web scraper nodes, sub-flows, and CRM writers.
- `Portable Skills`: Compiles an 8-skill `SKILL.md` bundle (`prospect-outreach` master skill, Steps 1 to 6, and `n8n-engineer-companion`).
- `Cron Job + Agent Backend`: Configures a stateful ROSTR Durable Object and scheduled Cloudflare Worker cron job (`0 8 * * 1-5`) backed by Supabase Postgres and Vault.

### Step 1: Run the 5-Part Section Micro-Cycle (Sections 01 to 06)

Process one section at a time in strict order (`01 Signals` -> `02 Companies` -> `03 Contacts` -> `04 Research` -> `05 Email` -> `06 Outreach`). Execute five actions in every section:

1. **Extract Purpose and Offer Enably Synthesis**: Ask what the section must achieve. If the user lacks a formal ICP/signal matrix in Section 01 or a buyer persona matrix in Section 03, invoke the Enably synthesis workflow (`references/enably-prompts.md`) to build it from their domain and product offer.
2. **Audit Connected Tools vs. Custom Build**: Ask which tools the user already has for this section or whether the system should generate a custom code/HTTP workflow.
3. **Resolve Tool Docs via `/r` Registry + PAL Intent Extractor**: Match the user's selected tools against `references/tool-docs-registry.md` (or fetch live docs via `/r/{tool_slug}`) so the PAL Intent Extractor binds the exact endpoint URL, auth header, rate limit, and payload mapping.
4. **Generate Section Preview and Documentation (`SECTION-0X-SPEC.md`)**: Output a structured preview card and markdown specification document covering purpose, bound tools, resolved API endpoints, guardrails, and CRM sync fields.
5. **Execute V1 Section Test and Edit Gate**: Simulate or execute a V1 test on sample records, display the output payload, and ask whether to approve V1 and advance to the next section or edit the current section.

### Step 2: Walk Through the Six Architecture Sections

Use the section-specific questions, tool options, and contracts below as you step from Section 01 to Section 06:

#### Section 01: Signals (`01-signals`)

- **Questions to Ask**: Who is the ICP and what buying signal proves they are ready to buy right now? Which signal tools do you have connected (ZoomInfo Workflows, Factors.ai, Common Room, Clay Signals), or should we build a daily live search workflow (DuckDuckGo Search API, Google News RSS, job boards, SEC filings)? Do you want the Enably agent to build out the ICP and signals first?
- **Output & Gate**: Generates `signals_brief` JSON and `SECTION-01-SIGNALS.md`. Halts with `config_incomplete` if any `TODO:` placeholder remains.

#### Section 02: Companies (`02-companies`)

- **Questions to Ask**: Should we pull existing accounts from your CRM (HubSpot, Salesforce, Pipedrive, Attio) that match the Section 01 signal, or discover net-new companies from a data provider (Apollo, Clay, ZoomInfo, Ocean.io) and write them back to your CRM? What minimum fit threshold (`min_confidence`, default `0.60`) should we enforce?
- **Output & Gate**: Deduplicates companies by root domain, scores fit against Section 01, logs low-scoring records as `skipped_low_fit` (never dropped silently), configures CRM upsert, and generates `SECTION-02-COMPANIES.md`.

#### Section 03: Contacts (`03-contacts`)

- **Questions to Ask**: Which buyer personas (titles, seniority, department) match your companies and signals (or should Enably build the persona matrix)? Which contact data tool do you have (Clay waterfall, Apollo, ZoomInfo, Hunter, Prospeo), or should we build a custom first/last email pattern generator with DNS MX and Reacher verification?
- **Output & Gate**: Resolves decision-makers linked to CRM company IDs, tags pattern-guessed emails as `guessed_unverified` (blocked from live send unless `allow_guessed_sends` is true), and generates `SECTION-03-CONTACTS.md`.

#### Section 04: Research (`04-research`)

- **Questions to Ask**: What research angle should we extract for each contact (Company, Prospect, Induced Signal, Deduced Signal)? Which scraping or search tools do you want to use (Apify actors, Firecrawl, Exa, Perplexity Sonar, or free DuckDuckGo Search API / Jina Reader)?
- **Output & Gate**: Produces a 6-part research brief requiring a verbatim `evidence_quote` and `evidence_url` for every hook. Unverified hooks are discarded; contacts with zero verified hooks are marked `needs_review`. Generates `SECTION-04-RESEARCH.md`.

#### Section 05: Email (`05-email`)

- **Questions to Ask**: What outreach best practices apply to your industry and ICP (word count cap, detailed technical proof vs. concise opener, tone)? Which LLM model should write the copy (Claude 3.7 Sonnet, GPT-4o, Gemini, or local Ollama)? Should we output `body_only` (`{{email_1_body}}` synced back to your CRM) or `full_email`?
- **Output & Gate**: Runs the deterministic 5-rule linter (<= 120 words, no fake `Re:`/`Fwd:`, no `!`, no raw URLs, no `{{placeholders}}`, no unverified digits), patches the CRM contact record with `{{email_1_body}}`, and generates `SECTION-05-EMAIL.md`.

#### Section 06: Outreach (`06-outreach`)

- **Questions to Ask**: How should approved messages go out: enroll in a sequence tool (Smartlead, Instantly, Outreach, HubSpot Sequences), POST to a custom code endpoint, or send directly from your inbox connector (Gmail/Outlook)? How should subject lines, bodies, and send statuses sync back to your CRM?
- **Output & Gate**: Enforces `dry_run: true` by default and verifies an opt-out signature line before permitting live sends. Generates `SECTION-06-OUTREACH.md` and compiles the final V1 bundle for the chosen runtime (`Make.com`, `n8n`, `Gumloop`, `Skills`, or `Cron Agent`).

## Gotchas

- Never skip the per-section V1 preview and test gate; users need to verify each section's tool binding and CRM writeback before moving to the next section.
- Always check `references/tool-docs-registry.md` so the PAL Intent Extractor outputs accurate endpoint paths, headers, and rate limits rather than generic placeholders.
- Keep `body_only` (`{{email_1_body}}`) free of greetings and signatures when syncing back to a CRM or sequence token so downstream templates do not double-greet prospects.
