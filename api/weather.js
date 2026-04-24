export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const key = process.env.WEATHER_KEY;
  if (!key) {
    console.error("[weather] WEATHER_KEY is not set");
    return res.status(500).json({ error: "Weather not configured" });
  }

  const type = req.query?.type === "forecast" ? "forecast" : "weather";
  const lat = req.query?.lat;
  const lon = req.query?.lon;
  if (!lat || !lon) return res.status(400).json({ error: "Missing lat/lon" });

  const url = `https://api.openweathermap.org/data/2.5/${type}?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&appid=${key}&units=imperial`;

  let upstream;
  try {
    upstream = await fetch(url);
  } catch (err) {
    console.error("[weather] fetch threw:", err);
    return res.status(502).json({ error: "Upstream fetch failed" });
  }

  const raw = await upstream.text();
  let data;
  try { data = JSON.parse(raw); } catch (_) {
    console.error("[weather] non-JSON upstream status=%d body=%s", upstream.status, raw.slice(0, 300));
    return res.status(502).json({ error: "Upstream returned non-JSON" });
  }

  if (!upstream.ok) {
    console.error("[weather] upstream error status=%d body=%o", upstream.status, data);
    return res.status(upstream.status).json(data);
  }

  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
  return res.status(200).json(data);
}
