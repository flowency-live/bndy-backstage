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
      user: {
        id: 'user-1',
        supabaseId: 'supabase-1',
        email: 'test@example.com',
        phone: '+447123456789',
        firstName: 'Test',
        lastName: 'User',
        displayName: 'Test User',
        hometown: 'London',
        instrument: 'Guitar',
        platformAdmin: false,
        profileCompleted: true,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      },
    });
  }),

  // Memberships
  http.get(`${API_BASE}/api/memberships/me`, () => {
    return HttpResponse.json({
      user: { id: 'user-1' },
      artists: [
        {
          id: 'membership-1',
          membership_id: 'membership-1',
          user_id: 'user-1',
          artist_id: 'artist-1',
          role: 'owner',
          membership_type: 'full',
          display_name: 'Test User',
          icon: '🎸',
          color: '#f97316',
          status: 'active',
          joined_at: '2025-01-01T00:00:00Z',
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
          artist: {
            id: 'artist-1',
            name: 'Test Band',
            location: 'London',
            displayColour: '#f97316',
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-01T00:00:00Z',
          },
        },
      ],
    });
  }),

  // Events endpoints
  http.get(`${API_BASE}/api/artists/:artistId/calendar`, ({ params, request }) => {
    const url = new URL(request.url);
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');

    return HttpResponse.json({
      artistEvents: [
        {
          id: 'event-1',
          artistId: params.artistId,
          type: 'gig',
          title: 'Test Gig',
          venue: 'Test Venue',
          location: 'London',
          date: '2025-12-01',
          startTime: '20:00',
          endTime: '23:00',
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z',
        },
      ],
      userUnavailability: [],
    });
  }),

  http.get(`${API_BASE}/api/artists/:artistId/events`, ({ params }) => {
    return HttpResponse.json([
      {
        id: 'event-1',
        artistId: params.artistId,
        type: 'gig',
        title: 'Test Gig',
        venue: 'Test Venue',
        date: '2025-12-01',
        startTime: '20:00',
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      },
      {
        id: 'event-2',
        artistId: params.artistId,
        type: 'practice',
        title: 'Band Practice',
        date: '2025-12-05',
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      },
    ]);
  }),

  http.post(`${API_BASE}/api/artists/:artistId/events`, async ({ params, request }) => {
    const body = await request.json() as any;

    return HttpResponse.json({
      id: 'new-event-1',
      artistId: params.artistId,
      ...body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }),

  http.put(`${API_BASE}/api/artists/:artistId/events/:eventId`, async ({ params, request }) => {
    const body = await request.json() as any;

    return HttpResponse.json({
      id: params.eventId,
      artistId: params.artistId,
      type: 'gig',
      title: 'Updated Event',
      date: '2025-12-01',
      ...body,
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: new Date().toISOString(),
    });
  }),

  http.delete(`${API_BASE}/api/artists/:artistId/events/:eventId`, () => {
    return new HttpResponse(null, { status: 204 });
  }),
];
