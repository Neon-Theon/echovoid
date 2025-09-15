import { sql } from "drizzle-orm";
import { pgTable, text, varchar, jsonb, timestamp, boolean, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const sessions = pgTable("sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at").defaultNow(),
});

export const songLists = pgTable("song_lists", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => sessions.id),
  songs: jsonb("songs").notNull(), // Array of {artist: string, title: string}
  features: jsonb("features"), // Aggregated audio features
  createdAt: timestamp("created_at").defaultNow(),
});

export const recommendations = pgTable("recommendations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => sessions.id),
  songListId: varchar("song_list_id").notNull().references(() => songLists.id),
  artist: text("artist").notNull(),
  title: text("title").notNull(),
  sonicMatch: text("sonic_match").notNull(),
  searchTerm: text("search_term").notNull(),
  videoId: text("video_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const feedback = pgTable("feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => sessions.id),
  recommendationId: varchar("recommendation_id").notNull().references(() => recommendations.id),
  liked: boolean("liked").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const playlists = pgTable("playlists", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => sessions.id),
  recommendationId: varchar("recommendation_id").notNull().references(() => recommendations.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Zod schemas
export const insertSessionSchema = createInsertSchema(sessions).omit({ id: true, createdAt: true });
export const insertSongListSchema = createInsertSchema(songLists).omit({ id: true, createdAt: true });
export const insertRecommendationSchema = createInsertSchema(recommendations).omit({ id: true, createdAt: true });
export const insertFeedbackSchema = createInsertSchema(feedback).omit({ id: true, createdAt: true });
export const insertPlaylistSchema = createInsertSchema(playlists).omit({ id: true, createdAt: true });

// Types
export type Session = typeof sessions.$inferSelect;
export type SongList = typeof songLists.$inferSelect;
export type Recommendation = typeof recommendations.$inferSelect;
export type Feedback = typeof feedback.$inferSelect;
export type Playlist = typeof playlists.$inferSelect;

export type InsertSession = z.infer<typeof insertSessionSchema>;
export type InsertSongList = z.infer<typeof insertSongListSchema>;
export type InsertRecommendation = z.infer<typeof insertRecommendationSchema>;
export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;
export type InsertPlaylist = z.infer<typeof insertPlaylistSchema>;

// Additional types for the application
export interface Song {
  artist: string;
  title: string;
}

export interface AudioFeatures {
  tempo: {
    mean: number;
    std: number;
    range: [number, number];
  };
  mfcc: {
    mean_vector: number[];
    variance_matrix: number[][];
  };
  chroma: {
    dominant_pitches: number[];
    avg_profile: number[];
  };
  spectral: {
    avg_centroid: number;
    flux_variance: number;
  };
  rhythm_complexity: number;
}

export interface ProcessingStatus {
  current: number;
  total: number;
  status: string;
  details?: string;
}

export interface SonicProfile {
  tempo: string;
  key: string;
  centroid: string;
  warmth: string;
  archetype: string;
}
