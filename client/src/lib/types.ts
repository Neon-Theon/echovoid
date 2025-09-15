export interface Song {
  artist: string;
  title: string;
}

export interface Recommendation {
  id: string;
  artist: string;
  title: string;
  sonicMatch: string;
  videoId?: string;
}

export interface ProcessingStatus {
  status: 'no_processing' | 'processing' | 'completed';
  songListId?: string;
  totalSongs?: number;
  hasFeatures?: boolean;
}

export interface SonicProfile {
  tempo: string;
  key: string;
  centroid: string;
  warmth: string;
  archetype: string;
}

export interface PlaylistItem {
  id: string;
  recommendation: Recommendation;
  createdAt: string;
}

export interface SystemStatus {
  geminiAI: 'ONLINE' | 'OFFLINE';
  musicBrainz: 'CONNECTED' | 'DISCONNECTED';
  youtubeAPI: 'ACTIVE' | 'INACTIVE';
  sessionId: string;
  processedTracks: number;
}
