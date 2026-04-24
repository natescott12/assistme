export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.error("[spotify-refresh] missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET");
    return res.status(500).json({ error: "Spotify credentials not configured" });
  }

  const { refresh_token } = req.body || {};
  if (!refresh_token) return res.status(400).json({ error: "Missing refresh_token" });

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: String(refresh_token),
  });

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const upstream = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${auth}`,
    },
    body: body.toString(),
  });

  const data = await upstream.json();
  if (!upstream.ok) {
    console.error("[spotify-refresh] failed", upstream.status, data);
    return res.status(upstream.status).json(data);
  }
  return res.status(200).json(data);
}
