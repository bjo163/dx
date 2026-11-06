const apiBase = () => process.env.API_INTERNAL_URL || "http://localhost:4000";

export async function proxyApi(request, path, method = "GET") {
  if (method !== "GET" && new URL(request.url).origin !== request.headers.get("origin")) {
    return Response.json({ error: "Cross-origin request rejected." }, { status: 403 });
  }
  const headers = {};
  const cookie = request.headers.get("cookie");
  const csrf = request.headers.get("x-csrf-token");
  if (cookie) headers.cookie = cookie;
  if (csrf) headers["x-csrf-token"] = csrf;
  let body;
  if (method !== "GET") {
    headers["content-type"] = "application/json";
    try { body = JSON.stringify(await request.json()); }
    catch { return Response.json({ error: "Request body must be valid JSON." }, { status: 400 }); }
  }
  try {
    const upstream = await fetch(new URL(path, apiBase()), { method, headers, body, cache: "no-store" });
    const responseHeaders = new Headers({ "content-type": upstream.headers.get("content-type") || "application/json" });
    for (const value of upstream.headers.getSetCookie?.() || []) responseHeaders.append("set-cookie", value);
    return new Response(await upstream.text(), { status: upstream.status, headers: responseHeaders });
  } catch {
    return Response.json({ error: "Control API is unavailable." }, { status: 503 });
  }
}
