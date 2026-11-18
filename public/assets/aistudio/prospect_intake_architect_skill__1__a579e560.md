---
name: prospect-intake-architect
description: Complete GTM Vertical Agent Harness and interactive section-by-section intake architect for outbound and revenue engines. Use when the user wants to design, intake, configure, test, or compile a go-to-market automation across Make.com, n8n, Gumloop, portable skills, or a cron job agent backend through the 6-section pipeline (Signals, Companies, Contacts, Research, Email, Outreach) plus Closed-Loop Reply Triage, Credit-Aware Enrichment Waterfalls, Deliverability Circuit Breakers, Enably ICP/persona synthesis, /r tool documentation registry lookups, per-section spec docs, and V1 test-and-edit gates.
---

# Prospect Intake Architect - GTM Vertical Agent Harness

## Summary

Guides revenue teams and GTM engineers through designing, testing, and compiling an end-to-end Go-To-Market (GTM) Vertical Agent across five runtimes (`Make.com`, `n8n`, `Gumloop`, `Portable Skills`, or `Cron Job + Agent Backend`). For each of the six pipeline sections (`01 Signals`, `02 Companies`, `03 Contacts`, `04 Research`, `05 Email`, `06 Outreach`) plus the `07 Reply & Revenue Triage Loop`, it extracts user intent, synthesizes ICPs and buyer personas via the Enably co-pilot, configures credit-aware enrichment waterfalls, resolves API schemas from the `/r` Tool Documentation Registry, enforces deliverability circuit breakers, generates per-section spec docs (`SECTION-0X-SPEC.md`), and runs a V1 test with an edit gate before advancing.

## When to Use

- The user wants to build, configure, or intake an outbound sales, GTM engineering, or revenue automation workflow step by step.
- The user names an automation target (`Make.com`, `n8n`, `Gumloop`, `Skills`, or `Cron Agent`) and needs to wire tools for signals, companies, contacts, research, email drafting, sequence outreach, or reply triage.
- The user wants a GTM agent harness that combines connected enterprise tools (Factors.ai, ZoomInfo, Clay, Apollo, Firecrawl, Exa, Smartlead, HubSpot, Salesforce) with zero-cost open-source fallbacks (DuckDuckGo Search API, Jina Reader, Cloudflare DNS MX, Reacher, local Ollama), credit-capped waterfalls, and V1 section test gates.

## Steps

### Step 0: Select the Automation Runtime and GTM Playbook Preset

Ask the user which primary runtime they want to compile for (and whether they want to start from a 1-click GTM Playbook or blank intake):

- `Make.com`: Compiles a scenario blueprint (`pae-main.blueprint.json`) with routers, HTTP modules, and CRM writebacks.
- `n8n`: Compiles a node graph (`pae-main.json` and `pae-error-alert.json`) with `n8n-nodes-base` and deterministic JavaScript Code gates.
- `Gumloop`: Compiles a modular AI pipeline (`pae-gumloop-flow.json`) with web scraper nodes, sub-flows, and CRM writers.
- `Portable Skills`: Compiles an 8-skill `SKILL.md` bundle (`prospect-outreach` master skill, Steps 1 to 6, and `n8n-engineer-companion`).
- `Cron Job + Agent Backend`: Configures a stateful ROSTR Durable Object and scheduled Cloudflare Worker cron job (`0 8 * * 1-5`) backed by Supabase Postgres and Vault.

### Step 1: Run the 6-Part Section Micro-Cycle (Sections 01 to 06 + Reply Loop)

Process one section at a time in strict order (`01 Signals` -> `02 Companies` -> `03 Contacts` -> `04 Research` -> `05 Email` -> `06 Outreach`). Execute six actions in every section:

1. **Extract Purpose and Run Enably Synthesis**: Ask what the section must achieve. If the user lacks a formal ICP/signal rubric (Section 01), buyer persona matrix (Section 03), or industry copywriting rubric (Section 05), invoke the Enably synthesis workflow (`references/enably-prompts.md`) to generate it from their domain and product offer.
2. **Audit Connected Tools vs. Custom Code Build**: Ask which tools the user already has for this section or whether the harness should generate a custom HTTP/scraper/code workflow.
3. **Configure Credit-Aware Waterfall Order**: When multiple data or research tools are available, order them from lowest cost (`$0.00` CRM cache / free DNS / Jina) to highest cost (`$0.08` enterprise waterfall), halting as soon as verification confidence (`>= 0.95`) is met.
4. **Resolve Tool Docs via `/r` Registry + PAL Intent Extractor**: Match the selected tools against `references/tool-docs-registry.md` (or fetch `/r/docs/{tool_slug}`) so the PAL Intent Extractor binds the exact endpoint URL, auth header, rate limit, and CRM property mapping.
5. **Generate Section Preview and Documentation (`SECTION-0X-SPEC.md`)**: Output a structured architecture preview and markdown specification document covering purpose, waterfall order, resolved API endpoints, guardrails, and CRM writeback fields.
6. **Execute V1 Section Test and Edit Gate**: Run a V1 dry-run test on sample records, display the output payload and cost-per-lead estimate, and ask whether to approve V1 and advance to the next section or edit the current section.

### Step 2: Walk Through the Six Core Architecture Sections + Reply Loop

#### Section 01: Signals (`01-signals`)

- **Questions to Ask**: Who is the ICP and what buying signal proves they are ready to buy right now? Which signal tools do you have connected (Factors.ai, ZoomInfo Workflows, Common Room, RB2B, 6sense, Clay Signals), or should we build a daily live search workflow (DuckDuckGo Search API, Google News RSS, Greenhouse/Lever job boards, SEC 8-K filings)? Do you want the Enably agent to build out the ICP and signals first?
- **Output & Gate**: Generates `signals_brief` JSON and `SECTION-01-SIGNALS.md`. Halts with `config_incomplete` if any `TODO:` placeholder remains.

#### Section 02: Companies (`02-companies`)

- **Questions to Ask**: Should we pull existing accounts from your CRM (HubSpot, Salesforce, Pipedrive, Attio) that match the Section 01 signal, or discover net-new companies from a data provider (Apollo, Clay, ZoomInfo, Ocean.io) and upsert them back to your CRM? What minimum fit threshold (`min_confidence`, default `0.60`) should we enforce?
- **Output & Gate**: Deduplicates companies by root domain, checks the global `suppression_list` (DNC/competitors/existing customers), scores fit against Section 01, logs low-scoring records as `skipped_low_fit`, upserts qualified accounts to CRM, and generates `SECTION-02-COMPANIES.md`.

#### Section 03: Contacts (`03-contacts`)

- **Questions to Ask**: Which buyer personas (titles, seniority, department) match your companies and signals (or should Enably build the persona matrix)? Which contact waterfall order should we run (CRM Check -> Apollo -> Prospeo/Hunter -> Clay/ZoomInfo -> Custom Pattern + DNS MX / Reacher verifier)?
- **Output & Gate**: Stops the waterfall on the first verified email (`confidence >= 0.95`), associates contacts to CRM company IDs, tags pattern-guessed emails as `guessed_unverified` (blocked from live send unless `allow_guessed_sends` is true), and generates `SECTION-03-CONTACTS.md`.

#### Section 04: Research (`04-research`)

- **Questions to Ask**: What research angle should we extract for each contact (Company, Prospect, Induced Signal, Deduced Bottleneck)? Which scraping or search waterfall should run (DuckDuckGo API + Jina Reader -> Firecrawl -> Exa Neural Search -> Apify Actors -> Perplexity Sonar)?
- **Output & Gate**: Produces a 6-part research brief requiring a verbatim `evidence_quote` and `evidence_url` for every hook. Unverified hooks are discarded; contacts with zero verified hooks are marked `needs_review`. Generates `SECTION-04-RESEARCH.md`.

#### Section 05: Email (`05-email`)

- **Questions to Ask**: What outreach best practices apply to your industry and ICP (word count cap, detailed technical proof vs. concise opener, peer tone)? Which LLM model should write the copy (Claude 3.7 Sonnet, GPT-4o, Gemini, or local Ollama)? Should we output `body_only` (`{{email_1_body}}` synced back to your CRM) or `full_email`?
- **Output & Gate**: Runs the deterministic 5-rule linter (<= 120 words, no fake `Re:`/`Fwd:`, no `!`, no raw URLs, no `{{placeholders}}`, no unverified digits), patches the CRM contact record with `{{email_1_body}}` and `{{email_1_subject}}`, and generates `SECTION-05-EMAIL.md`.

#### Section 06: Outreach & Deliverability Shield (`06-outreach`)

- **Questions to Ask**: How should approved messages go out: enroll in a sequence tool (Smartlead, Instantly, Outreach, HubSpot Sequences), POST to a custom code endpoint, or send directly from your inbox connector (Gmail/Outlook)? What deliverability circuit breakers (`max_sends_per_inbox: 35`, `max_bounce_rate: 2.5%`) and CRM activity writebacks should we enforce?
- **Output & Gate**: Verifies `SPF/DKIM/DMARC` and an opt-out signature line before permitting live sends, defaults to `dry_run: true` (`nothing_was_sent`), wires the **Closed-Loop Reply Triage webhook** (classifying replies into `positive_book_meeting`, `objection_timing`, `referral`, `ooo`, or `hard_opt_out_dnc` with automatic CRM + DNC sync), and compiles the final V1 bundle (`Make.com`, `n8n`, `Gumloop`, `Skills`, or `Cron Agent`).

## Gotchas

- Never skip the per-section V1 preview and test gate; users must verify each section's tool binding, credit cost, and CRM writeback before moving to the next section.
- Always check `references/tool-docs-registry.md` so the PAL Intent Extractor outputs accurate endpoint paths, headers, and rate limits rather than generic placeholders.
- Keep `body_only` (`{{email_1_body}}`) free of greetings and signatures when syncing back to a CRM or sequence token so downstream templates do not double-greet prospects.
