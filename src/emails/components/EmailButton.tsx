import { Button } from "@react-email/components";
import { BRAND } from "../constants";

interface EmailButtonProps {
  href: string;
  children: React.ReactNode;
}

export default function EmailButton({ href, children }: EmailButtonProps) {
  return (
    <Button href={href} style={buttonStyle}>
      {children}
    </Button>
  );
}

const buttonStyle = {
  display: "inline-block",
  fontFamily: BRAND.fontDisplay,
  fontSize: "15px",
  fontWeight: 700,
  color: "#FFFFFF",
  textDecoration: "none",
  padding: "14px 36px",
  borderRadius: BRAND.radiusPill,
  background: `linear-gradient(135deg, ${BRAND.primary} 0%, ${BRAND.accent} 100%)`,
};
