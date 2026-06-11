/**
 * Netlify Function: scores
 * ------------------------
 * Proxy for ESPN's public scoreboard API (the same JSON backend espn.com uses).
 * No API key required — this function exists for CORS safety and CDN caching,
 * so all your mates hammering the page in the pub share one upstream request.
 *
 * The client calls:
 *   /.netlify/functions/scores?endpoint=scoreboard&dates=20260611-20260719&limit=300
 *   /.netlify/functions/scores?endpoint=summary&event=760415
 *   /.netlify/functions/scores?endpoint=standings&season=2026
 */

const LEAGUE = "fifa.world"; // ESPN league slug for the FIFA World Cup

const ENDPOINTS = {
  scoreboard: `https://site.api.espn.com/apis/site/v2/sports/soccer/${LEAGUE}/scoreboard`,
  summary: `https://site.api.espn.com/apis/site/v2/sports/soccer/${LEAGUE}/summary`,
  standings: `https://site.api.espn.com/apis/v2/sports/soccer/${LEAGUE}/standings`,
};

// Query params we forward upstream.
const ALLOWED_PARAMS = new Set(["dates", "limit", "event", "season"]);

// CDN cache lifetime per endpoint (seconds).
const CACHE_SECONDS = { scoreboard: 55, summary: 3600, standings: 3600 };

exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  };

  const qs = event.queryStringParameters || {};
  const endpoint = qs.endpoint || "";
  const base = ENDPOINTS[endpoint];

  if (!base) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: `Endpoint not allowed: ${endpoint}` }),
    };
  }

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(qs)) {
    if (key !== "endpoint" && ALLOWED_PARAMS.has(key) && value !== "") {
      params.set(key, value);
    }
  }
  const url = `${base}${params.toString() ? "?" + params.toString() : ""}`;

  try {
    const res = await fetch(url, { headers: { "User-Agent": "sweepstake-dashboard" } });
    const body = await res.text();
    return {
      statusCode: res.status,
      headers: {
        ...headers,
        "Cache-Control": `public, max-age=0, s-maxage=${CACHE_SECONDS[endpoint]}, stale-while-revalidate=600`,
      },
      body,
    };
  } catch (err) {
    return {
      statusCode: 502,
      headers,
      body: JSON.stringify({ error: `Upstream request failed: ${err.message}` }),
    };
  }
};
