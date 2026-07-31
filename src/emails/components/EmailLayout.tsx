import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Text,
  Img,
} from "@react-email/components";
import { BRAND } from "../constants";

interface EmailLayoutProps {
  preview: string;
  children: React.ReactNode;
}

export default function EmailLayout({ preview, children }: EmailLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Section style={cardOuterStyle}>
            <Section style={cardAccentStyle} />

            <Section style={cardStyle}>
              <table cellPadding="0" cellSpacing="0" style={logoTableStyle}>
                <tr>
                  <td style={logoIconTdStyle}>
                    <Img 
                      src="https://puzzroo.com/logo-icon.png" 
                      width="37" 
                      height="37" 
                      alt="Puzzroo Logo" 
                      style={logoImgStyle} 
                    />
                  </td>
                  <td style={logoTdStyle}>
                    <span style={logoTextStyle}>Puzzroo</span>
                  </td>
                </tr>
              </table>

              {children}
            </Section>
          </Section>

          <Section style={footerStyle}>
            <Text style={footerTextStyle}>
              Puzzroo &copy; {new Date().getFullYear()}
            </Text>
            <Text style={footerMutedStyle}>
              If you didn&apos;t request this email, you can safely ignore it.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const bodyStyle = {
  backgroundColor: "#F0EEF8",
  fontFamily: BRAND.fontFamily,
  margin: 0,
  padding: "40px 16px",
};

const containerStyle = {
  maxWidth: "520px",
  margin: "0 auto",
};

const cardOuterStyle = {
  backgroundColor: BRAND.bg,
  borderRadius: "16px",
  overflow: "hidden" as const,
  boxShadow: "0 4px 24px rgba(105, 73, 255, 0.08), 0 1px 4px rgba(0, 0, 0, 0.04)",
};

const cardAccentStyle = {
  height: "4px",
  background: `linear-gradient(90deg, ${BRAND.primary} 0%, ${BRAND.accent} 100%)`,
};

const cardStyle = {
  padding: "40px 36px 36px",
  textAlign: "center" as const,
};

const logoTableStyle = {
  margin: "0 auto 24px",
};

const logoIconTdStyle = {
  paddingRight: "10px",
  verticalAlign: "middle" as const,
};

const logoImgStyle = {
  display: "block",
  borderRadius: "8px",
};

const logoTdStyle = {
  verticalAlign: "middle" as const,
};

const logoTextStyle = {
  fontFamily: BRAND.fontDisplay,
  fontSize: "24px",
  fontWeight: 800,
  color: BRAND.text,
  letterSpacing: "-0.5px",
};

const footerStyle = {
  paddingTop: "24px",
  textAlign: "center" as const,
};

const footerTextStyle = {
  fontSize: "12px",
  color: "#A8A0C0",
  margin: 0,
  lineHeight: "1.6",
};

const footerMutedStyle = {
  fontSize: "11px",
  color: "#C0B8D0",
  margin: "8px 0 0",
  lineHeight: "1.5",
};
