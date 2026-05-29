import type { Metadata } from "next";
import { Geist, Geist_Mono, Source_Serif_4 } from "next/font/google";
import { TopBar } from "@/components/TopBar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Source Serif 4 is a variable font (wght axis), so no explicit weight — it
// dresses the assistant answer body only, via the .t-serif class in globals.css.
const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ISQ Agent",
  description:
    "Answer supplier security questionnaires, grounded in Northstar Labs policies and past responses, with honest confidence flagging.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${sourceSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* Shared chrome: the TopBar mounts once in the layout so every screen
            inherits it (Slice 12 — the first screen). A footer with the
            Powered-by-Claude badge joins it on the Landing slice. */}
        <TopBar />
        {children}
      </body>
    </html>
  );
}
