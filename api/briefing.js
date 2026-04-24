export default async function handler(req, res) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.authorization || "";
    if (auth !== `Bearer ${cronSecret}`) {
      console.error("[briefing] unauthorized invocation");
      return res.status(401).json({ error: "Unauthorized" });
    }
  }

  const supaUrl = process.env.SUPABASE_URL;
  const supaKey = process.env.SUPABASE_ANON_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const weatherKey = process.env.WEATHER_KEY;

  const missing = [];
  if (!supaUrl) missing.push("SUPABASE_URL");
  if (!supaKey) missing.push("SUPABASE_ANON_KEY");
  if (!anthropicKey) missing.push("ANTHROPIC_API_KEY");
  if (!weatherKey) missing.push("WEATHER_KEY");
  if (missing.length) {
    console.error("[briefing] missing env vars:", missing.join(", "));
    return res.status(500).json({ error: "Missing env vars", missing });
  }

  const supaHeaders = { apikey: supaKey, Authorization: `Bearer ${supaKey}` };
  const supaBase = supaUrl.replace(/\/$/, "") + "/rest/v1";

  try {
    const [eventsRes, tasksRes, weatherRes] = await Promise.all([
      fetch(`${supaBase}/events?order=created_at.asc`, { headers: supaHeaders }),
      fetch(`${supaBase}/tasks?done=eq.false&order=created_at.asc`, { headers: supaHeaders }),
      fetch(`https://api.openweathermap.org/data/2.5/weather?lat=34.0522&lon=-118.2437&appid=${weatherKey}&units=imperial`),
    ]);

    const events = eventsRes.ok ? await eventsRes.json() : [];
    const tasks = tasksRes.ok ? await tasksRes.json() : [];
    const weather = weatherRes.ok ? await weatherRes.json() : null;

    const today = new Date().toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric", timeZone: "America/Los_Angeles",
    });
    const eventList = events.length
      ? events.map((e) => `${e.title} at ${e.time || "no time set"}`).join("; ")
      : "nothing scheduled";
    const taskList = tasks.length
      ? tasks.slice(0, 6).map((t) => `- ${t.title}`).join("\n")
      : "nothing pending";
    const wx = weather?.weather?.[0]
      ? `${Math.round(weather.main.temp)}°F, ${weather.weather[0].description}, high ${Math.round(weather.main.temp_max)}°, low ${Math.round(weather.main.temp_min)}°`
      : "weather unavailable";

    const userContent = `Today is ${today} in Los Angeles.
Weather: ${wx}.
Schedule: ${eventList}.
To-do list:
${taskList}

Generate a short 60-second morning briefing for Nate. Cover: weather, today's schedule, anything urgent on his to-do list, and one smart nudge. Conversational and warm, like a friend briefing you. 4-6 sentences max. Do NOT start with "Hey Nate" or similar greetings — jump straight into the briefing.`;

    const aRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 500,
        messages: [{ role: "user", content: userContent }],
      }),
    });

    const aText = await aRes.text();
    let aData;
    try { aData = JSON.parse(aText); } catch (_) { aData = null; }
    if (!aRes.ok) {
      console.error("[briefing] claude failed", aRes.status, aText.slice(0, 400));
      return res.status(502).json({ error: "Claude upstream failed", status: aRes.status, detail: aData });
    }
    const content = aData?.content?.[0]?.text?.trim();
    if (!content) {
      console.error("[briefing] empty content from Claude", aData);
      return res.status(502).json({ error: "Empty briefing" });
    }

    const insertRes = await fetch(`${supaBase}/briefings`, {
      method: "POST",
      headers: { ...supaHeaders, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify({ content }),
    });
    const insertText = await insertRes.text();
    if (!insertRes.ok) {
      console.error("[briefing] supabase insert failed", insertRes.status, insertText.slice(0, 400));
      return res.status(500).json({ error: "Supabase insert failed", status: insertRes.status });
    }
    const rows = JSON.parse(insertText);
    const row = Array.isArray(rows) ? rows[0] : rows;
    console.log("[briefing] generated", row?.id);
    return res.status(200).json({ ok: true, id: row?.id, content });
  } catch (err) {
    console.error("[briefing] unhandled error", err);
    return res.status(500).json({ error: String(err) });
  }
}
