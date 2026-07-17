import { Heading, Link } from "@react-email/components";
import { EmailLayout, EmailButton, EmailDivider, EmailText } from "../components";
import { BRAND } from "../constants";

interface VerifyEmailProps {
  verifyUrl: string;
}

export default function VerifyEmail({ verifyUrl }: VerifyEmailProps) {
  return (
    <EmailLayout preview="Verify your email address for Puzzroo">
      <Heading style={headingStyle}>Verify your email</Heading>
      <EmailText>
        Thanks for signing up for Puzzroo! Click the button below to confirm
        your email address and activate your account.
      </EmailText>
      <EmailButton href={verifyUrl}>Verify Email</EmailButton>
      <EmailText muted>
        This link expires in 24 hours. If you didn&apos;t create an account,
        you can ignore this email.
      </EmailText>
      <EmailDivider />
      <EmailText small>
        If the button doesn&apos;t work, copy this link into your browser:
      </EmailText>
      <Link href={verifyUrl} style={linkStyle}>
        {verifyUrl}
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
