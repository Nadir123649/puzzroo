import { Heading } from "@react-email/components";
import { EmailLayout, EmailText } from "../components";
import { BRAND } from "../constants";

interface EmailChangedProps {
  userName: string;
  newEmail: string;
}

export default function EmailChanged({ userName, newEmail }: EmailChangedProps) {
  return (
    <EmailLayout preview="Your Puzzroo email address has been changed">
      <Heading style={headingStyle}>Email changed</Heading>
      <EmailText>
        Hi {userName}, your Puzzroo account email address has been updated to{" "}
        <strong>{newEmail}</strong>.
      </EmailText>
      <EmailText>
        If you made this change, no further action is needed.
      </EmailText>
      <EmailText muted>
        If you didn&apos;t change your email, please contact support
        immediately so we can secure your account.
      </EmailText>
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
