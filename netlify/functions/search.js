// TAVILY_API_KEY があればTavily、なければDuckDuckGoを試す
exports.handler = async (event) => {
  const q = (event.queryStringParameters || {}).q;
  if (!q) return json(400, { error: "q is required" });
  try {
    const key = process.env.TAVILY_API_KEY;
    return key ? await tavily(q, key) : await duck(q);
  } catch (e) {
    return json(500, { error: String(e) });
  }
};

async function tavily(q, key) {
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
    body: JSON.stringify({ query: q, max_results: 10 }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return json(502, { error: "Tavily " + res.status + " " + JSON.stringify(data).slice(0, 200) });
  return json(200, {
    results: (data.results || []).map((r) => ({ url: r.url, title: r.title, snippet: r.content || "" })),
  });
}

async function duck(q) {
  const res = await fetch("https://html.duckduckgo.com/html/", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
    },
    body: new URLSearchParams({ q, kl: "jp-jp" }).toString(),
  });
  const html = await res.text();
  if (res.status !== 200 || /anomaly|captcha|challenge/i.test(html)) {
    return json(502, { error: "DuckDuckGoにブロックされました (status " + res.status + ")。TAVILY_API_KEYを設定してください" });
  }
  const results = [];
  const re = /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?(?:class="result__snippet"[^>]*>([\s\S]*?)<\/a>)?/g;
  let m;
  while ((m = re.exec(html)) && results.length < 20) {
    results.push({ url: realUrl(m[1]), title: clean(m[2]), snippet: clean(m[3] || "") });
  }
  return json(200, { results });
}

function realUrl(h) {
  const m = h.match(/[?&]uddg=([^&]+)/);
  if (m) return decodeURIComponent(m[1]);
  return h.startsWith("//") ? "https:" + h : h;
}
function clean(s) {
  return s.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#x27;/g, "'").trim();
}
function json(status, body) {
  return { statusCode: status, headers: { "Content-Type": "application/json; charset=utf-8" }, body: JSON.stringify(body) };
}
