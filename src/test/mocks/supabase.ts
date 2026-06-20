import { vi } from "vitest";
import { mockAuthUser, mockSession } from "../test-utils";

/**
 * Mock Supabase auth methods
 */
export const mockSupabaseAuth = {
  getSession: vi.fn().mockResolvedValue({
    data: { session: null },
    error: null,
  }),
  getUser: vi.fn().mockResolvedValue({
    data: { user: null },
    error: null,
  }),
  onAuthStateChange: vi.fn().mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } },
  }),
  signInWithPassword: vi.fn().mockResolvedValue({
    data: { user: mockAuthUser, session: mockSession },
    error: null,
  }),
  signInWithOAuth: vi.fn().mockResolvedValue({
    data: { url: "https://oauth.example.com" },
    error: null,
  }),
  signUp: vi.fn().mockResolvedValue({
    data: { user: mockAuthUser, session: null },
    error: null,
  }),
  signOut: vi.fn().mockResolvedValue({ error: null }),
  resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
  updateUser: vi.fn().mockResolvedValue({
    data: { user: mockAuthUser },
    error: null,
  }),
};

/**
 * Mock Supabase storage methods
 */
export const mockSupabaseStorage = {
  from: vi.fn().mockReturnValue({
    upload: vi.fn().mockResolvedValue({ data: { path: "path/to/file" }, error: null }),
    getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: "https://storage.example.com/file" } }),
    remove: vi.fn().mockResolvedValue({ error: null }),
    createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: "https://signed-url.example.com" }, error: null }),
    list: vi.fn().mockResolvedValue({ data: [], error: null }),
  }),
};

/**
 * Mock Supabase functions
 */
export const mockSupabaseFunctions = {
  invoke: vi.fn().mockResolvedValue({ data: {}, error: null }),
};

/**
 * Create a chainable query mock
 */
export function createQueryMock(data: any = [], error: any = null) {
  const chainMock = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnThis(),
    containedBy: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: Array.isArray(data) ? data[0] : data, error }),
    maybeSingle: vi.fn().mockResolvedValue({ data: Array.isArray(data) ? data[0] : data, error }),
    then: vi.fn((resolve) => resolve({ data, error })),
  };

  // Make the chainMock thenable
  Object.defineProperty(chainMock, "then", {
    value: (resolve: any) => Promise.resolve({ data, error }).then(resolve),
    writable: true,
    configurable: true,
  });

  return chainMock;
}

/**
 * Mock Supabase database methods
 */
export function createMockSupabaseFrom(tableData: Record<string, any[]> = {}) {
  return vi.fn((tableName: string) => {
    const data = tableData[tableName] || [];
    return createQueryMock(data);
  });
}

/**
 * Full Supabase client mock
 */
export function createMockSupabaseClient(tableData: Record<string, any[]> = {}) {
  return {
    auth: mockSupabaseAuth,
    storage: mockSupabaseStorage,
    functions: mockSupabaseFunctions,
    from: createMockSupabaseFrom(tableData),
  };
}

/**
 * Helper to setup authenticated state
 */
export function setupAuthenticatedState() {
  mockSupabaseAuth.getSession.mockResolvedValue({
    data: { session: mockSession },
    error: null,
  });
  mockSupabaseAuth.getUser.mockResolvedValue({
    data: { user: mockAuthUser },
    error: null,
  });
}

/**
 * Helper to setup unauthenticated state
 */
export function setupUnauthenticatedState() {
  mockSupabaseAuth.getSession.mockResolvedValue({
    data: { session: null },
    error: null,
  });
  mockSupabaseAuth.getUser.mockResolvedValue({
    data: { user: null },
    error: null,
  });
}

/**
 * Reset all mocks
 */
export function resetSupabaseMocks() {
  vi.clearAllMocks();
  setupUnauthenticatedState();
}
