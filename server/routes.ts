import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertBandMemberSchema, insertEventSchema, insertSongSchema, insertSongReadinessSchema, insertSongVetoSchema } from "@shared/schema";
import { spotifyService } from "./spotify";
import { spotifyUserService } from "./spotify-user";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Band Members endpoints
  app.get("/api/band-members", async (req, res) => {
    try {
      const members = await storage.getBandMembers();
      res.json(members);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch band members" });
    }
  });

  app.get("/api/band-members/:id", async (req, res) => {
    try {
      const member = await storage.getBandMember(req.params.id);
      if (!member) {
        return res.status(404).json({ message: "Band member not found" });
      }
      res.json(member);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch band member" });
    }
  });

  app.post("/api/band-members", async (req, res) => {
    try {
      const validatedData = insertBandMemberSchema.parse(req.body);
      const member = await storage.createBandMember(validatedData);
      res.status(201).json(member);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create band member" });
    }
  });

  app.delete("/api/band-members/:id", async (req, res) => {
    try {
      const success = await storage.deleteBandMember(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Band member not found" });
      }
      res.json({ message: "Band member deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete band member" });
    }
  });

  // Events endpoints
  app.get("/api/events", async (req, res) => {
    try {
      const { startDate, endDate, memberId } = req.query;
      
      let events;
      if (startDate && endDate) {
        events = await storage.getEventsByDateRange(
          startDate as string, 
          endDate as string
        );
      } else if (memberId) {
        events = await storage.getEventsByMember(memberId as string);
      } else {
        events = await storage.getEvents();
      }
      
      res.json(events);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  app.get("/api/events/:id", async (req, res) => {
    try {
      const event = await storage.getEvent(req.params.id);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      res.json(event);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch event" });
    }
  });

  app.post("/api/events", async (req, res) => {
    try {
      const validatedData = insertEventSchema.parse(req.body);
      const event = await storage.createEvent(validatedData);
      res.status(201).json(event);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create event" });
    }
  });

  app.patch("/api/events/:id", async (req, res) => {
    try {
      const validatedData = insertEventSchema.partial().parse(req.body);
      const event = await storage.updateEvent(req.params.id, validatedData);
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

  app.delete("/api/events/:id", async (req, res) => {
    try {
      const success = await storage.deleteEvent(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Event not found" });
      }
      res.json({ message: "Event deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete event" });
    }
  });

  // Check for conflicts
  app.post("/api/events/check-conflicts", async (req, res) => {
    try {
      const { date, endDate, type, memberId, excludeEventId } = req.body;
      const result = await storage.checkConflicts({ 
        date, 
        endDate, 
        type, 
        memberId,
        excludeEventId 
      });
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to check conflicts" });
    }
  });

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

  app.get("/api/spotify/callback", async (req, res) => {
    try {
      const { code, state } = req.query;
      
      if (!code) {
        return res.status(400).json({ message: "Authorization code required" });
      }

      if (state !== 'torrists-band-app') {
        return res.status(400).json({ message: "Invalid state parameter" });
      }

      const tokens = await spotifyUserService.getAccessToken(code as string);
      
      // Instead of just returning JSON, redirect to frontend with success message
      const frontendUrl = process.env.REPL_SLUG && process.env.REPL_OWNER
        ? `https://${process.env.REPL_SLUG}-${process.env.REPL_OWNER}.replit.app`
        : 'http://localhost:5000';
      
      // Redirect to admin page with success message
      res.redirect(`${frontendUrl}/admin?spotify_connected=true`);
    } catch (error) {
      console.error("Spotify callback error:", error);
      const frontendUrl = process.env.REPL_SLUG && process.env.REPL_OWNER
        ? `https://${process.env.REPL_SLUG}-${process.env.REPL_OWNER}.replit.app`
        : 'http://localhost:5000';
      res.redirect(`${frontendUrl}/admin?spotify_error=true`);
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

  // Songs endpoints
  app.get("/api/songs", async (req, res) => {
    try {
      const songs = await storage.getSongs();
      
      // Get readiness and vetos for each song
      const songsWithDetails = await Promise.all(
        songs.map(async (song) => {
          const [readiness, vetos] = await Promise.all([
            storage.getSongReadiness(song.id),
            storage.getSongVetos(song.id),
          ]);
          return { ...song, readiness, vetos };
        })
      );
      
      res.json(songsWithDetails);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch songs" });
    }
  });

  app.post("/api/songs", async (req, res) => {
    try {
      const validatedData = insertSongSchema.parse(req.body);
      
      // Check if song already exists
      const existingSong = await storage.getSongBySpotifyId(validatedData.spotifyId);
      if (existingSong) {
        return res.status(400).json({ message: "Song already exists in practice list" });
      }
      
      const song = await storage.createSong(validatedData);
      res.status(201).json(song);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to add song" });
    }
  });

  app.delete("/api/songs/:id", async (req, res) => {
    try {
      const success = await storage.deleteSong(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Song not found" });
      }
      res.json({ message: "Song deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete song" });
    }
  });

  // Song readiness endpoints
  app.post("/api/songs/:id/readiness", async (req, res) => {
    try {
      const songId = req.params.id;
      const validatedData = insertSongReadinessSchema.parse({
        ...req.body,
        songId,
      });
      
      const readiness = await storage.setSongReadiness(validatedData);
      res.json(readiness);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update song readiness" });
    }
  });

  app.delete("/api/songs/:id/readiness/:memberId", async (req, res) => {
    try {
      const { id: songId, memberId } = req.params;
      const success = await storage.removeSongReadiness(songId, memberId);
      if (!success) {
        return res.status(404).json({ message: "Readiness status not found" });
      }
      res.json({ message: "Readiness status removed successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to remove readiness status" });
    }
  });

  // Song veto endpoints
  app.post("/api/songs/:id/veto", async (req, res) => {
    try {
      const songId = req.params.id;
      const validatedData = insertSongVetoSchema.parse({
        ...req.body,
        songId,
      });
      
      const veto = await storage.addSongVeto(validatedData);
      res.json(veto);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to add song veto" });
    }
  });

  app.delete("/api/songs/:id/veto/:memberId", async (req, res) => {
    try {
      const { id: songId, memberId } = req.params;
      const success = await storage.removeSongVeto(songId, memberId);
      if (!success) {
        return res.status(404).json({ message: "Song veto not found" });
      }
      res.json({ message: "Song veto removed successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to remove song veto" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
