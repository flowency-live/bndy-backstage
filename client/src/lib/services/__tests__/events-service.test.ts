import { describe, it, expect, beforeEach } from 'vitest';
import { eventsService } from '../events-service';
import type { CreateEventRequest, UpdateEventRequest } from '../events-service';
import { server } from '@/test/setupTests';
import { http, HttpResponse } from 'msw';

const API_BASE = 'https://api.bndy.co.uk';

describe('EventsService', () => {
  const testArtistId = 'artist-1';

  beforeEach(() => {
    // Tests use default handlers from handlers.ts
  });

  describe('getArtistCalendar', () => {
    it('should fetch calendar events for an artist within date range', async () => {
      const startDate = '2025-12-01';
      const endDate = '2025-12-31';

      const result = await eventsService.getArtistCalendar(testArtistId, startDate, endDate);

      expect(result.artistEvents).toBeDefined();
      expect(Array.isArray(result.artistEvents)).toBe(true);
      expect(result.artistEvents.length).toBeGreaterThan(0);
      expect(result.artistEvents[0].id).toBe('event-1');
      expect(result.artistEvents[0].type).toBe('gig');
    });

    it('should include query parameters in the request', async () => {
      const startDate = '2025-01-01';
      const endDate = '2025-01-31';

      let capturedUrl = '';
      server.use(
        http.get(`${API_BASE}/api/artists/:artistId/calendar`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({
            artistEvents: [],
            userUnavailability: [],
          });
        })
      );

      await eventsService.getArtistCalendar(testArtistId, startDate, endDate);

      expect(capturedUrl).toContain(`startDate=${startDate}`);
      expect(capturedUrl).toContain(`endDate=${endDate}`);
    });

    it('should handle empty calendar response', async () => {
      server.use(
        http.get(`${API_BASE}/api/artists/:artistId/calendar`, () => {
          return HttpResponse.json({
            artistEvents: [],
            userUnavailability: [],
          });
        })
      );

      const result = await eventsService.getArtistCalendar(testArtistId, '2025-01-01', '2025-01-31');

      expect(result.artistEvents).toEqual([]);
      expect(result.userUnavailability).toEqual([]);
    });

    it('should handle API errors gracefully', async () => {
      server.use(
        http.get(`${API_BASE}/api/artists/:artistId/calendar`, () => {
          return HttpResponse.json(
            { error: 'Failed to fetch calendar' },
            { status: 500 }
          );
        })
      );

      await expect(
        eventsService.getArtistCalendar(testArtistId, '2025-01-01', '2025-01-31')
      ).rejects.toThrow();
    });
  });

  describe('getAllArtistEvents', () => {
    it('should fetch all events for an artist', async () => {
      const result = await eventsService.getAllArtistEvents(testArtistId);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
      expect(result[0].id).toBe('event-1');
      expect(result[1].id).toBe('event-2');
    });

    it('should return events with all required fields', async () => {
      const result = await eventsService.getAllArtistEvents(testArtistId);

      const event = result[0];
      expect(event.id).toBeDefined();
      expect(event.artistId).toBe(testArtistId);
      expect(event.type).toBeDefined();
      expect(event.date).toBeDefined();
      expect(event.createdAt).toBeDefined();
      expect(event.updatedAt).toBeDefined();
    });

    it('should handle network errors', async () => {
      server.use(
        http.get(`${API_BASE}/api/artists/:artistId/events`, () => {
          return HttpResponse.error();
        })
      );

      await expect(
        eventsService.getAllArtistEvents(testArtistId)
      ).rejects.toThrow();
    });
  });

  describe('createEvent', () => {
    it('should create a new event successfully', async () => {
      const newEvent: CreateEventRequest = {
        type: 'gig',
        title: 'New Test Gig',
        venue: 'New Venue',
        location: 'Manchester',
        date: '2025-12-15',
        startTime: '19:00',
        endTime: '22:00',
        notes: 'Test notes',
      };

      const result = await eventsService.createEvent(testArtistId, newEvent);

      expect(result.id).toBeDefined();
      expect(result.artistId).toBe(testArtistId);
      expect(result.type).toBe(newEvent.type);
      expect(result.title).toBe(newEvent.title);
      expect(result.venue).toBe(newEvent.venue);
      expect(result.createdAt).toBeDefined();
    });

    it('should create minimal event with only required fields', async () => {
      const minimalEvent: CreateEventRequest = {
        type: 'practice',
        date: '2025-12-20',
      };

      const result = await eventsService.createEvent(testArtistId, minimalEvent);

      expect(result.id).toBeDefined();
      expect(result.type).toBe('practice');
      expect(result.date).toBe('2025-12-20');
    });

    it('should create event with setlist reference', async () => {
      const eventWithSetlist: CreateEventRequest = {
        type: 'gig',
        title: 'Gig with Setlist',
        date: '2025-12-25',
        setlistId: 'setlist-123',
      };

      const result = await eventsService.createEvent(testArtistId, eventWithSetlist);

      expect(result.setlistId).toBe('setlist-123');
    });

    it('should handle validation errors', async () => {
      server.use(
        http.post(`${API_BASE}/api/artists/:artistId/events`, () => {
          return HttpResponse.json(
            { error: 'Invalid event data' },
            { status: 400 }
          );
        })
      );

      const invalidEvent: CreateEventRequest = {
        type: 'gig',
        date: 'invalid-date',
      };

      await expect(
        eventsService.createEvent(testArtistId, invalidEvent)
      ).rejects.toThrow();
    });
  });

  describe('updateEvent', () => {
    it('should update an event successfully', async () => {
      const eventId = 'event-1';
      const updates: UpdateEventRequest = {
        title: 'Updated Title',
        venue: 'Updated Venue',
        startTime: '21:00',
      };

      const result = await eventsService.updateEvent(testArtistId, eventId, updates);

      expect(result.id).toBe(eventId);
      expect(result.title).toBe(updates.title);
      expect(result.venue).toBe(updates.venue);
      expect(result.startTime).toBe(updates.startTime);
      expect(result.updatedAt).toBeDefined();
    });

    it('should update event type', async () => {
      const eventId = 'event-1';
      const updates: UpdateEventRequest = {
        type: 'recording',
      };

      const result = await eventsService.updateEvent(testArtistId, eventId, updates);

      expect(result.type).toBe('recording');
    });

    it('should update event date and times', async () => {
      const eventId = 'event-1';
      const updates: UpdateEventRequest = {
        date: '2026-01-01',
        startTime: '18:00',
        endTime: '23:00',
      };

      const result = await eventsService.updateEvent(testArtistId, eventId, updates);

      expect(result.date).toBe(updates.date);
      expect(result.startTime).toBe(updates.startTime);
      expect(result.endTime).toBe(updates.endTime);
    });

    it('should handle non-existent event', async () => {
      server.use(
        http.put(`${API_BASE}/api/artists/:artistId/events/:eventId`, () => {
          return HttpResponse.json(
            { error: 'Event not found' },
            { status: 404 }
          );
        })
      );

      await expect(
        eventsService.updateEvent(testArtistId, 'non-existent', { title: 'Test' })
      ).rejects.toThrow();
    });
  });

  describe('deleteEvent', () => {
    it('should delete an event successfully', async () => {
      const eventId = 'event-1';

      await expect(
        eventsService.deleteEvent(testArtistId, eventId)
      ).resolves.not.toThrow();
    });

    it('should handle 204 No Content response', async () => {
      const eventId = 'event-2';

      const result = await eventsService.deleteEvent(testArtistId, eventId);

      expect(result).toEqual({});
    });

    it('should handle deletion errors', async () => {
      server.use(
        http.delete(`${API_BASE}/api/artists/:artistId/events/:eventId`, () => {
          return HttpResponse.json(
            { error: 'Cannot delete event' },
            { status: 403 }
          );
        })
      );

      await expect(
        eventsService.deleteEvent(testArtistId, 'event-1')
      ).rejects.toThrow();
    });

    it('should handle non-existent event deletion', async () => {
      server.use(
        http.delete(`${API_BASE}/api/artists/:artistId/events/:eventId`, () => {
          return HttpResponse.json(
            { error: 'Event not found' },
            { status: 404 }
          );
        })
      );

      await expect(
        eventsService.deleteEvent(testArtistId, 'non-existent')
      ).rejects.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should include HTTP status code in error message', async () => {
      server.use(
        http.get(`${API_BASE}/api/artists/:artistId/events`, () => {
          return HttpResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
          );
        })
      );

      try {
        await eventsService.getAllArtistEvents(testArtistId);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toContain('401');
      }
    });

    it('should handle network timeouts', async () => {
      server.use(
        http.get(`${API_BASE}/api/artists/:artistId/events`, async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return HttpResponse.error();
        })
      );

      await expect(
        eventsService.getAllArtistEvents(testArtistId)
      ).rejects.toThrow();
    });
  });
});
