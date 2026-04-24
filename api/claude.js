const WEB_SEARCH_TOOL = { type: "web_search_20250305", name: "web_search", max_uses: 3 };
const MAX_ITERATIONS = 4;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    console.error("[claude] ANTHROPIC_API_KEY is not set");
    return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });
  }
  if (key.length < 20 || !key.startsWith("sk-ant-")) {
    console.error("[claude] ANTHROPIC_API_KEY looks malformed (len=%d, prefix=%s)", key.length, key.slice(0, 7));
    return res.status(500).json({ error: "ANTHROPIC_API_KEY looks malformed" });
  }

  const input = typeof req.body === "string" ? safeParse(req.body) : (req.body || {});
  let messages = Array.isArray(input.messages) ? input.messages.slice() : [];
  const system = input.system;
  const model = input.model || "claude-sonnet-4-20250514";
  const maxTokens = input.max_tokens || 500;
  const existingTools = Array.isArray(input.tools) ? input.tools : [];
  const hasWebSearch = existingTools.some(t => t?.type === "web_search_20250305");
  const tools = hasWebSearch ? existingTools : [...existingTools, WEB_SEARCH_TOOL];

  let lastResponse = null;

  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    const requestBody = { model, max_tokens: maxTokens, system, messages, tools };

    let upstream;
    try {
      upstream = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(requestBody),
      });
    } catch (err) {
      console.error("[claude] fetch threw:", err);
      return res.status(502).json({ error: "Upstream fetch failed", detail: String(err) });
    }

    const raw = await upstream.text();
    let data;
    try { data = JSON.parse(raw); } catch (_) {
      console.error("[claude] upstream non-JSON (status=%d): %s", upstream.status, raw.slice(0, 500));
      return res.status(502).json({ error: "Upstream returned non-JSON", status: upstream.status, body: raw.slice(0, 500) });
    }

    if (!upstream.ok) {
      console.error("[claude] upstream error status=%d body=%o", upstream.status, data);
      return res.status(upstream.status).json(data);
    }

    const content = Array.isArray(data.content) ? data.content : [];
    const serverSearches = content.filter(b => b.type === "server_tool_use").length;
    if (serverSearches) {
      const queries = content.filter(b => b.type === "server_tool_use").map(b => b.input?.query || "<?>").join(" | ");
      console.log("[claude] iter=%d web_search used: %s", iter, queries);
    }

    const clientToolUses = content.filter(b => b.type === "tool_use");

    if (data.stop_reason !== "tool_use" || clientToolUses.length === 0) {
      const text = extractText(content);
      console.log("[claude] done iter=%d stop_reason=%s text_len=%d", iter, data.stop_reason, text.length);
      return res.status(200).json({
        ...data,
        content: text ? [{ type: "text", text }] : content,
      });
    }

    messages = messages.concat([
      { role: "assistant", content },
      {
        role: "user",
        content: clientToolUses.map(tu => ({
          type: "tool_result",
          tool_use_id: tu.id,
          content: "Tool unavailable on this server.",
          is_error: true,
        })),
      },
    ]);
    lastResponse = data;
  }

  console.warn("[claude] hit MAX_ITERATIONS, returning last partial response");
  const fallbackText = extractText(lastResponse?.content || []);
  return res.status(200).json({
    ...(lastResponse || {}),
    content: fallbackText ? [{ type: "text", text: fallbackText }] : (lastResponse?.content || []),
  });
}

function extractText(content) {
  return (content || [])
    .filter(b => b && b.type === "text" && typeof b.text === "string")
    .map(b => b.text)
    .join("\n\n")
    .trim();
}

function safeParse(s) { try { return JSON.parse(s); } catch (_) { return {}; } }
