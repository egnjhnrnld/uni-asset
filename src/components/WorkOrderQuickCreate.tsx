"use client";

import { useMemo, useState } from "react";
import { Button, Input, Select } from "@/components/ui";
import type { WorkOrderType } from "@prisma/client";

const WORK_ORDER_TYPES: WorkOrderType[] = ["REPAIR", "DEPLOY", "PULLOUT", "INSPECTION"];

export function WorkOrderQuickCreate({ assetId }: { assetId: string }) {
  const [devEmail, setDevEmail] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<WorkOrderType>("REPAIR");
  const [assignedToEmail, setAssignedToEmail] = useState("");
  const [dueAt, setDueAt] = useState("");

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const payload = useMemo(
    () => ({
      title,
      description: description || undefined,
      type,
      assignedToEmail: assignedToEmail || undefined,
      dueAt: dueAt ? new Date(dueAt).toISOString() : undefined,
    }),
    [title, description, type, assignedToEmail, dueAt]
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/units/${assetId}/work-orders`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(devEmail ? { "x-dev-user-email": devEmail } : {}),
        },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? json?.message ?? "Failed to create work order");
      setMsg("Work order created. Refresh the unit page to see it in work log.");
      setTitle("");
      setDescription("");
      setAssignedToEmail("");
      setDueAt("");
    } catch (e: any) {
      setMsg(e?.message ?? "Failed to create work order");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-4">
      <div className="text-xs font-semibold text-zinc-200">Quick create work order</div>
      <p className="mt-1 text-[11px] text-zinc-500">
        Creates a work order plus an initial append-only work log entry.
      </p>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="md:col-span-2">
          <div className="mb-1 text-[11px] text-zinc-500">Dev email (actor)</div>
          <Input value={devEmail} onChange={(e) => setDevEmail(e.target.value)} placeholder="admin@example.edu" />
        </div>

        <div className="md:col-span-2">
          <div className="mb-1 text-[11px] text-zinc-500">Title</div>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Printer toner replacement" required />
        </div>

        <div>
          <div className="mb-1 text-[11px] text-zinc-500">Type</div>
          <Select value={type} onChange={(e) => setType(e.target.value as WorkOrderType)}>
            {WORK_ORDER_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.replace(/_/g, " ")}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <div className="mb-1 text-[11px] text-zinc-500">Due at (optional)</div>
          <Input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
        </div>

        <div className="md:col-span-2">
          <div className="mb-1 text-[11px] text-zinc-500">Description (optional)</div>
          <textarea
            className="min-h-[84px] w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add details for the technician…"
          />
        </div>

        <div className="md:col-span-2">
          <div className="mb-1 text-[11px] text-zinc-500">
            Assign technician email (dev-bypass convenience)
          </div>
          <Input
            value={assignedToEmail}
            onChange={(e) => setAssignedToEmail(e.target.value)}
            placeholder="tech@example.edu"
          />
        </div>
      </div>

      <div className="mt-3">
        <Button type="submit" disabled={busy || !title.trim()}>
          {busy ? "Saving…" : "Create work order"}
        </Button>
      </div>

      {msg ? <p className="mt-2 text-xs text-zinc-400">{msg}</p> : null}
    </form>
  );
}

