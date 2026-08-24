import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { PRIVACY } from "@/lib/legal-privacy";

export const metadata: Metadata = {
  title: "Privacy Policy · Rovyk",
  description:
    "Rovyk has no backend. What stays on your Mac, what a website and a mailing list actually collect, and the third parties you choose to involve.",
};

export default function PrivacyPage() {
  return <LegalPage doc={PRIVACY} />;
}
