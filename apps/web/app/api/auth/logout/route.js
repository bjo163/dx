import { proxyApi } from "../../../../lib/api-proxy.js";
export async function POST(request) { return proxyApi(request, "/api/auth/logout", "POST"); }
