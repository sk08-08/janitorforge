"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  FileText,
  Kanban,
  Users,
  Shield,
  Globe,
  Sparkles,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Zap,
  Heart,
  Palette,
  Eye,
  Send,
  Menu,
  X,
  Quote,
  Maximize2,
  Moon,
  Sun,
} from "lucide-react";

// ============================================================================
// Hooks
// ============================================================================

function useScrollDirection() {
  const [scrollDir, setScrollDir] = useState<"up" | "down">("up");
  const [scrolled, setScrolled] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    const handle = () => {
      const y = window.scrollY;
      setScrolled(y > 50);
      setScrollDir(y > lastY.current && y > 300 ? "down" : "up");
      lastY.current = y;
    };
    window.addEventListener("scroll", handle, { passive: true });
    return () => window.removeEventListener("scroll", handle);
  }, []);

  return { scrollDir, scrolled };
}

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return { ref, visible };
}

function FadeIn({
  children,
  delay = 0,
  className,
  direction = "up",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  direction?: "up" | "down" | "left" | "right";
}) {
  const { ref, visible } = useInView(0.1);
  const transforms: Record<string, string> = {
    up: "translateY(40px)",
    down: "translateY(-40px)",
    left: "translateX(40px)",
    right: "translateX(-40px)",
  };

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "none" : transforms[direction],
        transition: `opacity 0.8s cubic-bezier(0.22, 1, 0.36, 1) ${delay}s, transform 0.8s cubic-bezier(0.22, 1, 0.36, 1) ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <Button
      type="button"
      variant="outline"
      size="icon-sm"
      className="cursor-pointer border-border/60 bg-background/80"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
      title={`Switch to ${isDark ? "light" : "dark"} theme`}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}

// ============================================================================
// Noise Texture + Background
// ============================================================================

function NoiseOverlay() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-[1] opacity-[0.015]"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundRepeat: "repeat",
        backgroundSize: "128px 128px",
      }}
    />
  );
}

function HeroGlow() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Main violet glow */}
      <div
        className="absolute left-1/2 top-0 -translate-x-1/2 h-[700px] w-[1000px] opacity-[0.12]"
        style={{
          background:
            "radial-gradient(ellipse at center, #7c3aed 0%, transparent 60%)",
          filter: "blur(80px)",
        }}
      />
      {/* Warm accent */}
      <div
        className="absolute -top-40 -right-40 h-[500px] w-[500px] opacity-[0.06] animate-pulse"
        style={{
          background: "radial-gradient(circle, #f59e0b 0%, transparent 60%)",
          animationDuration: "8s",
        }}
      />
      {/* Cool accent */}
      <div
        className="absolute top-1/3 -left-32 h-[400px] w-[400px] opacity-[0.05]"
        style={{
          background: "radial-gradient(circle, #06b6d4 0%, transparent 60%)",
          animation: "orb-drift 22s ease-in-out infinite",
        }}
      />
      <style jsx>{`
        @keyframes orb-drift {
          0%,
          100% {
            transform: translate(0, 0);
          }
          50% {
            transform: translate(30px, 20px);
          }
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// Navbar
// ============================================================================

function Navbar() {
  const { scrollDir, scrolled } = useScrollDirection();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav
      data-landing-nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
        scrolled
          ? "bg-background/78 backdrop-blur-2xl border-b border-border/60 shadow-2xl shadow-black/10"
          : "bg-transparent",
        scrollDir === "down" && scrolled
          ? "-translate-y-full"
          : "translate-y-0",
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/logo.png"
            alt="JanitorForge"
            width={32}
            height={32}
            className="rounded-lg"
          />
          <span className="text-lg font-bold tracking-tight">
            JanitorForge (Beta)
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-8 md:flex">
          <a
            href="#features"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Features
          </a>
          <a
            href="#how"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            How it works
          </a>
          <a
            href="#showcase"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Showcase
          </a>
          <Link href="/login">
            <Button variant="ghost" size="sm" className="cursor-pointer">
              Sign in
            </Button>
          </Link>
          <ThemeToggle />
          <Link href="/login">
            <Button
              size="sm"
              className="cursor-pointer bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 shadow-lg shadow-violet-600/25"
            >
              Get started
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        {/* Mobile menu button */}
        <button
          className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-muted md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-border/60 bg-background/95 backdrop-blur-2xl px-5 py-4 md:hidden">
          <div className="flex flex-col gap-3">
            <a
              href="#features"
              className="py-2 text-sm text-muted-foreground"
              onClick={() => setMobileOpen(false)}
            >
              Features
            </a>
            <a
              href="#how"
              className="py-2 text-sm text-muted-foreground"
              onClick={() => setMobileOpen(false)}
            >
              How it works
            </a>
            <a
              href="#showcase"
              className="py-2 text-sm text-muted-foreground"
              onClick={() => setMobileOpen(false)}
            >
              Showcase
            </a>
            <div className="flex items-center gap-2 pt-2">
              <ThemeToggle />
              <Link href="/login" className="flex-1">
                <Button variant="outline" className="w-full cursor-pointer">
                  Sign in
                </Button>
              </Link>
              <Link href="/login" className="flex-1">
                <Button className="w-full cursor-pointer bg-gradient-to-r from-violet-600 to-purple-600">
                  Get started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

// ============================================================================
// Hero
// ============================================================================

function Hero() {
  return (
    <section className="relative min-h-[100vh] flex items-center justify-center overflow-hidden pt-16">
      <HeroGlow />

      {/* Dot grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "radial-gradient(circle at center, currentColor 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="relative mx-auto max-w-6xl px-5 py-20 text-center">
        <FadeIn>
          <Badge
            variant="outline"
            className="mb-6 gap-1.5 border-violet-500/30 bg-violet-500/[0.08] px-4 py-1.5 text-violet-400 text-xs tracking-wide uppercase"
          >
            <Sparkles className="h-3 w-3" />
            Built for character creators
          </Badge>
        </FadeIn>

        <FadeIn delay={0.1}>
          <h1 className="mx-auto max-w-4xl text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl md:text-6xl lg:text-[4.5rem]">
            Your characters deserve
            <br />
            <span className="relative inline-block">
              <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-purple-400 bg-clip-text text-transparent">
                better tools
              </span>
              <span className="absolute -bottom-1 left-0 right-0 h-[3px] rounded-full bg-gradient-to-r from-violet-500/50 via-fuchsia-500/50 to-purple-500/50 blur-sm" />
            </span>
          </h1>
        </FadeIn>

        <FadeIn delay={0.2}>
          <p className="mx-auto mt-7 max-w-2xl text-base text-muted-foreground/80 sm:text-lg md:text-xl leading-relaxed">
            JanitorForge is where you create, manage, and share your characters.
            Custom forms, visual boards, real collaboration — everything in one
            place, no juggling five different apps.
          </p>
        </FadeIn>

        <FadeIn delay={0.3}>
          <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link href="/login">
              <Button
                size="lg"
                className="group cursor-pointer bg-gradient-to-r from-violet-600 to-purple-600 px-8 text-base shadow-2xl shadow-violet-600/25 hover:from-violet-500 hover:to-purple-500 hover:shadow-violet-500/30 transition-all duration-300"
              >
                Start creating
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <a href="#features">
              <Button
                variant="outline"
                size="lg"
                className="cursor-pointer px-8 text-base border-white/10 hover:bg-white/[0.04]"
              >
                See what's inside
                <ChevronDown className="ml-2 h-4 w-4 animate-bounce" />
              </Button>
            </a>
          </div>
        </FadeIn>

        {/* Hero visual — floating dashboard mockup */}
        <FadeIn delay={0.45} className="mt-16 sm:mt-20">
          <div className="relative mx-auto max-w-4xl">
            {/* Ambient glow behind */}
            <div className="absolute -inset-x-12 top-12 -bottom-8 rounded-4xl bg-linear-to-b from-violet-600/8 via-purple-600/5 to-transparent blur-2xl" />

            <div className="relative rounded-2xl border border-border/60 bg-card/90 p-1.5 shadow-[0_0_80px_-12px_rgba(124,58,237,0.18)] backdrop-blur-xl">
              {/* Browser chrome */}
              <div className="flex items-center gap-2 rounded-t-xl border-b border-border/60 bg-background/70 px-4 py-3">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-[#ff5f57]/80" />
                  <div className="h-3 w-3 rounded-full bg-[#febc2e]/80" />
                  <div className="h-3 w-3 rounded-full bg-[#28c840]/80" />
                </div>
                <div className="ml-3 flex-1 rounded-md bg-muted/70 px-3 py-1 text-xs text-muted-foreground font-mono">
                  janitorforge.vercel.app/dashboard
                </div>
              </div>

              {/* Mockup content */}
              <div className="rounded-b-xl bg-gradient-to-br from-background/80 to-transparent p-4 sm:p-6 md:p-8">
                <div className="grid gap-4 md:grid-cols-3">
                  {[
                    {
                      label: "Characters",
                      value: "12",
                      icon: Bot,
                      color: "text-violet-400",
                      bg: "bg-violet-500/10",
                    },
                    {
                      label: "Active Forms",
                      value: "4",
                      icon: FileText,
                      color: "text-cyan-400",
                      bg: "bg-cyan-500/10",
                    },
                    {
                      label: "Submissions",
                      value: "89",
                      icon: Send,
                      color: "text-amber-400",
                      bg: "bg-amber-500/10",
                    },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-xl border border-border/60 bg-background/75 p-4 text-left"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {stat.label}
                        </span>
                        <div
                          className={cn(
                            "flex h-7 w-7 items-center justify-center rounded-lg",
                            stat.bg,
                          )}
                        >
                          <stat.icon
                            className={cn("h-3.5 w-3.5", stat.color)}
                          />
                        </div>
                      </div>
                      <p className="mt-2 text-2xl font-bold tracking-tight">
                        {stat.value}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Fake request cards */}
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {[
                    {
                      name: "Luna",
                      initial: "L",
                      status: "New",
                      form: "Open Commissions",
                      color: "bg-violet-500/15 text-violet-400",
                      avatar: "from-violet-500 to-fuchsia-500",
                    },
                    {
                      name: "Marco",
                      initial: "M",
                      status: "In progress",
                      form: "Custom Portrait",
                      color: "bg-cyan-500/15 text-cyan-400",
                      avatar: "from-cyan-500 to-blue-500",
                    },
                  ].map((req) => (
                    <div
                      key={req.name}
                      className="flex items-center gap-3 rounded-lg border border-border/60 bg-background/75 p-3"
                    >
                      <div
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br text-xs font-bold text-white",
                          req.avatar,
                        )}
                      >
                        {req.initial}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {req.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {req.form}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-[10px] font-semibold",
                          req.color,
                        )}
                      >
                        {req.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Floating badges */}
            <div className="absolute -top-4 -right-4 hidden sm:block">
              <div className="rounded-full border border-border/60 bg-background/85 px-3.5 py-1.5 text-xs font-medium shadow-xl backdrop-blur-md">
                <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Live
              </div>
            </div>
            <div className="absolute -bottom-4 -left-4 hidden sm:block">
              <div className="rounded-full border border-border/60 bg-background/85 px-3.5 py-1.5 text-xs font-medium shadow-xl backdrop-blur-md">
                <Heart className="mr-1 inline-block h-3 w-3 text-red-400" />
                89 submissions
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

// ============================================================================
// Features
// ============================================================================

const features = [
  {
    icon: Bot,
    title: "Characters with depth",
    description:
      "Full character editor — backstory, personality, scenarios, example dialogues. Not a boring form. A real tool built for creators.",
    accent: "violet",
    imagePlaceholder: true,
  },
  {
    icon: FileText,
    title: "Forms that actually work",
    description:
      "Custom sections, field types, validation, your own style. Share with a link, get submissions straight to your board.",
    accent: "cyan",
    imagePlaceholder: true,
  },
  {
    icon: Kanban,
    title: "Visual submission boards",
    description:
      "Drag, drop, change status, add notes. Kanban-style management for your submissions. See everything at a glance.",
    accent: "amber",
    imagePlaceholder: true,
  },
  {
    icon: Users,
    title: "Real collaboration",
    description:
      "Invite other creators to work on a character together. Roles, permissions, live activity. No more copy-pasting through Discord.",
    accent: "emerald",
    imagePlaceholder: true,
  },
  {
    icon: Shield,
    title: "Built-in moderation",
    description:
      "Content filters, custom blocklists, flagged submission reviews. You decide what gets through and what doesn't.",
    accent: "rose",
    imagePlaceholder: true,
  },
  {
    icon: Globe,
    title: "Your creator page",
    description:
      "One link to share your whole portfolio — characters, forms, socials. Like a personal website but made for creators.",
    accent: "sky",
    imagePlaceholder: true,
  },
];

const accentStyles: Record<
  string,
  {
    bg: string;
    text: string;
    glow: string;
    ring: string;
  }
> = {
  violet: {
    bg: "bg-violet-500/10",
    text: "text-violet-400",
    glow: "group-hover:shadow-violet-500/10",
    ring: "group-hover:ring-violet-500/20",
  },
  cyan: {
    bg: "bg-cyan-500/10",
    text: "text-cyan-400",
    glow: "group-hover:shadow-cyan-500/10",
    ring: "group-hover:ring-cyan-500/20",
  },
  amber: {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    glow: "group-hover:shadow-amber-500/10",
    ring: "group-hover:ring-amber-500/20",
  },
  emerald: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    glow: "group-hover:shadow-emerald-500/10",
    ring: "group-hover:ring-emerald-500/20",
  },
  rose: {
    bg: "bg-rose-500/10",
    text: "text-rose-400",
    glow: "group-hover:shadow-rose-500/10",
    ring: "group-hover:ring-rose-500/20",
  },
  sky: {
    bg: "bg-sky-500/10",
    text: "text-sky-400",
    glow: "group-hover:shadow-sky-500/10",
    ring: "group-hover:ring-sky-500/20",
  },
};

function ImageLightbox({
  images,
  initialIndex,
  onClose,
}: {
  images: { src: string; alt: string }[];
  initialIndex: number;
  onClose: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const goNext = () => setCurrentIndex((prev) => (prev + 1) % images.length);
  const goPrev = () =>
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Lock body scroll + hide navbar
  useEffect(() => {
    document.body.style.overflow = "hidden";
    document.body.dataset.lightbox = "open";
    return () => {
      document.body.style.overflow = "";
      delete document.body.dataset.lightbox;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md"
      onClick={onClose}
    >
      {/* Hide navbar while lightbox is open */}
      <style>{`nav[data-landing-nav] { visibility: hidden !important; }`}</style>
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 cursor-pointer"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Counter */}
      <div className="absolute top-4 left-4 z-10 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white">
        {currentIndex + 1} / {images.length}
      </div>

      {/* Image container */}
      <div
        className="relative mx-14 flex h-[80vh] w-full max-w-5xl items-center justify-center sm:mx-20"
        onClick={(e) => e.stopPropagation()}
      >
        <Image
          src={images[currentIndex].src}
          alt={images[currentIndex].alt}
          fill
          className="object-contain"
          unoptimized
        />
      </div>

      {/* Prev button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          goPrev();
        }}
        className="absolute left-2 sm:left-4 z-10 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 cursor-pointer"
      >
        <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
      </button>

      {/* Next button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          goNext();
        }}
        className="absolute right-2 sm:right-4 z-10 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 cursor-pointer"
      >
        <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
      </button>

      {/* Thumbnail strip */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-2 rounded-full bg-black/50 p-2 backdrop-blur-md">
        {images.map((img, i) => (
          <button
            key={i}
            onClick={(e) => {
              e.stopPropagation();
              setCurrentIndex(i);
            }}
            className={cn(
              "relative h-10 w-10 sm:h-12 sm:w-12 overflow-hidden rounded-lg transition-all cursor-pointer",
              i === currentIndex
                ? "ring-2 ring-violet-400 scale-105"
                : "opacity-50 hover:opacity-80",
            )}
          >
            <Image
              src={img.src}
              alt={img.alt}
              fill
              className="object-cover"
              unoptimized
            />
          </button>
        ))}
      </div>
    </div>
  );
}

function FeatureCard({
  feature,
  index,
  onImageClick,
}: {
  feature: (typeof features)[number];
  index: number;
  onImageClick?: () => void;
}) {
  const accent = accentStyles[feature.accent] || accentStyles.violet;

  return (
    <FadeIn delay={index * 0.08} className="h-full">
      <div
        className={cn(
          "group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/80 p-6 transition-all duration-500",
          "hover:border-border/80 hover:bg-card hover:shadow-2xl hover:ring-1",
          accent.glow,
          accent.ring,
        )}
      >
        {/* Subtle gradient on hover */}
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{
            background: `radial-gradient(ellipse at 50% 0%, ${feature.accent === "violet" ? "rgba(124,58,237,0.04)" : feature.accent === "cyan" ? "rgba(6,182,212,0.04)" : feature.accent === "amber" ? "rgba(245,158,11,0.04)" : feature.accent === "emerald" ? "rgba(16,185,129,0.04)" : feature.accent === "rose" ? "rgba(244,63,94,0.04)" : "rgba(14,165,233,0.04)"} 0%, transparent 70%)`,
          }}
        />

        {/* Image — clickable to open lightbox */}
        {feature.imagePlaceholder && (
          <button
            type="button"
            onClick={onImageClick}
            className="relative mb-4 h-40 overflow-hidden rounded-xl border border-border/60 bg-background/70 cursor-pointer group/image"
          >
            <Image
              src={`/landing/feature-${feature.accent}.jpg`}
              alt={feature.title}
              fill
              className="object-cover transition-transform duration-300 group-hover/image:scale-105"
              unoptimized
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover/image:bg-black/30">
              <Maximize2 className="h-6 w-6 text-white opacity-0 transition-opacity group-hover/image:opacity-100" />
            </div>
          </button>
        )}

        <div
          className={cn(
            "relative mb-3 flex h-10 w-10 items-center justify-center rounded-xl",
            accent.bg,
          )}
        >
          <feature.icon className={cn("h-5 w-5", accent.text)} />
        </div>
        <h3 className="relative text-lg font-semibold">{feature.title}</h3>
        <p className="relative mt-2 flex-1 text-sm leading-relaxed text-muted-foreground/70">
          {feature.description}
        </p>
      </div>
    </FadeIn>
  );
}

function Features() {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const imageFeatures = features.filter((f) => f.imagePlaceholder);
  const lightboxImages = imageFeatures.map((f) => ({
    src: `/landing/feature-${f.accent}.jpg`,
    alt: f.title,
  }));

  return (
    <section id="features" className="relative py-24 sm:py-32">
      {/* Divider */}
      <div className="absolute top-0 left-1/2 h-px w-[80%] max-w-xl -translate-x-1/2 bg-linear-to-r from-transparent via-white/8 to-transparent" />

      <div className="mx-auto max-w-6xl px-5">
        <FadeIn className="text-center">
          <Badge
            variant="outline"
            className="mb-4 border-violet-500/30 bg-violet-500/8 text-xs uppercase tracking-wide text-violet-400"
          >
            <Sparkles className="mr-1 h-3 w-3" />
            Everything you need
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Not another generic tool
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground/70 sm:text-lg">
            JanitorForge was built specifically for character creators. Every
            feature exists because someone actually needed it.
          </p>
        </FadeIn>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => {
            const imageIdx = imageFeatures.indexOf(feature);
            return (
              <FeatureCard
                key={feature.title}
                feature={feature}
                index={i}
                onImageClick={
                  feature.imagePlaceholder
                    ? () => setLightboxIndex(imageIdx)
                    : undefined
                }
              />
            );
          })}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <ImageLightbox
          images={lightboxImages}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </section>
  );
}

// ============================================================================
// How It Works
// ============================================================================

const steps = [
  {
    num: "01",
    title: "Create your account",
    description:
      "Pick a username and a PIN. No lengthy sign-ups, no email verification loops. You're in within 30 seconds.",
    icon: Zap,
    accent: "violet",
  },
  {
    num: "02",
    title: "Build your workspace",
    description:
      "Design characters, craft forms, set up your creator page. Everything has an interface that just makes sense.",
    icon: Palette,
    accent: "cyan",
  },
  {
    num: "03",
    title: "Share and receive",
    description:
      "Drop your link wherever your audience is. Submissions roll in, you manage them on the board. No extra apps needed.",
    icon: Send,
    accent: "amber",
  },
];

function HowItWorks() {
  return (
    <section id="how" className="relative py-24 sm:py-32">
      {/* Background accent */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute left-1/2 top-1/2 h-150 w-200 -translate-x-1/2 -translate-y-1/2 opacity-[0.04]"
          style={{
            background: "radial-gradient(ellipse, #06b6d4 0%, transparent 60%)",
            filter: "blur(60px)",
          }}
        />
      </div>

      {/* Top divider */}
      <div className="absolute top-0 left-1/2 h-px w-[80%] max-w-xl -translate-x-1/2 bg-linear-to-r from-transparent via-white/8 to-transparent" />

      <div className="relative mx-auto max-w-6xl px-5">
        <FadeIn className="text-center">
          <Badge
            variant="outline"
            className="mb-4 border-cyan-500/30 bg-cyan-500/8 text-xs uppercase tracking-wide text-cyan-400"
          >
            <ArrowRight className="mr-1 h-3 w-3" />
            Three steps
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            It&rsquo;s really that simple
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground/70 sm:text-lg">
            If you can post on social media, you can use JanitorForge.
            Seriously.
          </p>
        </FadeIn>

        <div className="mt-16 grid gap-10 md:grid-cols-3">
          {steps.map((step, i) => (
            <FadeIn key={step.num} delay={i * 0.12} className="relative">
              {/* Connector */}
              {i < steps.length - 1 && (
                <div className="absolute left-[calc(50%+2.5rem)] top-8 hidden h-px w-[calc(100%-5rem)] bg-linear-to-r from-border/70 to-transparent md:block" />
              )}

              <div className="flex flex-col items-center text-center">
                <div className="relative mb-6">
                  <div
                    className={cn(
                      "flex h-16 w-16 items-center justify-center rounded-2xl border border-border/60",
                      step.accent === "violet" && "bg-violet-500/8",
                      step.accent === "cyan" && "bg-cyan-500/8",
                      step.accent === "amber" && "bg-amber-500/8",
                    )}
                  >
                    <step.icon
                      className={cn("h-7 w-7", {
                        "text-violet-400": step.accent === "violet",
                        "text-cyan-400": step.accent === "cyan",
                        "text-amber-400": step.accent === "amber",
                      })}
                    />
                  </div>
                  <span className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full border border-border/60 bg-background/90 text-[11px] font-bold text-muted-foreground">
                    {step.num}
                  </span>
                </div>
                <h3 className="text-xl font-semibold">{step.title}</h3>
                <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground/70">
                  {step.description}
                </p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// Showcase
// ============================================================================

function Showcase() {
  return (
    <section id="showcase" className="relative py-24 sm:py-32">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-40 left-1/2 h-175 w-225 -translate-x-1/2 opacity-[0.06]"
          style={{
            background: "radial-gradient(ellipse, #7c3aed 0%, transparent 55%)",
            filter: "blur(80px)",
          }}
        />
      </div>

      {/* Top divider */}
      <div className="absolute top-0 left-1/2 h-px w-[80%] max-w-xl -translate-x-1/2 bg-linear-to-r from-transparent via-white/8 to-transparent" />

      <div className="relative mx-auto max-w-6xl px-5">
        <FadeIn className="text-center">
          <Badge
            variant="outline"
            className="mb-4 border-amber-500/30 bg-amber-500/8 text-xs uppercase tracking-wide text-amber-400"
          >
            <Eye className="mr-1 h-3 w-3" />
            See it live
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Looks as good as it works
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground/70 sm:text-lg">
            Your forms, your creator page, your dashboard. Everything looks
            polished out of the box — no design skills needed.
          </p>
        </FadeIn>

        <div className="mt-16 grid gap-6 lg:grid-cols-2">
          {/* Public form mockup */}
          <FadeIn direction="left">
            <div className="group overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-[0_0_60px_-16px_rgba(124,58,237,0.12)] transition-all duration-500 hover:shadow-[0_0_80px_-12px_rgba(124,58,237,0.2)]">
              <div className="flex items-center gap-2 border-b border-border/60 bg-background/70 px-4 py-3">
                <div className="flex gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]/60" />
                  <div className="h-2.5 w-2.5 rounded-full bg-[#febc2e]/60" />
                  <div className="h-2.5 w-2.5 rounded-full bg-[#28c840]/60" />
                </div>
                <span className="ml-2 font-mono text-[11px] text-muted-foreground">
                  janitorforge.vercel.app/form/open-commissions
                </span>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold">Open Commissions</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Fill out this form to request a commission. Please read the
                  rules before submitting.
                </p>

                <div className="mt-5 space-y-4">
                  {[
                    { label: "Your name", value: "Luna Starlight" },
                    { label: "Commission type", value: "Digital portrait" },
                  ].map((field) => (
                    <div key={field.label} className="space-y-1.5">
                      <label className="text-sm font-medium">
                        {field.label}
                      </label>
                      <div className="h-10 rounded-lg border border-border/60 bg-background/70 px-3 flex items-center">
                        <span className="text-sm text-muted-foreground/50">
                          {field.value}
                        </span>
                      </div>
                    </div>
                  ))}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Description</label>
                    <div className="h-20 rounded-lg border border-border/60 bg-background/70 px-3 py-2">
                      <span className="text-sm text-muted-foreground/50 leading-relaxed">
                        I'd like a portrait of my OC with a sunset background,
                        anime style...
                      </span>
                    </div>
                  </div>
                  <div className="h-11 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 flex items-center justify-center font-medium text-white text-sm shadow-lg shadow-violet-600/20">
                    Submit request
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>

          {/* Creator page mockup */}
          <FadeIn direction="right">
            <div className="group overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-[0_0_60px_-16px_rgba(16,185,129,0.08)] transition-all duration-500 hover:shadow-[0_0_80px_-12px_rgba(16,185,129,0.14)]">
              <div className="flex items-center gap-2 border-b border-border/60 bg-background/70 px-4 py-3">
                <div className="flex gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]/60" />
                  <div className="h-2.5 w-2.5 rounded-full bg-[#febc2e]/60" />
                  <div className="h-2.5 w-2.5 rounded-full bg-[#28c840]/60" />
                </div>
                <span className="ml-2 font-mono text-[11px] text-muted-foreground">
                  janitorforge.vercel.app/luna-creates
                </span>
              </div>
              <div className="p-6">
                {/* Banner placeholder */}
                <div className="mb-4 flex h-28 items-center justify-center overflow-hidden rounded-xl border border-dashed border-border/60 bg-linear-to-br from-violet-500/6 via-fuchsia-500/4 to-cyan-500/6">
                  <div className="text-center">
                    <Palette className="mx-auto h-5 w-5 text-muted-foreground/30" />
                    <p className="mt-1 font-mono text-[10px] text-muted-foreground/30">
                      [Creator banner image]
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-lg font-bold text-white shadow-lg shadow-violet-500/20">
                    L
                  </div>
                  <div>
                    <h3 className="font-bold">Luna Creates</h3>
                    <p className="text-xs text-muted-foreground">
                      Digital artist & character designer
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  I make characters and digital commissions. If you want to work
                  with me, fill out the form below ✨
                </p>

                <div className="mt-4 flex gap-2">
                  <span className="rounded-full bg-violet-500/10 px-2.5 py-1 text-xs text-violet-400 font-medium">
                    12 characters
                  </span>
                  <span className="rounded-full bg-cyan-500/10 px-2.5 py-1 text-xs text-cyan-400 font-medium">
                    4 forms
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  {["Aria", "Kai", "Nova"].map((name) => (
                    <div
                      key={name}
                      className="flex h-20 flex-col items-center justify-center rounded-lg border border-border/60 bg-background/70"
                    >
                      {/* Image placeholder for bot thumbnails */}
                      <span className="font-mono text-[10px] text-muted-foreground/40">
                        [Bot]
                      </span>
                      <span className="mt-1 text-[9px] text-muted-foreground/30">
                        {name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// Testimonial
// ============================================================================

// function Testimonial() {
//   return (
//     <section className="py-20 sm:py-28">
//       <FadeIn>
//         <div className="mx-auto max-w-3xl px-5">
//           <div className="relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 sm:p-10">
//             <Quote className="absolute top-6 left-6 h-8 w-8 text-violet-500/20" />
//             <blockquote className="relative text-lg sm:text-xl leading-relaxed text-foreground/90 font-medium">
//               &ldquo;I used to juggle between Google Forms, Notion boards, and
//               Discord DMs to manage my commissions. JanitorForge replaced all of
//               that. It just works.&rdquo;
//             </blockquote>
//             <div className="mt-6 flex items-center gap-3">
//               <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-sm font-bold text-white">
//                 S
//               </div>
//               <div>
//                 <p className="text-sm font-semibold">Sakura</p>
//                 <p className="text-xs text-muted-foreground/50">
//                   Character artist, 200+ commissions
//                 </p>
//               </div>
//             </div>
//           </div>
//         </div>
//       </FadeIn>
//     </section>
//   );
// }

// ============================================================================
// CTA
// ============================================================================

function CTA() {
  return (
    <section className="relative py-24 sm:py-32">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute left-1/2 top-1/2 h-125 w-175 -translate-x-1/2 -translate-y-1/2 opacity-[0.08]"
          style={{
            background: "radial-gradient(ellipse, #7c3aed 0%, transparent 50%)",
            filter: "blur(60px)",
          }}
        />
      </div>

      {/* Top divider */}
      <div className="absolute top-0 left-1/2 h-px w-[80%] max-w-xl -translate-x-1/2 bg-linear-to-r from-transparent via-white/8 to-transparent" />

      <FadeIn className="relative mx-auto max-w-3xl px-5 text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
          Stop winging it
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground/70 sm:text-lg">
          You don't need three different apps to do one thing. Create your
          account in seconds and start building your creator space.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link href="/login">
            <Button
              size="lg"
              className="group cursor-pointer bg-linear-to-r from-violet-600 to-purple-600 px-8 text-base shadow-2xl shadow-violet-600/25 transition-all duration-300 hover:from-violet-500 hover:to-purple-500"
            >
              Create my account
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
        </div>
        <p className="mt-5 text-xs text-muted-foreground/40">
          Free. No credit card. No catch. Start whenever you're ready.
        </p>
      </FadeIn>
    </section>
  );
}

// ============================================================================
// Footer
// ============================================================================

function Footer() {
  return (
    <footer className="border-t border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto max-w-6xl px-5 py-12">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <Image
              src="/logo.png"
              alt="JanitorForge (Beta)"
              width={24}
              height={24}
              className="rounded"
            />
            <span className="font-semibold text-sm">JanitorForge (Beta)</span>
          </div>

          <div className="flex gap-6 text-sm text-muted-foreground">
            <a
              href="#features"
              className="transition-colors hover:text-foreground"
            >
              Features
            </a>
            <a href="#how" className="transition-colors hover:text-foreground">
              How it works
            </a>
            <Link
              href="/login"
              className="transition-colors hover:text-foreground"
            >
              Sign in
            </Link>
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground/40">
            <Link
              href="/terms"
              className="transition-colors hover:text-foreground"
            >
              Terms
            </Link>
            <Link
              href="/privacy"
              className="transition-colors hover:text-foreground"
            >
              Privacy
            </Link>
            <span>© {new Date().getFullYear()} JanitorForge (Beta).</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ============================================================================
// Main Landing Page
// ============================================================================

export function LandingPage() {
  return (
    <div className="relative min-h-screen bg-background text-foreground antialiased">
      <NoiseOverlay />
      <Navbar />
      <main className="relative z-[2]">
        <Hero />
        <Features />
        <HowItWorks />
        <Showcase />
        {/* <Testimonial /> */}
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
