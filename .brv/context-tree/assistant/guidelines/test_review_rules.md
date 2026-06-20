---
title: Test Review Rules
summary: Guidelines for reviewing, writing, and maintaining tests using test-guard universal rules and project-specific conventions.
tags: []
related: []
keywords: []
createdAt: '2026-06-20T11:33:37.965Z'
updatedAt: '2026-06-20T11:33:37.965Z'
---
## Reason
Document the test-guard rules, project test stack, and review policy.

## Raw Concept
**Task:**
Document test review rules and project test stack based on the test-guard skill and project conventions.

**Changes:**
- Documented universal test-guard rules
- Documented project-specific test policy override
- Described test stack as Vitest + jsdom + Testing Library
- Clarified regression test sacredness and mocking boundaries

**Files:**
- C:/Users/HP/.pi/agent/skills/test-guard/SKILL.md
- AGENTS.md
- src/test/setup.ts

**Flow:**
skill and references -> rules extraction -> policy documentation

**Timestamp:** 2026-06-20

**Author:** ByteRover Context Engineer

**Patterns:**
- `^test_` - Test function naming convention: starts with test_
- `test.each|@pytest.mark.parametrize|[DataProvider]` (flags: i) - Data-driven test patterns for major stacks

## Narrative
### Structure
Test review guidelines are structured by the nine test-guard rules, with project-specific overrides allowed where AGENTS.md or CLAUDE.md provides them.

### Dependencies
Depends on project test stack (Vitest, jsdom, Testing Library) and project agent instructions.

### Highlights
Emphasizes merger of near-duplicate tests, strict boundary mocking, behavioral assertions, and the sacred status of regression tests.

### Rules
1. Assert only observable behavior, not implementation details.
2. Only mock system boundaries, never internals.
3. Merge near-duplicate tests into data-driven cases.
4. Each test must catch a unique bug.
6. Regression tests for production bugs are sacred and never deleted.
Project-specific rules in AGENTS.md/CLAUDE.md override these when in conflict.

### Examples
Vitest + jsdom + Testing Library stack; test.each used for Cloudinary row variants; regression test for 2026-06-20 incident.

## Facts
- **test_review_rules**: Test-guard skill enforces nine universal test review rules before tests are presented, committed, or merged. [project]
- **test_policy_override**: Project-specific testing rules from AGENTS.md or CLAUDE.md override test-guard rules when they conflict. [project]
- **test_stack**: The project's test stack is JavaScript/TypeScript with Vitest, jsdom, and Testing Library, with test helpers in src/test/setup.ts and colocated __tests__ folders. [project]
- **regression_test_policy**: Regression tests that reproduce a real production bug are sacred and cannot be deleted (test-guard Rule 6). [project]
- **mocking_policy**: Test-guard Rule 2: Only mock at system boundaries — network, database, filesystem, clock, randomness, third-party SDKs, LLM APIs. Never mock internal helpers or classes. [project]
- **data_driven_tests**: Test-guard Rule 3: Merge near-duplicate tests into data-driven tests (test.each, parametrize, DataProvider). [project]
- **test_justification**: Test-guard Rule 4: Each test must justify its existence by catching a unique bug. [project]
- **behavioral_assertions**: Test-guard Rule 1: Assert observable behavior, not implementation details. [project]
