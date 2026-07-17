import { Hr } from "@react-email/components";
import { BRAND } from "../constants";

export default function EmailDivider() {
  return <Hr style={hrStyle} />;
}

const hrStyle = {
  border: "none",
  borderTop: `1px solid ${BRAND.border}`,
  margin: "28px 0",
};
