import { Text } from "@react-email/components";
import { BRAND } from "../constants";

interface EmailTextProps {
  children: React.ReactNode;
  muted?: boolean;
  small?: boolean;
}

export default function EmailText({ children, muted, small }: EmailTextProps) {
  return (
    <Text style={muted ? mutedStyle : small ? smallStyle : baseStyle}>
      {children}
    </Text>
  );
}

const baseStyle = {
  fontFamily: BRAND.fontFamily,
  fontSize: "15px",
  color: BRAND.textBody,
  margin: "0 0 12px",
  lineHeight: "1.7",
};

const mutedStyle = {
  ...baseStyle,
  color: BRAND.textMuted,
  fontSize: "13px",
  margin: "0 0 4px",
};

const smallStyle = {
  ...baseStyle,
  fontSize: "12px",
  color: BRAND.textMuted,
  margin: "0 0 4px",
};
