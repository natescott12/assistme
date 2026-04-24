const DEFAULT_REDIRECT_URI = "https://assistant-amber-eta.vercel.app/callback";

export default async function handler(req, res) {
  const reqId = Math.random().toString(36).slice(2, 8);
  const q = req.query || {};
  console.log(`[callback ${reqId}] incoming`, {
    hasCode: !!q.code,
    state: q.state || null,
    error: q.error || null,
    host: req.headers["x-forwarded-host"] || req.headers.host,
  });

  const { code, error, state } = q;

  if (error) {
    console.error(`[callback ${reqId}] spotify returned error param:`, error);
    return redirectWithError(res, String(error));
  }
  if (!code) {
    console.error(`[callback ${reqId}] missing code param`);
    return respondError(res, "Missing authorization code");
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.error(`[callback ${reqId}] missing env SPOTIFY_CLIENT_ID/SECRET`);
    return respondError(res, "Spotify credentials not configured on server");
  }

  const redirectUri = process.env.SPOTIFY_REDIRECT_URI || DEFAULT_REDIRECT_URI;
  console.log(`[callback ${reqId}] using redirect_uri=${redirectUri} client_id_prefix=${clientId.slice(0, 6)}`);

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
    console.error(`[callback ${reqId}] fetch to Spotify token endpoint threw:`, err);
    return redirectWithError(res, "Couldn't reach Spotify");
  }

  const raw = await upstream.text();
  let data;
  try { data = JSON.parse(raw); } catch (_) { data = null; }

  if (!upstream.ok) {
    console.error(`[callback ${reqId}] token exchange failed status=${upstream.status} body=`, raw.slice(0, 800));
    const msg = data?.error_description || data?.error || `Token exchange failed (HTTP ${upstream.status})`;
    return redirectWithError(res, msg);
  }

  console.log(`[callback ${reqId}] token exchange ok; scopes=${data.scope}; expires_in=${data.expires_in}`);

  const payload = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + (data.expires_in || 3600) * 1000,
    scope: data.scope,
  };

  const fragment = encodeURIComponent(JSON.stringify(payload));
  const location = `/?spotify=1#spotify=${fragment}${state ? `&state=${encodeURIComponent(String(state))}` : ""}`;
  console.log(`[callback ${reqId}] redirecting to app with tokens in fragment (len=${fragment.length})`);

  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Location", location);
  return res.status(302).end();
}

function redirectWithError(res, msg) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Location", `/?spotify_error=${encodeURIComponent(msg)}`);
  return res.status(302).end();
}

function respondError(res, msg) {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  return res.status(400).send(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Spotify connection failed</title>
    <style>body{margin:0;background:#0F1319;color:#FFF;font:14px/1.5 'Helvetica Neue',Helvetica,Arial,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:32px;text-align:left;box-sizing:border-box}</style>
  </head>
  <body>
    <div style="max-width:380px">
      <div style="font-size:9px;letter-spacing:3px;text-transform:uppercase;color:#6B7A90;margin-bottom:16px">Error</div>
      <div style="font-size:32px;font-weight:700;margin-bottom:16px;letter-spacing:-0.8px;line-height:1.1">Spotify connection failed</div>
      <div style="color:#6B7A90;margin-bottom:32px;font-weight:300">${escapeHtml(msg)}</div>
      <a href="/" style="color:#2EC4B6;text-decoration:none;font-size:11px;letter-spacing:2px;text-transform:uppercase">← Back</a>
    </div>
  </body>
</html>`);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
