"use client";

import { useState } from "react";
import { Button, Input, Select } from "@/components/ui";
import { workLogActionLabel } from "@/lib/labels";
import type { WorkLogActionType } from "@prisma/client";

const ACTIONS = Object.keys(workLogActionLabel) as WorkLogActionType[];

export function WorkLogQuickAdd({ assetId }: { assetId: string }) {
  const [devEmail, setDevEmail] = useState("");
  const [actionType, setActionType] = useState<WorkLogActionType>("NOTE");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/units/${assetId}/work-logs`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(devEmail ? { "x-dev-user-email": devEmail } : {}),
        },
        body: JSON.stringify({ actionType, notes: notes || undefined }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Failed to log");
      setMsg("Logged. Refresh to see the new entry.");
      setNotes("");
    } catch (e: any) {
      setMsg(e?.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-4">
      <div className="text-xs font-semibold text-zinc-200">Add work log entry</div>
      <p className="mt-1 text-[11px] text-zinc-500">
        Append-only record: repairs, toner, firmware, battery, network changes, inspections.
      </p>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        <div className="md:col-span-2">
          <div className="mb-1 text-[11px] text-zinc-500">Dev email (if bypass)</div>
          <Input value={devEmail} onChange={(e) => setDevEmail(e.target.value)} placeholder="admin@example.edu" />
        </div>
        <div>
          <div className="mb-1 text-[11px] text-zinc-500">Action</div>
          <Select value={actionType} onChange={(e) => setActionType(e.target.value as WorkLogActionType)}>
            {ACTIONS.map((a) => (
              <option key={a} value={a}>
                {workLogActionLabel[a]}
              </option>
            ))}
          </Select>
        </div>
        <div className="md:col-span-2">
          <div className="mb-1 text-[11px] text-zinc-500">Notes</div>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What was done?" />
        </div>
      </div>
      <div className="mt-3">
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : "Add log entry"}
        </Button>
      </div>
      {msg ? <p className="mt-2 text-xs text-zinc-400">{msg}</p> : null}
    </form>
  );
}
