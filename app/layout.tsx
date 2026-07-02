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
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://janitorforge.vercel.app",
  ),
  title: {
    default: "JanitorForge (Beta)",
    template: "%s",
  },
  description:
    "Create, manage, and share your AI characters. Custom forms, visual boards, real collaboration — everything in one place for character creators.",
  keywords: [
    "Janitor AI",
    "bot creator",
    "character card",
    "AI chatbot",
    "bot manager",
    "character creator",
    "commission form",
    "creator tools",
    "character management",
    "AI character editor",
  ],
  authors: [{ name: "JanitorForge" }],
  creator: "JanitorForge",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "JanitorForge (Beta)",
    title: "JanitorForge (Beta) — The toolkit for character creators",
    description:
      "Create, manage, and share your AI characters. Custom forms, visual boards, real collaboration — everything in one place.",
    images: [
      {
        url: "/logo.png",
        width: 512,
        height: 512,
        alt: "JanitorForge (Beta) Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "JanitorForge (Beta) — The toolkit for character creators",
    description:
      "Create, manage, and share your AI characters. Custom forms, visual boards, real collaboration — everything in one place.",
    images: ["/logo.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
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
