import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { TERMS } from "@/lib/legal-terms";

export const metadata: Metadata = {
  title: "Terms of Use — Rovyk",
  description:
    "The terms you install Rovyk under: the licence, the permissions you grant, your own provider keys, and who is responsible for what.",
};

export default function TermsPage() {
  return <LegalPage doc={TERMS} />;
}
