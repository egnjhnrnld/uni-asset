import { headers } from "next/headers";

export async function requestMeta() {
  const h = await headers();
  return {
    ip: h.get("x-forwarded-for") ?? undefined,
    userAgent: h.get("user-agent") ?? undefined,
    source: "web",
  };
}

