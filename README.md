# ⚽ World Cup 2026 Sweepstake Dashboard

Live dashboard for an 8-person, 48-team World Cup 2026 sweepstake. Single-page
vanilla JS app — no build step, no frameworks — deployed on Netlify.

**Data source: ESPN's public scoreboard feed.** It's free, needs **no API key**,
and carries live scores plus in-play goal/card events. (The app originally used
API-Football, but their free tier doesn't include season 2026.)

## Repo layout

| File | What it is |
|---|---|
| `index.html` | The whole app (inline CSS + JS) |
| `netlify/functions/scores.js` | Proxy to ESPN — handles CORS + CDN caching |
| `netlify.toml` | Netlify config (publish dir + functions dir) |
| `data/sweepstake.json` | Who owns which teams — **edit this, not the code** |
| `data/overrides.json` | *(optional)* admin corrections exported from the admin panel |

## Deploy (GitHub → Netlify)

1. Push this repo to GitHub.
2. In [Netlify](https://app.netlify.com): **Add new site → Import an existing project → GitHub** → pick the repo.
3. Build settings: leave the build command **empty**, publish directory `.` (netlify.toml handles it).
4. Done. **No API key or environment variables needed.** (If you previously
   added `FOOTBALL_API_KEY`, you can delete it.) Every push to `main` redeploys.

## Local development

```bash
npm i -g netlify-cli
netlify dev   # serves the site + function on :8888
```

## Editing the sweepstake

Everything lives in `data/sweepstake.json` — names, team lists, chip colours,
flag emoji. `aliases` help match ESPN's naming (e.g. *Czechia* → Czech
Republic); matching is accent- and case-insensitive.

## Tweaking scoring & polling

Both live at the **top of the `<script>` in `index.html`**:

- `SCORING` — points per goal/win/draw/clean sheet/save/red card/stage bonuses.
- `CONFIG` — polling intervals, cache lifetimes, and the admin passphrase
  (`adminPass`, default `corner-flag` — **change it**).

## How data flows

- **One** scoreboard request returns the whole tournament: schedule, live
  scores and in-play events. Polled every 60s during matches, 10 min otherwise.
- Per-match summaries (cards, and goalkeeper saves where ESPN provides them)
  are fetched **once per finished match** and cached in localStorage forever.
- The Netlify function adds CDN cache headers, so the whole pub shares one
  upstream request per minute.
- If ESPN is unreachable, the page serves the last cached data and shows a
  banner — it never breaks.

**Note on saves:** ESPN doesn't always publish goalkeeper saves. When the stat
is missing, no save points are awarded automatically — use the admin panel to
add them manually (same for any stat you think is wrong). "Clean game" points
are likewise only awarded when card data is actually present.

**Note on the feed:** ESPN's endpoints are unofficial (the same JSON the ESPN
site itself uses). They've been stable for years, but if they ever change
mid-tournament, scoring corrections can be applied via the admin panel while
the code is updated.

## Admin mode

Open the site with `?admin=true` and enter the passphrase. You can:

- add/correct points manually (e.g. missing saves),
- push custom ticker messages ("Dave owes everyone a pint 🍺"),
- mark teams eliminated (group-stage exits aren't auto-detected — knockout
  losses are),
- **Export JSON** → commit the file as `data/overrides.json` so every device
  sees your corrections (local overrides merge on top).

## Celebration GIFs

`GOAL_GIFS` in `index.html` lists Giphy URLs. If one dies, the overlay falls
back to a bouncing ⚽. To use local GIFs, drop files in `assets/gifs/` and
change the URLs.

## Notes

- All kick-off times display in UK time (Europe/London), regardless of device.
- ESPN league slug: `fifa.world` (hardcoded in `netlify/functions/scores.js`).
