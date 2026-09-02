import type { Metadata } from "next";
import { Geist, Geist_Mono, DM_Sans } from "next/font/google";
import "./globals.css";
import { ENTITY } from "@/lib/legal";
import { SITE_ORIGIN } from "@/lib/site";
import { cn } from "@/lib/utils";
import { NotchNav } from "@/components/notch-nav";
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
  title: "Rovyk: voice agent for macOS",
  description:
    "Talk to your Mac and watch it work. Rovyk lives in the menu bar and operates your machine. Local by default.",

  /* Who made it, in the form search results, social cards and assistants
     actually read — the same fact the hero's byline and the footer's give a
     reader. `publisher` takes the filing rather than the byline: it is the
     one of the two names that can be served papers.

     `openGraph` carries only what is true of every page. Title and
     description are deliberately absent: Next fills those from each page's
     own, and spelling them out here would put the home page's title on the
     card for /terms and /privacy. */
  applicationName: "Rovyk",
  authors: [{ name: ENTITY.name, url: ENTITY.site }],
  creator: ENTITY.name,
  publisher: ENTITY.legal,
  openGraph: { type: "website", siteName: "Rovyk", locale: "en_US" },
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
      <body className="flex min-h-full flex-col bg-background">
        <SmoothScroll>
          {/* Above the nav and every section, because all of them ask for the
              same dialog and there is only ever one of it. */}
          <WaitlistProvider>
            <NotchNav />
            {children}
          </WaitlistProvider>
        </SmoothScroll>
      </body>
    </html>
  );
}
