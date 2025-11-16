/**
 * Cloudflare Worker for SerpAPI Product Search
 * Deploy this to: serpapi-search.YOUR-SUBDOMAIN.workers.dev
 *
 * Environment Variables (set in Cloudflare Dashboard):
 * - SERPAPI_KEY: Your SerpAPI key
 */

export default {
  async fetch(request, env) {
    // CORS headers for extension
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Only allow POST requests
    if (request.method !== 'POST') {
      return new Response('Method not allowed', {
        status: 405,
        headers: corsHeaders
      });
    }

    try {
      const { query } = await request.json();

      if (!query || typeof query !== 'string') {
        return new Response(JSON.stringify({
          error: 'Invalid query parameter'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Get API key from environment variable (secure)
      const SERPAPI_KEY = env.SERPAPI_KEY || 'fd9dce45e2dea0d9ebd0a0af21e007aa4ef1570a019bc3d9facb81e7ac636247';

      // Build SerpAPI request for Google Shopping
      const serpApiUrl = new URL('https://serpapi.com/search.json');
      serpApiUrl.searchParams.set('q', query);
      serpApiUrl.searchParams.set('tbm', 'shop'); // Google Shopping
      serpApiUrl.searchParams.set('api_key', SERPAPI_KEY);
      serpApiUrl.searchParams.set('num', '5'); // Get top 5 products

      console.log('Calling SerpAPI:', serpApiUrl.toString().replace(SERPAPI_KEY, 'REDACTED'));

      // Call SerpAPI
      const response = await fetch(serpApiUrl.toString());

      if (!response.ok) {
        throw new Error(`SerpAPI error: ${response.status}`);
      }

      const data = await response.json();

      // Extract product information
      const products = (data.shopping_results || []).slice(0, 5).map(product => ({
        title: product.title,
        price: product.price,
        link: product.link,
        source: product.source,
        rating: product.rating,
        reviews: product.reviews,
        thumbnail: product.thumbnail
      }));

      // Also get organic results as fallback
      const organicResults = (data.organic_results || []).slice(0, 3).map(result => ({
        title: result.title,
        link: result.link,
        snippet: result.snippet
      }));

      // Format response for AI
      let formattedResults = `Product Search Results for "${query}":\n\n`;

      if (products.length > 0) {
        formattedResults += '**Top Products:**\n';
        products.forEach((product, index) => {
          formattedResults += `${index + 1}. ${product.title}\n`;
          formattedResults += `   Price: ${product.price || 'N/A'}\n`;
          formattedResults += `   Rating: ${product.rating || 'N/A'} (${product.reviews || 0} reviews)\n`;
          formattedResults += `   Link: ${product.link}\n`;
          formattedResults += `   Store: ${product.source}\n\n`;
        });
      }

      if (organicResults.length > 0) {
        formattedResults += '\n**Related Pages:**\n';
        organicResults.forEach((result, index) => {
          formattedResults += `${index + 1}. ${result.title}\n`;
          formattedResults += `   ${result.snippet}\n`;
          formattedResults += `   Link: ${result.link}\n\n`;
        });
      }

      // Return results
      return new Response(JSON.stringify({
        success: true,
        results: formattedResults,
        products: products,
        organic: organicResults,
        query: query
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });

    } catch (error) {
      console.error('SerpAPI Worker Error:', error);

      return new Response(JSON.stringify({
        success: false,
        error: error.message
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
  }
};
