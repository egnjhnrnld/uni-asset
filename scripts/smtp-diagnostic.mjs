import net from "node:net";
import tls from "node:tls";
import crypto from "node:crypto";
import process from "node:process";
import fs from "node:fs";
import path from "node:path";
import { once } from "node:events";

function loadEnvFile() {
  // Minimal .env loader (no external deps). Only populates values that are not already set.
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;

  const content = fs.readFileSync(envPath, "utf8");
  const lines = content.split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIdx = line.indexOf("=");
    if (eqIdx < 0) continue;
    const key = line.slice(0, eqIdx).trim();
    let value = line.slice(eqIdx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

function timeoutPromise(ms, label) {
  return new Promise((_, reject) => {
    const t = setTimeout(() => {
      const err = new Error(label);
      // Align with common Node error codes for easier matching.
      err.code = "ETIMEDOUT";
      reject(err);
    }, ms);
    // Node will GC timer; keep reference only for clarity.
    void t;
  });
}

function base64(s) {
  return Buffer.from(s, "utf8").toString("base64");
}

function parseSmtpCode(line) {
  // Typical: "250 OK", "535 5.7.8 Authentication credentials invalid", ...
  const m = line.match(/^(\d{3})[ -]/);
  return m ? Number(m[1]) : null;
}

function buildMessage({ senderEmail, receiverEmail, id, entityRefId }) {
  const boundary = `----=_diag_boundary_${crypto.randomBytes(12).toString("hex")}`;
  const subject = `[DIAGNOSTIC-TEST] Support Ticket #${id}`;

  // Keep HTML simple for Outlook.
  const htmlBody = `
<!doctype html>
<html>
  <body>
    <p>Hi,</p>
    <p>This is an SMTP diagnostic email for deliverability testing.</p>
    <table cellpadding="0" cellspacing="0" border="0" style="font-family: Arial, sans-serif; font-size: 14px;">
      <tr><td style="padding: 4px 0; color: #333;">Ticket ID</td><td style="padding: 4px 0; color: #000;">${id}</td></tr>
      <tr><td style="padding: 4px 0; color: #333;">Priority</td><td style="padding: 4px 0; color: #000;">normal</td></tr>
      <tr><td style="padding: 4px 0; color: #333;">Environment</td><td style="padding: 4px 0; color: #000;">SMTP Diagnostic Suite</td></tr>
    </table>
    <p>Please check “Message Details” in Outlook to verify SPF, DKIM, and DMARC.</p>
    <hr />
    <p style="color:#666;font-size:12px;">If you received this message, the SMTP bridge is working.</p>
  </body>
</html>`.trim();

  const textBody = `Hi,

This is an SMTP diagnostic email for deliverability testing.

Ticket ID: ${id}
Priority: normal

Please check “Message Details” in Outlook to verify SPF, DKIM, and DMARC.
`;

  const date = new Date().toUTCString();
  const domain = senderEmail.includes("@") ? senderEmail.split("@")[1] : "localhost";
  const messageId = `<${crypto.randomUUID()}@${domain}>`;

  // Essential headers requested for Outlook testing.
  const listUnsubscribe = `mailto:${senderEmail}?subject=unsubscribe`;

  return [
    `From: ${senderEmail}`,
    `To: ${receiverEmail}`,
    `Subject: ${subject}`,
    `Date: ${date}`,
    `Message-ID: ${messageId}`,
    `MIME-Version: 1.0`,
    `Priority: normal`,
    `List-Unsubscribe: <${listUnsubscribe}>`,
    `X-Entity-Ref-ID: ${entityRefId}`,
    `Reply-To: ${senderEmail}`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/plain; charset="utf-8"`,
    `Content-Transfer-Encoding: 7bit`,
    ``,
    textBody,
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset="utf-8"`,
    `Content-Transfer-Encoding: 7bit`,
    ``,
    htmlBody,
    ``,
    `--${boundary}--`,
    ``,
  ].join("\r\n");
}

async function readSmtpResponse(socket, bufferState, timeoutMs, logPrefix) {
  const readLine = async () => {
    while (true) {
      const idx = bufferState.buffer.indexOf("\r\n");
      if (idx >= 0) {
        const line = bufferState.buffer.slice(0, idx);
        bufferState.buffer = bufferState.buffer.slice(idx + 2);
        return line;
      }

      await Promise.race([
        once(socket, "data"),
        timeoutPromise(timeoutMs, "Timeout waiting for SMTP response"),
      ]);
    }
  };

  const lines = [];
  const first = await readLine();
  lines.push(first);

  const code = parseSmtpCode(first);
  // Multiline responses: "250-" then "250 "
  while (true) {
    const isMultiline = /^(\d{3})-/.test(lines[lines.length - 1]);
    if (!isMultiline) break;
    const next = await readLine();
    lines.push(next);
  }

  const shown = lines.join("\n");
  console.log(`${logPrefix} ${shown}`);
  return { code, lines };
}

async function sendSmtpCommand(socket, bufferState, cmd, timeoutMs) {
  if (cmd !== null && cmd !== undefined) {
    console.log(`C: ${cmd}`);
    socket.write(cmd + "\r\n");
  }
  const logPrefix = "S:";
  return readSmtpResponse(socket, bufferState, timeoutMs, logPrefix);
}

function classifyAndFormatError({ stage, smtpCode, originalError }) {
  if (smtpCode === 535) {
    return `Authentication failed (535): Invalid Brevo SMTP credentials or API key. Double-check \`BREVO_SMTP_KEY\` (SMTP key, not account/API key). Stage: ${stage}.`;
  }
  if (smtpCode === 550 || smtpCode === 553) {
    return `Sender address not verified (SMTP ${smtpCode}): In Brevo, verify that \`SENDER_EMAIL\` is allowed/verified for the SMTP relay. Stage: ${stage}.`;
  }
  const code = originalError?.code;
  if (code === "EAI_AGAIN" || code === "ETIMEDOUT") {
    return `DNS/Connection issue: Could not reach Brevo on port 587 (timeout/DNS failure). Check network, firewall, and DNS. Stage: ${stage}.`;
  }
  if (code === "ECONNREFUSED") {
    return `Connection refused: Brevo SMTP port was actively refused. Stage: ${stage}.`;
  }
  return `SMTP diagnostic failed at stage "${stage}". ${originalError?.message ? `Details: ${originalError.message}` : ""}`;
}

async function run() {
  loadEnvFile();
  const BREVO_SMTP_KEY = requireEnv("BREVO_SMTP_KEY");
  const SENDER_EMAIL = requireEnv("SENDER_EMAIL");
  const TEST_RECEIVER_OUTLOOK = requireEnv("TEST_RECEIVER_OUTLOOK");

  const BREVO_SMTP_HOST = process.env.BREVO_SMTP_HOST?.trim() || "smtp-relay.brevo.com";
  const BREVO_SMTP_PORT = Number(process.env.BREVO_SMTP_PORT?.trim() || "587");
  if (BREVO_SMTP_PORT !== 587) {
    throw new Error(`This diagnostic suite enforces STARTTLS on port 587. Set BREVO_SMTP_PORT=587 (got ${BREVO_SMTP_PORT}).`);
  }

  const args = process.argv.slice(2);
  let id = null;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--id" && args[i + 1]) {
      id = args[i + 1];
    } else if (a.startsWith("--id=")) {
      id = a.slice("--id=".length);
    }
  }
  if (!id) id = crypto.randomBytes(3).toString("hex").toUpperCase();

  const entityRefId = `diag-${crypto.randomBytes(10).toString("hex")}`;

  const message = buildMessage({
    senderEmail: SENDER_EMAIL,
    receiverEmail: TEST_RECEIVER_OUTLOOK,
    id,
    entityRefId,
  });

  const timeoutMs = 10_000;
  console.log("=== SMTP Diagnostic Suite (Brevo) ===");
  console.log(`Host: ${BREVO_SMTP_HOST}:${BREVO_SMTP_PORT}`);
  console.log(`Sender: ${SENDER_EMAIL}`);
  console.log(`Receiver: ${TEST_RECEIVER_OUTLOOK}`);
  console.log(`Diagnostic ID: ${id}`);
  console.log("Verbose mode: enabled");

  const socket = net.createConnection({ host: BREVO_SMTP_HOST, port: BREVO_SMTP_PORT });
  socket.setNoDelay(true);

  const bufferState = { buffer: "" };
  socket.on("data", (chunk) => {
    bufferState.buffer += chunk.toString("utf8");
  });

  let stage = "initialize";
  try {
    stage = "connect";
    await Promise.race([
      once(socket, "connect"),
      timeoutPromise(timeoutMs, `Timeout connecting to ${BREVO_SMTP_HOST}:${BREVO_SMTP_PORT} (possible firewall/ISP block)`),
    ]);

    // 220 greeting
    stage = "greeting";
    const greeting = await readSmtpResponse(socket, bufferState, timeoutMs, "S:");
    if (greeting.code !== 220) {
      throw Object.assign(new Error(`Unexpected greeting code: ${greeting.code}`), { stage });
    }

    // EHLO
    stage = "ehlo";
    await sendSmtpCommand(socket, bufferState, `EHLO diag-${Date.now()}`, timeoutMs);

    // STARTTLS
    stage = "starttls";
    await sendSmtpCommand(socket, bufferState, "STARTTLS", timeoutMs);
    // Upgrade to TLS in-place.
    console.log("Upgrading connection to STARTTLS...");

    // Once the socket is wrapped by TLS, stop collecting plaintext chunks.
    socket.removeAllListeners("data");
    bufferState.buffer = "";

    const tlsSocket = tls.connect({
      socket,
      servername: BREVO_SMTP_HOST,
      // Brevo supports modern TLS; require valid certs for production-like validation.
      rejectUnauthorized: true,
    });

    const tlsBufferState = { buffer: "" };
    tlsSocket.on("data", (chunk) => {
      tlsBufferState.buffer += chunk.toString("utf8");
    });

    stage = "starttls-handshake";
    await Promise.race([
      once(tlsSocket, "secureConnect"),
      timeoutPromise(timeoutMs, "Timeout during STARTTLS negotiation"),
    ]);

    // EHLO after STARTTLS
    stage = "ehlo-after-tls";
    const ehlo2 = await sendSmtpCommand(tlsSocket, tlsBufferState, `EHLO diag-${Date.now()}`, timeoutMs);
    if (ehlo2.code !== 250) {
      throw Object.assign(new Error(`Unexpected EHLO code after STARTTLS: ${ehlo2.code}`), { stage });
    }

    // AUTH LOGIN
    stage = "auth-login";
    console.log(`C: AUTH LOGIN`);
    tlsSocket.write("AUTH LOGIN\r\n");
    const auth1 = await readSmtpResponse(tlsSocket, tlsBufferState, timeoutMs, "S:");
    if (auth1.code !== 334) {
      throw Object.assign(new Error(`Unexpected AUTH LOGIN challenge code: ${auth1.code}`), { stage });
    }

    console.log(`C: ${base64(SENDER_EMAIL)}`);
    tlsSocket.write(base64(SENDER_EMAIL) + "\r\n");
    const auth2 = await readSmtpResponse(tlsSocket, tlsBufferState, timeoutMs, "S:");
    if (auth2.code !== 334) {
      throw Object.assign(new Error(`Unexpected AUTH username challenge code: ${auth2.code}`), { stage });
    }

    // Do not print raw SMTP key in logs.
    const pwB64 = base64(BREVO_SMTP_KEY);
    console.log(`C: ${pwB64.slice(0, 8)}...[REDACTED]`);
    tlsSocket.write(pwB64 + "\r\n");
    const auth3 = await readSmtpResponse(tlsSocket, tlsBufferState, timeoutMs, "S:");
    if (auth3.code !== 235) {
      // Often 535 if credentials invalid.
      throw Object.assign(new Error("Brevo rejected AUTH LOGIN"), { smtpCode: auth3.code, stage });
    }

    // MAIL FROM
    stage = "mail-from";
    const mailFrom = await sendSmtpCommand(
      tlsSocket,
      tlsBufferState,
      `MAIL FROM:<${SENDER_EMAIL}>`,
      timeoutMs
    );
    if (mailFrom.code !== 250) {
      throw Object.assign(new Error("MAIL FROM not accepted"), { smtpCode: mailFrom.code, stage });
    }

    // RCPT TO
    stage = "rcpt-to";
    const rcptTo = await sendSmtpCommand(
      tlsSocket,
      tlsBufferState,
      `RCPT TO:<${TEST_RECEIVER_OUTLOOK}>`,
      timeoutMs
    );
    if (rcptTo.code !== 250 && rcptTo.code !== 251) {
      throw Object.assign(new Error("RCPT TO not accepted"), { smtpCode: rcptTo.code, stage });
    }

    // DATA
    stage = "data";
    const dataResp = await sendSmtpCommand(tlsSocket, tlsBufferState, "DATA", timeoutMs);
    if (dataResp.code !== 354) {
      throw Object.assign(new Error("DATA not accepted"), { smtpCode: dataResp.code, stage });
    }

    console.log("C: [email content]");
    tlsSocket.write(message + "\r\n.\r\n");
    stage = "data-commit";
    const afterData = await readSmtpResponse(tlsSocket, tlsBufferState, timeoutMs, "S:");
    if (afterData.code !== 250) {
      throw Object.assign(new Error("Message not accepted"), { smtpCode: afterData.code, stage });
    }

    // QUIT
    stage = "quit";
    console.log("C: QUIT");
    tlsSocket.write("QUIT\r\n");
    await readSmtpResponse(tlsSocket, tlsBufferState, timeoutMs, "S:").catch(() => {});

    console.log("\n=== Result: SEND SUCCESS ===");
    console.log("Brevo accepted the message and returned SMTP 250.");
    console.log("\nNext Steps (Outlook Deliverability Check):");
    console.log("1. Open the sent email in Outlook.");
    console.log('2. Open “Message Details” (often via “... -> View message details”).');
    console.log("3. Verify SPF: should show pass.");
    console.log("4. Verify DKIM: should show pass.");
    console.log("5. Verify DMARC: should show pass or aligned policy.");
    console.log("6. If any fail, check Brevo domain settings (SPF/DKIM/DMARC) and sender verification.");

    return { ok: true, id };
  } catch (err) {
    const smtpCode = err?.smtpCode ?? parseSmtpCode(err?.message || "");
    const message = classifyAndFormatError({ stage: err?.stage || stage || "unknown", smtpCode, originalError: err });
    console.error("\n=== Result: SEND FAILURE ===");
    console.error(message);
    if (smtpCode) console.error(`Observed SMTP reply code: ${smtpCode}`);
    if (err?.message) console.error(`Raw error: ${err.message}`);
    return { ok: false, id, smtpCode };
  } finally {
    socket.destroy();
  }
}

run().then(() => process.exit(0)).catch(() => process.exit(1));

