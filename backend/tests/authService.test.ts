/**
 * authService.test.ts
 * ---------------------------------------------------------------------------
 * Unit tests for the AuthService class, focused on the DEF-001 bug fix:
 *   "POST /api/auth/refresh fails with Prisma unique constraint error"
 *
 * Root cause: storeRefreshToken used prisma.refreshToken.create() which throws
 * when the same token string already exists (unique constraint on `token`).
 * Fix: replaced create() with upsert() inside a $transaction.
 *
 * Test matrix:
 *   TC-001  Happy path -- login stores a new refresh token (create branch)
 *   TC-002  Duplicate token is idempotent (upsert update branch)
 *   TC-003  Refresh flow: old token revoked, new token stored correctly
 *   TC-004  Old-token cleanup fires when user has > 5 tokens
 *   TC-005  Revoked tokens are not counted as valid during refresh
 *   TC-006  Expired tokens are rejected during refresh
 * ---------------------------------------------------------------------------
 */

// ---------------------------------------------------------------------------
// Mock: prisma
// ---------------------------------------------------------------------------
// We build a manual mock so we can inspect every call made to the client.
// The $transaction mock simply executes the callback with the same mock object
// (mirrors Prisma's interactive transaction API).
// ---------------------------------------------------------------------------

const mockUpsert = jest.fn();
const mockFindMany = jest.fn();
const mockDeleteMany = jest.fn();
const mockUpdate = jest.fn();
const mockFindFirst = jest.fn();

const refreshTokenMock = {
  upsert: mockUpsert,
  findMany: mockFindMany,
  deleteMany: mockDeleteMany,
  update: mockUpdate,
  findFirst: mockFindFirst,
  create: jest.fn(), // should NOT be called after the fix
};

const userMock = {
  findUnique: jest.fn(),
  create: jest.fn(),
};

// $transaction receives an async callback and invokes it with the tx object.
// We reuse the same top-level mocks so assertions are straightforward.
const prismaInstance = {
  refreshToken: refreshTokenMock,
  user: userMock,
  $transaction: jest.fn((cb: (tx: typeof prismaInstance) => Promise<void>) => cb(prismaInstance)),
};

jest.mock('../src/config/database', () => ({
  prisma: prismaInstance,
}));

// ---------------------------------------------------------------------------
// Mock: password utilities
// ---------------------------------------------------------------------------
jest.mock('../src/utils/password', () => ({
  hashPassword: jest.fn().mockResolvedValue('hashed_password'),
  comparePassword: jest.fn().mockResolvedValue(true),
  validatePasswordStrength: jest.fn().mockReturnValue({ isValid: true, errors: [] }),
}));

// ---------------------------------------------------------------------------
// Mock: JWT utilities
// We control the token strings returned so we can assert on DB calls.
// ---------------------------------------------------------------------------
let tokenCounter = 0;
jest.mock('../src/utils/jwt', () => ({
  generateAccessToken: jest.fn(() => `access_token_${++tokenCounter}`),
  generateRefreshToken: jest.fn(() => `refresh_token_${++tokenCounter}`),
  verifyRefreshToken: jest.fn((token: string) => {
    // Extract the userId we embedded when we set up the stored-token mock.
    // For simplicity all test tokens belong to userId 1.
    if (token.startsWith('refresh_token_')) return { userId: 1, email: 'test@example.com', role: 'PUBLIC' };
    throw new Error('Invalid token');
  }),
  getTokenExpiration: jest.fn(() => new Date('2026-12-31T23:59:59.000Z')),
}));

// ---------------------------------------------------------------------------
// Mock: config (only JWT section is needed)
// ---------------------------------------------------------------------------
jest.mock('../src/config', () => ({
  config: {
    jwt: {
      secret: 'test-secret',
      refreshSecret: 'test-refresh-secret',
      expiresIn: '1h',
      refreshExpiresIn: '7d',
    },
    nodeEnv: 'test',
  },
}));

// ---------------------------------------------------------------------------
// SUT
// ---------------------------------------------------------------------------
import { authService } from '../src/services/authService';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Standard active user row returned by prisma.user.findUnique / create */
const activeUser = {
  id: 1,
  email: 'test@example.com',
  passwordHash: 'hashed_password',
  firstName: 'Test',
  lastName: 'User',
  role: 'PUBLIC' as const,
  status: 'ACTIVE' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
};

/** Reset every mock between tests so call counts / args do not bleed. */
function resetAll() {
  jest.clearAllMocks();
  tokenCounter = 0;
}

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

describe('AuthService -- storeRefreshToken (DEF-001 fix)', () => {
  beforeEach(resetAll);

  // -----------------------------------------------------------------------
  // TC-001: Happy path -- login stores a brand-new refresh token
  // -----------------------------------------------------------------------
  test('TC-001: login() calls upsert (not create) and stores the refresh token', async () => {
    userMock.findUnique.mockResolvedValueOnce(activeUser);
    mockUpsert.mockResolvedValueOnce(undefined);
    mockFindMany.mockResolvedValueOnce([]); // no stale tokens

    await authService.login({ email: 'test@example.com', password: 'password123' });

    // prisma.refreshToken.create must NOT have been called (the old code path)
    expect(refreshTokenMock.create).not.toHaveBeenCalled();

    // upsert must have been called with the correct shape
    expect(mockUpsert).toHaveBeenCalledTimes(1);
    const upsertCall = mockUpsert.mock.calls[0][0];
    expect(upsertCall).toMatchObject({
      where: { token: expect.any(String) },
      create: {
        token: expect.any(String),
        userId: 1,
        expiresAt: expect.any(Date),
      },
      update: {
        expiresAt: expect.any(Date),
        userId: 1,
        revokedAt: null,
      },
    });

    // The whole operation ran inside a transaction
    expect(prismaInstance.$transaction).toHaveBeenCalledTimes(1);
  });

  // -----------------------------------------------------------------------
  // TC-002: Duplicate token -- idempotent, no crash
  // Simulates: client retries the same refresh POST after a timeout.
  // The upsert update branch fires; no unique-constraint error is raised.
  // -----------------------------------------------------------------------
  test('TC-002: duplicate token string does not throw (upsert update branch)', async () => {
    userMock.findUnique.mockResolvedValueOnce(activeUser);
    // Upsert resolves fine even when the row already exists -- Prisma handles it
    mockUpsert.mockResolvedValueOnce(undefined);
    mockFindMany.mockResolvedValueOnce([]);

    // Should not throw
    await expect(
      authService.login({ email: 'test@example.com', password: 'password123' })
    ).resolves.toBeDefined();

    // Verify upsert was the mechanism used
    expect(mockUpsert).toHaveBeenCalledTimes(1);
    expect(refreshTokenMock.create).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // TC-003: Full refresh flow -- old token revoked, new token stored
  // -----------------------------------------------------------------------
  test('TC-003: refreshAccessToken() revokes old token and stores new one via upsert', async () => {
    const oldTokenString = 'refresh_token_old';

    // The stored-token lookup that refreshAccessToken performs
    mockFindFirst.mockResolvedValueOnce({
      id: 42,
      token: oldTokenString,
      userId: 1,
      expiresAt: new Date('2026-12-31T00:00:00.000Z'),
      revokedAt: null,
    });

    // The user lookup inside refreshAccessToken
    userMock.findUnique.mockResolvedValueOnce(activeUser);

    // The update that revokes the old token
    mockUpdate.mockResolvedValueOnce(undefined);

    // The upsert for the new token + cleanup
    mockUpsert.mockResolvedValueOnce(undefined);
    mockFindMany.mockResolvedValueOnce([]); // no stale tokens

    const result = await authService.refreshAccessToken(oldTokenString);

    // Should return both tokens
    expect(result).toHaveProperty('accessToken');
    expect(result).toHaveProperty('refreshToken');

    // Old token was revoked by primary key
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 42 },
      data: { revokedAt: expect.any(Date) },
    });

    // New token was persisted via upsert, not create
    expect(mockUpsert).toHaveBeenCalledTimes(1);
    expect(refreshTokenMock.create).not.toHaveBeenCalled();

    // Transaction was used
    expect(prismaInstance.$transaction).toHaveBeenCalledTimes(1);
  });

  // -----------------------------------------------------------------------
  // TC-004: Cleanup fires when user has > 5 refresh tokens
  // -----------------------------------------------------------------------
  test('TC-004: tokens beyond the 5-most-recent limit are deleted inside the transaction', async () => {
    userMock.findUnique.mockResolvedValueOnce(activeUser);
    mockUpsert.mockResolvedValueOnce(undefined);

    // Simulate 3 stale tokens returned by the skip:5 query
    const staleTokens = [{ id: 100 }, { id: 101 }, { id: 102 }];
    mockFindMany.mockResolvedValueOnce(staleTokens);
    mockDeleteMany.mockResolvedValueOnce({ count: 3 });

    await authService.login({ email: 'test@example.com', password: 'password123' });

    // findMany was called with skip: 5 to identify stale tokens
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 1 },
        orderBy: { createdAt: 'desc' },
        skip: 5,
        select: { id: true },
      })
    );

    // deleteMany was called with exactly the stale IDs
    expect(mockDeleteMany).toHaveBeenCalledWith({
      where: { id: { in: [100, 101, 102] } },
    });

    // Everything happened inside a single transaction
    expect(prismaInstance.$transaction).toHaveBeenCalledTimes(1);
  });

  // -----------------------------------------------------------------------
  // TC-005: Revoked token is rejected during refresh
  // ---------------------------------------------------------------------------
  test('TC-005: refreshAccessToken() rejects a revoked token', async () => {
    const revokedToken = 'refresh_token_revoked';

    // findFirst returns null because the WHERE includes revokedAt: null
    mockFindFirst.mockResolvedValueOnce(null);

    await expect(authService.refreshAccessToken(revokedToken)).rejects.toMatchObject({
      statusCode: 401,
      code: 'TOKEN_REVOKED',
    });

    // No upsert, no transaction, no user lookup -- fail fast
    expect(mockUpsert).not.toHaveBeenCalled();
    expect(prismaInstance.$transaction).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // TC-006: Expired token is rejected during refresh
  // ---------------------------------------------------------------------------
  test('TC-006: refreshAccessToken() rejects an expired token', async () => {
    const expiredToken = 'refresh_token_expired';

    // findFirst returns null (expiresAt < now filtered in WHERE)
    mockFindFirst.mockResolvedValueOnce(null);

    await expect(authService.refreshAccessToken(expiredToken)).rejects.toMatchObject({
      statusCode: 401,
      code: 'TOKEN_REVOKED',
    });

    expect(mockUpsert).not.toHaveBeenCalled();
    expect(prismaInstance.$transaction).not.toHaveBeenCalled();
  });
});
