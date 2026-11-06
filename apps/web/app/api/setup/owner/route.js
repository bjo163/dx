import { proxyApi } from "../../../../lib/api-proxy.js";
export async function POST(request) { return proxyApi(request, "/api/setup/owner", "POST"); }
