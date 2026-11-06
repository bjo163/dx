import { proxyApi } from "../../../lib/api-proxy.js";

export async function GET(request) {
  return proxyApi(request, "/api/projects");
}

export async function POST(request) {
  return proxyApi(request, "/api/projects", "POST");
}
