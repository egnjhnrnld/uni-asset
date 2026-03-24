import { Card } from "@/components/ui";
import Link from "next/link";
import { devBypassAuthEnabled } from "@/lib/env";

export default function LoginPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold">Login</h1>
      <p className="mt-2 text-sm text-zinc-300">
        MVP supports Firebase Auth (recommended) or a dev-only bypass mode.
      </p>

      <div className="mt-8 grid gap-6">
        <Card title="Firebase Auth (recommended)">
          <p className="text-sm text-zinc-300">
            Configure Firebase env vars and implement the client login UI. The server verifies
            <code className="text-zinc-100"> Authorization: Bearer &lt;idToken&gt;</code>{" "}
            on API requests.
          </p>
          <p className="mt-3 text-sm text-zinc-400">
            For MVP code generation, this repo includes server-side verification and RBAC.
            You can add the client login in <code className="text-zinc-100">src/lib/firebaseClient.ts</code>.
          </p>
        </Card>

        <Card title="Dev bypass auth">
          <p className="text-sm text-zinc-300">
            Current status:{" "}
            <span className="font-semibold text-zinc-100">
              {devBypassAuthEnabled ? "ENABLED" : "DISABLED"}
            </span>
          </p>
          <p className="mt-2 text-sm text-zinc-400">
            When enabled, the server will auto-provision a user with role{" "}
            <code className="text-zinc-100">UNIVERSITY_ADMIN</code>.
            <br />
            You can authenticate by sending{" "}
            <code className="text-zinc-100">x-dev-user-email</code>, or using{" "}
            <code className="text-zinc-100">Authorization: Basic ...</code> with{" "}
            <code className="text-zinc-100">DEV_LOCAL_ADMIN_USERNAME</code> /
            <code className="text-zinc-100">DEV_LOCAL_ADMIN_PASSWORD</code> (maps to{" "}
            <code className="text-zinc-100">DEV_DEFAULT_USER_EMAIL</code>).
          </p>
        </Card>
      </div>

      <div className="mt-8 text-sm">
        <Link href="/units">Continue to Units</Link>
      </div>
    </main>
  );
}

