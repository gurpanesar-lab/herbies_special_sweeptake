# ⚽ World Cup 2026 Sweepstake Dashboard

Live dashboard for an 8-person, 48-team World Cup 2026 sweepstake. Single-page
vanilla JS app — no build step, no frameworks — deployed on Netlify with a
serverless proxy so the API key never reaches the browser.

## Repo layout

| File | What it is |
|---|---|
| `index.html` | The whole app (inline CSS + JS) |
| `netlify/functions/scores.js` | Proxy to API-Football — holds the key server-side |
| `netlify.toml` | Netlify config (publish dir + functions dir) |
| `data/sweepstake.json` | Who owns which teams — **edit this, not the code** |
| `data/overrides.json` | *(optional)* admin corrections exported from the admin panel |

## Deploy (GitHub → Netlify)

1. Push this repo to GitHub.
2. In [Netlify](https://app.netlify.com): **Add new site → Import an existing project → GitHub** → pick the repo.
3. Build settings: leave the build command **empty**, publish directory `.` (netlify.toml handles it).
4. **Add the API key** (before or after the first deploy):
   - Site configuration → **Environment variables** → *Add a variable*
   - Key: `FOOTBALL_API_KEY`
   - Value: your key from [dashboard.api-football.com](https://dashboard.api-football.com)
   - Scope: all (or at least *Functions*)
5. **Trigger a redeploy** (Deploys → Trigger deploy) so the function picks up the variable.

That's it. Every push to `main` redeploys automatically.

> 🔑 Never commit the key to the repo. If it ever leaks (e.g. pasted somewhere
> public), rotate it in the API-Football dashboard and update the Netlify variable.

## Local development

```bash
npm i -g netlify-cli
export FOOTBALL_API_KEY=your_key_here   # or put it in a .env file (gitignored)
netlify dev                              # serves the site + function on :8888
```

## Editing the sweepstake

Everything lives in `data/sweepstake.json` — names, team lists, chip colours,
flag emoji. `aliases` help match API-Football's naming (e.g. *Korea Republic* →
South Korea); matching is accent- and case-insensitive, so you rarely need them.

## Tweaking scoring & polling

Both live at the **top of the `<script>` in `index.html`**:

- `SCORING` — points per goal/win/draw/clean sheet/save/red card/stage bonuses.
- `CONFIG` — polling intervals, cache lifetimes, the admin passphrase
  (`adminPass`, default `corner-flag` — **change it**), and the daily request
  budget guard.

## Rate limits (free tier: 100 requests/day)

The app is aggressive about caching:

- One request fetches the **entire tournament schedule** (cached 1h).
- Live scores+events come from **one** `live=all` call, only polled while a
  match window is actually open (60s cadence; 10 min otherwise).
- Match statistics (cards/saves) are fetched **once per finished match** and
  cached in localStorage forever.
- The Netlify function adds CDN `s-maxage` headers, so all 8 of you hammering
  the page in the pub still produces ~1 upstream request per minute.
- A client-side budget counter stops calling the API after ~95 requests/day and
  falls back to cached data with a warning banner.

⚠️ Even so, 60-second polling through long multi-match days can brush against
100 req/day on a single device. If you see the cached-data banner often, either
bump `pollLiveMs` to 120–300s or upgrade the API plan.

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
change the URLs (local files also don't count against your Lighthouse score —
they're only loaded when someone scores).

## Notes

- All kick-off times display in UK time (Europe/London), regardless of device.
- League/season: API-Football league `1`, season `2026` (set in `CONFIG`).
- If the API is unreachable, the page silently serves the last cached data and
  shows a banner — it never breaks.
