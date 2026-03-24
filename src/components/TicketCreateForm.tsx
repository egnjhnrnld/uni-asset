"use client";

import { useMemo, useState } from "react";
import { Button, Input, Select } from "@/components/ui";
import { TicketPriority, TicketSource } from "@prisma/client";

type AssetLite = { id: string; assetTag: string; displayName: string | null };
const priorityDeadlineLabel: Record<TicketPriority, string> = {
  URGENT: "4 hours",
  HIGH: "24 hours",
  NORMAL: "72 hours",
  LOW: "7 days",
};

export function TicketCreateForm({
  assets,
  initialAssetId,
}: {
  assets?: AssetLite[];
  initialAssetId?: string;
}) {
  const safeAssets = assets ?? [];
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TicketPriority>(TicketPriority.NORMAL);
  const [source, setSource] = useState<TicketSource>(TicketSource.WEB);
  const [assetId, setAssetId] = useState(initialAssetId ?? "");
  const [locationName, setLocationName] = useState("");
  const [locationBuilding, setLocationBuilding] = useState("");
  const [locationRoom, setLocationRoom] = useState("");
  const [assigneeEmail, setAssigneeEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const payload = useMemo(
    () => ({
      title,
      description: description || undefined,
      priority,
      source,
      assetId: assetId || undefined,
      locationName: locationName || undefined,
      locationBuilding: locationBuilding || undefined,
      locationRoom: locationRoom || undefined,
      assigneeEmail,
    }),
    [title, description, priority, source, assetId, locationName, locationBuilding, locationRoom, assigneeEmail]
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Failed to create ticket");
      if (json.emailSent === false) {
        setMsg(
          `Created ticket ${json.ticket.id}. Email was NOT sent: ${json.emailError ?? "unknown error"}.`
        );
      } else {
        setMsg(`Created ticket ${json.ticket.id}. Go back to the tickets list.`);
      }
      setTitle("");
      setDescription("");
      setAssigneeEmail("");
    } catch (e: any) {
      setMsg(e?.message ?? "Failed to create ticket");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-5">
      <div className="text-xs font-semibold text-zinc-200">Ticket details</div>
      <p className="mt-1 text-[11px] text-zinc-500">Tickets use priority deadlines and email assignment.</p>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="md:col-span-2">
          <div className="mb-1 text-[11px] text-zinc-500">Title</div>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div className="md:col-span-2">
          <div className="mb-1 text-[11px] text-zinc-500">Description</div>
          <textarea
            className="min-h-[120px] w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div>
          <div className="mb-1 text-[11px] text-zinc-500">Priority</div>
          <Select value={priority} onChange={(e) => setPriority(e.target.value as TicketPriority)}>
            {Object.values(TicketPriority).map((p) => (
              <option key={p} value={p}>
                {p} ({priorityDeadlineLabel[p]})
              </option>
            ))}
          </Select>
          <div className="mt-1 text-[11px] text-emerald-300">
            Deadline for {priority}: {priorityDeadlineLabel[priority]}
          </div>
        </div>
        <div>
          <div className="mb-1 text-[11px] text-zinc-500">Source</div>
          <Select value={source} onChange={(e) => setSource(e.target.value as TicketSource)}>
            {Object.values(TicketSource).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <div className="mb-1 text-[11px] text-zinc-500">Link asset (optional)</div>
          <Select value={assetId} onChange={(e) => setAssetId(e.target.value)}>
            <option value="">—</option>
            {safeAssets.map((a) => (
              <option key={a.id} value={a.id}>
                {a.displayName ?? a.assetTag}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <div className="mb-1 text-[11px] text-zinc-500">Link location name (manual)</div>
          <Input
            value={locationName}
            onChange={(e) => setLocationName(e.target.value)}
            placeholder="e.g. Lab 3 / Office 204 / MDF"
          />
        </div>
        <div>
          <div className="mb-1 text-[11px] text-zinc-500">Location building (optional)</div>
          <Input
            value={locationBuilding}
            onChange={(e) => setLocationBuilding(e.target.value)}
            placeholder="e.g. Science"
          />
        </div>
        <div>
          <div className="mb-1 text-[11px] text-zinc-500">Location room (optional)</div>
          <Input
            value={locationRoom}
            onChange={(e) => setLocationRoom(e.target.value)}
            placeholder="e.g. 301"
          />
        </div>
        <div className="md:col-span-2">
          <div className="mb-1 text-[11px] text-zinc-500">Assignee employee email</div>
          <Input
            value={assigneeEmail}
            onChange={(e) => setAssigneeEmail(e.target.value)}
            placeholder="employee@yourdomain.edu"
            required
          />
          <div className="mt-1 text-[11px] text-zinc-500">
            Ticket details are emailed to this address when created.
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <Button type="submit" disabled={busy || !title.trim() || !assigneeEmail.trim()}>
          {busy ? "Creating…" : "Create ticket"}
        </Button>
        {msg ? <span className="text-xs text-zinc-400">{msg}</span> : null}
      </div>
    </form>
  );
}

