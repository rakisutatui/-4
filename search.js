// DuckDuckGo HTML版を取得して結果をJSONにする関数
exports.handler = async (event) => {
  const q = (event.queryStringParameters || {}).q;
  if (!q) return json(400, { error: "q is required" });

  try {
    const res = await fetch("https://html.duckduckgo.com/html/", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (compatible; PersonalSearch/1.0)",
      },
      body: new URLSearchParams({ q, kl: "jp-jp" }).toString(),
    });
    if (!res.ok) return json(502, { error: "DuckDuckGo returned " + res.status });
    const html = await res.text();

    const results = [];
    const re = /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?(?:class="result__snippet"[^>]*>([\s\S]*?)<\/a>)?/g;
    let m;
    while ((m = re.exec(html)) && results.length < 20) {
      results.push({
        url: realUrl(m[1]),
        title: clean(m[2]),
        snippet: clean(m[3] || ""),
      });
    }
    return json(200, { results });
  } catch (e) {
    return json(500, { error: String(e) });
  }
};

function realUrl(href) {
  const m = href.match(/[?&]uddg=([^&]+)/);
  if (m) return decodeURIComponent(m[1]);
  return href.startsWith("//") ? "https:" + href : href;
}
function clean(s) {
  return s
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&#39;/g, "'")
    .trim();
}
function json(status, body) {
  return {
    statusCode: status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  };
}
