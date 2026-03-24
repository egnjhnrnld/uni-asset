"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

export function ResendTicketEmailButton({ ticketId }: { ticketId: string }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function resend() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/resend-email`, { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Resend failed");
      if (json.emailSent) setMsg("Email resent successfully.");
      else setMsg(`Email not sent: ${json.emailError ?? "unknown error"}`);
    } catch (e: any) {
      setMsg(e?.message ?? "Resend failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Button variant="secondary" onClick={resend} disabled={busy} className="w-full md:w-auto">
        {busy ? "Resending…" : "Resend email"}
      </Button>
      {msg ? <div className="mt-2 text-xs text-zinc-400">{msg}</div> : null}
    </div>
  );
}

