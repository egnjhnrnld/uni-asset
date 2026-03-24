import { getSession } from "@/lib/auth";

export async function requireSession(opts?: { allowAnonymous?: boolean }) {
  const session = await getSession();
  if (!opts?.allowAnonymous && !session.user) {
    return { user: null };
  }
  return session;
}

