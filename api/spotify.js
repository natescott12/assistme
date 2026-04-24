const DEFAULT_REDIRECT_URI = "https://assistant-amber-eta.vercel.app/callback";

const SCOPES = [
  "streaming",
  "user-read-playback-state",
  "user-modify-playback-state",
  "user-read-currently-playing",
  "playlist-read-private",
].join(" ");

export default async function handler(req, res) {
  const reqId = Math.random().toString(36).slice(2, 8);
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.error(`[spotify ${reqId}] missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET`);
    return res.status(500).json({ error: "Spotify credentials not configured" });
  }

  const redirectUri = process.env.SPOTIFY_REDIRECT_URI || DEFAULT_REDIRECT_URI;

  if (req.method === "GET") {
    const state = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    const url = new URL("https://accounts.spotify.com/authorize");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("scope", SCOPES);
    url.searchParams.set("state", state);
    console.log(`[spotify ${reqId}] authorize url built; redirect_uri=${redirectUri} state=${state.slice(0, 6)}`);
    return res.status(200).json({ url: url.toString(), state });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = typeof req.body === "string" ? safeParse(req.body) : (req.body || {});
  const { code } = body;
  if (!code) {
    console.error(`[spotify ${reqId}] POST missing code`);
    return res.status(400).json({ error: "Missing code" });
  }

  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code: String(code),
    redirect_uri: redirectUri,
  });

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  let upstream;
  try {
    upstream = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${auth}`,
      },
      body: params.toString(),
    });
  } catch (err) {
    console.error(`[spotify ${reqId}] fetch to token endpoint threw:`, err);
    return res.status(502).json({ error: "Upstream fetch failed" });
  }

  const raw = await upstream.text();
  let data;
  try { data = JSON.parse(raw); } catch (_) { data = null; }

  if (!upstream.ok) {
    console.error(`[spotify ${reqId}] token exchange failed status=${upstream.status} body=`, raw.slice(0, 800));
    return res.status(upstream.status).json(data || { error: "Token exchange failed" });
  }

  console.log(`[spotify ${reqId}] token exchange ok`);
  return res.status(200).json(data);
}

function safeParse(s) { try { return JSON.parse(s); } catch (_) { return {}; } }
