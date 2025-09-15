import { GoogleGenAI } from "@google/genai";
import type { AudioFeatures } from "@shared/schema";

interface GeminiRecommendation {
  artist: string;
  title: string;
  sonic_match: string;
  search_term: string;
}

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GOOGLE_API_KEY or GEMINI_API_KEY environment variable is required");
    }
    this.ai = new GoogleGenAI({ apiKey });
  }

  async generateRecommendations(
    features: AudioFeatures,
    userSongs: string[],
    feedbackHistory?: Array<{ liked: boolean; artist: string; title: string }>
  ): Promise<GeminiRecommendation[]> {
    try {
      const systemPrompt = `You are a sonic pattern virtuoso. Analyze ONLY audible elements from the user's music collection features. Ignore lyrics, genres, artists' histories – focus on waveforms, harmonics, timbre, rhythm.

Identify core patterns from the audio features and create a 'sonic signature' summary.

User feedback adjustments:${feedbackHistory ? this.buildFeedbackPrompt(feedbackHistory) : ' None yet.'}

Recommend exactly 7-10 unheard songs (obscure/emerging, not mainstream hits) that match 95%+ sonically. Prioritize instant love: Maximize timbre harmony, rhythmic lock, harmonic resonance.

Output strict JSON array format:
[
  {
    "artist": "Artist Name",
    "title": "Song Title", 
    "sonic_match": "Detailed technical reason explaining MFCC alignment, tempo sync, chroma overlap, spectral matching etc.",
    "search_term": "Artist Title official audio"
  }
]

Be creative: Invent hybrid patterns leading to lifelong discoveries.`;

      const userPrompt = `Analyze these audio features from ${userSongs.length} songs:

${JSON.stringify(features, null, 2)}

Sample of user's songs (to avoid recommending): ${userSongs.slice(0, 20).join(', ')}

Generate recommendations that match the sonic patterns.`;

      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-pro",
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          responseSchema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                artist: { type: "string" },
                title: { type: "string" },
                sonic_match: { type: "string" },
                search_term: { type: "string" }
              },
              required: ["artist", "title", "sonic_match", "search_term"]
            }
          }
        },
        contents: userPrompt,
      });

      const rawJson = response.text;
      if (!rawJson) {
        throw new Error("Empty response from Gemini");
      }

      const recommendations: GeminiRecommendation[] = JSON.parse(rawJson);
      
      // Validate recommendations
      if (!Array.isArray(recommendations) || recommendations.length === 0) {
        throw new Error("Invalid recommendations format");
      }

      return recommendations.filter(rec => 
        rec.artist && rec.title && rec.sonic_match && rec.search_term
      );

    } catch (error) {
      console.error("Error generating recommendations:", error);
      // Fallback to empty array rather than crashing
      return [];
    }
  }

  private buildFeedbackPrompt(feedbackHistory: Array<{ liked: boolean; artist: string; title: string }>): string {
    const liked = feedbackHistory.filter(f => f.liked);
    const disliked = feedbackHistory.filter(f => !f.liked);

    let prompt = "";
    
    if (liked.length > 0) {
      prompt += `\nUser LOVED: ${liked.map(f => `${f.artist} - ${f.title}`).join(", ")}`;
    }
    
    if (disliked.length > 0) {
      prompt += `\nUser DISLIKED: ${disliked.map(f => `${f.artist} - ${f.title}`).join(", ")}`;
    }

    if (disliked.length > liked.length) {
      prompt += "\nAdjust recommendations to avoid patterns from disliked tracks.";
    }

    return prompt;
  }

  async generateSonicArchetype(features: AudioFeatures): Promise<string> {
    try {
      const prompt = `Based on these audio features, create a poetic 1-2 sentence description of the sonic archetype/signature:

${JSON.stringify(features, null, 2)}

Respond with a creative, atmospheric description like "Velvet harmonics with driving 128BPM pulses" or "Crystalline frequencies cascading through rhythmic void". Focus on the feel and texture of the sound.`;

      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      return response.text || "Unknown sonic archetype";
    } catch (error) {
      console.error("Error generating sonic archetype:", error);
      return "Neural pattern processing...";
    }
  }
}
