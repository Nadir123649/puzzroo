import { Resend } from "resend";
import nodemailer from "nodemailer";
import { render } from "@react-email/components";
import {
  VerifyEmail,
  PasswordReset,
  PasswordChanged,
  Welcome,
  SecurityAlert,
  EmailChanged,
  UsernameChanged,
  AccountNotification,
} from "@/emails";

// Email delivery strategy:
// 1. Resend API (fast, reliable, ~instant delivery) when RESEND_API_KEY is set.
// 2. nodemailer/SMTP as fallback for environments without a Resend key.
let resendClient: Resend | null = null;
let transporter: nodemailer.Transporter | null = null;

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!resendClient) resendClient = new Resend(process.env.RESEND_API_KEY);
  return resendClient;
}

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
}

// Resend requires a verified domain; fall back to the sandbox sender until one
// is verified in the Resend dashboard.
const FROM =
  process.env.RESEND_FROM ||
  process.env.EMAIL_FROM ||
  "Puzzroo <onboarding@resend.dev>";

async function deliver(to: string, subject: string, html: string) {
  const resend = getResend();
  if (resend) {
    const { error } = await resend.emails.send({ from: FROM, to, subject, html });
    if (error) throw new Error(`Resend send failed: ${error.message}`);
    return;
  }
  await getTransporter().sendMail({ from: FROM, to, subject, html });
}

export function validateSmtpEnv(): string | null {
  if (process.env.RESEND_API_KEY) return null;
  const required = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS"] as const;
  for (const key of required) {
    if (!process.env[key]) return `Missing SMTP env var: ${key}`;
  }
  return null;
}

export async function sendVerificationEmail(to: string, verifyUrl: string) {
  const html = await render(<VerifyEmail verifyUrl={verifyUrl} />);
  await deliver(to, "Verify your email — Puzzroo", html);
}

export async function sendResetPasswordEmail(to: string, resetUrl: string, expiresInMinutes = 60) {
  const html = await render(<PasswordReset resetUrl={resetUrl} expiresInMinutes={expiresInMinutes} />);
  await deliver(to, "Reset your Puzzroo password", html);
}

export async function sendPasswordChangedEmail(to: string, userName: string) {
  const html = await render(<PasswordChanged userName={userName} />);
  await deliver(to, "Your Puzzroo password was changed", html);
}

export async function sendWelcomeEmail(to: string, userName: string, dashboardUrl: string) {
  const html = await render(<Welcome userName={userName} dashboardUrl={dashboardUrl} />);
  await deliver(to, "Welcome to Puzzroo!", html);
}

export async function sendSecurityAlertEmail(
  to: string,
  event: string,
  time: string,
  location?: string,
  device?: string,
) {
  const html = await render(<SecurityAlert event={event} time={time} location={location} device={device} />);
  await deliver(to, "Security alert — Puzzroo", html);
}

export async function sendEmailChangedEmail(to: string, userName: string, newEmail: string) {
  const html = await render(<EmailChanged userName={userName} newEmail={newEmail} />);
  await deliver(to, "Your Puzzroo email has been updated", html);
}

export async function sendUsernameChangedEmail(to: string, userName: string, newUsername: string) {
  const html = await render(<UsernameChanged userName={userName} newUsername={newUsername} />);
  await deliver(to, "Your Puzzroo username has been updated", html);
}

export async function sendAccountNotificationEmail(to: string, userName: string, subject: string, message: string) {
  const html = await render(<AccountNotification userName={userName} subject={subject} message={message} />);
  await deliver(to, subject, html);
}