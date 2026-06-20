import Link from "next/link";
import { Bot, ArrowLeft, Home, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-lg w-full text-center space-y-8">
        {/* Animated bot icon */}
        <div className="relative mx-auto w-32 h-32">
          <div className="absolute inset-0 rounded-full bg-primary/10 animate-pulse" />
          <div className="absolute inset-2 rounded-full bg-primary/5" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Bot className="h-16 w-16 text-primary/60" />
          </div>
          {/* Floating question marks */}
          <div className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-amber-500/20 flex items-center justify-center animate-bounce">
            <span className="text-amber-500 text-sm font-bold">?</span>
          </div>
          <div className="absolute -bottom-1 -left-3 h-6 w-6 rounded-full bg-rose-500/20 flex items-center justify-center animate-bounce [animation-delay:0.3s]">
            <span className="text-rose-500 text-xs font-bold">?</span>
          </div>
        </div>

        {/* Error code */}
        <div>
          <h1 className="text-7xl sm:text-8xl font-extrabold tracking-tight bg-gradient-to-br from-primary via-primary/70 to-primary/40 bg-clip-text text-transparent">
            404
          </h1>
          <div className="mt-3 h-1 w-20 mx-auto rounded-full bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        </div>

        {/* Message */}
        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">
            Page not found
          </h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
            The page you're looking for doesn't exist, has been moved, or is no
            longer available. Maybe the bot took a wrong turn?
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/">
            <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors cursor-pointer shadow-lg shadow-primary/20">
              <Home className="h-4 w-4" />
              Go Home
            </button>
          </Link>
          <Link href="/login">
            <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border bg-background text-foreground font-medium text-sm hover:bg-muted transition-colors cursor-pointer">
              <Search className="h-4 w-4" />
              Sign In
            </button>
          </Link>
        </div>

        {/* Decorative footer */}
        <p className="text-xs text-muted-foreground/50 pt-4">
          JanitorForge — Bot Creator Toolkit
        </p>
      </div>
    </div>
  );
}
