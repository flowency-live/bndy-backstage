import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { artistsService } from '../artists-service';
import type { Artist, ArtistMember } from '../artists-service';

const API_BASE = 'https://api.bndy.co.uk';

// MSW server setup
const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('ArtistsService', () => {
  // ===== Artist Profile Operations =====

  describe('getArtist', () => {
    it('should fetch artist profile successfully', async () => {
      const mockArtist: Artist = {
        id: 'artist-1',
        name: 'Test Band',
        bio: 'A great band',
        location: 'London',
        profileImageUrl: 'https://example.com/image.jpg',
        genres: ['Rock', 'Indie'],
        artistType: 'band',
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      };

      server.use(
        http.get(`${API_BASE}/api/artists/:artistId`, ({ params }) => {
          expect(params.artistId).toBe('artist-1');
          return HttpResponse.json(mockArtist);
        })
      );

      const result = await artistsService.getArtist('artist-1');
      expect(result).toEqual(mockArtist);
    });

    it('should throw error for non-existent artist', async () => {
      server.use(
        http.get(`${API_BASE}/api/artists/:artistId`, () => {
          return HttpResponse.json({ error: 'Not found' }, { status: 404 });
        })
      );

      await expect(artistsService.getArtist('non-existent')).rejects.toThrow(/404/);
    });

    it('should handle network errors', async () => {
      server.use(
        http.get(`${API_BASE}/api/artists/:artistId`, () => {
          return HttpResponse.error();
        })
      );

      await expect(artistsService.getArtist('artist-1')).rejects.toThrow();
    });
  });

  describe('updateArtist', () => {
    it('should update artist profile successfully', async () => {
      const updateData = {
        name: 'Updated Band Name',
        bio: 'Updated bio',
        genres: ['Rock', 'Blues'],
      };

      server.use(
        http.put(`${API_BASE}/api/artists/:artistId`, async ({ request, params }) => {
          expect(params.artistId).toBe('artist-1');
          const body = await request.json();
          expect(body).toEqual(updateData);

          return HttpResponse.json({
            id: 'artist-1',
            ...updateData,
            createdAt: '2025-01-01T00:00:00Z',
            updatedAt: new Date().toISOString(),
          });
        })
      );

      const result = await artistsService.updateArtist('artist-1', updateData);
      expect(result.name).toBe('Updated Band Name');
      expect(result.bio).toBe('Updated bio');
      expect(result.genres).toEqual(['Rock', 'Blues']);
    });

    it('should update social media URLs', async () => {
      const updateData = {
        facebookUrl: 'https://facebook.com/testband',
        instagramUrl: 'https://instagram.com/testband',
        websiteUrl: 'https://testband.com',
      };

      server.use(
        http.put(`${API_BASE}/api/artists/:artistId`, async ({ request }) => {
          const body = await request.json();
          return HttpResponse.json({
            id: 'artist-1',
            name: 'Test Band',
            ...body,
            createdAt: '2025-01-01T00:00:00Z',
            updatedAt: new Date().toISOString(),
          });
        })
      );

      const result = await artistsService.updateArtist('artist-1', updateData);
      expect(result.facebookUrl).toBe('https://facebook.com/testband');
      expect(result.instagramUrl).toBe('https://instagram.com/testband');
      expect(result.websiteUrl).toBe('https://testband.com');
    });

    it('should handle validation errors', async () => {
      server.use(
        http.put(`${API_BASE}/api/artists/:artistId`, () => {
          return HttpResponse.json(
            { error: 'Name is required' },
            { status: 400 }
          );
        })
      );

      await expect(
        artistsService.updateArtist('artist-1', { name: '' })
      ).rejects.toThrow(/400/);
    });
  });

  describe('createArtist', () => {
    it('should create new artist with minimal data', async () => {
      const newArtist = {
        name: 'New Band',
      };

      server.use(
        http.post(`${API_BASE}/api/artists`, async ({ request }) => {
          const body = await request.json();
          expect(body).toMatchObject(newArtist);

          return HttpResponse.json({
            id: 'new-artist-1',
            ...body,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        })
      );

      const result = await artistsService.createArtist(newArtist);
      expect(result.id).toBe('new-artist-1');
      expect(result.name).toBe('New Band');
    });

    it('should create artist with full profile', async () => {
      const newArtist = {
        name: 'Full Profile Band',
        bio: 'A comprehensive bio',
        location: 'Manchester',
        genres: ['Rock', 'Alternative'],
        artistType: 'band' as const,
        actType: ['original'],
        acoustic: false,
        facebookUrl: 'https://facebook.com/fullband',
      };

      server.use(
        http.post(`${API_BASE}/api/artists`, async ({ request }) => {
          const body = await request.json();
          return HttpResponse.json({
            id: 'full-artist-1',
            ...body,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        })
      );

      const result = await artistsService.createArtist(newArtist);
      expect(result.name).toBe('Full Profile Band');
      expect(result.bio).toBe('A comprehensive bio');
      expect(result.genres).toEqual(['Rock', 'Alternative']);
      expect(result.artistType).toBe('band');
    });

    it('should handle validation errors', async () => {
      server.use(
        http.post(`${API_BASE}/api/artists`, () => {
          return HttpResponse.json(
            { error: 'Name is required' },
            { status: 400 }
          );
        })
      );

      await expect(artistsService.createArtist({})).rejects.toThrow(/400/);
    });
  });

  describe('deleteArtist', () => {
    it('should delete artist successfully', async () => {
      server.use(
        http.delete(`${API_BASE}/api/artists/:artistId`, ({ params }) => {
          expect(params.artistId).toBe('artist-1');
          return new HttpResponse(null, { status: 204 });
        })
      );

      const result = await artistsService.deleteArtist('artist-1');
      expect(result).toBeDefined(); // Returns empty object {} for 204 responses
    });

    it('should handle non-existent artist deletion', async () => {
      server.use(
        http.delete(`${API_BASE}/api/artists/:artistId`, () => {
          return HttpResponse.json({ error: 'Not found' }, { status: 404 });
        })
      );

      await expect(artistsService.deleteArtist('non-existent')).rejects.toThrow(/404/);
    });
  });

  describe('getMyArtists', () => {
    it('should fetch current user artists', async () => {
      const mockArtists: Artist[] = [
        {
          id: 'artist-1',
          name: 'Band 1',
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z',
        },
        {
          id: 'artist-2',
          name: 'Band 2',
          createdAt: '2025-01-02T00:00:00Z',
          updatedAt: '2025-01-02T00:00:00Z',
        },
      ];

      server.use(
        http.get(`${API_BASE}/api/artists`, () => {
          return HttpResponse.json(mockArtists);
        })
      );

      const result = await artistsService.getMyArtists();
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Band 1');
      expect(result[1].name).toBe('Band 2');
    });

    it('should return empty array for users with no artists', async () => {
      server.use(
        http.get(`${API_BASE}/api/artists`, () => {
          return HttpResponse.json([]);
        })
      );

      const result = await artistsService.getMyArtists();
      expect(result).toEqual([]);
    });
  });

  // ===== Members Operations =====

  describe('getArtistMembers', () => {
    it('should fetch artist members (array response)', async () => {
      const mockMembers: ArtistMember[] = [
        {
          id: 'member-1',
          displayName: 'John Doe',
          avatarUrl: null,
          instrument: 'Guitar',
          role: 'owner',
          joinedAt: '2025-01-01T00:00:00Z',
        },
      ];

      server.use(
        http.get(`${API_BASE}/api/artists/:artistId/members`, ({ params }) => {
          expect(params.artistId).toBe('artist-1');
          return HttpResponse.json(mockMembers);
        })
      );

      const result = await artistsService.getArtistMembers('artist-1');
      expect(result).toHaveLength(1);
      expect(result[0].displayName).toBe('John Doe');
      expect(result[0].instrument).toBe('Guitar');
    });

    it('should fetch artist members (object response with members property)', async () => {
      const mockMembers: ArtistMember[] = [
        {
          id: 'member-1',
          displayName: 'Jane Smith',
          avatarUrl: 'https://example.com/avatar.jpg',
          instrument: 'Vocals',
          role: 'admin',
          joinedAt: '2025-01-01T00:00:00Z',
        },
      ];

      server.use(
        http.get(`${API_BASE}/api/artists/:artistId/members`, () => {
          return HttpResponse.json({ members: mockMembers });
        })
      );

      const result = await artistsService.getArtistMembers('artist-1');
      expect(result).toHaveLength(1);
      expect(result[0].displayName).toBe('Jane Smith');
    });

    it('should handle empty members list', async () => {
      server.use(
        http.get(`${API_BASE}/api/artists/:artistId/members`, () => {
          return HttpResponse.json([]);
        })
      );

      const result = await artistsService.getArtistMembers('artist-1');
      expect(result).toEqual([]);
    });
  });

  describe('removeMembership', () => {
    it('should remove membership successfully', async () => {
      server.use(
        http.delete(`${API_BASE}/api/memberships/:membershipId`, ({ params }) => {
          expect(params.membershipId).toBe('membership-1');
          return new HttpResponse(null, { status: 204 });
        })
      );

      const result = await artistsService.removeMembership('membership-1');
      expect(result).toBeDefined(); // Returns empty object {} for 204 responses
    });

    it('should handle non-existent membership', async () => {
      server.use(
        http.delete(`${API_BASE}/api/memberships/:membershipId`, () => {
          return HttpResponse.json({ error: 'Not found' }, { status: 404 });
        })
      );

      await expect(artistsService.removeMembership('non-existent')).rejects.toThrow(/404/);
    });
  });

  // ===== Pipeline Operations =====

  describe('getPipelineCounts', () => {
    it('should fetch pipeline counts successfully', async () => {
      server.use(
        http.get(`${API_BASE}/api/artists/:artistId/pipeline`, ({ request, params }) => {
          expect(params.artistId).toBe('artist-1');
          const url = new URL(request.url);
          const status = url.searchParams.get('status');

          if (status === 'voting') {
            return HttpResponse.json([1, 2, 3, 4, 5]); // 5 items
          } else if (status === 'review') {
            return HttpResponse.json([1, 2, 3]); // 3 items
          } else if (status === 'practice') {
            return HttpResponse.json([1, 2, 3, 4, 5, 6, 7]); // 7 items
          }
          return HttpResponse.json([]);
        })
      );

      const result = await artistsService.getPipelineCounts('artist-1');
      expect(result.voting).toBe(5);
      expect(result.review).toBe(3);
      expect(result.practice).toBe(7);
    });

    it('should handle zero counts', async () => {
      server.use(
        http.get(`${API_BASE}/api/artists/:artistId/pipeline`, () => {
          return HttpResponse.json([]);
        })
      );

      const result = await artistsService.getPipelineCounts('artist-1');
      expect(result.voting).toBe(0);
      expect(result.review).toBe(0);
      expect(result.practice).toBe(0);
    });
  });

  describe('checkVoteReminders', () => {
    it('should send vote reminders successfully', async () => {
      server.use(
        http.post(`${API_BASE}/api/artists/:artistId/check-vote-reminders`, ({ params }) => {
          expect(params.artistId).toBe('artist-1');
          return new HttpResponse(null, { status: 204 });
        })
      );

      const result = await artistsService.checkVoteReminders('artist-1');
      expect(result).toBeDefined(); // Returns empty object {} for 204 responses
    });

    it('should handle errors when sending reminders', async () => {
      server.use(
        http.post(`${API_BASE}/api/artists/:artistId/check-vote-reminders`, () => {
          return HttpResponse.json(
            { error: 'Failed to send reminders' },
            { status: 500 }
          );
        })
      );

      await expect(artistsService.checkVoteReminders('artist-1')).rejects.toThrow(/500/);
    });
  });

  describe('getPipelineSongs', () => {
    it('should fetch pipeline songs by status', async () => {
      const mockSongs = [
        { id: 'song-1', title: 'Test Song', status: 'voting' },
        { id: 'song-2', title: 'Another Song', status: 'voting' },
      ];

      server.use(
        http.get(`${API_BASE}/api/artists/:artistId/pipeline`, ({ request, params }) => {
          expect(params.artistId).toBe('artist-1');
          const url = new URL(request.url);
          expect(url.searchParams.get('status')).toBe('voting');
          return HttpResponse.json(mockSongs);
        })
      );

      const result = await artistsService.getPipelineSongs('artist-1', 'voting');
      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Test Song');
    });

    it('should handle empty pipeline', async () => {
      server.use(
        http.get(`${API_BASE}/api/artists/:artistId/pipeline`, () => {
          return HttpResponse.json([]);
        })
      );

      const result = await artistsService.getPipelineSongs('artist-1', 'review');
      expect(result).toEqual([]);
    });
  });

  describe('getVotingPipelineSongs', () => {
    it('should fetch voting and review songs in parallel', async () => {
      server.use(
        http.get(`${API_BASE}/api/artists/:artistId/pipeline`, ({ request }) => {
          const url = new URL(request.url);
          const status = url.searchParams.get('status');

          if (status === 'voting') {
            return HttpResponse.json([
              { id: 'voting-1', title: 'Voting Song', status: 'voting' },
            ]);
          } else if (status === 'review') {
            return HttpResponse.json([
              { id: 'review-1', title: 'Review Song', status: 'review' },
            ]);
          }
          return HttpResponse.json([]);
        })
      );

      const result = await artistsService.getVotingPipelineSongs('artist-1');
      expect(result).toHaveLength(2);
      expect(result.find(s => s.id === 'voting-1')).toBeDefined();
      expect(result.find(s => s.id === 'review-1')).toBeDefined();
    });
  });

  describe('getArchivedPipelineSongs', () => {
    it('should fetch parked and discarded songs in parallel', async () => {
      server.use(
        http.get(`${API_BASE}/api/artists/:artistId/pipeline`, ({ request }) => {
          const url = new URL(request.url);
          const status = url.searchParams.get('status');

          if (status === 'parked') {
            return HttpResponse.json([
              { id: 'parked-1', title: 'Parked Song', status: 'parked' },
            ]);
          } else if (status === 'discarded') {
            return HttpResponse.json([
              { id: 'discarded-1', title: 'Discarded Song', status: 'discarded' },
            ]);
          }
          return HttpResponse.json([]);
        })
      );

      const result = await artistsService.getArchivedPipelineSongs('artist-1');
      expect(result).toHaveLength(2);
    });
  });

  describe('votePipelineSong', () => {
    it('should submit vote successfully', async () => {
      server.use(
        http.post(
          `${API_BASE}/api/artists/:artistId/pipeline/:pipelineId/vote`,
          async ({ request, params }) => {
            expect(params.artistId).toBe('artist-1');
            expect(params.pipelineId).toBe('pipeline-1');
            const body = await request.json();
            expect(body).toEqual({ vote_value: 1 });

            return HttpResponse.json({
              id: 'pipeline-1',
              votes: [{ userId: 'user-1', value: 1 }],
            });
          }
        )
      );

      const result = await artistsService.votePipelineSong('artist-1', 'pipeline-1', 1);
      expect(result.id).toBe('pipeline-1');
    });

    it('should handle vote update (changing vote)', async () => {
      server.use(
        http.post(
          `${API_BASE}/api/artists/:artistId/pipeline/:pipelineId/vote`,
          async ({ request }) => {
            const body = await request.json();
            expect(body).toEqual({ vote_value: -1 });
            return HttpResponse.json({ id: 'pipeline-1', votes: [] });
          }
        )
      );

      await artistsService.votePipelineSong('artist-1', 'pipeline-1', -1);
    });
  });

  describe('updatePipelineStatus', () => {
    it('should update pipeline status successfully', async () => {
      server.use(
        http.put(
          `${API_BASE}/api/artists/:artistId/pipeline/:pipelineId/status`,
          async ({ request, params }) => {
            expect(params.pipelineId).toBe('pipeline-1');
            const body = await request.json();
            expect(body).toEqual({ status: 'practice' });

            return HttpResponse.json({
              id: 'pipeline-1',
              status: 'practice',
            });
          }
        )
      );

      const result = await artistsService.updatePipelineStatus('artist-1', 'pipeline-1', 'practice');
      expect(result.status).toBe('practice');
    });
  });

  describe('updatePipelineRAGStatus', () => {
    it('should update RAG status successfully', async () => {
      server.use(
        http.put(
          `${API_BASE}/api/artists/:artistId/pipeline/:pipelineId/rag-status`,
          async ({ request, params }) => {
            expect(params.pipelineId).toBe('pipeline-1');
            const body = await request.json();
            expect(body).toEqual({ rag_status: 'green' });

            return HttpResponse.json({
              id: 'pipeline-1',
              ragStatus: 'green',
            });
          }
        )
      );

      const result = await artistsService.updatePipelineRAGStatus('artist-1', 'pipeline-1', 'green');
      expect(result.ragStatus).toBe('green');
    });
  });

  describe('deletePipelineSong', () => {
    it('should delete pipeline song successfully', async () => {
      server.use(
        http.delete(
          `${API_BASE}/api/artists/:artistId/pipeline/:pipelineId`,
          ({ params }) => {
            expect(params.artistId).toBe('artist-1');
            expect(params.pipelineId).toBe('pipeline-1');
            return new HttpResponse(null, { status: 204 });
          }
        )
      );

      const result = await artistsService.deletePipelineSong('artist-1', 'pipeline-1');
      expect(result).toBeDefined(); // Returns empty object {} for 204 responses
    });
  });

  describe('addPipelineSuggestion', () => {
    it('should add suggestion to voting with vote', async () => {
      const suggestionData = {
        song_id: 'song-1',
        initial_vote: 1,
        added_by_membership_id: 'member-1',
      };

      server.use(
        http.post(
          `${API_BASE}/api/artists/:artistId/pipeline/suggestions`,
          async ({ request, params }) => {
            expect(params.artistId).toBe('artist-1');
            const body = await request.json();
            expect(body).toMatchObject(suggestionData);

            return HttpResponse.json({
              id: 'pipeline-new-1',
              songId: 'song-1',
              status: 'voting',
              votes: [{ userId: 'user-1', value: 1 }],
            });
          }
        )
      );

      const result = await artistsService.addPipelineSuggestion('artist-1', suggestionData);
      expect(result.status).toBe('voting');
    });

    it('should add suggestion directly to practice', async () => {
      const suggestionData = {
        song_id: 'song-2',
        status: 'practice',
        added_by_membership_id: 'member-1',
      };

      server.use(
        http.post(
          `${API_BASE}/api/artists/:artistId/pipeline/suggestions`,
          async ({ request }) => {
            const body = await request.json();
            expect(body).toMatchObject(suggestionData);

            return HttpResponse.json({
              id: 'pipeline-new-2',
              songId: 'song-2',
              status: 'practice',
            });
          }
        )
      );

      const result = await artistsService.addPipelineSuggestion('artist-1', suggestionData);
      expect(result.status).toBe('practice');
    });
  });

  // ===== Error Handling =====

  describe('Error Handling', () => {
    it('should include HTTP status code in error message', async () => {
      server.use(
        http.get(`${API_BASE}/api/artists/:artistId`, () => {
          return HttpResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
          );
        })
      );

      await expect(artistsService.getArtist('artist-1')).rejects.toThrow(/401/);
    });

    it('should handle network timeouts', async () => {
      server.use(
        http.get(`${API_BASE}/api/artists/:artistId`, async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return HttpResponse.error();
        })
      );

      await expect(artistsService.getArtist('artist-1')).rejects.toThrow();
    });

    it('should handle malformed JSON responses', async () => {
      server.use(
        http.get(`${API_BASE}/api/artists/:artistId`, () => {
          return new HttpResponse('Not JSON', {
            headers: { 'Content-Type': 'text/plain' },
          });
        })
      );

      await expect(artistsService.getArtist('artist-1')).rejects.toThrow();
    });
  });
});
