import { Heading } from "@react-email/components";
import { EmailLayout, EmailText } from "../components";
import { BRAND } from "../constants";

interface UsernameChangedProps {
  userName: string;
  newUsername: string;
}

export default function UsernameChanged({
  userName,
  newUsername,
}: UsernameChangedProps) {
  return (
    <EmailLayout preview="Your Puzzroo username has been changed">
      <Heading style={headingStyle}>Username changed</Heading>
      <EmailText>
        Hi {userName}, your Puzzroo username has been updated to{" "}
        <strong>{newUsername}</strong>.
      </EmailText>
      <EmailText>
        You can use your new username to log in and others will see it on the
        leaderboard.
      </EmailText>
      <EmailText muted>
        If you didn&apos;t make this change, please contact support.
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
