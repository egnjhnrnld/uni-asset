## SMTP Diagnostic Suite (Brevo / Outlook-friendly)

Standalone verbose SMTP handshake diagnostic tool.

### Required environment variables

- `BREVO_SMTP_KEY` (Brevo SMTP key / password for SMTP relay)
- `SENDER_EMAIL` (SMTP relay username)
- `TEST_RECEIVER_OUTLOOK` (recipient mailbox to test deliverability)

Optional:

- `BREVO_SMTP_HOST` (default: `smtp-relay.brevo.com`)
- `BREVO_SMTP_PORT` (must be `587`, default: `587`)

### Run

From `uni-asset-app/`:

```bash
node ./scripts/smtp-diagnostic.mjs --id 123
```

If you omit `--id`, the script generates one automatically for the subject line.

The script prints:

- Full SMTP conversation logs (EHLO, STARTTLS, AUTH LOGIN, MAIL FROM, DATA)
- Friendly failure explanations (535, 550/553, DNS/timeout)
- A post-send “Next Steps” checklist for Outlook “Message Details”.

