import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.string().optional(),
  DATABASE_URL: z.string().min(1),
  APP_BASE_URL: z.string().default("http://localhost:3000"),

  DEV_BYPASS_AUTH: z.string().optional(),
  DEV_DEFAULT_USER_EMAIL: z.string().optional(),
  DEV_LOCAL_ADMIN_USERNAME: z.string().optional(),
  DEV_LOCAL_ADMIN_PASSWORD: z.string().optional(),

  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),

  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().optional(),

  MAIL_PROVIDER: z.string().optional(), // "smtp" | "brevo"

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),

  // Brevo SMTP relay (preferred for Outlook/Office365 deliverability testing)
  BREVO_SMTP_HOST: z.string().optional(),
  BREVO_SMTP_PORT: z.string().optional(),
  BREVO_SMTP_KEY: z.string().optional(),
  SENDER_EMAIL: z.string().optional(),

  APP_NAME: z.string().optional(),
});

export type Env = z.infer<typeof EnvSchema>;

export const env: Env = EnvSchema.parse(process.env);

export const devBypassAuthEnabled =
  (env.DEV_BYPASS_AUTH ?? "").toLowerCase() === "true";

