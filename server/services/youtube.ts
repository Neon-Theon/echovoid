// Using youtube-search-without-api-key for searching
// Note: This is a scraping solution that doesn't require API keys
export class YouTubeService {
  async searchVideo(query: string): Promise<{ id: string; url: string } | null> {
    try {
      // Import the search function
      const { search } = await import('youtube-search-without-api-key');
      
      const results = await search(query);
      console.log(`YouTube search results for "${query}":`, results);

      if (results && results.length > 0) {
        const result = results[0];
        // Handle the result structure from the library
        const videoId = result.id.videoId;
        if (videoId) {
          return {
            id: videoId,
            url: `https://www.youtube.com/watch?v=${videoId}`
          };
        }
      }

      return null;
    } catch (error) {
      console.error(`Error searching YouTube for "${query}":`, error);
      
      // Fallback: try with modified query
      try {
        const { search } = await import('youtube-search-without-api-key');
        const fallbackQuery = `${query} lyrics`;
        
        const results = await search(fallbackQuery);
        console.log(`YouTube fallback search results for "${fallbackQuery}":`, results);

        if (results && results.length > 0) {
          const result = results[0];
          const videoId = result.id.videoId;
          if (videoId) {
            return {
              id: videoId,
              url: `https://www.youtube.com/watch?v=${videoId}`
            };
          }
        }
      } catch (fallbackError) {
        console.error(`Fallback search also failed for "${query}":`, fallbackError);
      }

      return null;
    }
  }

  async searchMultipleVideos(queries: string[]): Promise<Map<string, string>> {
    const results = new Map<string, string>();
    
    // Process queries with rate limiting
    for (const query of queries) {
      try {
        const result = await this.searchVideo(query);
        if (result) {
          results.set(query, result.id);
        }
        
        // Rate limiting delay
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Error processing query "${query}":`, error);
      }
    }

    return results;
  }
}
