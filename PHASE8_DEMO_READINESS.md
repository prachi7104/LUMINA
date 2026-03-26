# PHASE 8 - Demo Readiness, Final Polish, and Surprise Scenario Preparation

This guide is the final pre-judging runbook.

## 8.1 Pre-seed Demo Data

Run the pre-cache script 2 hours before judging:

```bash
cd api
python scripts/precache_demo.py --base-url https://your-render-url.onrender.com
```

What it does:
- Runs all 3 scenario packs end-to-end
- Waits for terminal status (completed, awaiting_approval, escalated, failed)
- Verifies key outputs per scenario
- Verifies strategy endpoint for pivot scenario
- Stores run IDs and verification summary in api/scripts/demo_cache.json

## 8.2 Surprise Scenario Preparation

### Surprise 1: Brand guide upload + custom rule violation

Judge flow:
1. Upload api/tests/fixtures/ET_Mock_Brand_Guide.pdf
2. Run a brief intentionally violating custom brand constraints
3. Show compliance annotations include org-specific rule IDs

Verification command:

```bash
cd api
python -m pytest tests/test_phase2.py::test_end_to_end_pdf_to_compliance_cites_brand_guide -v
```

### Surprise 2: Re-run same topic and show learning from edits

Judge flow:
1. Run a topic
2. Edit output in approval gate
3. Capture diff
4. Re-run same topic
5. Show correction context influences drafting

Verification commands:

```bash
cd api
python -m pytest tests/test_phase3.py::test_diff_endpoint_saves_correction -v
python -m pytest tests/test_phase3.py::test_draft_agent_injects_correction_context_when_available -v
```

Preparation tip:
- Seed 2-3 real corrections on demo topics ahead of time.

### Surprise 3: Multi-language quality verification

Judge asks if Hindi output is adapted, not literal.

Talking point:
- Localization agent enforces culturally adapted Hindi with financial context replacement and editorial self-check behavior.

Verification command:

```bash
cd api
python -m pytest tests/test_localization_agent.py -v
```

## 8.3 Judge Question Preparation

### How many steps run without human intervention?
- Six of seven agents run autonomously.
- Compliance can loop up to 3 times without human input.
- Human approval gate is intentional for enterprise control.

### What if LLM fails mid-pipeline?
- Wrapper retries Groq with exponential backoff.
- Falls back to Google Gemini when needed.
- If both fail, run is marked failed with error state.
- LangGraph checkpoint preserves progress for recovery.

### How does the system learn from human edits?
- Approval gate edits are captured as diffs.
- Corrections are stored and reused in later drafts for same content category.
- Knowledge triples are added for future draft/compliance grounding.

### What is the compliance mechanism?
- Layer 1: default SEBI/ASCI rules seeded at startup.
- Layer 2: org-specific rules extracted from uploaded brand guide PDFs.
- Layer 3: compliance-revision loop with annotations and suggested fixes, up to 3 iterations.

### Where is the knowledge graph?
- Supabase triple store populated from brand guide extraction and editorial corrections.
- Runtime retrieval injects triples into drafting/compliance prompts.

### How is ROI quantified?
- Typical run is under 2 minutes vs 8-hour manual baseline.
- Baseline includes research, drafting, compliance review, social adaptation, localization, editorial review.
- Direct labor savings are surfaced per run in metrics endpoint.

## 8.4 Pre-demo Checklist (2 Hours Before Judging)

- [ ] API is live on Render and /health returns status ok
- [ ] python scripts/precache_demo.py --base-url [URL] finishes with ALL SCENARIOS PASSED
- [ ] Frontend on Vercel points to Render API (VITE_API_URL)
- [ ] GET /api/settings/rules returns count >= 12
- [ ] ET_Mock_Brand_Guide.pdf is ready for upload scenario
- [ ] Backend non-smoke tests pass: cd api && make test-unit
- [ ] Approval gate validates: blog render, compliance summary, metrics, Hindi tab, content calendar for pivot run
- [ ] Audit PDF export works on completed run
- [ ] Browser console has no runtime errors on dashboard, running, approval pages
- [ ] No localhost API references in deployed frontend

## 8.5 Architecture Diagram (for Judges)

```text
INPUTS: Brief + Engagement Data + Optional Brand Guide PDF
    |
    +--> Rule extraction + Knowledge graph storage (Supabase)
    |
Pipeline (LangGraph):
    intake -> trend -> draft -> disclaimer_injector -> compliance
                         ^                       |
                         |<---- revise loop -----|
compliance pass -> localization -> format -> human approval gate
compliance reject/max-iter -> human escalation

Outputs:
    blog, faq, twitter, linkedin, whatsapp (en/hi), publisher brief
Audit:
    per-agent events, metrics, and PDF export
```

## 8.6 90-second Pitch

NarrativeOps is a 7-agent enterprise content pipeline built for high-trust financial publishing.
A brief goes in, approval-ready multi-channel outputs come out in under 2 minutes, including Hindi localization and compliance-aware copy.

Key behaviors:
- Compliance loop with targeted violation annotations and suggested fixes
- Brand guide grounding through extracted org rules and knowledge triples
- Editorial learning loop where approved human edits improve future drafts

Human approval is intentionally retained as the final control point for enterprise governance.
Everything before that point is autonomous, observable, and auditable.

## End-to-end Verification Before Push

Use this exact sequence before pushing to GitHub:

```bash
# 1) Backend deterministic gate (no live external quota dependency)
cd api && python -m pytest tests/ -v -m "not smoke and not integration" --tb=short

# 2) Backend live integration gate (must pass before judging/demo)
cd api && python -m pytest tests/ -v -m integration --tb=short

# 3) Frontend
cd ../frontend && npm test -- --run

# 4) Smoke against deployed API
cd ../api && API_BASE_URL=https://your-render-url.onrender.com python -m pytest tests/test_demo_readiness.py -v -m smoke

# 5) Pre-cache all scenarios against deployed API
python scripts/precache_demo.py --base-url https://your-render-url.onrender.com
```

Push only if all five steps pass.
