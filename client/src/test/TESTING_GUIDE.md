# Testing Guide - BNDY Backstage

**Last Updated:** 2025-11-17

---

## Quick Start

### Running Tests

```bash
# Run all tests (watch mode)
npm test

# Run all tests once (CI mode)
npm test -- --run

# Run with coverage report
npm run test:coverage

# Run with visual UI
npm run test:ui

# Run specific test file
npm test -- auth-service.test.ts

# Run tests matching pattern
npm test -- --grep "should handle errors"
```

### Test Files Location

```
client/src/
├── lib/
│   ├── __tests__/
│   │   └── user-context.test.tsx       # React context tests
│   └── services/
│       └── __tests__/
│           ├── auth-service.test.ts     # Auth service tests
│           └── events-service.test.ts   # Events service tests
├── pages/
│   └── setlist-editor/
│       └── __tests__/                   # Existing setlist tests
└── test/
    ├── setup.ts                         # Test configuration
    ├── mocks/
    │   └── handlers.ts                  # MSW API mocks
    └── CONTEXT.md                       # Testing progress tracker
```

---

## Test Structure Pattern

All tests follow this consistent pattern:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { server } from '@/test/setupTests';
import { http, HttpResponse } from 'msw';

describe('ServiceName', () => {
  describe('methodName', () => {
    it('should handle happy path', async () => {
      const result = await service.method();
      expect(result).toBeDefined();
    });

    it('should handle error case', async () => {
      server.use(
        http.get('/api/endpoint', () => {
          return HttpResponse.json({ error: 'Failed' }, { status: 500 });
        })
      );

      await expect(service.method()).rejects.toThrow();
    });
  });
});
```

---

## API Mocking with MSW

### Default Handlers

All default API responses are defined in `test/mocks/handlers.ts`:
- Auth endpoints (login, logout, OTP)
- User profile
- Memberships
- Events (calendar, CRUD operations)

### Override in Tests

Override default handlers for specific test cases:

```typescript
import { server } from '@/test/setupTests';
import { http, HttpResponse } from 'msw';

it('should handle API error', async () => {
  server.use(
    http.get('https://api.bndy.co.uk/endpoint', () => {
      return HttpResponse.json({ error: 'Custom error' }, { status: 500 });
    })
  );

  // Test code that uses the overridden endpoint
});
```

---

## React Component Testing

For components that use contexts/providers:

```typescript
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
};

it('should test hook behavior', async () => {
  const { result } = renderHook(() => useYourHook(), {
    wrapper: createWrapper(),
  });

  await waitFor(() => {
    expect(result.current.data).toBeDefined();
  });
});
```

---

## Coverage Reports

### View Coverage

After running `npm run test:coverage`:

```bash
# Open HTML coverage report
open coverage/index.html        # macOS
start coverage/index.html       # Windows
xdg-open coverage/index.html    # Linux
```

### Coverage Targets

- **Critical services (auth, user-context, events):** 80%+ coverage
- **Utilities:** 90%+ coverage
- **Overall project:** Not prioritized (quality over quantity)

---

## Common Patterns

### Testing Async Operations

```typescript
it('should handle async data fetching', async () => {
  const result = await service.fetchData();
  expect(result).toBeDefined();
});
```

### Testing Error Handling

```typescript
it('should throw error on invalid input', async () => {
  await expect(
    service.processData('invalid')
  ).rejects.toThrow('Invalid input');
});
```

### Testing localStorage

```typescript
beforeEach(() => {
  localStorage.clear();
});

it('should persist data to localStorage', () => {
  service.savePreference('theme', 'dark');
  expect(localStorage.getItem('theme')).toBe('dark');
});
```

### Testing React Query Hooks

```typescript
it('should fetch and cache data', async () => {
  const { result } = renderHook(() => useData(), {
    wrapper: createWrapper(),
  });

  expect(result.current.isLoading).toBe(true);

  await waitFor(() => {
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeDefined();
  });
});
```

---

## Anti-Patterns (AVOID)

❌ **Complex mocking:**
```typescript
// BAD - Too complex, brittle
const mockFn = vi.fn();
vi.spyOn(service as any, '_internalMethod').mockImplementation(mockFn);
global.Date = vi.fn(() => new Date('2025-01-01')) as any;
```

✅ **Simple MSW handlers:**
```typescript
// GOOD - Simple, realistic
server.use(
  http.get('/api/data', () => {
    return HttpResponse.json({ data: 'test' });
  })
);
```

❌ **Testing implementation details:**
```typescript
// BAD - Tests internal state
expect(component.state.internalCounter).toBe(5);
```

✅ **Testing public API:**
```typescript
// GOOD - Tests observable behavior
expect(screen.getByText('Count: 5')).toBeInTheDocument();
```

---

## Debugging Tests

### Run Single Test

```bash
npm test -- --grep "specific test name"
```

### Run with Debugging

```bash
# Add debugger statement in test
it('should debug this', () => {
  debugger;
  // test code
});

# Run with Node inspector
node --inspect-brk ./node_modules/vitest/vitest.mjs --run
```

### VS Code Debugging

Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Vitest Tests",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["test", "--", "--run"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

---

## CI/CD Integration

Tests run automatically on:
- ✅ Every commit (pre-commit hook)
- ✅ Pull requests (GitHub Actions)
- ✅ Main branch pushes (GitHub Actions)

### Expected Output

```
Test Files  9 passed (9)
     Tests  131 passed (131)
  Start at  18:26:22
  Duration  6.99s
```

---

## Adding New Tests

1. **Create test file** next to the code being tested:
   - Services: `services/__tests__/service-name.test.ts`
   - Components: `components/__tests__/component-name.test.tsx`
   - Hooks: `hooks/__tests__/hook-name.test.ts`

2. **Follow the established pattern:**
   - Use `describe` for grouping related tests
   - Use `it` for individual test cases
   - Keep tests simple and readable
   - Use MSW for API mocking

3. **Run tests** to ensure they pass:
   ```bash
   npm test -- your-new.test.ts
   ```

4. **Check coverage** if needed:
   ```bash
   npm run test:coverage
   ```

5. **Commit** with descriptive message:
   ```bash
   git add .
   git commit -m "Add tests for feature-name"
   ```

---

## Resources

- **Vitest Docs:** https://vitest.dev
- **React Testing Library:** https://testing-library.com/react
- **MSW Docs:** https://mswjs.io
- **Testing Best Practices:** `test/CONTEXT.md`
- **Test Infrastructure Plan:** See `bndy All Platform Docs/Audits/BACKSTAGE_TEST_INFRASTRUCTURE_PLAN.md`

---

## Need Help?

1. Check `test/CONTEXT.md` for current testing status
2. Look at existing tests for patterns
3. Review MSW handlers in `test/mocks/handlers.ts`
4. Ask questions in team chat

---

**Status:** Phase 1 Complete - 131 tests passing
**Coverage:** auth-service (79.87%), user-context (76.71%), events-service (100%)
**Last Updated:** 2025-11-17
