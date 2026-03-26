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
import { Eye, EyeOff, ShieldCheck, Fingerprint, Key } from "lucide-react";
import Link from "next/link";

interface RegistrationClientProps {
  flow: RegistrationFlow;
}

export function RegistrationClient({ flow }: RegistrationClientProps) {
  const [showPassword, setShowPassword] = useState(false);
  const groups = getNodesByGroup(flow.ui.nodes);

  const emailNode = getNodeByName(flow.ui.nodes, "traits.email");
  const passwordNode = getNodeByName(flow.ui.nodes, "password");
  const firstNameNode = getNodeByName(flow.ui.nodes, "traits.name.first");
  const lastNameNode = getNodeByName(flow.ui.nodes, "traits.name.last");

  const hasPassword = !!groups.password;
  const hasOidc = !!groups.oidc;
  const hasPasskey = !!groups.passkey;
  const hasWebAuthn = !!groups.webauthn;
  const hasCredentialMethod = hasPassword || hasWebAuthn || hasPasskey;

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

          {/* ── Email / Password section ── */}
          {hasCredentialMethod ? (
            /* Kratos returned password nodes — submit normally */
            <KratosForm
              action={flow.ui.action}
              nodes={flow.ui.nodes}
              messages={flow.ui.messages}
            >
              <CardContent className="space-y-4">
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

                {hasPassword && passwordNode && (
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
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {passwordNode.messages.map((msg, i) => (
                      <p key={i} className="text-xs text-destructive">{msg}</p>
                    ))}
                  </div>
                )}
              </CardContent>

              <CardFooter className="flex flex-col gap-3 pt-2">
                {hasPassword && (
                  <Button type="submit" name="method" value="password" className="w-full">
                    Create account
                  </Button>
                )}
                {hasWebAuthn && (
                  <>
                    {hasPassword && <Separator />}
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
                  </>
                )}
                {hasPasskey && (
                  <>
                    {(hasPassword || hasWebAuthn) && <Separator />}
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
                  </>
                )}

                {/* OIDC separator + buttons */}
                {hasOidc && (
                  <>
                    <div className="relative my-1">
                      <Separator />
                      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                        or
                      </span>
                    </div>
                    {(groups.oidc ?? [])
                      .filter((n) => n.type === "input")
                      .map((node) => {
                        const attrs = node.attributes as { name: string; value: string };
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
          ) : (
            /* Kratos returned OIDC-only flow (OAuth2 challenge context).
               Show the form visually but wire "Create account" to a fresh flow.
               Wire the OIDC button to the current Kratos flow. */
            <>
              {/* Email / password — static form that starts a fresh Kratos flow */}
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">First name</Label>
                    <Input
                      id="first_name"
                      type="text"
                      autoComplete="given-name"
                      placeholder="Jane"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Last name</Label>
                    <Input
                      id="last_name"
                      type="text"
                      autoComplete="family-name"
                      placeholder="Doe"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    autoFocus
                    placeholder="you@example.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password_direct">Password</Label>
                  <div className="relative">
                    <Input
                      id="password_direct"
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
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex flex-col gap-3 pt-2">
                {/* Navigate to a fresh registration browser flow */}
                <a href="/self-service/registration/browser" className="w-full">
                  <Button type="button" className="w-full">
                    Create account
                  </Button>
                </a>

                {/* "or" divider */}
                <div className="relative w-full my-1">
                  <Separator />
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                    or
                  </span>
                </div>

                {/* OIDC via current Kratos flow */}
                <KratosForm
                  action={flow.ui.action}
                  nodes={flow.ui.nodes}
                  messages={flow.ui.messages}
                  className="w-full"
                >
                  {(groups.oidc ?? [])
                    .filter((n) => n.type === "input")
                    .map((node) => {
                      const attrs = node.attributes as { name: string; value: string };
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
                </KratosForm>
              </CardFooter>
            </>
          )}
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
