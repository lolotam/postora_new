# Testing Guide

This guide explains how to run tests locally using Vitest.

## Prerequisites

Make sure you have all dependencies installed:

```bash
npm install
```

## Running Tests

### Run All Tests

```bash
npm test
```

Or with Vitest directly:

```bash
npx vitest
```

### Run Tests in Watch Mode

```bash
npx vitest --watch
```

### Run Tests with UI

```bash
npx vitest --ui
```

This opens an interactive UI in your browser to explore and run tests.

### Run Specific Test File

```bash
npx vitest src/test/e2e/auth.e2e.test.tsx
```

### Run Tests Matching a Pattern

```bash
npx vitest --testNamePattern "should handle successful login"
```

### Run Tests in a Directory

```bash
npx vitest src/test/e2e/
```

## Test Structure

```
src/
├── test/
│   ├── setup.ts              # Test setup (jest-dom, mocks)
│   ├── test-utils.tsx        # Test utilities and helpers
│   ├── mocks/
│   │   └── supabase.ts       # Supabase client mocks
│   └── e2e/
│       ├── auth.e2e.test.tsx      # Authentication tests
│       ├── posts.e2e.test.tsx     # Post management tests
│       ├── profiles.e2e.test.tsx  # Social profiles tests
│       ├── analytics.e2e.test.tsx # Analytics tests
│       └── utils.e2e.test.ts      # Utility function tests
├── components/
│   └── **/__tests__/         # Component-specific tests
├── hooks/
│   └── __tests__/            # Hook tests
└── lib/
    └── __tests__/            # Library function tests
```

## Test Categories

### E2E Tests (`src/test/e2e/`)

Integration tests that test complete user flows:

- **auth.e2e.test.tsx**: Login, signup, logout, password reset
- **posts.e2e.test.tsx**: Post creation, scheduling, AI features
- **profiles.e2e.test.tsx**: Social accounts, OAuth, health checks
- **analytics.e2e.test.tsx**: Dashboard stats, charts, date filtering
- **utils.e2e.test.ts**: Utility functions, platform specs, formatting

### Component Tests

Located in `__tests__` folders alongside components:

```bash
npx vitest src/components/
```

### Hook Tests

Located in `src/hooks/__tests__/`:

```bash
npx vitest src/hooks/__tests__/
```

## Writing Tests

### Basic Test Structure

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

describe("Feature Name", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should do something", async () => {
    const user = userEvent.setup();
    render(<Component />);

    await user.click(screen.getByRole("button"));
    
    await waitFor(() => {
      expect(screen.getByText("Expected")).toBeInTheDocument();
    });
  });
});
```

### Using Test Utilities

```typescript
import { renderWithProviders, mockAuthUser } from "@/test/test-utils";
import { setupAuthenticatedState } from "@/test/mocks/supabase";

describe("Protected Feature", () => {
  beforeEach(() => {
    setupAuthenticatedState();
  });

  it("should render for authenticated users", () => {
    renderWithProviders(<ProtectedComponent />);
    // ...
  });
});
```

### Mocking Supabase

```typescript
import { createQueryMock, mockSupabaseFunctions } from "@/test/mocks/supabase";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn((table) => createQueryMock(mockData)),
    functions: mockSupabaseFunctions,
  },
}));
```

## Coverage Report

Generate a coverage report:

```bash
npx vitest --coverage
```

View coverage in browser:

```bash
npx vitest --coverage --ui
```

## Debugging Tests

### Run with Verbose Output

```bash
npx vitest --reporter=verbose
```

### Debug Single Test

```bash
npx vitest --inspect-brk --single-thread src/test/e2e/auth.e2e.test.tsx
```

Then attach your debugger.

## CI/CD Integration

The tests are configured to run in CI with:

```bash
npm test -- --run
```

This runs tests once without watch mode.

## Common Issues

### Tests Hanging

If tests hang, check for:
- Unresolved promises
- Missing `await` on async operations
- Timer mocks not being cleaned up

### Mock Not Working

Ensure mocks are defined before imports:

```typescript
// ❌ Wrong order
import { Component } from "./Component";
vi.mock("./dependency");

// ✅ Correct order
vi.mock("./dependency");
import { Component } from "./Component";
```

### State Leaking Between Tests

Always reset mocks in `beforeEach`:

```typescript
beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
});
```
