"use client";

import { useState } from "react";
import { RegistrationFlow } from "@ory/client-fetch";
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

interface RegistrationClientProps {
  flow: RegistrationFlow;
}

export function RegistrationClient({ flow }: RegistrationClientProps) {
  const [showPassword, setShowPassword] = useState(false);

  const emailNode = getNodeByName(flow.ui.nodes, "traits.email");
  const passwordNode = getNodeByName(flow.ui.nodes, "password");
  const firstNameNode = getNodeByName(flow.ui.nodes, "traits.name.first");
  const lastNameNode = getNodeByName(flow.ui.nodes, "traits.name.last");

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Brand */}
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Create an account</h1>
          <p className="text-sm text-muted-foreground">
            Enter your details below to get started
          </p>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Register</CardTitle>
            <CardDescription>Fill in the form to create your account</CardDescription>
          </CardHeader>

          <KratosForm
            action={flow.ui.action}
            nodes={flow.ui.nodes}
            messages={flow.ui.messages}
          >
            <CardContent className="space-y-4">
              {/* Name fields — show only if present in this Kratos schema */}
              {(firstNameNode || lastNameNode) && (
                <div className="grid grid-cols-2 gap-3">
                  {firstNameNode && (
                    <div className="space-y-2">
                      <Label htmlFor="traits.name.first">First name</Label>
                      <Input
                        id="traits.name.first"
                        name="traits.name.first"
                        type="text"
                        autoComplete="given-name"
                        defaultValue={firstNameNode.value}
                        placeholder="Jane"
                      />
                      {firstNameNode.messages.map((msg, i) => (
                        <p key={i} className="text-xs text-destructive">{msg}</p>
                      ))}
                    </div>
                  )}
                  {lastNameNode && (
                    <div className="space-y-2">
                      <Label htmlFor="traits.name.last">Last name</Label>
                      <Input
                        id="traits.name.last"
                        name="traits.name.last"
                        type="text"
                        autoComplete="family-name"
                        defaultValue={lastNameNode.value}
                        placeholder="Doe"
                      />
                      {lastNameNode.messages.map((msg, i) => (
                        <p key={i} className="text-xs text-destructive">{msg}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Email */}
              {emailNode && (
                <div className="space-y-2">
                  <Label htmlFor="traits.email">Email</Label>
                  <Input
                    id="traits.email"
                    name="traits.email"
                    type="email"
                    autoComplete="email"
                    autoFocus={!firstNameNode}
                    defaultValue={emailNode.value}
                    placeholder="you@example.com"
                  />
                  {emailNode.messages.map((msg, i) => (
                    <p key={i} className="text-xs text-destructive">{msg}</p>
                  ))}
                </div>
              )}

              {/* Password */}
              {passwordNode && (
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      defaultValue={passwordNode.value}
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
                  {passwordNode.messages.map((msg, i) => (
                    <p key={i} className="text-xs text-destructive">{msg}</p>
                  ))}
                </div>
              )}
            </CardContent>

            <CardFooter className="flex flex-col gap-3 pt-2">
              <Button type="submit" name="method" value="password" className="w-full">
                Create account
              </Button>
            </CardFooter>
          </KratosForm>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/auth/login"
            className="font-medium text-primary hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
