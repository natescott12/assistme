export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = typeof req.body === "string" ? safeParse(req.body) : (req.body || {});
  const { access_token, path, method = "GET", body: upstreamBody } = body;

  if (!access_token) return res.status(401).json({ error: "Missing access_token" });
  if (!path || typeof path !== "string" || !path.startsWith("/")) {
    return res.status(400).json({ error: "Invalid path" });
  }

  const url = `https://api.spotify.com/v1${path}`;
  const hasBody = upstreamBody != null;

  let upstream;
  try {
    upstream = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${access_token}`,
        ...(hasBody ? { "Content-Type": "application/json" } : {}),
      },
      body: hasBody ? JSON.stringify(upstreamBody) : undefined,
    });
  } catch (err) {
    console.error("[spotify-player] fetch threw:", err);
    return res.status(502).json({ error: "Upstream fetch failed" });
  }

  if (upstream.status === 204) return res.status(204).end();

  const text = await upstream.text();
  if (!upstream.ok) {
    console.error(`[spotify-player] ${method} ${path} → ${upstream.status}`, text.slice(0, 400));
  }

  try {
    const data = JSON.parse(text);
    return res.status(upstream.status).json(data);
  } catch (_) {
    res.setHeader("Content-Type", upstream.headers.get("content-type") || "text/plain");
    return res.status(upstream.status).send(text);
  }
}

function safeParse(s) { try { return JSON.parse(s); } catch (_) { return {}; } }
