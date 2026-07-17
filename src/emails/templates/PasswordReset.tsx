import { Heading, Link } from "@react-email/components";
import { EmailLayout, EmailButton, EmailDivider, EmailText } from "../components";
import { BRAND } from "../constants";

interface PasswordResetProps {
  resetUrl: string;
  expiresInMinutes?: number;
}

export default function PasswordReset({ resetUrl, expiresInMinutes = 15 }: PasswordResetProps) {
  return (
    <EmailLayout preview="Reset your Puzzroo password">
      <Heading style={headingStyle}>Reset your password</Heading>
      <EmailText>
        We received a request to reset the password for your Puzzroo account.
      </EmailText>
      <EmailText>
        Click the button below to set a new password. For your security, this
        link will expire in {expiresInMinutes} minutes.
      </EmailText>
      <EmailButton href={resetUrl}>Reset Password</EmailButton>
      <EmailText muted>
        If you didn&apos;t request this, you can safely ignore this email.
      </EmailText>
      <EmailDivider />
      <EmailText small>
        If the button doesn&apos;t work, copy this link into your browser:
      </EmailText>
      <Link href={resetUrl} style={linkStyle}>
        {resetUrl}
      </Link>
    </EmailLayout>
  );
}

const headingStyle = {
  fontFamily: BRAND.fontDisplay,
  fontSize: "22px",
  fontWeight: 800,
  color: BRAND.text,
  margin: "0 0 12px",
  padding: 0,
};

const linkStyle = {
  color: BRAND.primary,
  fontSize: "12px",
  wordBreak: "break-all" as const,
};
