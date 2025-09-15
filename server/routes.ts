import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { MusicBrainzService } from "./services/musicbrainz";
import { GeminiService } from "./services/gemini";
import { YouTubeService } from "./services/youtube";
import { z } from "zod";
import { insertSongListSchema, insertFeedbackSchema, type Song, type AudioFeatures } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  const musicBrainzService = new MusicBrainzService();
  const geminiService = new GeminiService();
  const youtubeService = new YouTubeService();

  // Create a new session
  app.post("/api/session", async (req, res) => {
    try {
      const session = await storage.createSession();
      res.json(session);
    } catch (error) {
      console.error("Error creating session:", error);
      res.status(500).json({ error: "Failed to create session" });
    }
  });

  // Process song list and extract features
  app.post("/api/process-list", async (req, res) => {
    try {
      const { sessionId, songs } = z.object({
        sessionId: z.string(),
        songs: z.array(z.object({
          artist: z.string(),
          title: z.string()
        }))
      }).parse(req.body);

      // Validate session exists
      const session = await storage.getSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      // Create song list
      const songList = await storage.createSongList(sessionId, songs);

      // Start feature extraction in background
      setImmediate(async () => {
        try {
          const { features, processedCount } = await musicBrainzService.extractFeaturesFromSongs(songs);
          
          if (features) {
            await storage.updateSongListFeatures(songList.id, features);
          }
          
          console.log(`Processed ${processedCount}/${songs.length} songs for session ${sessionId}`);
        } catch (error) {
          console.error("Error extracting features:", error);
        }
      });

      res.json({ 
        songListId: songList.id,
        message: "Processing started",
        totalSongs: songs.length
      });
    } catch (error) {
      console.error("Error processing song list:", error);
      res.status(500).json({ error: "Failed to process song list" });
    }
  });

  // Get processing status
  app.get("/api/processing-status/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      
      const songLists = await storage.getSongListsBySession(sessionId);
      if (songLists.length === 0) {
        return res.json({ status: "no_processing" });
      }

      const latestSongList = songLists[songLists.length - 1];
      const hasFeatures = latestSongList.features !== null;
      
      res.json({
        status: hasFeatures ? "completed" : "processing",
        songListId: latestSongList.id,
        totalSongs: Array.isArray(latestSongList.songs) ? latestSongList.songs.length : 0,
        hasFeatures
      });
    } catch (error) {
      console.error("Error getting processing status:", error);
      res.status(500).json({ error: "Failed to get processing status" });
    }
  });

  // Generate recommendations
  app.post("/api/recommendations", async (req, res) => {
    try {
      const { sessionId, songListId } = z.object({
        sessionId: z.string(),
        songListId: z.string()
      }).parse(req.body);

      const songList = await storage.getSongList(songListId);
      if (!songList || !songList.features) {
        return res.status(400).json({ error: "Song list not found or features not ready" });
      }

      // Get feedback history for personalization
      const feedbackHistory = await storage.getFeedbackBySession(sessionId);
      const existingRecommendations = await storage.getRecommendationsBySession(sessionId);
      
      const feedbackData = feedbackHistory.map(f => {
        const rec = existingRecommendations.find(r => r.id === f.recommendationId);
        return rec ? {
          liked: f.liked,
          artist: rec.artist,
          title: rec.title
        } : null;
      }).filter(Boolean) as Array<{ liked: boolean; artist: string; title: string }>;

      // Generate recommendations using Gemini
      const userSongs = Array.isArray(songList.songs) 
        ? songList.songs.map((s: any) => `${s.artist} - ${s.title}`)
        : [];

      const geminiRecs = await geminiService.generateRecommendations(
        songList.features as AudioFeatures,
        userSongs,
        feedbackData
      );

      if (geminiRecs.length === 0) {
        return res.status(500).json({ error: "Failed to generate recommendations" });
      }

      // Save recommendations and get YouTube video IDs
      const savedRecommendations = [];
      
      for (const rec of geminiRecs) {
        const saved = await storage.createRecommendation({
          sessionId,
          songListId,
          artist: rec.artist,
          title: rec.title,
          sonicMatch: rec.sonic_match,
          searchTerm: rec.search_term,
          videoId: null
        });

        // Try to get YouTube video ID
        try {
          const videoResult = await youtubeService.searchVideo(rec.search_term);
          if (videoResult) {
            await storage.updateRecommendationVideoId(saved.id, videoResult.id);
            saved.videoId = videoResult.id;
          }
        } catch (error) {
          console.error(`Failed to get video for ${rec.search_term}:`, error);
        }

        savedRecommendations.push(saved);
      }

      res.json(savedRecommendations);
    } catch (error) {
      console.error("Error generating recommendations:", error);
      res.status(500).json({ error: "Failed to generate recommendations" });
    }
  });

  // Get recommendations for session
  app.get("/api/recommendations/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const recommendations = await storage.getRecommendationsBySession(sessionId);
      res.json(recommendations);
    } catch (error) {
      console.error("Error getting recommendations:", error);
      res.status(500).json({ error: "Failed to get recommendations" });
    }
  });

  // Submit feedback
  app.post("/api/feedback", async (req, res) => {
    try {
      const feedbackData = insertFeedbackSchema.parse(req.body);
      const feedback = await storage.createFeedback(feedbackData);
      
      // If liked, add to playlist
      if (feedbackData.liked) {
        await storage.addToPlaylist(feedbackData.sessionId, feedbackData.recommendationId);
      }
      
      res.json(feedback);
    } catch (error) {
      console.error("Error submitting feedback:", error);
      res.status(500).json({ error: "Failed to submit feedback" });
    }
  });

  // Get playlist
  app.get("/api/playlist/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const playlist = await storage.getPlaylistBySession(sessionId);
      res.json(playlist);
    } catch (error) {
      console.error("Error getting playlist:", error);
      res.status(500).json({ error: "Failed to get playlist" });
    }
  });

  // Get sonic profile
  app.get("/api/sonic-profile/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const songLists = await storage.getSongListsBySession(sessionId);
      
      if (songLists.length === 0 || !songLists[0].features) {
        return res.json({
          tempo: "-- BPM",
          key: "Unknown",
          centroid: "-- kHz", 
          warmth: "--",
          archetype: "Neural pattern processing..."
        });
      }

      const features = songLists[0].features as AudioFeatures;
      const archetype = await geminiService.generateSonicArchetype(features);

      // Extract key from chroma data (simplified)
      const keyMap = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
      const dominantPitch = features.chroma?.dominant_pitches?.[0] ?? 0;
      const key = keyMap[dominantPitch % 12];

      res.json({
        tempo: `${features.tempo?.mean?.toFixed(1) || 0} BPM`,
        key: `${key} ${Math.random() > 0.5 ? 'Minor' : 'Major'}`,
        centroid: `${(features.spectral?.avg_centroid / 1000)?.toFixed(1) || 0}kHz`,
        warmth: features.mfcc?.mean_vector?.[2]?.toFixed(2) || "0.0",
        archetype
      });
    } catch (error) {
      console.error("Error getting sonic profile:", error);
      res.status(500).json({ error: "Failed to get sonic profile" });
    }
  });

  // Export playlist
  app.get("/api/export-playlist/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { format = 'json' } = req.query;
      
      const playlist = await storage.getPlaylistBySession(sessionId);
      
      if (format === 'txt') {
        const textContent = playlist
          .map(item => `${item.recommendation.artist} - ${item.recommendation.title}`)
          .join('\n');
        
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', 'attachment; filename="echo-void-playlist.txt"');
        res.send(textContent);
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename="echo-void-playlist.json"');
        res.json(playlist);
      }
    } catch (error) {
      console.error("Error exporting playlist:", error);
      res.status(500).json({ error: "Failed to export playlist" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
