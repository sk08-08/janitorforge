"use client";

import { useState } from "react";
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
import { Loader2 } from "lucide-react";
import Image from "next/image";
import { loginWithPin, registerUser } from "@/app/actions/auth";
import { FeedbackActions } from "@/components/feedback/feedback-actions";

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
      setError("Los PINs no coinciden");
      return;
    }

    if (regPin.length !== 4 || !/^\d+$/.test(regPin)) {
      setError("El PIN debe ser de 4 digitos numericos");
      return;
    }

    setIsLoading(true);

    const result = await registerUser(regUsername, regPin);

    if (result.success) {
      // Auto login after register
      const loginResult = await loginWithPin(regUsername, regPin);
      if (loginResult.success) {
        router.push("/");
        router.refresh();
      }
    } else {
      setError(result.error || "Error al registrar");
    }

    setIsLoading(false);
  };

  const handlePinInput = (value: string, setter: (v: string) => void) => {
    // Only allow digits, max 4
    const cleaned = value.replace(/\D/g, "").slice(0, 4);
    setter(cleaned);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Image
              src="/logo.png"
              alt="JanitorForge Logo"
              width={44}
              height={44}
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">JanitorForge</h1>
          <p className="text-sm text-muted-foreground">
            Bot creators control panel
          </p>
        </div>

        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <Tabs defaultValue="login">
            <CardHeader className="pb-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Sign In</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>
            </CardHeader>

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
                      onChange={(e) => setLoginUsername(e.target.value)}
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
                    <p className="text-center text-sm text-destructive">
                      {error}
                    </p>
                  )}
                </CardContent>

                <CardFooter className="py-4">
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
                </CardFooter>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleRegister}>
                <CardContent className="space-y-4">
                  <CardDescription className="text-center">
                    Create your account with a 4-digit PIN
                  </CardDescription>

                  <div className="space-y-2">
                    <Label htmlFor="reg-username">Username</Label>
                    <Input
                      id="reg-username"
                      type="text"
                      placeholder="username"
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value)}
                      autoComplete="username"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-pin">PIN</Label>
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
                      className="text-center text-2xl tracking-[0.5em]"
                      autoComplete="new-password"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-pin-confirm">Confirm PIN</Label>
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
                      className="text-center text-2xl tracking-[0.5em]"
                      autoComplete="new-password"
                      required
                    />
                  </div>

                  {error && (
                    <p className="text-center text-sm text-destructive">
                      {error}
                    </p>
                  )}
                </CardContent>

                <CardFooter className="py-4">
                  <Button
                    type="submit"
                    className="w-full cursor-pointer"
                    disabled={
                      isLoading ||
                      !regUsername ||
                      regPin.length !== 4 ||
                      regPinConfirm.length !== 4
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
