const apiBase = () => process.env.API_INTERNAL_URL || "http://localhost:4000";

export async function GET() {
  try {
    const response = await fetch(new URL("/api/projects", apiBase()), { cache: "no-store" });
    const body = await response.text();
    return new Response(body, { status: response.status, headers: { "content-type": "application/json" } });
  } catch {
    return Response.json({ error: "Control API is unavailable." }, { status: 503 });
  }
}

export async function POST(request) {
  let payload;
  try { payload = await request.json(); }
  catch { return Response.json({ error: "Request body must be valid JSON." }, { status: 400 }); }

  try {
    const response = await fetch(new URL("/api/projects", apiBase()), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store"
    });
    const body = await response.text();
    return new Response(body, { status: response.status, headers: { "content-type": "application/json" } });
  } catch {
    return Response.json({ error: "Control API is unavailable." }, { status: 503 });
  }
}
