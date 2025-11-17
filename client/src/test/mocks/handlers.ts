import { http, HttpResponse } from 'msw';

const API_BASE = 'https://api.bndy.co.uk';

export const handlers = [
  // Auth endpoints
  http.post(`${API_BASE}/auth/phone/request-otp`, async ({ request }) => {
    const body = await request.json() as { phone: string };

    if (!body.phone || !body.phone.match(/^\+?[1-9]\d{1,14}$/)) {
      return HttpResponse.json(
        { error: 'Invalid phone number format' },
        { status: 400 }
      );
    }

    return HttpResponse.json({
      success: true,
      requestId: 'req-otp-123',
      expiresIn: 300,
    });
  }),

  http.post(`${API_BASE}/auth/phone/verify-otp`, async ({ request }) => {
    const body = await request.json() as { phone_number: string; code: string };

    if (body.code === '000000') {
      return HttpResponse.json(
        { error: 'Invalid or expired OTP' },
        { status: 401 }
      );
    }

    if (body.code === '123456') {
      return HttpResponse.json({
        token: 'mock-jwt-token',
        user: {
          id: 'user-1',
          phone_number: body.phone_number,
          display_name: 'Test User',
        },
      });
    }

    return HttpResponse.json(
      { error: 'Invalid OTP' },
      { status: 401 }
    );
  }),

  http.post(`${API_BASE}/auth/email/send-magic-link`, async ({ request }) => {
    const body = await request.json() as { email: string };

    if (!body.email || !body.email.includes('@')) {
      return HttpResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    return HttpResponse.json({ success: true });
  }),

  http.post(`${API_BASE}/auth/email/verify-token`, async ({ request }) => {
    const body = await request.json() as { token: string };

    if (body.token === 'invalid-token') {
      return HttpResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    return HttpResponse.json({
      token: 'mock-jwt-token',
      user: {
        id: 'user-1',
        email: 'test@example.com',
        display_name: 'Test User',
      },
    });
  }),

  http.post(`${API_BASE}/auth/refresh`, () => {
    return HttpResponse.json({
      token: 'refreshed-jwt-token',
    });
  }),

  http.post(`${API_BASE}/auth/logout`, () => {
    return HttpResponse.json({ success: true });
  }),

  // User endpoints
  http.get(`${API_BASE}/users/profile`, () => {
    return HttpResponse.json({
      id: 'user-1',
      display_name: 'Test User',
      phone_number: '+447123456789',
      email: 'test@example.com',
    });
  }),

  // Memberships
  http.get(`${API_BASE}/api/memberships/me`, () => {
    return HttpResponse.json([
      {
        artist_id: 'artist-1',
        user_id: 'user-1',
        role: 'owner',
        display_name: 'Test Band',
      },
    ]);
  }),
];
