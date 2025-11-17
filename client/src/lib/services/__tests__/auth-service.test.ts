import { describe, it, expect, beforeEach, vi } from 'vitest';
import { authService } from '../auth-service';
import type { AuthSession, User } from '../auth-service';
import { server } from '@/test/setupTests';
import { http, HttpResponse } from 'msw';

const API_BASE = 'https://api.bndy.co.uk';

describe('AuthService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('requestPhoneOTP', () => {
    it('should send OTP to valid phone number', async () => {
      const result = await authService.requestPhoneOTP('+447123456789');

      expect(result.success).toBe(true);
      expect(result.requestId).toBeDefined();
      expect(result.expiresIn).toBeGreaterThan(0);
    });

    it('should reject invalid phone number format', async () => {
      await expect(
        authService.requestPhoneOTP('invalid-phone')
      ).rejects.toThrow();
    });

    it('should handle network errors gracefully', async () => {
      server.use(
        http.post(`${API_BASE}/auth/phone/request-otp`, () => {
          return HttpResponse.error();
        })
      );

      await expect(
        authService.requestPhoneOTP('+447123456789')
      ).rejects.toThrow();
    });
  });

  describe('verifyPhoneOTP', () => {
    it('should verify valid OTP code', async () => {
      server.use(
        http.post(`${API_BASE}/auth/phone/verify-otp`, async ({ request }) => {
          const body = await request.json() as { phone: string; otp: string };

          return HttpResponse.json({
            success: true,
            phoneVerified: true,
            requiresOnboarding: false,
            user: {
              id: 'user-1',
              phone: body.phone,
              displayName: 'Test User',
              profileCompleted: true,
            },
          });
        })
      );

      const result = await authService.verifyPhoneOTP('+447123456789', '123456');

      expect(result.success).toBe(true);
      expect(result.phoneVerified).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user?.id).toBe('user-1');
    });

    it('should reject invalid OTP', async () => {
      await expect(
        authService.verifyPhoneOTP('+447123456789', '000000')
      ).rejects.toThrow();
    });

    it('should indicate onboarding required for new users', async () => {
      server.use(
        http.post(`${API_BASE}/auth/phone/verify-otp`, () => {
          return HttpResponse.json({
            success: true,
            phoneVerified: true,
            requiresOnboarding: true,
          });
        })
      );

      const result = await authService.verifyPhoneOTP('+447123456789', '123456');

      expect(result.success).toBe(true);
      expect(result.requiresOnboarding).toBe(true);
    });
  });

  describe('requestEmailMagicLink', () => {
    it('should send magic link to valid email', async () => {
      server.use(
        http.post(`${API_BASE}/auth/email/request-magic`, async ({ request }) => {
          const body = await request.json() as { email: string };

          return HttpResponse.json({
            success: true,
            requestId: 'req-123',
            expiresIn: 600,
          });
        })
      );

      const result = await authService.requestEmailMagicLink('test@example.com');

      expect(result.success).toBe(true);
      expect(result.requestId).toBeDefined();
      expect(result.expiresIn).toBe(600);
    });

    it('should reject invalid email format', async () => {
      server.use(
        http.post(`${API_BASE}/auth/email/request-magic`, () => {
          return HttpResponse.json(
            { error: 'Invalid email format' },
            { status: 400 }
          );
        })
      );

      await expect(
        authService.requestEmailMagicLink('not-an-email')
      ).rejects.toThrow();
    });
  });

  describe('checkAuth', () => {
    it('should return user session when authenticated', async () => {
      server.use(
        http.get(`${API_BASE}/api/me`, () => {
          return HttpResponse.json({
            user: {
              id: 'user-1',
              cognitoId: 'cognito-1',
              username: 'testuser',
              email: 'test@example.com',
              displayName: 'Test User',
              profileCompleted: true,
              createdAt: '2025-01-01T00:00:00Z',
            },
            bands: [],
            session: {
              issuedAt: Date.now(),
              expiresAt: Date.now() + 3600000,
            },
          });
        })
      );

      const result = await authService.checkAuth();

      expect(result).not.toBeNull();
      expect(result?.user.id).toBe('user-1');
      expect(result?.user.displayName).toBe('Test User');
    });

    it('should save session backup to localStorage on successful auth', async () => {
      server.use(
        http.get(`${API_BASE}/api/me`, () => {
          return HttpResponse.json({
            user: {
              id: 'user-1',
              cognitoId: 'cognito-1',
              username: 'testuser',
              email: 'test@example.com',
              displayName: 'Test User',
              profileCompleted: true,
              createdAt: '2025-01-01T00:00:00Z',
            },
            bands: [],
            session: {
              issuedAt: Date.now(),
              expiresAt: Date.now() + 3600000,
            },
          });
        })
      );

      await authService.checkAuth();

      const backup = localStorage.getItem('bndy-session-backup');
      expect(backup).not.toBeNull();

      const parsed = JSON.parse(backup!);
      expect(parsed.userId).toBe('user-1');
      expect(parsed.displayName).toBe('Test User');
    });

    it('should return null when not authenticated', async () => {
      server.use(
        http.get(`${API_BASE}/api/me`, () => {
          return HttpResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
          );
        })
      );

      const result = await authService.checkAuth();

      expect(result).toBeNull();
    });

    it('should clear session backup on auth failure', async () => {
      localStorage.setItem('bndy-session-backup', JSON.stringify({ userId: 'old-user' }));

      server.use(
        http.get(`${API_BASE}/api/me`, () => {
          return HttpResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
          );
        })
      );

      await authService.checkAuth();

      const backup = localStorage.getItem('bndy-session-backup');
      expect(backup).toBeNull();
    });
  });

  describe('signOut', () => {
    it('should call logout endpoint and clear session backup', async () => {
      localStorage.setItem('bndy-session-backup', JSON.stringify({ userId: 'user-1' }));

      await authService.signOut();

      const backup = localStorage.getItem('bndy-session-backup');
      expect(backup).toBeNull();
    });

    it('should handle logout API errors gracefully', async () => {
      server.use(
        http.post(`${API_BASE}/auth/logout`, () => {
          return HttpResponse.error();
        })
      );

      await expect(authService.signOut()).rejects.toThrow();
    });
  });

  describe('isSessionValid', () => {
    it('should return true for valid session', () => {
      const session: AuthSession = {
        user: {} as User,
        bands: [],
        session: {
          issuedAt: Date.now() - 1000000,
          expiresAt: Date.now() + 3600000,
        },
      };

      expect(authService.isSessionValid(session)).toBe(true);
    });

    it('should return false for expired session', () => {
      const session: AuthSession = {
        user: {} as User,
        bands: [],
        session: {
          issuedAt: Date.now() - 3600000,
          expiresAt: Date.now() - 1000,
        },
      };

      expect(authService.isSessionValid(session)).toBe(false);
    });

    it('should return false for session expiring within 5 minutes', () => {
      const session: AuthSession = {
        user: {} as User,
        bands: [],
        session: {
          issuedAt: Date.now() - 1000000,
          expiresAt: Date.now() + 240000,
        },
      };

      expect(authService.isSessionValid(session)).toBe(false);
    });

    it('should return false for null session', () => {
      expect(authService.isSessionValid(null as any)).toBe(false);
    });
  });

  describe('getUserDisplayName', () => {
    it('should return displayName when available', () => {
      const user: User = {
        id: '1',
        cognitoId: 'cognito-1',
        username: 'testuser',
        email: 'test@example.com',
        displayName: 'Display Name',
        firstName: 'First',
        lastName: 'Last',
        profileCompleted: true,
        createdAt: '2025-01-01',
      };

      expect(authService.getUserDisplayName(user)).toBe('Display Name');
    });

    it('should return full name when displayName unavailable', () => {
      const user: User = {
        id: '1',
        cognitoId: 'cognito-1',
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'First',
        lastName: 'Last',
        profileCompleted: true,
        createdAt: '2025-01-01',
      };

      expect(authService.getUserDisplayName(user)).toBe('First Last');
    });

    it('should return firstName only when lastName unavailable', () => {
      const user: User = {
        id: '1',
        cognitoId: 'cognito-1',
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'First',
        profileCompleted: true,
        createdAt: '2025-01-01',
      };

      expect(authService.getUserDisplayName(user)).toBe('First');
    });

    it('should fall back to username or email', () => {
      const user: User = {
        id: '1',
        cognitoId: 'cognito-1',
        username: 'testuser',
        email: 'test@example.com',
        profileCompleted: true,
        createdAt: '2025-01-01',
      };

      expect(authService.getUserDisplayName(user)).toBe('testuser');
    });
  });

  describe('isProfileComplete', () => {
    it('should return true for complete profile', () => {
      const user: User = {
        id: '1',
        cognitoId: 'cognito-1',
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'First',
        lastName: 'Last',
        instrument: 'Guitar',
        profileCompleted: true,
        createdAt: '2025-01-01',
      };

      expect(authService.isProfileComplete(user)).toBe(true);
    });

    it('should return false when profileCompleted is false', () => {
      const user: User = {
        id: '1',
        cognitoId: 'cognito-1',
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'First',
        lastName: 'Last',
        instrument: 'Guitar',
        profileCompleted: false,
        createdAt: '2025-01-01',
      };

      expect(authService.isProfileComplete(user)).toBe(false);
    });

    it('should return false when required fields missing', () => {
      const user: User = {
        id: '1',
        cognitoId: 'cognito-1',
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'First',
        profileCompleted: true,
        createdAt: '2025-01-01',
      };

      expect(authService.isProfileComplete(user)).toBe(false);
    });
  });

  describe('getGoogleAuthUrl', () => {
    it('should return correct Google OAuth URL', () => {
      const url = authService.getGoogleAuthUrl();
      expect(url).toBe('https://api.bndy.co.uk/auth/google');
    });
  });

  describe('getAppleAuthUrl', () => {
    it('should return correct Apple OAuth URL', () => {
      const url = authService.getAppleAuthUrl();
      expect(url).toBe('https://api.bndy.co.uk/auth/apple');
    });
  });
});
