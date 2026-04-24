const ALLOWED = new Set(["tasks", "events", "lists", "briefings"]);

export default async function handler(req, res) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.error("[db] SUPABASE_URL or SUPABASE_ANON_KEY is missing");
    return res.status(500).json({ error: "Supabase not configured" });
  }

  const resource = req.query?.resource;
  const id = req.query?.id;
  if (!resource || !ALLOWED.has(resource)) {
    return res.status(400).json({ error: "Invalid resource" });
  }

  const base = `${url.replace(/\/$/, "")}/rest/v1/${resource}`;
  const authHeaders = {
    apikey: key,
    Authorization: `Bearer ${key}`,
  };

  const body = typeof req.body === "string"
    ? (safeParse(req.body) ?? {})
    : (req.body || {});

  try {
    if (req.method === "GET") {
      const q = req.query?.q || "order=created_at.asc";
      const r = await fetch(`${base}?${q}`, { headers: authHeaders });
      return relay(res, r);
    }

    if (req.method === "POST") {
      const r = await fetch(base, {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json", Prefer: "return=representation" },
        body: JSON.stringify(body),
      });
      const data = await r.json().catch(() => null);
      return res.status(r.status).json(Array.isArray(data) ? (data[0] ?? null) : data);
    }

    if (req.method === "PATCH") {
      if (!id) return res.status(400).json({ error: "Missing id" });
      const r = await fetch(`${base}?id=eq.${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { ...authHeaders, "Content-Type": "application/json", Prefer: "return=representation" },
        body: JSON.stringify(body),
      });
      const data = await r.json().catch(() => null);
      return res.status(r.status).json(Array.isArray(data) ? (data[0] ?? null) : data);
    }

    if (req.method === "DELETE") {
      if (!id) return res.status(400).json({ error: "Missing id" });
      const r = await fetch(`${base}?id=eq.${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      if (r.status === 204 || r.ok) return res.status(204).end();
      const data = await r.json().catch(() => ({}));
      return res.status(r.status).json(data);
    }

    res.setHeader("Allow", "GET, POST, PATCH, DELETE");
    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("[db] error:", err);
    return res.status(500).json({ error: String(err) });
  }
}

async function relay(res, upstream) {
  const text = await upstream.text();
  if (!upstream.ok) console.error("[db] upstream", upstream.status, text.slice(0, 400));
  try {
    const data = JSON.parse(text);
    return res.status(upstream.status).json(data);
  } catch (_) {
    return res.status(upstream.status).send(text);
  }
}

function safeParse(s) { try { return JSON.parse(s); } catch (_) { return null; } }
