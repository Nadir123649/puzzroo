import { Heading } from "@react-email/components";
import { EmailLayout, EmailText } from "../components";
import { BRAND } from "../constants";

interface AccountNotificationProps {
  userName: string;
  subject: string;
  message: string;
}

export default function AccountNotification({
  userName,
  subject,
  message,
}: AccountNotificationProps) {
  return (
    <EmailLayout preview={subject}>
      <Heading style={headingStyle}>
        {userName ? `Hi ${userName},` : ""}
      </Heading>
      <Heading style={subheadingStyle}>{subject}</Heading>
      <EmailText>{message}</EmailText>
    </EmailLayout>
  );
}

const headingStyle = {
  fontFamily: BRAND.fontDisplay,
  fontSize: "18px",
  fontWeight: 700,
  color: BRAND.text,
  margin: "0 0 4px",
  padding: 0,
};

const subheadingStyle = {
  fontFamily: BRAND.fontDisplay,
  fontSize: "20px",
  fontWeight: 800,
  color: BRAND.text,
  margin: "0 0 12px",
  padding: 0,
};
