import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { TermsContent } from "./terms-content";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "JanitorForge Terms of Service. Read the rules and guidelines governing your use of the JanitorForge platform.",
  openGraph: {
    title: "Terms of Service | JanitorForge",
    description:
      "JanitorForge Terms of Service. Read the rules and guidelines governing your use of the JanitorForge platform.",
  },
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#08060e] text-foreground antialiased">
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#08060e]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-5 py-4">
          <Link
            href="/"
            className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
          >
            <Image
              src="/logo.png"
              alt="JanitorForge"
              width={24}
              height={24}
              className="rounded"
            />
            <span className="font-semibold text-sm">JanitorForge</span>
          </Link>
          <span className="text-muted-foreground/40">/</span>
          <span className="text-sm text-muted-foreground/70">
            Terms of Service
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-5 py-12 md:py-16">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Terms of Service
        </h1>
        <p className="mt-2 text-sm text-muted-foreground/60">
          Last updated: July 04, 2026
        </p>

        <div className="prose-invert mt-10 space-y-10 text-muted-foreground/80 leading-relaxed">
          <TermsContent />
        </div>

        <div className="mt-16 flex items-center gap-4 border-t border-white/[0.06] pt-8 text-sm text-muted-foreground/60">
          <Link href="/" className="transition-colors hover:text-foreground">
            Home
          </Link>
          <span className="text-muted-foreground/30">·</span>
          <Link
            href="/privacy"
            className="transition-colors hover:text-foreground"
          >
            Privacy Policy
          </Link>
          <span className="text-muted-foreground/30">·</span>
          <Link
            href="/login"
            className="transition-colors hover:text-foreground"
          >
            Sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
