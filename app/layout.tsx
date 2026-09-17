import type { Metadata, Viewport } from "next";
import { Oswald, Inter } from "next/font/google";
import "./globals.css";

const display = Oswald({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
});

const body = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "Pickleball Club — Book a Court",
  description: "Reserve a pickleball court online in under a minute.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#0F3D37",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="bg-chalk font-body text-ink antialiased">{children}</body>
    </html>
  );
}
