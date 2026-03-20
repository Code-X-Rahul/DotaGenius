---
phase: 1
slug: replay-pipeline
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-20
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (latest, aligned with Next.js ecosystem) |
| **Config file** | none — Wave 0 installs |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 0 | PIPE-01 | unit | `npx vitest run tests/unit/validation.test.ts` | ❌ W0 | ⬜ pending |
| 01-01-02 | 01 | 0 | PIPE-01 | unit | `npx vitest run tests/unit/opendota.test.ts` | ❌ W0 | ⬜ pending |
| 01-01-03 | 01 | 0 | PIPE-01 | unit | `npx vitest run tests/unit/replay-url.test.ts` | ❌ W0 | ⬜ pending |
| 01-01-04 | 01 | 0 | PIPE-01 | unit | `npx vitest run tests/unit/replay-expiry.test.ts` | ❌ W0 | ⬜ pending |
| 01-02-01 | 02 | 1 | PIPE-02 | unit | `npx vitest run tests/unit/parser.test.ts` | ❌ W0 | ⬜ pending |
| 01-02-02 | 02 | 1 | PIPE-02 | unit | `npx vitest run tests/unit/parse-events.test.ts` | ❌ W0 | ⬜ pending |
| 01-03-01 | 03 | 1 | PIPE-03 | integration | `npx vitest run tests/integration/data-storage.test.ts` | ❌ W0 | ⬜ pending |
| 01-03-02 | 03 | 1 | PIPE-03 | integration | `npx vitest run tests/integration/data-query.test.ts` | ❌ W0 | ⬜ pending |
| 01-04-01 | 04 | 1 | PIPE-01 | integration | `npx vitest run tests/integration/replay-download.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest.config.ts` — Vitest configuration with path aliases matching Next.js
- [ ] `tests/unit/` directory — unit test stubs for validation, API clients, URL construction
- [ ] `tests/integration/` directory — integration test stubs requiring database/Redis
- [ ] `tests/fixtures/` — sample OpenDota API responses, sample ndjson parser output
- [ ] Framework install: `npm install -D vitest @vitejs/plugin-react`

*Wave 0 must be complete before any plan execution begins.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Status page updates live (SSE) | PIPE-01 | Real-time UI updates need browser context | Submit a Match ID, observe status page transitions through downloading → parsing → complete |
| Steam GC spike validates replay download | PIPE-01 | Requires live Steam account and GC connection | Run spike script with test Match ID, verify .dem URL is returned |
| Landing page hero section + search UX | PIPE-01 | Visual design review | Load landing page, verify hero section, search bar, and recent analyses layout |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
