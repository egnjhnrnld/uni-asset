"use client";

import { useMemo, useState } from "react";
import { Button, Input, Select } from "@/components/ui";

export function UnitActions({
  assetId,
  checkoutable = true,
}: {
  assetId: string;
  checkoutable?: boolean;
}) {
  const [devEmail, setDevEmail] = useState("");
  const [assignedType, setAssignedType] = useState<"USER" | "LOCATION">("USER");
  const [assignedToId, setAssignedToId] = useState("");
  const [expectedCheckin, setExpectedCheckin] = useState("");
  const [note, setNote] = useState("");
  const [checkinNote, setCheckinNote] = useState("");
  const [busy, setBusy] = useState<null | "checkout" | "checkin">(null);
  const [message, setMessage] = useState<string | null>(null);

  const checkoutBody = useMemo(
    () => ({
      assignedType,
      assignedToId,
      expectedCheckin: expectedCheckin ? new Date(expectedCheckin).toISOString() : undefined,
      note: note || undefined,
    }),
    [assignedType, assignedToId, expectedCheckin, note]
  );

  async function doCheckout() {
    setBusy("checkout");
    setMessage(null);
    try {
      const res = await fetch(`/api/units/${assetId}/checkout`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(devEmail ? { "x-dev-user-email": devEmail } : {}),
        },
        body: JSON.stringify(checkoutBody),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? json?.message ?? "Checkout failed");
      setMessage("Checked out. Refresh page to see updated assignment + audit event.");
    } catch (e: any) {
      setMessage(e?.message ?? "Checkout failed");
    } finally {
      setBusy(null);
    }
  }

  async function doCheckin() {
    setBusy("checkin");
    setMessage(null);
    try {
      const res = await fetch(`/api/units/${assetId}/checkin`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(devEmail ? { "x-dev-user-email": devEmail } : {}),
        },
        body: JSON.stringify({
          note: checkinNote || undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? json?.message ?? "Checkin failed");
      setMessage("Checked in. Refresh page to see updated assignment + audit event.");
    } catch (e: any) {
      setMessage(e?.message ?? "Checkin failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="w-full max-w-xl rounded-lg border border-zinc-800 bg-zinc-900/20 p-4">
      <div className="text-xs font-semibold text-zinc-200">Actions</div>

      <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
        <div className="md:col-span-2">
          <div className="mb-1 text-xs text-zinc-400">Dev email header (optional)</div>
          <Input
            value={devEmail}
            onChange={(e) => setDevEmail(e.target.value)}
            placeholder="admin@example.edu (used only if DEV_BYPASS_AUTH=true)"
          />
        </div>
        <div>
          <div className="mb-1 text-xs text-zinc-400">Assign to (type)</div>
          <Select value={assignedType} onChange={(e) => setAssignedType(e.target.value as any)}>
            <option value="USER">User</option>
            <option value="LOCATION">Location</option>
          </Select>
        </div>
        <div>
          <div className="mb-1 text-xs text-zinc-400">Assign to (ID)</div>
          <Input
            value={assignedToId}
            onChange={(e) => setAssignedToId(e.target.value)}
            placeholder="User ID or Location ID"
          />
        </div>
        <div className="md:col-span-2">
          <div className="mb-1 text-xs text-zinc-400">Expected check-in (optional)</div>
          <Input
            type="datetime-local"
            value={expectedCheckin}
            onChange={(e) => setExpectedCheckin(e.target.value)}
          />
        </div>
        <div className="md:col-span-2">
          <div className="mb-1 text-xs text-zinc-400">Checkout note (optional)</div>
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason / note" />
        </div>
      </div>

      {!checkoutable ? (
        <p className="mt-3 text-xs text-zinc-500">
          Checkout applies to lab/office computers only (not printers, UPS, or network gear).
        </p>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={doCheckout} disabled={busy !== null || !assignedToId}>
            {busy === "checkout" ? "Checking out…" : "Check out"}
          </Button>
          <div className="flex-1" />
        </div>
      )}

      <div className="mt-4 border-t border-zinc-800 pt-4">
        <div className="mb-1 text-xs text-zinc-400">Check-in note (optional)</div>
        <Input
          value={checkinNote}
          onChange={(e) => setCheckinNote(e.target.value)}
          placeholder="Condition / return note"
        />
        <div className="mt-3">
          <Button variant="secondary" onClick={doCheckin} disabled={busy !== null}>
            {busy === "checkin" ? "Checking in…" : "Check in"}
          </Button>
        </div>
      </div>

      {message ? <div className="mt-3 text-xs text-zinc-300">{message}</div> : null}
      <div className="mt-2 text-[11px] text-zinc-500">
        Note: API calls require auth (Firebase Bearer token) unless dev bypass auth is enabled.
      </div>
    </div>
  );
}

