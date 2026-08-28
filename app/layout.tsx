import type { Metadata } from "next";
import { Geist, Geist_Mono, DM_Sans } from "next/font/google";
import "./globals.css";
import { SITE_ORIGIN } from "@/lib/site";
import { cn } from "@/lib/utils";
import { SmoothScroll } from "@/components/smooth-scroll";
import { WaitlistProvider } from "@/components/waitlist/waitlist-provider";

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-sans" });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Every absolute URL Next emits — the canonical link, og:url, og:image —
  // is resolved against this, so the origin is stated once, from the env
  // var, and every page below can keep writing relative paths.
  metadataBase: SITE_ORIGIN,
  alternates: { canonical: "/" },
  title: "Rovyk for macOS",
  description: "Rovyk for macOS.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={cn(
        "h-full",
        "antialiased",
        geistSans.variable,
        geistMono.variable,
        "font-sans",
        dmSans.variable,
      )}
    >
      {/* Black is the frame the sheet floats in, not a section background —
          so it belongs to the shell. */}
      <body className="flex min-h-full flex-col bg-black">
        <SmoothScroll>
          {/* Above the nav and every section, because all of them ask for the
              same dialog and there is only ever one of it. */}
          <WaitlistProvider>
            {children}
          </WaitlistProvider>
        </SmoothScroll>
      </body>
    </html>
  );
}
