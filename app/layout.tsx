import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { Toaster } from "@/components/ui/sonner";
import { CustomScrollbar } from "@/components/ui/custom-scrollbar";
import "./globals.css";

// Font configuration
const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

// SEO Metadata
export const metadata: Metadata = {
  title: "JanitorForge",
  description:
    "A powerful ecosystem of tools for Janitor AI bot creators. Manage bots, create request forms, and organize Atlas hubs for series, lore, and creator spaces.",
  keywords: [
    "Janitor AI",
    "bot creator",
    "character card",
    "AI chatbot",
    "bot manager",
  ],
  authors: [{ name: "JanitorForge" }],
  icons: {
    icon: [
      { url: "/icon-light-32x32.png", media: "(prefers-color-scheme: light)" },
      { url: "/icon-dark-32x32.png", media: "(prefers-color-scheme: dark)" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-icon.png",
  },
};

// Viewport configuration
export const viewport: Viewport = {
  themeColor: "#1a1625",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark bg-background">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <CustomScrollbar />
        {children}
        <Toaster />
        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  );
}
