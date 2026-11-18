---
name: backmap
description: Scan any codebase, database schema, API surface, and infrastructure config to map how the current architecture lies, generate system and data-flow diagrams, produce a current-state architecture report, and build a current-state vs. desired-state roadmap. Portable across all agent platforms and harnesses (Claude Code, Cursor, Codex, Gemini, Windsurf, and custom agent runners). Use when the user asks to map architecture, audit a repo or database, visualize system topology, run gap analysis, plan a migration or refactor roadmap, or run backmap.
---

# backmap

## Summary

Map how a software system actually works today and chart how to get it to a target architecture. `backmap` runs a deterministic scan across codebase structure, dependencies, database schemas, API routes, agent/AI layers, and deployment configs, then produces three concrete outputs: architecture diagrams (Mermaid), a current-state architecture report, and a phased current-state vs. desired-state roadmap.

## When to Use

- You need to understand an unfamiliar, sprawling, or undocumented codebase and database
- You want visual system, data-flow, and entity-relationship diagrams grounded in actual files
- You need a current-state vs. desired-state gap analysis and migration roadmap (e.g. monolith to services, local script to SaaS, adding multi-tenancy, swapping ORMs, or adopting an agent harness)
- You want a portable architecture audit workflow that works across any agent platform or harness
- The user asks to "run backmap", "map my architecture", or "build a current vs desired state roadmap"

## Steps

### Step 1: Capture Scope and Desired State

Before scanning, clarify or extract from the user's prompt:

1. **Target Scope**: Root directory of the repo (or multiple repos/services) and whether live database introspection is available or static schema/migration parsing should be used.
2. **Desired State**: What the user wants the architecture to become (e.g. target scale, new platform/cloud, security/multi-tenancy goals, AI/agent integration, or tech debt elimination). If the user has not specified a desired state, infer sensible industry-standard targets from the scan findings (e.g. fixing single points of failure, missing auth boundaries, or N+1 bottlenecks) and label them as recommended targets for confirmation.

### Step 2: Run the Deterministic Architecture Scan

Use the bundled zero-dependency Python scanner to inventory the system without blowing up your context window:

```bash
python3 scripts/scan_architecture.py <project_root> --out <output_dir>
```

The scanner inspects:

- **Workspace & Monorepo Topology**: Root packages, workspaces (`pnpm`, `npm`, `turbo`, `nx`, `Cargo`, Python).
- **Dependencies & Frameworks**: Web frameworks, AI/agent SDKs, ORMs, auth providers, queues, and MCP configs.
- **Database & Data Layer**: `prisma/schema.prisma`, Drizzle schemas, Supabase/SQL migrations, Alembic/SQLAlchemy models, and extracted table/model names.
- **API & Entrypoints**: App/Pages router endpoints, REST/GraphQL/tRPC handlers, webhooks, cron jobs, workers, and MCP servers.
- **Infrastructure & Config**: Docker, Terraform, `vercel.json`, `wrangler.toml`, CI/CD workflows, and environment variable keys (keys only, never secret values).

If a live database connection is explicitly provided and permitted (e.g. read-only `psql` or `supabase db dump --schema-only`), supplement the static scan with live table, index, foreign-key, and RLS policy counts. Never expose or log credential values.

### Step 3: Deep-Read Key Architectural Seams

Use the scan output (`backmap-scan.json` and `backmap-scan-summary.md`) to target only the highest-signal files rather than reading the entire repo:

1. **Entrypoints & Auth Middleware**: Read main server/app entrypoints, middleware, and auth/session guards to trace trust boundaries.
2. **Core Data Models & Hot Paths**: Read primary schema files and the busiest API/worker handlers to trace how data flows from client -> API -> queue/agent -> database.
3. **External Integrations**: Read webhook handlers, third-party SDK wrappers, and MCP/tool definitions to identify external dependencies and failure modes.

### Step 4: Generate Architecture Diagrams

Follow `references/diagram-patterns.md` to produce valid, readable Mermaid diagrams grounded strictly in verified files and tables:

1. **System Context & Container Diagram**: Show clients, frontend surfaces, API/backend services, agent/AI runners, databases, queues, and external APIs with protocol labels.
2. **Data & Auth Flow Diagram**: Trace primary request, webhook, or agent execution paths across trust boundaries.
3. **Database ER Diagram**: Map core tables/models and their relationships extracted from the schema/migrations.

Keep node labels concise, group nodes with `subgraph` blocks by runtime/layer, and validate Mermaid syntax so diagrams render cleanly in GitHub, Notion, Markdown viewers, or HTML exports.

### Step 5: Write the Current-State Architecture Report

Populate `assets/architecture-report-template.md` with verified findings:

- **Executive Summary & Topology**: High-level system shape, primary runtimes, and deployment footprint.
- **Component & Stack Inventory**: Verified frameworks, versions, and service responsibilities with file-path citations.
- **Data Layer & Schema Audit**: Tables/models, migration strategy, indexing/RLS posture, and state management.
- **API, Agent & Integration Surface**: Route groups, auth mechanisms, webhooks, background jobs, and external dependencies.
- **Architectural Risks & Bottlenecks**: Concrete, evidence-backed findings (coupling, missing validation, unindexed hot paths, secret/env sprawl, single points of failure).

### Step 6: Build the Current State vs. Desired State Roadmap

Populate `assets/roadmap-template.md` to bridge where the system is today with where it needs to go:

1. **Side-by-Side Comparison Matrix**: Compare Current State vs. Desired State across Compute/Runtime, Data/Storage, Auth/Security, AI/Agents, Observability, and DX/CI-CD.
2. **Gap Analysis**: Quantify the delta for each domain (what exists, what is missing, what must be retired or refactored).
3. **Phased Execution Roadmap**: Organize work into sequential phases (Phase 1: Stabilize & Secure, Phase 2: Decouple & Scale, Phase 3: Target Capabilities & Optimization) with concrete tasks, affected file paths, dependencies, effort sizing, and verification gates.

### Step 7: Deliver Outputs Portably Across Harnesses

Consult `references/harness-compatibility.md` to adapt delivery to the active platform or harness:

- Save the generated artifacts (`architecture-report.md`, `architecture-diagrams.md`, `architecture-roadmap.md`, or a combined `backmap-package.md`) to the workspace/output directory if file creation is supported, or present them cleanly in chat if running in a text-only harness.
- If the user requests visual exports (PNG/SVG/HTML/PDF), render the Mermaid diagrams or package the report using the host environment's available rendering tools.

## Bundled Resources

- `scripts/scan_architecture.py`: Zero-dependency Python 3 scanner for codebases, databases/migrations, API routes, and infra configs.
- `references/diagram-patterns.md`: Mermaid diagram templates (System/Container, Data Flow, ER) and syntax guardrails.
- `references/harness-compatibility.md`: Portability guide for running `backmap` across Claude Code, Cursor, Codex, Gemini, Windsurf, and custom agent harnesses.
- `assets/architecture-report-template.md`: Structured template for the current-state architecture report.
- `assets/roadmap-template.md`: Structured template for the current-state vs. desired-state roadmap.

## Gotchas

- **Never fabricate files, tables, or integrations**: Every node in a diagram and every line in the report must trace back to a scanned file, dependency, or schema. Mark unverified runtime details as `[Needs Runtime Verification]`.
- **Never read or print secret values**: When scanning `.env*` files, record only variable key names (e.g. `DATABASE_URL`, `STRIPE_WEBHOOK_SECRET`), never their values.
- **Avoid diagram clutter**: If a database has 40+ tables or an app has 80+ routes, group them by domain/module in the system diagram and show only core entities in the ER diagram, listing the full inventory in the report.
- **Keep instructions harness-agnostic**: Do not assume a single IDE, cloud provider, or agent toolset; use standard shell/file operations with clear fallbacks.
