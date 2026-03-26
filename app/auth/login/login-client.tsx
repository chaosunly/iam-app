"use client";

import { useState } from "react";
import { LoginFlow } from "@ory/client-fetch";
import { KratosForm } from "@/components/auth/kratos-form";
import { getNodeByName } from "@/lib/auth/ory-flow-utils";
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
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import Link from "next/link";

interface LoginClientProps {
  flow: LoginFlow;
}

export function LoginClient({ flow }: LoginClientProps) {
  const [showPassword, setShowPassword] = useState(false);

  const identifierNode = getNodeByName(flow.ui.nodes, "identifier");
  const passwordNode = getNodeByName(flow.ui.nodes, "password");

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo / Brand */}
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
          <p className="text-sm text-muted-foreground">
            Sign in to your account to continue
          </p>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Sign in</CardTitle>
            <CardDescription>
              Enter your credentials below to access your account
            </CardDescription>
          </CardHeader>

          <KratosForm
            action={flow.ui.action}
            nodes={flow.ui.nodes}
            messages={flow.ui.messages}
          >
            <CardContent className="space-y-4">
              {/* Identifier (email / username) */}
              <div className="space-y-2">
                <Label htmlFor="identifier">
                  {identifierNode?.label ?? "Email or Username"}
                </Label>
                <Input
                  id="identifier"
                  name="identifier"
                  type="text"
                  autoComplete="username email"
                  autoFocus
                  defaultValue={identifierNode?.value}
                  disabled={identifierNode?.disabled}
                  placeholder="you@example.com"
                  aria-describedby={
                    identifierNode?.messages.length
                      ? "identifier-error"
                      : undefined
                  }
                />
                {identifierNode?.messages.map((msg, i) => (
                  <p
                    key={i}
                    id="identifier-error"
                    className="text-xs text-destructive"
                  >
                    {msg}
                  </p>
                ))}
              </div>

              {/* Password */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">
                    {passwordNode?.label ?? "Password"}
                  </Label>
                  <Link
                    href="/auth/recovery"
                    className="text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    defaultValue={passwordNode?.value}
                    disabled={passwordNode?.disabled}
                    placeholder="••••••••"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {passwordNode?.messages.map((msg, i) => (
                  <p key={i} className="text-xs text-destructive">
                    {msg}
                  </p>
                ))}
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3 pt-2">
              <Button type="submit" name="method" value="password" className="w-full">
                Sign in
              </Button>
            </CardFooter>
          </KratosForm>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link
            href="/auth/registration"
            className="font-medium text-primary hover:underline"
          >
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
