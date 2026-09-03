const axios = require("axios");
const { recordUsage } = require("./usage");

const TAVILY_API_URL =
  "https://api.tavily.com/search";

const SEARCH_CACHE = new Map();

const CACHE_TTL_MS =
  10 * 60 * 1000;

function getCacheKey(query) {
  return query
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function getCachedSearch(query) {
  const key =
    getCacheKey(query);

  const cached =
    SEARCH_CACHE.get(key);

  if (!cached) {
    return null;
  }

  if (
    Date.now() - cached.timestamp >
    CACHE_TTL_MS
  ) {
    SEARCH_CACHE.delete(key);
    return null;
  }

  return cached.data;
}

function setCachedSearch(query, data) {
  const key =
    getCacheKey(query);

  SEARCH_CACHE.set(key, {
    timestamp: Date.now(),
    data
  });

  if (SEARCH_CACHE.size > 100) {
    const oldestKey =
      SEARCH_CACHE.keys().next().value;

    if (oldestKey) {
      SEARCH_CACHE.delete(oldestKey);
    }
  }
}

async function webSearch(query, options = {}) {
  if (!process.env.TAVILY_API_KEY) {
    throw new Error(
      "TAVILY_API_KEY is not configured."
    );
  }

  if (
    typeof query !== "string" ||
    !query.trim()
  ) {
    throw new Error(
      "A search query is required."
    );
  }

  const cached =
    getCachedSearch(query);

  if (cached) {
    return {
      ...cached,
      cached: true
    };
  }

  const response =
    await axios.post(
      TAVILY_API_URL,
      {
        api_key:
          process.env.TAVILY_API_KEY,

        query:
          query.trim().slice(0, 500),

        search_depth:
          options.searchDepth || "basic",

        topic:
          options.topic || "general",

        max_results:
          Math.min(
            Number(options.maxResults) || 5,
            10
          ),

        include_answer:
          options.includeAnswer !== false,

        include_raw_content: false,

        include_images: false
      },
      {
        timeout: 15000
      }
    );

  const data =
    response.data || {};

  const searchResult = {
    query: query.trim(),
    answer:
      typeof data.answer === "string"
        ? data.answer
        : "",

    results:
      Array.isArray(data.results)
        ? data.results.map(result => ({
            title:
              result.title || "",

            url:
              result.url || "",

            content:
              result.content || "",

            score:
              typeof result.score === "number"
                ? result.score
                : null,

            publishedDate:
              result.published_date ||
              null
          }))
        : []
  };

  recordUsage("tavily");

  setCachedSearch(
    query,
    searchResult
  );

  return {
    ...searchResult,
    cached: false
  };
}

module.exports = {
  webSearch
};
