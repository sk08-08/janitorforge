"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import Image from "next/image";
import {
  loginWithPin,
  registerUser,
  checkUsernameAvailability,
} from "@/features/auth/actions/auth";
import { FeedbackActions } from "@/features/feedback/components/feedback-actions";
import { cn } from "@/lib/utils";
import Link from "next/link";

// ----------------------------------------------------------------------------
// Username validation rules (client-side mirror of server)
// ----------------------------------------------------------------------------

interface UsernameRule {
  label: string;
  test: (username: string) => boolean;
}

const usernameRules: UsernameRule[] = [
  {
    label: "3–30 characters long",
    test: (u) => u.length >= 3 && u.length <= 30,
  },
  {
    label: "Only letters, numbers, hyphens, underscores",
    test: (u) => /^[a-z0-9_-]*$/.test(u),
  },
  {
    label: "Starts with a letter or number",
    test: (u) => u.length === 0 || /^[a-z0-9]/.test(u),
  },
];

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Login form
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPin, setLoginPin] = useState("");

  // Register form
  const [regUsername, setRegUsername] = useState("");
  const [regPin, setRegPin] = useState("");
  const [regPinConfirm, setRegPinConfirm] = useState("");

  // Username availability state
  const [usernameStatus, setUsernameStatus] = useState<
    "idle" | "checking" | "available" | "taken" | "invalid"
  >("idle");
  const [usernameMessage, setUsernameMessage] = useState("");
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastChecked = useRef("");

  // Tab state (for programmatic switching)
  const [activeTab, setActiveTab] = useState("login");

  // Debounced username check
  const checkUsername = useCallback(async (username: string) => {
    const clean = username.toLowerCase().trim();

    // Client-side validation first
    if (clean.length === 0) {
      setUsernameStatus("idle");
      setUsernameMessage("");
      return;
    }

    const failedRule = usernameRules.find((r) => !r.test(clean));
    if (failedRule) {
      setUsernameStatus("invalid");
      setUsernameMessage(failedRule.label);
      return;
    }

    // Avoid re-checking the same value
    if (clean === lastChecked.current) return;

    setUsernameStatus("checking");
    setUsernameMessage("Checking availability...");

    try {
      const result = await checkUsernameAvailability(clean);
      lastChecked.current = clean;

      if (result.available) {
        setUsernameStatus("available");
        setUsernameMessage(`"${clean}" is available!`);
      } else {
        setUsernameStatus("taken");
        setUsernameMessage(result.error || "This username is already taken");
      }
    } catch {
      setUsernameStatus("idle");
      setUsernameMessage("");
    }
  }, []);

  // Debounce effect for register username
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (regUsername.length < 3) {
      setUsernameStatus(regUsername.length > 0 ? "invalid" : "idle");
      if (regUsername.length > 0) {
        const failedRule = usernameRules.find((r) => !r.test(regUsername));
        setUsernameMessage(
          failedRule?.label || "Username must be at least 3 characters",
        );
      } else {
        setUsernameMessage("");
      }
      lastChecked.current = "";
      return;
    }

    debounceTimer.current = setTimeout(() => {
      checkUsername(regUsername);
    }, 500);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [regUsername, checkUsername]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const result = await loginWithPin(loginUsername, loginPin);

    if (result.success) {
      router.push("/");
      router.refresh();
    } else {
      setError(result.error || "Error al iniciar sesion");
    }

    setIsLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (regPin !== regPinConfirm) {
      setError("PINs do not match");
      return;
    }

    if (regPin.length !== 4 || !/^\d+$/.test(regPin)) {
      setError("PIN must be 4 numeric digits");
      return;
    }

    if (usernameStatus === "taken") {
      setError("This username is already taken. Please choose another.");
      return;
    }

    setIsLoading(true);

    const result = await registerUser(regUsername, regPin);

    if (result.success) {
      // registerUser already signs in and sets session cookie
      router.push("/");
      router.refresh();
    } else {
      setError(result.error || "Error registering");
    }

    setIsLoading(false);
  };

  const handlePinInput = (value: string, setter: (v: string) => void) => {
    // Only allow digits, max 4
    const cleaned = value.replace(/\D/g, "").slice(0, 4);
    setter(cleaned);
  };

  // Username requirement checklist for register
  const usernameChecklist =
    regUsername.length > 0
      ? usernameRules.map((rule) => ({
          label: rule.label,
          passed: rule.test(regUsername.toLowerCase().trim()),
        }))
      : [];

  // PIN validation states
  const pinValid = regPin.length === 4 && /^\d{4}$/.test(regPin);
  const pinsMatch =
    regPin.length > 0 && regPinConfirm.length > 0 && regPin === regPinConfirm;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <Link href="/">
            <Image
              src="/logo.png"
              alt="JanitorForge Logo"
              width={54}
              height={54}
            />
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">JanitorForge</h1>
          <p className="text-sm text-muted-foreground">
            Bot creators control panel
          </p>
        </div>

        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <CardHeader className="pb-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Sign In</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>
            </CardHeader>

            {/* ===== LOGIN TAB ===== */}
            <TabsContent value="login">
              <form onSubmit={handleLogin}>
                <CardContent className="space-y-4">
                  <CardDescription className="text-center">
                    Enter your username and 4-digit PIN
                  </CardDescription>

                  <div className="space-y-2">
                    <Label htmlFor="login-username">Username</Label>
                    <Input
                      id="login-username"
                      type="text"
                      placeholder="username"
                      value={loginUsername}
                      onChange={(e) =>
                        setLoginUsername(e.target.value.toLowerCase().trim())
                      }
                      autoComplete="username"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-pin">PIN</Label>
                    <Input
                      id="login-pin"
                      type="password"
                      inputMode="numeric"
                      placeholder="****"
                      value={loginPin}
                      onChange={(e) =>
                        handlePinInput(e.target.value, setLoginPin)
                      }
                      maxLength={4}
                      className="text-center text-2xl tracking-[0.5em]"
                      autoComplete="current-password"
                      required
                    />
                  </div>

                  {error && (
                    <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                      <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                      <p className="text-sm text-destructive">{error}</p>
                    </div>
                  )}
                </CardContent>

                <CardFooter className="flex flex-col gap-3 py-4">
                  <Button
                    type="submit"
                    className="w-full cursor-pointer"
                    disabled={
                      isLoading || !loginUsername || loginPin.length !== 4
                    }
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      "Sign In"
                    )}
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    Don't have an account?{" "}
                    <button
                      type="button"
                      className="text-primary hover:underline cursor-pointer font-medium"
                      onClick={() => setActiveTab("register")}
                    >
                      Register here
                    </button>
                  </p>
                </CardFooter>
              </form>
            </TabsContent>

            {/* ===== REGISTER TAB ===== */}
            <TabsContent value="register">
              <form onSubmit={handleRegister}>
                <CardContent className="space-y-4">
                  <CardDescription className="text-center">
                    Create your account with a unique username and 4-digit PIN
                  </CardDescription>

                  {/* Username field with availability feedback */}
                  <div className="space-y-2">
                    <Label htmlFor="reg-username">Username</Label>
                    <div className="relative">
                      <Input
                        id="reg-username"
                        type="text"
                        placeholder="choose a username"
                        value={regUsername}
                        onChange={(e) =>
                          setRegUsername(e.target.value.toLowerCase().trim())
                        }
                        autoComplete="username"
                        className={cn(
                          "pr-10 transition-colors",
                          usernameStatus === "available" &&
                            "border-emerald-500 focus-visible:ring-emerald-500/30",
                          usernameStatus === "taken" &&
                            "border-destructive focus-visible:ring-destructive/30",
                          usernameStatus === "invalid" &&
                            "border-amber-500 focus-visible:ring-amber-500/30",
                        )}
                        required
                      />
                      {/* Status icon */}
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {usernameStatus === "checking" && (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        )}
                        {usernameStatus === "available" && (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        )}
                        {usernameStatus === "taken" && (
                          <XCircle className="h-4 w-4 text-destructive" />
                        )}
                        {usernameStatus === "invalid" && (
                          <AlertCircle className="h-4 w-4 text-amber-500" />
                        )}
                      </div>
                    </div>

                    {/* Status message */}
                    {usernameMessage && (
                      <p
                        className={cn(
                          "text-xs flex items-center gap-1",
                          usernameStatus === "available" && "text-emerald-600",
                          usernameStatus === "taken" && "text-destructive",
                          usernameStatus === "invalid" && "text-amber-600",
                          usernameStatus === "checking" &&
                            "text-muted-foreground",
                        )}
                      >
                        {usernameMessage}
                      </p>
                    )}

                    {/* Username taken → switch to Sign In */}
                    {usernameStatus === "taken" && (
                      <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 p-2.5">
                        <p className="text-xs text-muted-foreground flex-1">
                          Already have an account?
                        </p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs cursor-pointer"
                          onClick={() => {
                            setLoginUsername(regUsername);
                            setActiveTab("login");
                            setError("");
                          }}
                        >
                          Sign In
                          <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                      </div>
                    )}

                    {/* Requirements checklist */}
                    {usernameChecklist.length > 0 && (
                      <div className="space-y-1">
                        {usernameChecklist.map((item, i) => (
                          <div
                            key={i}
                            className={cn(
                              "flex items-center gap-1.5 text-[11px]",
                              item.passed
                                ? "text-emerald-600"
                                : "text-muted-foreground",
                            )}
                          >
                            {item.passed ? (
                              <CheckCircle2 className="h-3 w-3 shrink-0" />
                            ) : (
                              <div className="h-3 w-3 rounded-full border border-muted-foreground/30 shrink-0" />
                            )}
                            {item.label}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* PIN field with validation */}
                  <div className="space-y-2">
                    <Label htmlFor="reg-pin">PIN</Label>
                    <div className="relative">
                      <Input
                        id="reg-pin"
                        type="password"
                        inputMode="numeric"
                        placeholder="****"
                        value={regPin}
                        onChange={(e) =>
                          handlePinInput(e.target.value, setRegPin)
                        }
                        maxLength={4}
                        className={cn(
                          "text-center text-2xl tracking-[0.5em] transition-colors",
                          pinValid &&
                            "border-emerald-500 focus-visible:ring-emerald-500/30",
                        )}
                        autoComplete="new-password"
                        required
                      />
                      {regPin.length > 0 && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          {pinValid ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <div className="text-xs text-muted-foreground font-mono">
                              {regPin.length}/4
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {pinValid
                        ? "PIN is valid"
                        : `Enter exactly 4 digits (${regPin.length}/4)`}
                    </p>
                  </div>

                  {/* PIN Confirm with match feedback */}
                  <div className="space-y-2">
                    <Label htmlFor="reg-pin-confirm">Confirm PIN</Label>
                    <div className="relative">
                      <Input
                        id="reg-pin-confirm"
                        type="password"
                        inputMode="numeric"
                        placeholder="****"
                        value={regPinConfirm}
                        onChange={(e) =>
                          handlePinInput(e.target.value, setRegPinConfirm)
                        }
                        maxLength={4}
                        className={cn(
                          "text-center text-2xl tracking-[0.5em] transition-colors",
                          pinsMatch &&
                            "border-emerald-500 focus-visible:ring-emerald-500/30",
                          regPinConfirm.length === 4 &&
                            !pinsMatch &&
                            "border-destructive focus-visible:ring-destructive/30",
                        )}
                        autoComplete="new-password"
                        required
                      />
                      {regPinConfirm.length > 0 && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          {pinsMatch ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          ) : regPinConfirm.length === 4 ? (
                            <XCircle className="h-4 w-4 text-destructive" />
                          ) : null}
                        </div>
                      )}
                    </div>
                    {regPinConfirm.length > 0 && (
                      <p
                        className={cn(
                          "text-[11px]",
                          pinsMatch ? "text-emerald-600" : "text-destructive",
                        )}
                      >
                        {pinsMatch ? "PINs match" : "PINs do not match"}
                      </p>
                    )}
                  </div>

                  {error && (
                    <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                      <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                      <p className="text-sm text-destructive">{error}</p>
                    </div>
                  )}
                </CardContent>

                <CardFooter className="flex flex-col gap-3 py-4">
                  <Button
                    type="submit"
                    className="w-full cursor-pointer"
                    disabled={
                      isLoading ||
                      !regUsername ||
                      !pinValid ||
                      !pinsMatch ||
                      usernameStatus === "taken" ||
                      usernameStatus === "checking"
                    }
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Registering...
                      </>
                    ) : (
                      "Create Account"
                    )}
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    Already have an account?{" "}
                    <button
                      type="button"
                      className="text-primary hover:underline cursor-pointer font-medium"
                      onClick={() => setActiveTab("login")}
                    >
                      Sign in
                    </button>
                  </p>
                </CardFooter>
              </form>
            </TabsContent>
          </Tabs>
        </Card>

        <div className="mt-4 flex justify-center">
          <FeedbackActions
            compact
            context={{
              sourcePage: "Login / Register",
              sourceLabel: "Login page",
              sourcePath: "/login",
            }}
          />
        </div>
      </div>
    </div>
  );
}
