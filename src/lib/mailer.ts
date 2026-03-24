import { env } from "@/lib/env";
import crypto from "node:crypto";
import type { Transporter } from "nodemailer";

type TicketEmailPayload = {
  ticketId: string;
  title: string;
  description?: string | null;
  priority: string;
  status: string;
  source: string;
  dueAt?: string | null;
  requesterEmail: string;
  assigneeEmail: string;
  assetTag?: string | null;
  locationName?: string | null;
};

function getMailProvider() {
  return (env.MAIL_PROVIDER ?? "").toLowerCase() === "brevo" ? "brevo" : "smtp";
}

function ensureBrevoConfig() {
  if (!env.BREVO_SMTP_HOST && !env.BREVO_SMTP_PORT && !env.BREVO_SMTP_KEY) {
    // We don't throw early; missing defaults will be handled below.
  }
  if (!env.BREVO_SMTP_KEY || !env.SENDER_EMAIL) {
    throw new Error(
      "Brevo SMTP is not configured. Set BREVO_SMTP_KEY and SENDER_EMAIL in .env."
    );
  }
}

function ensureSmtpConfig() {
  const smtpUser = env.SMTP_USER ?? env.DEV_DEFAULT_USER_EMAIL;
  if (!env.SMTP_HOST || !env.SMTP_PORT || !smtpUser || !env.SMTP_PASS) {
    throw new Error(
      "SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER (or DEV_DEFAULT_USER_EMAIL), SMTP_PASS (and optionally SMTP_FROM)."
    );
  }
}

async function buildBrevoTransport(): Promise<Transporter> {
  ensureBrevoConfig();
  const host = env.BREVO_SMTP_HOST?.trim() || "smtp-relay.brevo.com";
  const port = Number(env.BREVO_SMTP_PORT?.trim() || "587");
  if (port !== 587) {
    throw new Error(`Brevo diagnostic/app mailer enforces STARTTLS on 587 (got ${port}).`);
  }

  // Brevo expects SMTP key as the "password".
  const smtpUser = env.SENDER_EMAIL!;

  // Keep the same dynamic import shape as the existing Office365 mailer.
  return (await import("nodemailer")).createTransport({
    host,
    port,
    secure: false, // STARTTLS on 587
    requireTLS: true,
    auth: {
      user: smtpUser,
      pass: env.BREVO_SMTP_KEY!,
    },
    tls: {
      rejectUnauthorized: true,
    },
  });
}

async function buildSmtpTransport() {
  ensureSmtpConfig();
  const nodemailer = await import("nodemailer");
  const smtpUser = env.SMTP_USER ?? env.DEV_DEFAULT_USER_EMAIL;
  const host = env.SMTP_HOST!;
  const port = Number(env.SMTP_PORT!);

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    requireTLS: port === 587, // enforce STARTTLS when on 587
    auth: {
      user: smtpUser!,
      pass: env.SMTP_PASS!,
    },
  });
}

function buildTicketHtml(payload: TicketEmailPayload) {
  const desc = payload.description?.trim() || "-";
  const location = payload.locationName?.trim() || "-";
  const asset = payload.assetTag?.trim() || "-";

  return `
<div style="font-family: Arial, sans-serif; font-size: 14px; color: #111;">
  <p>Hi,</p>
  <p>A new support ticket has been created.</p>

  <table cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse;">
    <tr><td style="padding: 4px 10px 4px 0; color: #444;">Ticket ID</td><td style="padding: 4px 0;">${payload.ticketId}</td></tr>
    <tr><td style="padding: 4px 10px 4px 0; color: #444;">Title</td><td style="padding: 4px 0;">${escapeHtml(payload.title)}</td></tr>
    <tr><td style="padding: 4px 10px 4px 0; color: #444;">Status</td><td style="padding: 4px 0;">${escapeHtml(payload.status)}</td></tr>
    <tr><td style="padding: 4px 10px 4px 0; color: #444;">Priority</td><td style="padding: 4px 0;">${escapeHtml(payload.priority)}</td></tr>
    <tr><td style="padding: 4px 10px 4px 0; color: #444;">Source</td><td style="padding: 4px 0;">${escapeHtml(payload.source)}</td></tr>
    <tr><td style="padding: 4px 10px 4px 0; color: #444;">Due</td><td style="padding: 4px 0;">${payload.dueAt ?? "-"}</td></tr>
    <tr><td style="padding: 4px 10px 4px 0; color: #444;">Asset</td><td style="padding: 4px 0;">${escapeHtml(asset)}</td></tr>
    <tr><td style="padding: 4px 10px 4px 0; color: #444;">Location</td><td style="padding: 4px 0;">${escapeHtml(location)}</td></tr>
  </table>

  <hr style="border: 0; border-top: 1px solid #ddd; margin: 14px 0;" />
  <div style="white-space: pre-wrap;">${escapeHtml(desc)}</div>

  <p style="margin-top: 18px; color: #666; font-size: 12px;">
    To verify deliverability, check “Message Details” in Outlook to view SPF/DKIM/DMARC.
  </p>
</div>`;
}

function escapeHtml(s: string) {
  return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

export async function sendTicketCreatedEmail(payload: TicketEmailPayload) {
  const provider = getMailProvider();
  const transporter =
    provider === "brevo" ? await buildBrevoTransport() : await buildSmtpTransport();

  const senderEmail =
    provider === "brevo"
      ? env.SENDER_EMAIL!
      : env.SMTP_FROM ?? (env.SMTP_USER ?? env.DEV_DEFAULT_USER_EMAIL)!;

  const entityRefId = `ticket-${payload.ticketId}-${crypto.randomUUID()}`;
  const listUnsubscribe = `<mailto:${senderEmail}?subject=unsubscribe>`;

  const subject = `[Ticket ${payload.ticketId}] ${payload.title}`;
  const lines = [
    `Ticket ID: ${payload.ticketId}`,
    `Title: ${payload.title}`,
    `Status: ${payload.status}`,
    `Priority: ${payload.priority}`,
    `Source: ${payload.source}`,
    `Due: ${payload.dueAt ?? "-"}`,
    `Requester: ${payload.requesterEmail}`,
    `Assignee: ${payload.assigneeEmail}`,
    `Asset: ${payload.assetTag ?? "-"}`,
    `Location: ${payload.locationName ?? "-"}`,
    "",
    "Description:",
    payload.description ?? "-",
  ];

  await transporter.sendMail({
    from: {
      name: env.APP_NAME ?? "Uni Asset App",
      address: senderEmail,
    },
    replyTo: senderEmail,
    envelope: {
      from: senderEmail,
      to: payload.assigneeEmail,
    },
    to: payload.assigneeEmail,
    subject,
    text: lines.join("\n"),
    html: buildTicketHtml(payload),
    priority: "normal",
    headers: {
      "List-Unsubscribe": listUnsubscribe,
      "X-Entity-Ref-ID": entityRefId,
      "Priority": "normal",
    },
  });
}

