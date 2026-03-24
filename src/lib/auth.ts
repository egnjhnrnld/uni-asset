import { headers } from "next/headers";
import { devBypassAuthEnabled, env } from "@/lib/env";
import { prisma } from "@/lib/db";
import { Role } from "@prisma/client";

export type SessionUser = {
  id: string;
  email: string;
  displayName: string | null;
  role: Role;
};

export type Session = { user: SessionUser | null };

let adminAppInitialized = false;

function tryParseBasicAuth(authHeader: string): { username: string; password: string } | null {
  const match = authHeader.match(/^Basic\s+(.+)$/i);
  if (!match) return null;

  try {
    const decoded = Buffer.from(match[1]!, "base64").toString("utf8");
    const sepIdx = decoded.indexOf(":");
    if (sepIdx < 0) return null;
    return {
      username: decoded.slice(0, sepIdx),
      password: decoded.slice(sepIdx + 1),
    };
  } catch {
    return null;
  }
}

async function verifyFirebaseIdToken(idToken: string): Promise<{ email: string }> {
  const admin = await import("firebase-admin");

  if (!adminAppInitialized) {
    const projectId = env.FIREBASE_PROJECT_ID;
    const clientEmail = env.FIREBASE_CLIENT_EMAIL;
    const privateKey = env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error(
        "Firebase Admin env vars missing. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY."
      );
    }

    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    }
    adminAppInitialized = true;
  }

  const decoded = await admin.auth().verifyIdToken(idToken);
  if (!decoded.email) throw new Error("Firebase token missing email.");
  return { email: decoded.email };
}

export async function getSession(): Promise<Session> {
  const h = await headers();

  if (devBypassAuthEnabled) {
    const emailFromHeader = h.get("x-dev-user-email")?.trim();
    let email = emailFromHeader || "";

    // Optional local-dev username/password support (Basic auth).
    // This does NOT store passwords; it's purely a dev-bypass convenience.
    if (!email) {
      const authHeader = h.get("authorization") || "";
      const basic = tryParseBasicAuth(authHeader);

      const expectedUsername = env.DEV_LOCAL_ADMIN_USERNAME?.trim();
      const expectedPassword = env.DEV_LOCAL_ADMIN_PASSWORD?.trim();
      const expectedEmail = env.DEV_DEFAULT_USER_EMAIL?.trim();

      if (
        basic &&
        expectedEmail &&
        expectedUsername &&
        expectedPassword &&
        basic.username === expectedUsername &&
        basic.password === expectedPassword
      ) {
        email = expectedEmail;
      } else {
        // Fall back to configured default admin email (keeps existing dev-bypass behavior).
        email = expectedEmail || "";
      }
    }

    if (!email) return { user: null };
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        displayName: env.DEV_DEFAULT_USER_EMAIL?.trim() === email ? "Admin" : "Dev User",
        role: Role.UNIVERSITY_ADMIN,
      },
    });
    return { user };
  }

  const authHeader = h.get("authorization") || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return { user: null };

  const { email } = await verifyFirebaseIdToken(match[1]!);
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      displayName: email.split("@")[0] ?? null,
      role: Role.STAFF,
    },
  });
  return { user };
}

