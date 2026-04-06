"use client";

import { useState } from "react";
import { RegistrationFlow } from "@ory/client-fetch";
import { KratosForm } from "@/components/auth/kratos-form";
import { WebAuthnScript } from "@/components/auth/webauthn-script";
import { getNodeByName, getNodesByGroup } from "@/lib/auth/ory-flow-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Eye, EyeOff, ShieldCheck, Fingerprint, Key, Mail } from "lucide-react";
import Link from "next/link";

interface RegistrationClientProps {
  flow: RegistrationFlow;
}

export function RegistrationClient({ flow }: RegistrationClientProps) {
  const [showPassword, setShowPassword] = useState(false);

  const groups = getNodesByGroup(flow.ui.nodes);
  const firstNameNode = getNodeByName(flow.ui.nodes, "traits.name.first");
  const lastNameNode = getNodeByName(flow.ui.nodes, "traits.name.last");
  const usernameNode = getNodeByName(flow.ui.nodes, "traits.username");
  const emailNode = getNodeByName(flow.ui.nodes, "traits.email");
  const passwordNode = getNodeByName(flow.ui.nodes, "password");
  const codeNode = getNodeByName(flow.ui.nodes, "code");

  const hasPassword = !!groups.password;
  const hasCode = !!groups.code;
  const hasOidc = !!groups.oidc;
  const hasPasskey = !!groups.passkey;
  const hasWebAuthn = !!groups.webauthn;
  // Kratos v1.2+ two-step registration: step 1 uses the 'profile' group.
  // With enable_legacy_one_step: true this is absent; kept as fallback.
  const hasProfile = !!groups.profile;
  const isProfileOnlyStep =
    hasProfile && !hasPassword && !hasCode && !hasPasskey && !hasWebAuthn;

  // Step 2 of code flow: Kratos sent the OTP and is now waiting for it
  const isCodeVerifyStep = hasCode && !!codeNode;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <WebAuthnScript nodes={flow.ui.nodes} />

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
            <CardDescription>
              Fill in the form or use a provider below
            </CardDescription>
          </CardHeader>

          {/*
           * Single KratosForm = single <form action={flow.ui.action}>.
           * All inputs and submit buttons live inside it so the CSRF token
           * hidden field is always included on submission.
           */}
          <KratosForm
            action={flow.ui.action}
            nodes={flow.ui.nodes}
            messages={flow.ui.messages}
          >
            <CardContent className="space-y-4">
              {/* Name fields (default group) */}
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

              {/* Email (default group) */}
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

              {/* Username (optional trait) */}
              {usernameNode && (
                <div className="space-y-2">
                  <Label htmlFor="traits.username">Username</Label>
                  <Input
                    id="traits.username"
                    name="traits.username"
                    type="text"
                    autoComplete="username"
                    defaultValue={usernameNode.value}
                    placeholder="janedoe"
                  />
                  {usernameNode.messages.map((msg, i) => (
                    <p key={i} className="text-xs text-destructive">{msg}</p>
                  ))}
                </div>
              )}

              {/* Password (password group) */}
              {hasPassword && passwordNode && (
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
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

              {/* Code OTP input — step 2: Kratos sent the code, waiting for entry */}
              {isCodeVerifyStep && codeNode && (
                <div className="space-y-2">
                  <Label htmlFor="code">Verification code</Label>
                  <Input
                    id="code"
                    name="code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    autoFocus
                    placeholder="000000"
                    maxLength={6}
                    className="tracking-widest text-center text-lg font-mono"
                  />
                  {codeNode.messages.map((msg, i) => (
                    <p key={i} className="text-xs text-destructive">{msg}</p>
                  ))}
                </div>
              )}
            </CardContent>

            <CardFooter className="flex flex-col gap-3 pt-2">
              {/* Two-step profile step: Kratos v1.2+ without enable_legacy_one_step */}
              {isProfileOnlyStep && (
                <>
                  <p className="text-xs text-center text-muted-foreground -mb-1">
                    Step 1 of 2 — enter your details to continue
                  </p>
                  <Button
                    type="submit"
                    name="method"
                    value="profile"
                    className="w-full"
                  >
                    Continue
                  </Button>
                </>
              )}

              {/* Password submit */}
              {hasPassword && (
                <Button
                  type="submit"
                  name="method"
                  value="password"
                  className="w-full"
                >
                  Create account
                </Button>
              )}

              {/* Code step 1: request the verification code */}
              {hasCode && !isCodeVerifyStep && (
                <Button
                  type="submit"
                  name="method"
                  value="code"
                  className="w-full"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Create account
                </Button>
              )}

              {/* Code step 2: submit the OTP */}
              {isCodeVerifyStep && (
                <Button
                  type="submit"
                  name="method"
                  value="code"
                  className="w-full"
                >
                  Verify & create account
                </Button>
              )}

              {/* WebAuthn */}
              {hasWebAuthn && (
                <Button
                  type="submit"
                  name="method"
                  value="webauthn"
                  variant="outline"
                  className="w-full"
                  id="webauthn-register-button"
                >
                  <Key className="h-4 w-4 mr-2" />
                  Register with security key
                </Button>
              )}

              {/* Passkey */}
              {hasPasskey && (
                <Button
                  type="submit"
                  name="method"
                  value="passkey"
                  variant="outline"
                  className="w-full"
                  id="passkey-register-button"
                >
                  <Fingerprint className="h-4 w-4 mr-2" />
                  Register with passkey
                </Button>
              )}

              {/* OIDC providers */}
              {hasOidc && (
                <>
                  {(hasPassword || hasCode || hasWebAuthn || hasPasskey) && (
                    <div className="relative w-full my-1">
                      <Separator />
                      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                        or
                      </span>
                    </div>
                  )}
                  {(groups.oidc ?? [])
                    .filter((n) => n.type === "input")
                    .map((node) => {
                      const attrs = node.attributes as {
                        name: string;
                        value: string;
                      };
                      const label = node.meta?.label?.text ?? attrs.value;
                      return (
                        <Button
                          key={attrs.value}
                          type="submit"
                          name={attrs.name}
                          value={attrs.value}
                          variant="outline"
                          className="w-full"
                        >
                          {label}
                        </Button>
                      );
                    })}
                </>
              )}
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
