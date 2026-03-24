"use client";

import { useState } from "react";
import { Button, Input } from "@/components/ui";

type Props = {
  assetId: string;
  initial: {
    displayName: string | null;
    internalNotes: string | null;
    purchaseDate: string | null;
    warrantyExpiresAt: string | null;
    lastServiceAt: string | null;
    nextServiceDueAt: string | null;
  };
};

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function MaintenanceFieldsForm({ assetId, initial }: Props) {
  const [devEmail, setDevEmail] = useState("");
  const [displayName, setDisplayName] = useState(initial.displayName ?? "");
  const [internalNotes, setInternalNotes] = useState(initial.internalNotes ?? "");
  const [purchaseDate, setPurchaseDate] = useState(toLocalInput(initial.purchaseDate));
  const [warrantyExpiresAt, setWarrantyExpiresAt] = useState(toLocalInput(initial.warrantyExpiresAt));
  const [lastServiceAt, setLastServiceAt] = useState(toLocalInput(initial.lastServiceAt));
  const [nextServiceDueAt, setNextServiceDueAt] = useState(toLocalInput(initial.nextServiceDueAt));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const body: Record<string, unknown> = {
        displayName: displayName || null,
        internalNotes: internalNotes || null,
        purchaseDate: purchaseDate ? new Date(purchaseDate).toISOString() : null,
        warrantyExpiresAt: warrantyExpiresAt ? new Date(warrantyExpiresAt).toISOString() : null,
        lastServiceAt: lastServiceAt ? new Date(lastServiceAt).toISOString() : null,
        nextServiceDueAt: nextServiceDueAt ? new Date(nextServiceDueAt).toISOString() : null,
      };
      const res = await fetch(`/api/units/${assetId}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          ...(devEmail ? { "x-dev-user-email": devEmail } : {}),
        },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Update failed");
      setMsg("Saved. Refresh to see audit entry.");
    } catch (e: any) {
      setMsg(e?.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-4">
      <div className="text-xs font-semibold text-zinc-200">Asset record & maintenance dates</div>
      <p className="mt-1 text-[11px] text-zinc-500">
        Warranty, next service, and internal notes (UPS, printers, network gear).
      </p>
      <div className="mt-3 space-y-2">
        <Input value={devEmail} onChange={(e) => setDevEmail(e.target.value)} placeholder="Dev email (if bypass)" />
        <div>
          <div className="mb-1 text-[11px] text-zinc-500">Display name</div>
          <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </div>
        <div>
          <div className="mb-1 text-[11px] text-zinc-500">Internal notes</div>
          <textarea
            className="min-h-[88px] w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
            value={internalNotes}
            onChange={(e) => setInternalNotes(e.target.value)}
          />
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          <div>
            <div className="mb-1 text-[11px] text-zinc-500">Purchase</div>
            <Input type="datetime-local" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
          </div>
          <div>
            <div className="mb-1 text-[11px] text-zinc-500">Warranty ends</div>
            <Input
              type="datetime-local"
              value={warrantyExpiresAt}
              onChange={(e) => setWarrantyExpiresAt(e.target.value)}
            />
          </div>
          <div>
            <div className="mb-1 text-[11px] text-zinc-500">Last service</div>
            <Input type="datetime-local" value={lastServiceAt} onChange={(e) => setLastServiceAt(e.target.value)} />
          </div>
          <div>
            <div className="mb-1 text-[11px] text-zinc-500">Next service due</div>
            <Input
              type="datetime-local"
              value={nextServiceDueAt}
              onChange={(e) => setNextServiceDueAt(e.target.value)}
            />
          </div>
        </div>
      </div>
      <div className="mt-3">
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save"}
        </Button>
      </div>
      {msg ? <p className="mt-2 text-xs text-zinc-400">{msg}</p> : null}
    </form>
  );
}
