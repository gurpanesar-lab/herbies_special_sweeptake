/**
 * Netlify Function: scores
 * ------------------------
 * Serverless proxy for API-Football (api-football.com, v3).
 * The API key lives ONLY in the Netlify environment variable FOOTBALL_API_KEY
 * (Site settings → Environment variables) — it is never shipped to the browser.
 *
 * The client calls:
 *   /.netlify/functions/scores?endpoint=fixtures&league=1&season=2026
 *   /.netlify/functions/scores?endpoint=fixtures&live=all
 *   /.netlify/functions/scores?endpoint=fixtures/statistics&fixture=12345
 *   /.netlify/functions/scores?endpoint=fixtures/events&fixture=12345
 *   /.netlify/functions/scores?endpoint=standings&league=1&season=2026
 *
 * Only whitelisted endpoints/params are forwarded, so the function can't be
 * abused as an open proxy. Responses carry CDN cache headers (s-maxage) so
 * multiple viewers share one upstream request — this matters a lot on the
 * free tier (100 requests/day).
 */

const API_BASE = "https://v3.football.api-sports.io";

// Endpoints the client is allowed to hit.
const ALLOWED_ENDPOINTS = new Set([
  "fixtures",
  "fixtures/events",
  "fixtures/statistics",
  "standings",
]);

// Query params we forward upstream.
const ALLOWED_PARAMS = new Set([
  "league", "season", "live", "fixture", "ids",
  "date", "from", "to", "round", "team", "timezone",
]);

exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  };

  const apiKey = process.env.FOOTBALL_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "FOOTBALL_API_KEY is not set. Add it in Netlify → Site settings → Environment variables, then redeploy.",
      }),
    };
  }

  const qs = event.queryStringParameters || {};
  const endpoint = qs.endpoint || "";

  if (!ALLOWED_ENDPOINTS.has(endpoint)) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: `Endpoint not allowed: ${endpoint}` }),
    };
  }

  // Build the upstream URL from whitelisted params only.
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(qs)) {
    if (key !== "endpoint" && ALLOWED_PARAMS.has(key) && value !== "") {
      params.set(key, value);
    }
  }
  const url = `${API_BASE}/${endpoint}${params.toString() ? "?" + params.toString() : ""}`;

  try {
    const res = await fetch(url, {
      headers: { "x-apisports-key": apiKey },
    });
    const body = await res.text();

    // CDN caching: live data is cached ~55s, everything else 5 min.
    // stale-while-revalidate keeps the page snappy while refreshing in the background.
    const isLive = "live" in qs;
    const sMaxAge = isLive ? 55 : 300;

    return {
      statusCode: res.status,
      headers: {
        ...headers,
        "Cache-Control": `public, max-age=0, s-maxage=${sMaxAge}, stale-while-revalidate=600`,
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
