export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

export type EmailTemplateName =
  | "verify-email"
  | "password-reset"
  | "password-changed"
  | "welcome"
  | "security-alert"
  | "account-notification"
  | "email-changed"
  | "username-changed";
