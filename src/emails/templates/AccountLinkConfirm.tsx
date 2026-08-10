import { Heading, Link } from "@react-email/components";
import { EmailLayout, EmailButton, EmailDivider, EmailText } from "../components";
import { BRAND } from "../constants";

interface AccountLinkConfirmProps {
  confirmUrl: string;
  donorEmail: string;
}

export default function AccountLinkConfirm({ confirmUrl, donorEmail }: AccountLinkConfirmProps) {
  return (
    <EmailLayout preview="Confirm linking your Puzzroo account">
      <Heading style={headingStyle}>Confirm account linking</Heading>
      <EmailText>
        Someone signed in with the email address <strong>{donorEmail}</strong> and
        requested to link it to this Puzzroo account. Both accounts will be merged
        into this one, keeping all of its data.
      </EmailText>
      <EmailText>If this was you, click the button below to confirm.</EmailText>
      <EmailButton href={confirmUrl}>Confirm Link</EmailButton>
      <EmailText muted>
        This link expires in 24 hours. If you did not request this, you can ignore
        this email — nothing will change on your account.
      </EmailText>
      <EmailDivider />
      <EmailText small>
        If the button doesn&apos;t work, copy this link into your browser:
      </EmailText>
      <Link href={confirmUrl} style={linkStyle}>
        {confirmUrl}
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