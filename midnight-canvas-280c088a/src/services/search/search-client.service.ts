/**
 * Search Client Service
 *
 * Handles communication with serverless search functions
 * Manages parallel searches, timeouts, and error handling
 */

import { supabase } from '@/lib/supabase';
import type { Platform, PlatformResult, NormalizedResult } from '@/types/search';

class SearchClientService {
  private readonly defaultTimeout = 10000; // 10 seconds per platform

  /**
   * Search a single platform
   */
  async searchPlatform(
    platform: Platform,
    query: string,
    sessionId?: string
  ): Promise<PlatformResult> {
    const startTime = Date.now();

    try {
      // Get current auth session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Call serverless function for this platform
      const response = await fetch(`/api/search/${platform}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ query, sessionId })
      });

      const duration = Date.now() - startTime;

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `${platform} search failed`);
      }

      const data = await response.json();

      return {
        platform,
        results: data.results || [],
        duration,
        error: undefined
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`${platform} search error:`, error);

      return {
        platform,
        results: [],
        duration,
        error: error.message || `${platform} search failed`
      };
    }
  }

  /**
   * Search multiple platforms in parallel
   */
  async searchMultiplePlatforms(
    platforms: Platform[],
    query: string,
    sessionId?: string
  ): Promise<PlatformResult[]> {
    // Create search promises for all platforms
    const searchPromises = platforms.map(platform =>
      this.searchPlatformWithTimeout(platform, query, sessionId)
    );

    // Execute all searches in parallel
    const results = await Promise.allSettled(searchPromises);

    // Process results (both successful and failed)
    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        // Handle rejected promise (timeout or error)
        return {
          platform: platforms[index],
          results: [],
          duration: 0,
          error: result.reason?.message || 'Search failed'
        };
      }
    });
  }

  /**
   * Search a single platform with timeout
   */
  private async searchPlatformWithTimeout(
    platform: Platform,
    query: string,
    sessionId?: string
  ): Promise<PlatformResult> {
    return Promise.race([
      this.searchPlatform(platform, query, sessionId),
      this.createTimeoutPromise(platform, this.defaultTimeout)
    ]);
  }

  /**
   * Create a promise that rejects after specified timeout
   */
  private createTimeoutPromise(platform: Platform, ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`${platform} search timed out after ${ms}ms`));
      }, ms);
    });
  }

  /**
   * Get platform statistics from results
   */
  getSearchStats(platformResults: PlatformResult[]) {
    const totalResults = platformResults.reduce(
      (sum, pr) => sum + pr.results.length,
      0
    );

    const platformCounts = platformResults.reduce((acc, pr) => {
      acc[pr.platform] = pr.results.length;
      return acc;
    }, {} as Record<Platform, number>);

    const successfulPlatforms = platformResults.filter(
      pr => !pr.error && pr.results.length > 0
    ).length;

    const failedPlatforms = platformResults.filter(pr => pr.error).length;

    const totalDuration = platformResults.reduce(
      (sum, pr) => sum + pr.duration,
      0
    );

    return {
      totalResults,
      platformCounts,
      successfulPlatforms,
      failedPlatforms,
      averageDuration: platformResults.length > 0
        ? Math.round(totalDuration / platformResults.length)
        : 0,
      totalDuration
    };
  }

  /**
   * Group results by platform
   */
  groupResultsByPlatform(results: NormalizedResult[]) {
    return results.reduce((acc, result) => {
      if (!acc[result.platform]) {
        acc[result.platform] = [];
      }
      acc[result.platform].push(result);
      return acc;
    }, {} as Record<string, NormalizedResult[]>);
  }
}

// Export singleton instance
export const searchClient = new SearchClientService();
