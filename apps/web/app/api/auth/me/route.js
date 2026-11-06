import { proxyApi } from "../../../../lib/api-proxy.js";
export async function GET(request) { return proxyApi(request, "/api/auth/me"); }
