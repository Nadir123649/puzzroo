import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Text,
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
                    <svg width="37" height="37" viewBox="0 0 37 37" fill="none" xmlns="http://www.w3.org/2000/svg" style={logoImgStyle}>
                      <path d="M23.0562 16.7426C24.2701 16.042 24.2701 14.2913 23.0562 13.5908L17.1366 10.1753C15.9227 9.47472 14.405 10.3508 14.405 11.7519V18.5814C14.405 19.9825 15.9227 20.8586 17.1366 20.158L23.0562 16.7426Z" fill="url(#logo-grad-a)"/>
                      <path fillRule="evenodd" clipRule="evenodd" d="M27.5315 30.4851C32.0394 30.5303 35.8181 27.0727 36.1827 22.6137C36.3524 20.041 36.4191 17.4557 36.3954 14.8712C36.3746 12.6103 36.2857 10.3493 36.1367 8.09876C35.97 6.08 35.0829 4.18861 33.6371 2.76821C32.1913 1.34856 30.2831 0.495435 28.26 0.364356C25.0274 0.0910889 21.6126 0 18.1978 0C14.783 0 11.3682 0.0910889 8.18086 0.318441C6.15775 0.44952 4.24952 1.30339 2.8037 2.72304C1.35789 4.14269 0.470835 6.03482 0.304096 8.05359C-0.0597661 12.922 -0.105712 17.7453 0.212945 22.6137C0.387836 24.7769 1.3779 26.7935 2.98452 28.2553C4.59041 29.7164 6.69206 30.5133 8.86412 30.4851H13.6447V36.4L22.7509 30.4851H27.5315ZM13.6447 30.4851V24.5703H8.86412C7.45239 24.6155 6.22297 23.6142 6.08661 22.2042C5.81316 17.6542 5.85911 13.1042 6.17776 8.55421C6.23038 7.81439 6.58979 7.18269 7.13151 6.76427C7.52353 6.46213 8.01041 6.2718 8.54546 6.23329C11.6416 6.00594 14.9193 5.91485 18.1978 5.91485C21.4763 5.91485 24.754 6.05186 27.8502 6.18812C29.0796 6.27921 30.1267 7.23453 30.2179 8.50829C30.5825 13.0583 30.5825 17.6083 30.309 22.1583C30.1267 23.5691 28.9432 24.6155 27.5315 24.5703H22.7509L13.6447 30.4851Z" fill="url(#logo-grad-b)"/>
                      <defs>
                        <linearGradient id="logo-grad-a" x1="36.4" y1="36.4" x2="-6.91273" y2="23.8419" gradientUnits="userSpaceOnUse">
                          <stop stopColor="#6949FF"/>
                          <stop offset="1" stopColor="#876DFF"/>
                        </linearGradient>
                        <linearGradient id="logo-grad-b" x1="36.4" y1="36.4" x2="-6.91273" y2="23.8419" gradientUnits="userSpaceOnUse">
                          <stop stopColor="#6949FF"/>
                          <stop offset="1" stopColor="#876DFF"/>
                        </linearGradient>
                      </defs>
                    </svg>
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
