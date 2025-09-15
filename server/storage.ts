import { 
  type Session, type InsertSession,
  type SongList, type InsertSongList,
  type Recommendation, type InsertRecommendation,
  type Feedback, type InsertFeedback,
  type Playlist, type InsertPlaylist,
  type Song, type AudioFeatures, type ProcessingStatus
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Session management
  createSession(): Promise<Session>;
  getSession(id: string): Promise<Session | undefined>;

  // Song list management
  createSongList(sessionId: string, songs: Song[]): Promise<SongList>;
  updateSongListFeatures(id: string, features: AudioFeatures): Promise<SongList | undefined>;
  getSongList(id: string): Promise<SongList | undefined>;
  getSongListsBySession(sessionId: string): Promise<SongList[]>;

  // Recommendations
  createRecommendation(data: InsertRecommendation): Promise<Recommendation>;
  getRecommendationsBySession(sessionId: string): Promise<Recommendation[]>;
  getRecommendation(id: string): Promise<Recommendation | undefined>;
  updateRecommendationVideoId(id: string, videoId: string): Promise<void>;

  // Feedback
  createFeedback(data: InsertFeedback): Promise<Feedback>;
  getFeedbackBySession(sessionId: string): Promise<Feedback[]>;

  // Playlist
  addToPlaylist(sessionId: string, recommendationId: string): Promise<Playlist>;
  getPlaylistBySession(sessionId: string): Promise<(Playlist & { recommendation: Recommendation })[]>;
  removeFromPlaylist(sessionId: string, recommendationId: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private sessions: Map<string, Session> = new Map();
  private songLists: Map<string, SongList> = new Map();
  private recommendations: Map<string, Recommendation> = new Map();
  private feedback: Map<string, Feedback> = new Map();
  private playlists: Map<string, Playlist> = new Map();

  async createSession(): Promise<Session> {
    const id = randomUUID();
    const session: Session = {
      id,
      createdAt: new Date(),
    };
    this.sessions.set(id, session);
    return session;
  }

  async getSession(id: string): Promise<Session | undefined> {
    return this.sessions.get(id);
  }

  async createSongList(sessionId: string, songs: Song[]): Promise<SongList> {
    const id = randomUUID();
    const songList: SongList = {
      id,
      sessionId,
      songs,
      features: null,
      createdAt: new Date(),
    };
    this.songLists.set(id, songList);
    return songList;
  }

  async updateSongListFeatures(id: string, features: AudioFeatures): Promise<SongList | undefined> {
    const songList = this.songLists.get(id);
    if (!songList) return undefined;
    
    const updated = { ...songList, features };
    this.songLists.set(id, updated);
    return updated;
  }

  async getSongList(id: string): Promise<SongList | undefined> {
    return this.songLists.get(id);
  }

  async getSongListsBySession(sessionId: string): Promise<SongList[]> {
    return Array.from(this.songLists.values()).filter(sl => sl.sessionId === sessionId);
  }

  async createRecommendation(data: InsertRecommendation): Promise<Recommendation> {
    const id = randomUUID();
    const recommendation: Recommendation = {
      id,
      ...data,
      videoId: data.videoId ?? null,
      createdAt: new Date(),
    };
    this.recommendations.set(id, recommendation);
    return recommendation;
  }

  async getRecommendationsBySession(sessionId: string): Promise<Recommendation[]> {
    return Array.from(this.recommendations.values()).filter(r => r.sessionId === sessionId);
  }

  async getRecommendation(id: string): Promise<Recommendation | undefined> {
    return this.recommendations.get(id);
  }

  async updateRecommendationVideoId(id: string, videoId: string): Promise<void> {
    const recommendation = this.recommendations.get(id);
    if (recommendation) {
      this.recommendations.set(id, { ...recommendation, videoId });
    }
  }

  async createFeedback(data: InsertFeedback): Promise<Feedback> {
    const id = randomUUID();
    const feedbackItem: Feedback = {
      id,
      ...data,
      createdAt: new Date(),
    };
    this.feedback.set(id, feedbackItem);
    return feedbackItem;
  }

  async getFeedbackBySession(sessionId: string): Promise<Feedback[]> {
    return Array.from(this.feedback.values()).filter(f => f.sessionId === sessionId);
  }

  async addToPlaylist(sessionId: string, recommendationId: string): Promise<Playlist> {
    const id = randomUUID();
    const playlistItem: Playlist = {
      id,
      sessionId,
      recommendationId,
      createdAt: new Date(),
    };
    this.playlists.set(id, playlistItem);
    return playlistItem;
  }

  async getPlaylistBySession(sessionId: string): Promise<(Playlist & { recommendation: Recommendation })[]> {
    const playlistItems = Array.from(this.playlists.values()).filter(p => p.sessionId === sessionId);
    
    return playlistItems.map(item => {
      const recommendation = this.recommendations.get(item.recommendationId);
      return {
        ...item,
        recommendation: recommendation!,
      };
    }).filter(item => item.recommendation);
  }

  async removeFromPlaylist(sessionId: string, recommendationId: string): Promise<void> {
    const entries = Array.from(this.playlists.entries());
    for (const [id, item] of entries) {
      if (item.sessionId === sessionId && item.recommendationId === recommendationId) {
        this.playlists.delete(id);
        break;
      }
    }
  }
}

export const storage = new MemStorage();
