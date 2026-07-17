import { Heading } from "@react-email/components";
import { EmailLayout, EmailText } from "../components";
import { BRAND } from "../constants";

interface PasswordChangedProps {
  userName: string;
}

export default function PasswordChanged({ userName }: PasswordChangedProps) {
  return (
    <EmailLayout preview="Your Puzzroo password has been changed">
      <Heading style={headingStyle}>Password changed</Heading>
      <EmailText>
        Hi {userName}, your Puzzroo account password was successfully changed.
      </EmailText>
      <EmailText>
        If you made this change, no further action is needed.
      </EmailText>
      <EmailText muted>
        If you didn&apos;t change your password, please contact support
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
