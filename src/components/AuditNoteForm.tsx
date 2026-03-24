"use client";

import { useState } from "react";
import { Button, Input } from "@/components/ui";

export function AuditNoteForm({ assetId }: { assetId: string }) {
  const [devEmail, setDevEmail] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/units/${assetId}/notes`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(devEmail ? { "x-dev-user-email": devEmail } : {}),
        },
        body: JSON.stringify({ note }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Failed");
      setMsg("Note recorded on audit timeline.");
      setNote("");
    } catch (e: any) {
      setMsg(e?.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-4">
      <div className="text-xs font-semibold text-zinc-200">Audit note</div>
      <p className="mt-1 text-[11px] text-zinc-500">Short note on the official audit timeline.</p>
      <div className="mt-3 space-y-2">
        <Input
          value={devEmail}
          onChange={(e) => setDevEmail(e.target.value)}
          placeholder="Dev email (if bypass)"
        />
        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note text" required />
      </div>
      <div className="mt-3">
        <Button type="submit" disabled={busy || !note.trim()}>
          {busy ? "Saving…" : "Add audit note"}
        </Button>
      </div>
      {msg ? <p className="mt-2 text-xs text-zinc-400">{msg}</p> : null}
    </form>
  );
}
