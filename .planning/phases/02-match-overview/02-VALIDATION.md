---
phase: 2
slug: match-overview
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-20
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.0 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run tests/unit --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/unit --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | MATC-01 | unit | `npx vitest run tests/unit/test-dota-constants.test.ts -x` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | MATC-01 | unit | `npx vitest run tests/unit/test-match-api.test.ts -x` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 1 | MATC-02 | unit | `npx vitest run tests/unit/test-match-utils.test.ts -x` | ❌ W0 | ⬜ pending |
| 02-02-02 | 02 | 1 | MATC-02 | unit | `npx vitest run tests/unit/test-match-utils.test.ts -x` | ❌ W0 | ⬜ pending |
| 02-03-01 | 03 | 2 | MATC-03 | unit | `npx vitest run tests/unit/test-match-utils.test.ts -x` | ❌ W0 | ⬜ pending |
| 02-03-02 | 03 | 2 | MATC-03 | unit | `npx vitest run tests/unit/test-match-utils.test.ts -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/unit/test-dota-constants.test.ts` — stubs for hero/item lookup correctness (MATC-01)
- [ ] `tests/unit/test-match-utils.test.ts` — stubs for lane classification, CS@10 extraction, data transforms (MATC-02, MATC-03)
- [ ] `tests/unit/test-match-api.test.ts` — stubs for expanded API response serialization (MATC-01)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Hero portrait strip renders correctly | MATC-01 | Visual layout | Open match page, verify 5v5 hero icons with score |
| Benchmark colors correct | MATC-01 | Visual color check | Verify green/yellow/red stat coloring against percentiles |
| Recharts graph renders with hover | MATC-03 | Interactive UI | Hover graph, verify tooltip values match data |
| Lane cards show correct matchups | MATC-02 | Visual layout | Cross-check lane assignments against OpenDota |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
