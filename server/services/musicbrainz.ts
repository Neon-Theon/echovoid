interface MusicBrainzRecording {
  id: string;
  title: string;
  "artist-credit": Array<{
    artist: {
      name: string;
    };
  }>;
}

interface MusicBrainzResponse {
  recordings: MusicBrainzRecording[];
}

interface AcousticBrainzFeatures {
  rhythm?: {
    bpm?: number;
    beats_count?: number;
  };
  tonal?: {
    chroma_cens?: number[];
    key_edma?: {
      key?: string;
      scale?: string;
    };
  };
  lowlevel?: {
    mfcc?: {
      mean?: number[];
      var?: number[];
    };
    spectral_centroid?: {
      mean?: number;
    };
    spectral_flux?: {
      var?: number;
    };
    zerocrossingrate?: {
      mean?: number;
    };
  };
}

export class MusicBrainzService {
  private static readonly MB_BASE_URL = 'https://musicbrainz.org/ws/2';
  private static readonly AB_BASE_URL = 'https://acousticbrainz.org/api/v1';
  private static readonly RATE_LIMIT_DELAY = 1000; // 1 second between requests

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async searchRecording(artist: string, title: string): Promise<string | null> {
    const maxRetries = 3;
    const timeoutMs = 10000; // 10 second timeout
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.delay(MusicBrainzService.RATE_LIMIT_DELAY);
        
        const query = `artist:"${artist}" AND recording:"${title}"`;
        const url = `${MusicBrainzService.MB_BASE_URL}/recording?query=${encodeURIComponent(query)}&fmt=json&limit=1`;
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'EchoVoid/1.0.0 (https://echvoid.example.com)',
          },
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);

        if (!response.ok) {
          if (response.status === 429 && attempt < maxRetries) {
            // Rate limited, wait with exponential backoff
            const waitTime = attempt * 2000; // 2s, 4s, 6s
            console.log(`MusicBrainz rate limited, waiting ${waitTime}ms before retry ${attempt + 1}`);
            await this.delay(waitTime);
            continue; // Retry
          }
          throw new Error(`MusicBrainz API error: ${response.status}`);
        }

        const data: MusicBrainzResponse = await response.json();
        
        if (data.recordings && data.recordings.length > 0) {
          return data.recordings[0].id;
        }
        
        return null;
      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          console.error(`MusicBrainz search timeout for ${artist} - ${title} (attempt ${attempt})`);
        } else {
          console.error(`Error searching for ${artist} - ${title} (attempt ${attempt}):`, error);
        }
        
        if (attempt === maxRetries) {
          return null; // Final failure
        }
        
        // Wait before retry
        await this.delay(attempt * 1000);
      }
    }
    
    return null;
  }

  async getAudioFeatures(mbid: string): Promise<AcousticBrainzFeatures | null> {
    const timeoutMs = 10000; // 10 second timeout
    
    try {
      const url = `${MusicBrainzService.AB_BASE_URL}/${mbid}/low-level`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      const response = await fetch(url, {
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        if (response.status === 404) {
          // No features available for this recording
          return null;
        }
        throw new Error(`AcousticBrainz API error: ${response.status}`);
      }

      const features: AcousticBrainzFeatures = await response.json();
      return features;
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        console.error(`AcousticBrainz features timeout for MBID ${mbid}`);
      } else {
        console.error(`Error fetching features for MBID ${mbid}:`, error);
      }
      return null;
    }
  }

  async extractFeaturesFromSongs(songs: Array<{ artist: string; title: string }>): Promise<{
    features: any;
    processedCount: number;
  }> {
    const allFeatures: AcousticBrainzFeatures[] = [];
    let processedCount = 0;
    
    // Limit to 500 songs for performance
    const songsToProcess = songs.slice(0, 500);
    
    for (const song of songsToProcess) {
      const mbid = await this.searchRecording(song.artist, song.title);
      
      if (mbid) {
        const features = await this.getAudioFeatures(mbid);
        if (features) {
          allFeatures.push(features);
        }
      }
      
      processedCount++;
    }

    // Aggregate features or provide empty scaffold
    if (allFeatures.length === 0) {
      console.log(`No audio features found for any of ${processedCount} songs, returning empty scaffold`);
      // Return empty scaffold to allow processing completion
      const emptyFeatures = {
        tempo: { mean: 0, std: 0, range: [0, 0] },
        mfcc: { mean_vector: [], variance_matrix: [] },
        chroma: { dominant_pitches: [], avg_profile: [] },
        spectral: { avg_centroid: 0, flux_variance: 0 },
        rhythm_complexity: 0,
      };
      return { features: emptyFeatures, processedCount };
    }

    console.log(`Successfully extracted features for ${allFeatures.length}/${processedCount} songs`);
    const aggregated = this.aggregateFeatures(allFeatures);
    return { features: aggregated, processedCount };
  }

  private aggregateFeatures(features: AcousticBrainzFeatures[]): any {
    const tempos: number[] = [];
    const mfccs: number[][] = [];
    const chromas: number[][] = [];
    const centroids: number[] = [];
    const fluxes: number[] = [];
    const zeroCrossings: number[] = [];

    for (const feature of features) {
      if (feature.rhythm?.bpm) {
        tempos.push(feature.rhythm.bpm);
      }
      
      if (feature.lowlevel?.mfcc?.mean) {
        mfccs.push(feature.lowlevel.mfcc.mean);
      }
      
      if (feature.tonal?.chroma_cens) {
        chromas.push(feature.tonal.chroma_cens);
      }
      
      if (feature.lowlevel?.spectral_centroid?.mean) {
        centroids.push(feature.lowlevel.spectral_centroid.mean);
      }
      
      if (feature.lowlevel?.spectral_flux?.var) {
        fluxes.push(feature.lowlevel.spectral_flux.var);
      }
      
      if (feature.lowlevel?.zerocrossingrate?.mean) {
        zeroCrossings.push(feature.lowlevel.zerocrossingrate.mean);
      }
    }

    return {
      tempo: {
        mean: this.mean(tempos),
        std: this.std(tempos),
        range: tempos.length > 0 ? [Math.min(...tempos), Math.max(...tempos)] : [0, 0],
      },
      mfcc: {
        mean_vector: this.meanVector(mfccs),
        variance_matrix: this.varianceMatrix(mfccs),
      },
      chroma: {
        dominant_pitches: this.getDominantPitches(chromas),
        avg_profile: this.meanVector(chromas),
      },
      spectral: {
        avg_centroid: this.mean(centroids),
        flux_variance: this.variance(fluxes),
      },
      rhythm_complexity: this.mean(zeroCrossings),
    };
  }

  private mean(arr: number[]): number {
    if (arr.length === 0) return 0;
    return arr.reduce((sum, val) => sum + val, 0) / arr.length;
  }

  private std(arr: number[]): number {
    if (arr.length === 0) return 0;
    const mean = this.mean(arr);
    const variance = arr.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / arr.length;
    return Math.sqrt(variance);
  }

  private variance(arr: number[]): number {
    if (arr.length === 0) return 0;
    const mean = this.mean(arr);
    return arr.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / arr.length;
  }

  private meanVector(vectors: number[][]): number[] {
    if (vectors.length === 0) return [];
    const length = vectors[0]?.length || 0;
    const result: number[] = new Array(length).fill(0);
    
    for (const vector of vectors) {
      for (let i = 0; i < Math.min(length, vector.length); i++) {
        result[i] += vector[i];
      }
    }
    
    return result.map(val => val / vectors.length);
  }

  private varianceMatrix(vectors: number[][]): number[][] {
    if (vectors.length === 0) return [];
    const meanVec = this.meanVector(vectors);
    const length = meanVec.length;
    const matrix: number[][] = Array(length).fill(0).map(() => Array(length).fill(0));
    
    for (const vector of vectors) {
      for (let i = 0; i < length; i++) {
        for (let j = 0; j < length; j++) {
          const diffI = (vector[i] || 0) - meanVec[i];
          const diffJ = (vector[j] || 0) - meanVec[j];
          matrix[i][j] += diffI * diffJ;
        }
      }
    }
    
    return matrix.map(row => row.map(val => val / vectors.length));
  }

  private getDominantPitches(chromas: number[][]): number[] {
    if (chromas.length === 0) return [];
    const avgChroma = this.meanVector(chromas);
    
    // Get indices of top 3 values
    const indexed = avgChroma.map((val, idx) => ({ val, idx }));
    indexed.sort((a, b) => b.val - a.val);
    
    return indexed.slice(0, 3).map(item => item.idx);
  }
}
