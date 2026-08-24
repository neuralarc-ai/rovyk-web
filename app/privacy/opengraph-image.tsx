import { OG_CONTENT_TYPE, OG_SIZE, ogImage } from "@/components/og/render";

export const alt = "Rovyk: Privacy Policy";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return ogImage("Privacy Policy");
}
