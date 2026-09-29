import { server } from ".."

export function getIPFromRequest(req: Bun.BunRequest): string {
    return req.headers.get("X-Forwarded-For") || server.requestIP(req)?.address || "0.0.0.0"
}