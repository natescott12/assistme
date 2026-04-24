# AssistMe

A personal AI assistant running on the Anthropic Claude API, built as a React + Vite SPA deployed on Vercel with Supabase-backed persistence.

**Features**
- **Voice-first conversational loop** — tap the mic, speak, listen. Powered by the Web Speech API (STT) + `speechSynthesis` (TTS). Tap once to start, tap again to stop; Claude's responses are read aloud in a user-selectable voice.
- **Today dashboard** — morning briefing generated daily at 7 AM Pacific by a Vercel cron job; greets you with weather, today's events, open tasks, and a smart nudge. Shows the next upcoming event (UP NEXT), your checklist (YOUR DAY), and Spotify now-playing when connected.
- **Intent-routing markers** — Claude uses `{{event:…}}` / `{{task:…}}` / `{{list:…}}` patterns so the assistant can silently create timed events, untimed to-dos, and list items while speaking a natural reply.
- **Spotify integration** — OAuth flow, mini-player, voice control (`play something chill`, `pause`, `skip`, `volume up`), and a full controller modal with playlist browse and search.
- **Claude with Web Search** — the proxy injects Anthropic's `web_search_20250305` tool so the assistant can answer live-info questions (weather, prices, scores) on every turn.
- **PWA installable** — `manifest.json`, service worker, iOS-installable home-screen icon. Notifications fire 5 minutes before any timed event.
- **Weather, Grocery List, Tee Times, Reservations, Rideshare, Trip Planning** — all exposed as Features tab tiles.

## Stack

- **Frontend**: React 19, Vite, no routing library (SPA with tab state)
- **Backend**: Vercel serverless functions (Node runtime) in `api/`
- **Database**: Supabase (Postgres + PostgREST), four tables: `tasks`, `events`, `lists`, `briefings`
- **AI**: Claude Sonnet 4 via Anthropic Messages API, with server-side `web_search_20250305` tool
- **Auth**: Spotify OAuth 2.0, Gmail OAuth 2.0 (stretch)
- **Scheduled jobs**: Vercel cron for the morning briefing

## Required environment variables

Set these in the Vercel dashboard (Settings → Environment Variables) for the **Production** environment. All are server-only.

| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Claude API key (get from console.anthropic.com) |
| `SUPABASE_URL` | Your Supabase project URL, e.g. `https://<ref>.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase anon/publishable key (Project Settings → API) |
| `SPOTIFY_CLIENT_ID` | Spotify app client ID (developer.spotify.com dashboard) |
| `SPOTIFY_CLIENT_SECRET` | Spotify app client secret |
| `WEATHER_KEY` | OpenWeatherMap API key (openweathermap.org/api) |
| `CRON_SECRET` | *(optional)* Any random string; guards `/api/briefing` from unauthenticated calls |
| `GOOGLE_CLIENT_ID` | *(optional, stretch)* Google OAuth client ID for Gmail integration |
| `GOOGLE_CLIENT_SECRET` | *(optional, stretch)* Google OAuth client secret |

## Deploy

```bash
git clone https://github.com/<your-username>/assistme.git
cd assistme
npm install

# Log into Vercel
npx vercel login

# Link to a Vercel project (first time only)
npx vercel link

# Set each env var for production
npx vercel env add ANTHROPIC_API_KEY production
# …repeat for SUPABASE_URL, SUPABASE_ANON_KEY, SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, WEATHER_KEY

# Apply the database schema (below) to your own Supabase project

# Deploy
npx vercel --prod
```

### Supabase schema

Run in the SQL editor of your Supabase project:

```sql
CREATE TABLE tasks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  time text,
  done boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  time text,
  type text DEFAULT 'reminder',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE lists (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  list_name text NOT NULL,
  item text NOT NULL,
  done boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX lists_list_name_idx ON lists (list_name);

CREATE TABLE briefings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX briefings_created_at_idx ON briefings (created_at DESC);
```

RLS is disabled — the anon key stays server-side in the `/api/db` proxy and never reaches the browser. If you expose the key client-side, enable RLS with appropriate policies.

### Spotify redirect URI

In the Spotify developer dashboard, add your deployment's callback as an allowed redirect URI: `https://<your-vercel-alias>/callback`. The default in `api/spotify.js` and `api/callback.js` is `https://assistant-amber-eta.vercel.app/callback` — change `DEFAULT_REDIRECT_URI` in both files if you use a different domain, or set `SPOTIFY_REDIRECT_URI` as an env var.

## Multiple collaborators — each uses their own Supabase

The app writes tasks / events / lists / briefings without user scoping — all data goes into the one project the deployment is pointed at. Two people sharing the same Supabase project will see and overwrite each other's data.

To onboard a collaborator:
1. Clone the repo
2. Create a fresh Supabase project and run the schema SQL above
3. Create a fresh Vercel project (or use their own)
4. Set their own env vars — their own `SUPABASE_URL` / `SUPABASE_ANON_KEY`, their own Spotify app credentials if they want music features, their own OpenWeather key
5. Deploy with `npx vercel --prod`

## Local development

```bash
npm install
npm run dev             # Vite at http://localhost:5173 — frontend only
```

`npm run dev` does **not** run the `/api/*` serverless functions. For full-stack local dev:

```bash
npx vercel dev          # runs Vite + serverless functions together
npx vercel env pull .env.local    # download production env vars for local use
```

## Project structure

```
api/
  claude.js            # Claude Messages API proxy w/ web_search tool + loop
  db.js                # Generic Supabase CRUD proxy (tasks, events, lists, briefings)
  briefing.js          # Cron-triggered morning briefing generator
  spotify.js           # Spotify authorize URL + token exchange
  spotify-player.js    # Spotify Web API proxy (playback, search, playlists)
  spotify-refresh.js   # Token refresh
  callback.js          # OAuth redirect handler (tokens via URL fragment)
  gmail.js             # (stretch) Gmail OAuth authorize/refresh
  gmail-callback.js    # (stretch) Gmail OAuth callback
src/
  App.jsx              # Whole app (single-file SPA)
  main.jsx             # React entry
public/
  manifest.json        # PWA manifest
  sw.js                # Service worker for push notifications
  icon-{192,512}.png   # PWA icons
  apple-touch-icon.png # iOS home-screen icon
vercel.json            # /callback rewrite + cron schedule
```
