// src/lib/services/__tests__/songs-service.test.ts
import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import songsService from '../songs-service';
import { API_BASE_URL } from '../../../config/api';

const API_BASE = API_BASE_URL;

// Setup MSW server
const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('SongsService', () => {
  // ===== Global Song Operations =====

  describe('searchSongs', () => {
    it('should search for songs with query', async () => {
      const mockSongs = [
        {
          id: 'song-1',
          title: 'Bohemian Rhapsody',
          artistName: 'Queen',
          album: 'A Night at the Opera',
          spotifyUrl: 'https://spotify.com/track/1',
        },
        {
          id: 'song-2',
          title: 'Somebody to Love',
          artistName: 'Queen',
          album: 'A Day at the Races',
          spotifyUrl: 'https://spotify.com/track/2',
        },
      ];

      server.use(
        http.get(`${API_BASE}/api/songs`, ({ request }) => {
          const url = new URL(request.url);
          const query = url.searchParams.get('q');
          expect(query).toBe('queen');
          return HttpResponse.json(mockSongs);
        })
      );

      const result = await songsService.searchSongs('queen');
      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Bohemian Rhapsody');
    });

    it('should handle empty search results', async () => {
      server.use(
        http.get(`${API_BASE}/api/songs`, () => {
          return HttpResponse.json([]);
        })
      );

      const result = await songsService.searchSongs('nonexistent');
      expect(result).toEqual([]);
    });

    it('should URL encode search query', async () => {
      server.use(
        http.get(`${API_BASE}/api/songs`, ({ request }) => {
          const url = new URL(request.url);
          const query = url.searchParams.get('q');
          expect(query).toBe('AC/DC - Back in Black');
          return HttpResponse.json([]);
        })
      );

      await songsService.searchSongs('AC/DC - Back in Black');
    });
  });

  describe('createGlobalSong', () => {
    it('should create global song with Spotify data', async () => {
      const songData = {
        title: 'Bohemian Rhapsody',
        artistName: 'Queen',
        album: 'A Night at the Opera',
        albumImageUrl: 'https://i.scdn.co/image/abc123',
        spotifyUrl: 'https://open.spotify.com/track/xyz',
        duration: 354000,
        genre: 'Rock',
        releaseDate: '1975-10-31',
        previewUrl: 'https://p.scdn.co/mp3-preview/xyz',
      };

      server.use(
        http.post(`${API_BASE}/api/songs`, async ({ request }) => {
          const body = await request.json();
          expect(body).toMatchObject(songData);
          return HttpResponse.json({ id: 'global-song-1' });
        })
      );

      const result = await songsService.createGlobalSong(songData);
      expect(result.id).toBe('global-song-1');
    });

    it('should create song with minimal required fields', async () => {
      const songData = {
        title: 'Test Song',
        artistName: 'Test Artist',
        album: 'Test Album',
        spotifyUrl: 'https://open.spotify.com/track/test',
        duration: 180000,
      };

      server.use(
        http.post(`${API_BASE}/api/songs`, async ({ request }) => {
          const body = await request.json();
          expect(body).toMatchObject(songData);
          expect(body.genre).toBeUndefined();
          expect(body.releaseDate).toBeUndefined();
          return HttpResponse.json({ id: 'global-song-2' });
        })
      );

      const result = await songsService.createGlobalSong(songData);
      expect(result.id).toBe('global-song-2');
    });
  });

  // ===== Artist Playbook Operations =====

  describe('getArtistSongs', () => {
    it('should fetch all songs for artist playbook', async () => {
      const mockPlaybook = [
        {
          id: 'artist-song-1',
          artistId: 'artist-1',
          globalSongId: 'global-1',
          tuning: 'Standard',
          createdAt: '2025-01-01T00:00:00Z',
          globalSong: {
            title: 'Song 1',
            artistName: 'Artist 1',
            album: 'Album 1',
            spotifyUrl: 'https://spotify.com/1',
            duration: 180000,
            albumImageUrl: null,
            previewUrl: null,
          },
          readiness: [],
          vetos: [],
        },
        {
          id: 'artist-song-2',
          artistId: 'artist-1',
          globalSongId: 'global-2',
          createdAt: '2025-01-02T00:00:00Z',
          globalSong: {
            title: 'Song 2',
            artistName: 'Artist 2',
            album: 'Album 2',
            spotifyUrl: 'https://spotify.com/2',
            duration: 200000,
            albumImageUrl: null,
            previewUrl: null,
          },
          readiness: [],
          vetos: [],
        },
      ];

      server.use(
        http.get(`${API_BASE}/api/artists/:artistId/playbook`, ({ params }) => {
          expect(params.artistId).toBe('artist-1');
          return HttpResponse.json(mockPlaybook);
        })
      );

      const result = await songsService.getArtistSongs('artist-1');
      expect(result).toHaveLength(2);
      expect(result[0].globalSong?.title).toBe('Song 1');
      expect(result[1].globalSong?.title).toBe('Song 2');
    });

    it('should return empty array for artist with no songs', async () => {
      server.use(
        http.get(`${API_BASE}/api/artists/:artistId/playbook`, () => {
          return HttpResponse.json([]);
        })
      );

      const result = await songsService.getArtistSongs('artist-1');
      expect(result).toEqual([]);
    });

    it('should include readiness and veto data', async () => {
      const mockPlaybook = [
        {
          id: 'artist-song-1',
          artistId: 'artist-1',
          globalSongId: 'global-1',
          createdAt: '2025-01-01T00:00:00Z',
          globalSong: {
            title: 'Song 1',
            artistName: 'Artist 1',
            album: 'Album 1',
            spotifyUrl: 'https://spotify.com/1',
            duration: 180000,
            albumImageUrl: null,
            previewUrl: null,
          },
          readiness: [
            {
              id: 'ready-1',
              songId: 'artist-song-1',
              membershipId: 'member-1',
              status: 'green' as const,
              updatedAt: '2025-01-01T12:00:00Z',
            },
          ],
          vetos: [
            {
              id: 'veto-1',
              songId: 'artist-song-1',
              membershipId: 'member-2',
              createdAt: '2025-01-01T13:00:00Z',
            },
          ],
        },
      ];

      server.use(
        http.get(`${API_BASE}/api/artists/:artistId/playbook`, () => {
          return HttpResponse.json(mockPlaybook);
        })
      );

      const result = await songsService.getArtistSongs('artist-1');
      expect(result[0].readiness).toHaveLength(1);
      expect(result[0].readiness[0].status).toBe('green');
      expect(result[0].vetos).toHaveLength(1);
    });
  });

  describe('addSong', () => {
    it('should add song to artist playbook with all fields', async () => {
      const songRequest = {
        spotifyUrl: 'https://open.spotify.com/track/xyz',
        tuning: 'Drop D',
        notes: 'Capo on 2nd fret',
        customDuration: 200000,
        guitarChordsUrl: 'https://ultimate-guitar.com/xyz',
        additionalUrl: 'https://youtube.com/xyz',
      };

      server.use(
        http.post(`${API_BASE}/api/artists/:artistId/playbook`, async ({ request, params }) => {
          expect(params.artistId).toBe('artist-1');
          const body = await request.json();
          expect(body).toMatchObject(songRequest);

          return HttpResponse.json({
            id: 'artist-song-new',
            artistId: 'artist-1',
            globalSongId: 'global-xyz',
            ...songRequest,
            createdAt: '2025-01-01T00:00:00Z',
            readiness: [],
            vetos: [],
          });
        })
      );

      const result = await songsService.addSong('artist-1', songRequest);
      expect(result.id).toBe('artist-song-new');
      expect(result.tuning).toBe('Drop D');
      expect(result.notes).toBe('Capo on 2nd fret');
    });

    it('should add song with minimal required fields', async () => {
      const songRequest = {
        spotifyUrl: 'https://open.spotify.com/track/abc',
      };

      server.use(
        http.post(`${API_BASE}/api/artists/:artistId/playbook`, async ({ request }) => {
          const body = await request.json();
          expect(body).toEqual(songRequest);
          expect(body.tuning).toBeUndefined();
          expect(body.notes).toBeUndefined();

          return HttpResponse.json({
            id: 'artist-song-new',
            artistId: 'artist-1',
            globalSongId: 'global-abc',
            spotifyUrl: songRequest.spotifyUrl,
            createdAt: '2025-01-01T00:00:00Z',
            readiness: [],
            vetos: [],
          });
        })
      );

      const result = await songsService.addSong('artist-1', songRequest);
      expect(result.id).toBe('artist-song-new');
    });
  });

  describe('updateSong', () => {
    it('should update song with all optional fields', async () => {
      const updates = {
        tuning: 'Half-step down',
        notes: 'Updated notes',
        customDuration: 210000,
        guitarChordsUrl: 'https://updated-chords.com',
        additionalUrl: 'https://updated-video.com',
      };

      server.use(
        http.put(
          `${API_BASE}/api/artists/:artistId/playbook/:songId`,
          async ({ request, params }) => {
            expect(params.artistId).toBe('artist-1');
            expect(params.songId).toBe('song-1');
            const body = await request.json();
            expect(body).toMatchObject(updates);

            return HttpResponse.json({
              id: 'song-1',
              artistId: 'artist-1',
              globalSongId: 'global-1',
              ...updates,
              createdAt: '2025-01-01T00:00:00Z',
              readiness: [],
              vetos: [],
            });
          }
        )
      );

      const result = await songsService.updateSong('artist-1', 'song-1', updates);
      expect(result.tuning).toBe('Half-step down');
      expect(result.notes).toBe('Updated notes');
    });

    it('should update only specific fields', async () => {
      const updates = {
        tuning: 'Standard',
      };

      server.use(
        http.put(
          `${API_BASE}/api/artists/:artistId/playbook/:songId`,
          async ({ request }) => {
            const body = await request.json();
            expect(body).toEqual(updates);
            expect(Object.keys(body)).toHaveLength(1);

            return HttpResponse.json({
              id: 'song-1',
              artistId: 'artist-1',
              globalSongId: 'global-1',
              tuning: 'Standard',
              createdAt: '2025-01-01T00:00:00Z',
              readiness: [],
              vetos: [],
            });
          }
        )
      );

      const result = await songsService.updateSong('artist-1', 'song-1', updates);
      expect(result.tuning).toBe('Standard');
    });
  });

  describe('deleteSong', () => {
    it('should delete song from playbook', async () => {
      server.use(
        http.delete(
          `${API_BASE}/api/artists/:artistId/playbook/:songId`,
          ({ params }) => {
            expect(params.artistId).toBe('artist-1');
            expect(params.songId).toBe('song-1');
            return HttpResponse.json({});
          }
        )
      );

      await songsService.deleteSong('artist-1', 'song-1');
    });

    it('should throw error for non-existent song', async () => {
      server.use(
        http.delete(`${API_BASE}/api/artists/:artistId/playbook/:songId`, () => {
          return HttpResponse.json({ error: 'Not found' }, { status: 404 });
        })
      );

      await expect(songsService.deleteSong('artist-1', 'non-existent')).rejects.toThrow(/404/);
    });
  });

  // ===== Readiness and Veto Operations =====

  describe('updateReadiness', () => {
    it('should update readiness to green', async () => {
      server.use(
        http.put(
          `${API_BASE}/api/artists/:artistId/playbook/:songId/readiness`,
          async ({ request, params }) => {
            expect(params.artistId).toBe('artist-1');
            expect(params.songId).toBe('song-1');
            const body = await request.json();
            expect(body).toEqual({ status: 'green' });
            return HttpResponse.json({});
          }
        )
      );

      await songsService.updateReadiness('artist-1', 'song-1', 'green');
    });

    it('should update readiness to amber', async () => {
      server.use(
        http.put(
          `${API_BASE}/api/artists/:artistId/playbook/:songId/readiness`,
          async ({ request }) => {
            const body = await request.json();
            expect(body).toEqual({ status: 'amber' });
            return HttpResponse.json({});
          }
        )
      );

      await songsService.updateReadiness('artist-1', 'song-1', 'amber');
    });

    it('should update readiness to red', async () => {
      server.use(
        http.put(
          `${API_BASE}/api/artists/:artistId/playbook/:songId/readiness`,
          async ({ request }) => {
            const body = await request.json();
            expect(body).toEqual({ status: 'red' });
            return HttpResponse.json({});
          }
        )
      );

      await songsService.updateReadiness('artist-1', 'song-1', 'red');
    });
  });

  describe('toggleVeto', () => {
    it('should toggle veto status', async () => {
      server.use(
        http.post(
          `${API_BASE}/api/artists/:artistId/playbook/:songId/veto`,
          ({ params }) => {
            expect(params.artistId).toBe('artist-1');
            expect(params.songId).toBe('song-1');
            return HttpResponse.json({});
          }
        )
      );

      await songsService.toggleVeto('artist-1', 'song-1');
    });

    it('should handle veto toggle errors', async () => {
      server.use(
        http.post(`${API_BASE}/api/artists/:artistId/playbook/:songId/veto`, () => {
          return HttpResponse.json(
            { error: 'Cannot veto song' },
            { status: 400 }
          );
        })
      );

      await expect(songsService.toggleVeto('artist-1', 'song-1')).rejects.toThrow(/400/);
    });
  });

  // ===== Error Handling =====

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      server.use(
        http.get(`${API_BASE}/api/songs`, () => {
          return HttpResponse.error();
        })
      );

      await expect(songsService.searchSongs('test')).rejects.toThrow();
    });

    it('should handle 500 server errors', async () => {
      server.use(
        http.get(`${API_BASE}/api/artists/:artistId/playbook`, () => {
          return HttpResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
          );
        })
      );

      await expect(songsService.getArtistSongs('artist-1')).rejects.toThrow(/500/);
    });

    it('should handle malformed JSON responses', async () => {
      server.use(
        http.get(`${API_BASE}/api/songs`, () => {
          return new HttpResponse('Not valid JSON', {
            status: 200,
            headers: { 'Content-Type': 'text/plain' },
          });
        })
      );

      await expect(songsService.searchSongs('test')).rejects.toThrow();
    });
  });
});
