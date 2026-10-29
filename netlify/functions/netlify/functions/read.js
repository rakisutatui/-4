// 指定URLの本文をTavily Extractで取得して返す
exports.handler = async (event) => {
  const url = (event.queryStringParameters || {}).url;
  const key = process.env.TAVILY_API_KEY;
  if (!url || !/^https?:\/\//.test(url)) return json(400, { error: "url is required" });
  if (!key) return json(500, { error: "TAVILY_API_KEY が未設定です" });
  try {
    const res = await fetch("https://api.tavily.com/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
      body: JSON.stringify({ urls: [url] }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return json(502, { error: "Tavily " + res.status });
    const r = (data.results || [])[0];
    if (!r) return json(404, { error: "このページの本文は取得できませんでした" });
    return json(200, { text: String(r.raw_content || "").slice(0, 20000) });
  } catch (e) {
    return json(500, { error: String(e) });
  }
};
function json(status, body) {
  return { statusCode: status, headers: { "Content-Type": "application/json; charset=utf-8" }, body: JSON.stringify(body) };
}

