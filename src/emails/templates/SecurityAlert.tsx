import { Heading } from "@react-email/components";
import { EmailLayout, EmailText } from "../components";
import { BRAND } from "../constants";

interface SecurityAlertProps {
  event: string;
  location?: string;
  device?: string;
  time: string;
  actionUrl?: string;
}

export default function SecurityAlert({
  event,
  location,
  device,
  time,
}: SecurityAlertProps) {
  return (
    <EmailLayout preview="Security alert for your Puzzroo account">
      <Heading style={headingStyle}>Security alert</Heading>
      <EmailText>
        A security event occurred on your Puzzroo account:
      </EmailText>
      <EmailText>
        <strong>Event:</strong> {event}
        <br />
        {location && (
          <>
            <strong>Location:</strong> {location}
            <br />
          </>
        )}
        {device && (
          <>
            <strong>Device:</strong> {device}
            <br />
          </>
        )}
        <strong>Time:</strong> {time}
      </EmailText>
      <EmailText muted>
        If this was you, no action is needed. If you don&apos;t recognize this
        activity, please change your password immediately.
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
