import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertBandMemberSchema, insertEventSchema, insertSongSchema, insertSongReadinessSchema, insertSongVetoSchema, insertUserProfileSchema, updateUserProfileSchema } from "@shared/schema";
import { spotifyService } from "./spotify";
import { spotifyUserService } from "./spotify-user";
import { authenticateSupabaseJWT, requireMembership, type AuthenticatedRequest } from "./auth-middleware";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication endpoint
  app.get("/api/me", authenticateSupabaseJWT, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // Get or create user in our database
      let dbUser = req.user.dbUser;
      
      if (!dbUser) {
        // User doesn't exist in our database yet, create them
        try {
          dbUser = await storage.createOrGetUser({
            supabaseId: req.user.supabaseId,
            email: req.user.email || null,
            phone: req.user.phone || null,
            displayName: req.user.email || req.user.phone || null,
          });
        } catch (error) {
          console.error("Failed to create user in database:", error);
          return res.status(500).json({ message: "Failed to create user profile" });
        }
      }

      // Get user's band memberships
      const bandMemberships = await storage.getUserBands(dbUser.id);

      // Return user profile with band memberships
      res.json({
        user: {
          id: dbUser.id,
          supabaseId: dbUser.supabaseId,
          email: dbUser.email,
          phone: dbUser.phone,
          firstName: dbUser.firstName,
          lastName: dbUser.lastName,
          displayName: dbUser.displayName,
          hometown: dbUser.hometown,
          instrument: dbUser.instrument,
          avatarUrl: dbUser.avatarUrl,
          platformAdmin: dbUser.platformAdmin,
          profileCompleted: dbUser.profileCompleted,
          createdAt: dbUser.createdAt,
          updatedAt: dbUser.updatedAt,
        },
        bands: bandMemberships,
      });
    } catch (error) {
      console.error("Failed to fetch user profile:", error);
      res.status(500).json({ message: "Failed to fetch user profile" });
    }
  });

  // User Profile Update endpoint
  app.put("/api/me", authenticateSupabaseJWT, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user?.dbUser?.id) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const validatedData = updateUserProfileSchema.parse(req.body);
      
      // Update the profile completion status if all required fields are provided
      let profileCompleted = req.user.dbUser.profileCompleted;
      if (validatedData.firstName && validatedData.lastName && validatedData.displayName && validatedData.hometown && validatedData.instrument) {
        profileCompleted = true;
      }

      const updatedUser = await storage.updateUser(req.user.dbUser.id, {
        ...validatedData,
        profileCompleted,
      });

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        user: {
          id: updatedUser.id,
          supabaseId: updatedUser.supabaseId,
          email: updatedUser.email,
          phone: updatedUser.phone,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          displayName: updatedUser.displayName,
          hometown: updatedUser.hometown,
          instrument: updatedUser.instrument,
          avatarUrl: updatedUser.avatarUrl,
          profileCompleted: updatedUser.profileCompleted,
          createdAt: updatedUser.createdAt,
          updatedAt: updatedUser.updatedAt,
        },
        message: "Profile updated successfully"
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Failed to update user profile:", error);
      res.status(500).json({ message: "Failed to update user profile" });
    }
  });

  // Band Management endpoints
  app.get("/api/bands", authenticateSupabaseJWT, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user?.dbUser?.id) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const bands = await storage.getUserBands(req.user.dbUser.id);
      res.json(bands);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bands" });
    }
  });

  app.post("/api/bands", authenticateSupabaseJWT, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user?.dbUser?.id) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      // Check if band creation is allowed
      const totalBandsCount = await storage.getTotalBandsCount();
      const isPlatformAdmin = req.user.dbUser.platformAdmin === true;
      
      // Enforce invite-only concept: only platform admins can create bands until we have 10 bands
      if (totalBandsCount >= 10 || isPlatformAdmin) {
        // Band creation allowed
        const { name, description } = req.body;
        // Generate slug from name (simple version - replace spaces with hyphens and lowercase)
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        const band = await storage.createBand({
          name,
          slug,
          description,
          createdBy: req.user.dbUser.id,
        }, req.user.dbUser.id);
        
        res.status(201).json(band);
      } else {
        return res.status(403).json({ 
          message: "Band creation is currently restricted. Please contact an administrator or use an invite link to join an existing band.",
          reason: "invite_only_period"
        });
      }
    } catch (error) {
      console.error("Failed to create band:", error);
      res.status(500).json({ message: "Failed to create band" });
    }
  });

  app.get("/api/bands/:bandId", authenticateSupabaseJWT, requireMembership, async (req: AuthenticatedRequest, res) => {
    try {
      const band = await storage.getBand(req.params.bandId);
      res.json(band);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch band" });
    }
  });

  // Band Members endpoints (band-scoped)
  app.get("/api/bands/:bandId/members", authenticateSupabaseJWT, requireMembership, async (req: AuthenticatedRequest, res) => {
    try {
      const members = await storage.getBandMembers(req.params.bandId);
      res.json(members);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch band members" });
    }
  });

  // SECURITY: Legacy endpoints removed - they allowed unauthenticated access to all band data
  // Use /api/bands/:bandId/members endpoints instead, which require proper authentication and band membership

  // Events endpoints (band-scoped)
  app.get("/api/bands/:bandId/events", authenticateSupabaseJWT, requireMembership, async (req: AuthenticatedRequest, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      let events;
      if (startDate && endDate) {
        events = await storage.getEventsByDateRange(
          req.params.bandId,
          startDate as string, 
          endDate as string
        );
      } else {
        events = await storage.getEvents(req.params.bandId);
      }
      
      res.json(events);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  app.get("/api/bands/:bandId/events/:id", authenticateSupabaseJWT, requireMembership, async (req: AuthenticatedRequest, res) => {
    try {
      const event = await storage.getEvent(req.params.bandId, req.params.id);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      res.json(event);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch event" });
    }
  });

  app.post("/api/bands/:bandId/events", authenticateSupabaseJWT, requireMembership, async (req: AuthenticatedRequest, res) => {
    try {
      const validatedData = insertEventSchema.parse({
        ...req.body,
        bandId: req.params.bandId
      });
      const event = await storage.createEvent(req.params.bandId, validatedData);
      res.status(201).json(event);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create event" });
    }
  });

  app.patch("/api/bands/:bandId/events/:id", authenticateSupabaseJWT, requireMembership, async (req: AuthenticatedRequest, res) => {
    try {
      const validatedData = insertEventSchema.partial().parse(req.body);
      const event = await storage.updateEvent(req.params.bandId, req.params.id, validatedData);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      res.json(event);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update event" });
    }
  });

  app.delete("/api/bands/:bandId/events/:id", authenticateSupabaseJWT, requireMembership, async (req: AuthenticatedRequest, res) => {
    try {
      const success = await storage.deleteEvent(req.params.bandId, req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Event not found" });
      }
      res.json({ message: "Event deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete event" });
    }
  });

  // Check for conflicts (band-scoped)
  app.post("/api/bands/:bandId/events/check-conflicts", authenticateSupabaseJWT, requireMembership, async (req: AuthenticatedRequest, res) => {
    try {
      const { date, endDate, type, membershipId, excludeEventId } = req.body;
      const result = await storage.checkConflicts(req.params.bandId, { 
        date, 
        endDate, 
        type, 
        membershipId,
        excludeEventId 
      });
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to check conflicts" });
    }
  });

  // SECURITY: Legacy Events endpoints PERMANENTLY REMOVED - they allowed cross-band data access
  // Use /api/bands/:bandId/events endpoints instead, which require proper authentication and band membership

  // Spotify search endpoint
  app.get("/api/spotify/search", async (req, res) => {
    try {
      const { q, limit } = req.query;
      if (!q) {
        return res.status(400).json({ message: "Query parameter 'q' is required" });
      }
      
      console.log(`Spotify search query: "${q}"`);
      const tracks = await spotifyService.searchTracks(
        q as string, 
        parseInt(limit as string) || 10
      );
      console.log(`Found ${tracks.length} tracks`);
      res.json(tracks);
    } catch (error) {
      console.error("Spotify search error:", error);
      res.status(500).json({ message: "Failed to search Spotify", error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Debug endpoint to check environment variables
  app.get("/api/spotify/debug-env", (req, res) => {
    res.json({
      clientId: process.env.SPOTIFY_CLIENT_ID?.substring(0, 10) + '...',
      hasSecret: !!process.env.SPOTIFY_CLIENT_SECRET,
      devDomain: process.env.REPLIT_DEV_DOMAIN
    });
  });

  // Spotify user authentication endpoints
  app.get("/api/spotify/auth", (req, res) => {
    try {
      const authUrl = spotifyUserService.getAuthorizationUrl();
      res.json({ authUrl });
    } catch (error) {
      console.error("Spotify auth URL error:", error);
      res.status(500).json({ message: "Failed to generate auth URL" });
    }
  });

  // Add debug logging for all requests
  app.use((req, res, next) => {
    if (req.path.includes('spotify')) {
      console.log(`Spotify route hit: ${req.method} ${req.path} from ${req.ip}`);
    }
    next();
  });

  app.get("/api/spotify/callback", async (req, res) => {
    try {
      const { code, state } = req.query;
      
      if (!code) {
        return res.status(400).json({ message: "Authorization code required" });
      }

      if (!state || !spotifyUserService.validateState(state as string)) {
        return res.status(400).json({ message: "Invalid or expired state parameter" });
      }

      const tokens = await spotifyUserService.getAccessToken(code as string);
      
      // Send HTML that stores tokens in localStorage and closes the popup
      const html = `
        <!DOCTYPE html>
        <html>
        <head><title>Spotify Connected</title></head>
        <body>
          <h2>Successfully connected to Spotify!</h2>
          <p>This window will close automatically...</p>
          <script>
            // Store tokens in localStorage
            localStorage.setItem('spotify_access_token', '${tokens.access_token}');
            localStorage.setItem('spotify_refresh_token', '${tokens.refresh_token}');
            localStorage.setItem('spotify_expires_at', '${Date.now() + (tokens.expires_in * 1000)}');
            
            // Close popup window
            setTimeout(() => {
              window.close();
              if (!window.closed) {
                // Fallback if window.close() doesn't work
                window.location.href = 'about:blank';
              }
            }, 1000);
          </script>
        </body>
        </html>
      `;
      
      res.send(html);
    } catch (error) {
      console.error("Spotify callback error:", error);
      const html = `
        <!DOCTYPE html>
        <html>
        <head><title>Spotify Connection Failed</title></head>
        <body>
          <h2>Failed to connect to Spotify</h2>
          <p>Please try again. This window will close automatically...</p>
          <script>
            setTimeout(() => {
              window.close();
              if (!window.closed) {
                window.location.href = 'about:blank';
              }
            }, 2000);
          </script>
        </body>
        </html>
      `;
      res.send(html);
    }
  });

  // Get Spotify user profile
  app.get("/api/spotify/user", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: "Access token required" });
      }

      const accessToken = authHeader.replace('Bearer ', '');
      const userProfile = await spotifyUserService.getUserProfile(accessToken);
      res.json(userProfile);
    } catch (error) {
      console.error("Spotify user profile error:", error);
      res.status(500).json({ message: "Failed to fetch user profile" });
    }
  });

  app.get("/api/spotify/playlists", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: "Access token required" });
      }

      const accessToken = authHeader.replace('Bearer ', '');
      const playlists = await spotifyUserService.getUserPlaylists(accessToken);
      res.json(playlists);
    } catch (error) {
      console.error("Spotify playlists error:", error);
      res.status(500).json({ message: "Failed to fetch playlists" });
    }
  });

  app.get("/api/spotify/playlists/:id/tracks", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: "Access token required" });
      }

      const accessToken = authHeader.replace('Bearer ', '');
      const tracks = await spotifyUserService.getPlaylistTracks(req.params.id, accessToken);
      res.json(tracks);
    } catch (error) {
      console.error("Spotify playlist tracks error:", error);
      res.status(500).json({ message: "Failed to fetch playlist tracks" });
    }
  });

  // Sync practice list to Spotify playlist (requires bandId in request body)
  app.post("/api/spotify/playlists/:id/sync", authenticateSupabaseJWT, async (req: AuthenticatedRequest, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: "Access token required" });
      }

      const { bandId } = req.body;
      if (!bandId) {
        return res.status(400).json({ message: "Band ID is required" });
      }

      // Verify user has access to this band
      if (!req.user?.dbUser?.id) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const userBands = await storage.getUserBands(req.user.dbUser.id);
      const hasAccess = userBands.some(band => band.bandId === bandId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied to band" });
      }

      const accessToken = authHeader.replace('Bearer ', '');
      const songs = await storage.getSongs(bandId);
      
      await spotifyUserService.syncToPlaylist(req.params.id, songs, accessToken);
      res.json({ message: "Successfully synced practice list to Spotify playlist" });
    } catch (error) {
      console.error("Spotify sync error:", error);
      res.status(500).json({ message: "Failed to sync to Spotify playlist" });
    }
  });

  // Add single track to Spotify playlist when added to practice list
  app.post("/api/spotify/playlists/:id/tracks", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: "Access token required" });
      }

      const accessToken = authHeader.replace('Bearer ', '');
      const { spotifyId } = req.body;
      
      const trackUri = `spotify:track:${spotifyId}`;
      await spotifyUserService.addTrackToPlaylist(req.params.id, trackUri, accessToken);
      res.json({ message: "Track added to Spotify playlist" });
    } catch (error) {
      console.error("Spotify add track error:", error);
      res.status(500).json({ message: "Failed to add track to Spotify playlist" });
    }
  });

  // Remove single track from Spotify playlist when removed from practice list
  app.delete("/api/spotify/playlists/:id/tracks/:spotifyId", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: "Access token required" });
      }

      const accessToken = authHeader.replace('Bearer ', '');
      const { spotifyId } = req.params;
      
      const trackUri = `spotify:track:${spotifyId}`;
      await spotifyUserService.removeTrackFromPlaylist(req.params.id, trackUri, accessToken);
      res.json({ message: "Track removed from Spotify playlist" });
    } catch (error) {
      console.error("Spotify remove track error:", error);
      res.status(500).json({ message: "Failed to remove track from Spotify playlist" });
    }
  });

  // Songs endpoints (band-scoped)
  app.get("/api/bands/:bandId/songs", authenticateSupabaseJWT, requireMembership, async (req: AuthenticatedRequest, res) => {
    try {
      const songs = await storage.getSongs(req.params.bandId);
      
      // Get readiness and vetos for each song
      const songsWithDetails = await Promise.all(
        songs.map(async (song) => {
          const [readiness, vetos] = await Promise.all([
            storage.getSongReadiness(req.params.bandId, song.id),
            storage.getSongVetos(req.params.bandId, song.id),
          ]);
          return { ...song, readiness, vetos };
        })
      );
      
      res.json(songsWithDetails);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch songs" });
    }
  });

  app.post("/api/bands/:bandId/songs", authenticateSupabaseJWT, requireMembership, async (req: AuthenticatedRequest, res) => {
    try {
      const validatedData = insertSongSchema.parse({
        ...req.body,
        bandId: req.params.bandId
      });
      
      // Check if song already exists in this band
      const existingSong = await storage.getSongBySpotifyId(req.params.bandId, validatedData.spotifyId);
      if (existingSong) {
        return res.status(400).json({ message: "Song already exists in practice list" });
      }
      
      const song = await storage.createSong(req.params.bandId, validatedData);
      res.status(201).json(song);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to add song" });
    }
  });

  app.delete("/api/bands/:bandId/songs/:id", authenticateSupabaseJWT, requireMembership, async (req: AuthenticatedRequest, res) => {
    try {
      const success = await storage.deleteSong(req.params.bandId, req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Song not found" });
      }
      res.json({ message: "Song deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete song" });
    }
  });

  // Song readiness endpoints (band-scoped)
  app.post("/api/bands/:bandId/songs/:id/readiness", authenticateSupabaseJWT, requireMembership, async (req: AuthenticatedRequest, res) => {
    try {
      const songId = req.params.id;
      const validatedData = insertSongReadinessSchema.parse({
        ...req.body,
        songId,
      });
      
      const readiness = await storage.setSongReadiness(req.params.bandId, validatedData);
      res.json(readiness);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update song readiness" });
    }
  });

  app.delete("/api/bands/:bandId/songs/:id/readiness/:memberId", authenticateSupabaseJWT, requireMembership, async (req: AuthenticatedRequest, res) => {
    try {
      const { id: songId, memberId } = req.params;
      const success = await storage.removeSongReadiness(req.params.bandId, songId, memberId);
      if (!success) {
        return res.status(404).json({ message: "Readiness status not found" });
      }
      res.json({ message: "Readiness status removed successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to remove readiness status" });
    }
  });

  // Song veto endpoints (band-scoped)
  app.post("/api/bands/:bandId/songs/:id/veto", authenticateSupabaseJWT, requireMembership, async (req: AuthenticatedRequest, res) => {
    try {
      const songId = req.params.id;
      const validatedData = insertSongVetoSchema.parse({
        ...req.body,
        songId,
      });
      
      const veto = await storage.addSongVeto(req.params.bandId, validatedData);
      res.json(veto);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to add song veto" });
    }
  });

  app.delete("/api/bands/:bandId/songs/:id/veto/:memberId", authenticateSupabaseJWT, requireMembership, async (req: AuthenticatedRequest, res) => {
    try {
      const { id: songId, memberId } = req.params;
      const success = await storage.removeSongVeto(req.params.bandId, songId, memberId);
      if (!success) {
        return res.status(404).json({ message: "Song veto not found" });
      }
      res.json({ message: "Song veto removed successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to remove song veto" });
    }
  });

  // SECURITY: Legacy Songs endpoints PERMANENTLY REMOVED - they had no authentication at all
  // Use /api/bands/:bandId/songs endpoints instead, which require proper authentication and band membership

  const httpServer = createServer(app);
  return httpServer;
}
