"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

export function TicketCommentForm({ ticketId }: { ticketId: string }) {
  const [body, setBody] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/comments`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ body, isInternal }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Failed to add comment");
      setMsg("Comment added. Refresh to see it.");
      setBody("");
      setIsInternal(false);
    } catch (e: any) {
      setMsg(e?.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-5">
      <div className="text-xs font-semibold text-zinc-200">Add comment</div>
      <div className="mt-3 space-y-2">
        <textarea
          className="min-h-[120px] w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write an update…"
          required
        />
        <label className="flex items-center gap-2 text-xs text-zinc-400">
          <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} />
          Internal (staff only)
        </label>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <Button type="submit" disabled={busy || !body.trim()}>
          {busy ? "Saving…" : "Post comment"}
        </Button>
        {msg ? <span className="text-xs text-zinc-400">{msg}</span> : null}
      </div>
    </form>
  );
}

