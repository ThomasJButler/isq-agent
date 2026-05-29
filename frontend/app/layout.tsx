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

// Runs synchronously before the body paints, so the right theme is applied with
// no light-first flash: stored choice wins, otherwise fall back to the OS
// preference. The "isq-theme" key matches components/ThemeToggle.tsx. SSR-safe —
// no Date.now / Math.random — and self-contained so it can ship as an inline
// string (it executes before any bundle, so it can't import the toggle's const).
const NO_FLASH_THEME_SCRIPT = `(function(){try{var c=localStorage.getItem('isq-theme');if(c==='dark'||(c===null&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark');}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning: the pre-hydration script below adds `.dark` to
    // <html>, so its className differs from the server's. Without this, React 19
    // would "reconcile" the class away on hydration and undo the theme.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${sourceSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* First child so it runs during parse, before any visible content paints
            — that's what kills the light-mode flash. A raw inline <script> (not
            next/script) executes deterministically here without hoisting. */}
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_THEME_SCRIPT }} />
        {/* Shared chrome: the TopBar mounts once in the layout so every screen
            inherits it (Slice 12 — the first screen). A footer with the
            Powered-by-Claude badge joins it on the Landing slice. */}
        <TopBar />
        {children}
      </body>
    </html>
  );
}
