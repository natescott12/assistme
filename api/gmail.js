const DEFAULT_REDIRECT_URI = "https://assistant-amber-eta.vercel.app/gmail-callback";

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
].join(" ");

export default async function handler(req, res) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.error("[gmail] missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET");
    return res.status(500).json({ error: "Gmail not configured" });
  }

  const redirectUri = process.env.GOOGLE_REDIRECT_URI || DEFAULT_REDIRECT_URI;

  if (req.method === "GET") {
    const state = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("scope", SCOPES);
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
    url.searchParams.set("state", state);
    return res.status(200).json({ url: url.toString(), state });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = typeof req.body === "string" ? safeParse(req.body) : (req.body || {});
  const { refresh_token } = body;
  if (!refresh_token) return res.status(400).json({ error: "Missing refresh_token" });

  const params = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: String(refresh_token),
    client_id: clientId,
    client_secret: clientSecret,
  });

  const upstream = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  const data = await upstream.json().catch(() => ({}));
  if (!upstream.ok) {
    console.error("[gmail] refresh failed", upstream.status, data);
    return res.status(upstream.status).json(data);
  }
  return res.status(200).json(data);
}

function safeParse(s) { try { return JSON.parse(s); } catch (_) { return {}; } }
