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

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

const FROM = process.env.EMAIL_FROM || "Puzzroo <noreply@puzzroo.com>";

export async function sendVerificationEmail(to: string, verifyUrl: string) {
  const html = await render(<VerifyEmail verifyUrl={verifyUrl} />);
  await transporter.sendMail({ from: FROM, to, subject: "Verify your email — Puzzroo", html });
}

export async function sendResetPasswordEmail(to: string, resetUrl: string, expiresInMinutes = 15) {
  const html = await render(<PasswordReset resetUrl={resetUrl} expiresInMinutes={expiresInMinutes} />);
  await transporter.sendMail({ from: FROM, to, subject: "Reset your Puzzroo password", html });
}

export async function sendPasswordChangedEmail(to: string, userName: string) {
  const html = await render(<PasswordChanged userName={userName} />);
  await transporter.sendMail({ from: FROM, to, subject: "Your Puzzroo password was changed", html });
}

export async function sendWelcomeEmail(to: string, userName: string, dashboardUrl: string) {
  const html = await render(<Welcome userName={userName} dashboardUrl={dashboardUrl} />);
  await transporter.sendMail({ from: FROM, to, subject: "Welcome to Puzzroo!", html });
}

export async function sendSecurityAlertEmail(
  to: string,
  event: string,
  time: string,
  location?: string,
  device?: string,
) {
  const html = await render(<SecurityAlert event={event} time={time} location={location} device={device} />);
  await transporter.sendMail({ from: FROM, to, subject: "Security alert — Puzzroo", html });
}

export async function sendEmailChangedEmail(to: string, userName: string, newEmail: string) {
  const html = await render(<EmailChanged userName={userName} newEmail={newEmail} />);
  await transporter.sendMail({ from: FROM, to, subject: "Your Puzzroo email has been updated", html });
}

export async function sendUsernameChangedEmail(to: string, userName: string, newUsername: string) {
  const html = await render(<UsernameChanged userName={userName} newUsername={newUsername} />);
  await transporter.sendMail({ from: FROM, to, subject: "Your Puzzroo username has been updated", html });
}

export async function sendAccountNotificationEmail(to: string, userName: string, subject: string, message: string) {
  const html = await render(<AccountNotification userName={userName} subject={subject} message={message} />);
  await transporter.sendMail({ from: FROM, to, subject, html });
}
