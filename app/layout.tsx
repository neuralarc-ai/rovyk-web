import type { Metadata } from "next";
import { Geist, Geist_Mono, DM_Sans } from "next/font/google";
import "./globals.css";
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
  title: "Rovyk — voice agent for macOS",
  description:
    "Talk to your Mac and watch it work. Rovyk lives in the menu bar and operates your machine. Local by default.",
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
            <NotchNav />
            {children}
          </WaitlistProvider>
        </SmoothScroll>
      </body>
    </html>
  );
}
