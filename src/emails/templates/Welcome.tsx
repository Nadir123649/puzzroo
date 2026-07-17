import { Heading, Link } from "@react-email/components";
import { EmailLayout, EmailButton, EmailDivider, EmailText } from "../components";
import { BRAND } from "../constants";

interface WelcomeProps {
  userName: string;
  dashboardUrl: string;
}

export default function Welcome({ userName, dashboardUrl }: WelcomeProps) {
  return (
    <EmailLayout preview="Welcome to Puzzroo!">
      <Heading style={headingStyle}>
        Welcome{userName ? `, ${userName}` : ""}!
      </Heading>
      <EmailText>
        Your Puzzroo account is ready. Challenge your mind with daily puzzles,
        track your streaks, and compete on the leaderboard.
      </EmailText>
      <EmailButton href={dashboardUrl}>Start Playing</EmailButton>
      <EmailDivider />
      <EmailText muted>Here&apos;s what you can do on Puzzroo:</EmailText>
      <EmailText small>
        {"\u2022"} Solve daily sudoku, cross-math, and number puzzles
        {"\n"}
        {"\u2022"} Track your solving streaks and stats
        {"\n"}
        {"\u2022"} Challenge friends with custom puzzle links
        {"\n"}
        {"\u2022"} Earn achievements as you improve
      </EmailText>
      <EmailDivider />
      <EmailText small>
        Questions? Visit our{" "}
        <Link href="https://puzzroo.com/faq" style={inlineLinkStyle}>
          FAQ
        </Link>{" "}
        or{" "}
        <Link href="https://puzzroo.com/contact-us" style={inlineLinkStyle}>
          contact us
        </Link>
        .
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

const inlineLinkStyle = {
  color: BRAND.primary,
  textDecoration: "underline",
};
