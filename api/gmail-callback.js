const DEFAULT_REDIRECT_URI = "https://assistant-amber-eta.vercel.app/gmail-callback";

export default async function handler(req, res) {
  const reqId = Math.random().toString(36).slice(2, 8);
  const q = req.query || {};
  const { code, error, state } = q;

  if (error) {
    console.error(`[gmail-callback ${reqId}] google error:`, error);
    return redirect(res, `/?gmail_error=${encodeURIComponent(String(error))}`);
  }
  if (!code) return redirect(res, `/?gmail_error=missing_code`);

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.error(`[gmail-callback ${reqId}] missing env`);
    return redirect(res, `/?gmail_error=not_configured`);
  }
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || DEFAULT_REDIRECT_URI;

  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code: String(code),
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const upstream = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  const text = await upstream.text();
  let data; try { data = JSON.parse(text); } catch (_) { data = null; }
  if (!upstream.ok) {
    console.error(`[gmail-callback ${reqId}] token exchange failed`, upstream.status, text.slice(0, 400));
    const msg = data?.error_description || data?.error || "token_exchange_failed";
    return redirect(res, `/?gmail_error=${encodeURIComponent(msg)}`);
  }

  const payload = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + (data.expires_in || 3600) * 1000,
    scope: data.scope,
  };
  const fragment = encodeURIComponent(JSON.stringify(payload));
  const incomingState = state ? String(state) : "";
  return redirect(res, `/?gmail=1#gmail=${fragment}${incomingState ? `&state=${encodeURIComponent(incomingState)}` : ""}`);
}

function redirect(res, location) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Location", location);
  return res.status(302).end();
}
