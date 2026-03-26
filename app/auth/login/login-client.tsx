"use client";

import { useState } from "react";
import { LoginFlow } from "@ory/client-fetch";
import { KratosForm } from "@/components/auth/kratos-form";
import { WebAuthnScript } from "@/components/auth/webauthn-script";
import { getNodeByName, getNodesByGroup } from "@/lib/auth/ory-flow-utils";
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
import { Separator } from "@/components/ui/separator";
import { Eye, EyeOff, ShieldCheck, Mail, Key, Fingerprint } from "lucide-react";
import Link from "next/link";

interface LoginClientProps {
  flow: LoginFlow;
}

export function LoginClient({ flow }: LoginClientProps) {
  const [showPassword, setShowPassword] = useState(false);
  const groups = getNodesByGroup(flow.ui.nodes);

  const identifierNode = getNodeByName(flow.ui.nodes, "identifier");
  const passwordNode = getNodeByName(flow.ui.nodes, "password");
  const totpNode = getNodeByName(flow.ui.nodes, "totp_code");
  const lookupNode = getNodeByName(flow.ui.nodes, "lookup_secret");
  const codeNode = getNodeByName(flow.ui.nodes, "code");

  const hasPassword = !!groups.password;
  const hasOidc = !!groups.oidc;
  const hasCode = !!groups.code;
  const hasWebAuthn = !!groups.webauthn;
  const hasPasskey = !!groups.passkey;
  const hasTotp = !!groups.totp;
  const hasLookup = !!groups.lookup_secret;

  const is2FA = hasTotp || hasLookup;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      {/* Inject WebAuthn/Passkey scripts if present */}
      <WebAuthnScript nodes={flow.ui.nodes} />

      <div className="w-full max-w-sm space-y-6">
        {/* Brand */}
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            {is2FA ? "Two-factor authentication" : "Welcome back"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {is2FA
              ? "Verify your identity to continue"
              : "Sign in to your account to continue"}
          </p>
        </div>

        <Card>
          <KratosForm
            action={flow.ui.action}
            nodes={flow.ui.nodes}
            messages={flow.ui.messages}
          >
            {/* ── 2FA: TOTP ── */}
            {hasTotp && (
              <>
                <CardHeader className="pb-4">
                  <CardTitle className="text-base">Authenticator app</CardTitle>
                  <CardDescription>
                    Enter the 6-digit code from your app
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {totpNode && (
                    <div className="space-y-2">
                      <Label htmlFor="totp_code">One-time code</Label>
                      <Input
                        id="totp_code"
                        name="totp_code"
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        autoFocus
                        maxLength={6}
                        placeholder="000000"
                        className="tracking-widest text-center text-lg font-mono"
                      />
                      {totpNode.messages.map((msg, i) => (
                        <p key={i} className="text-xs text-destructive">
                          {msg}
                        </p>
                      ))}
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex flex-col gap-3 pt-2">
                  <Button
                    type="submit"
                    name="method"
                    value="totp"
                    className="w-full"
                  >
                    Verify code
                  </Button>
                </CardFooter>
              </>
            )}

            {/* ── 2FA: Lookup Secret (backup codes) ── */}
            {!hasTotp && hasLookup && (
              <>
                <CardHeader className="pb-4">
                  <CardTitle className="text-base">Backup code</CardTitle>
                  <CardDescription>
                    Enter one of your recovery backup codes
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {lookupNode && (
                    <div className="space-y-2">
                      <Label htmlFor="lookup_secret">Backup code</Label>
                      <Input
                        id="lookup_secret"
                        name="lookup_secret"
                        type="text"
                        autoComplete="off"
                        autoFocus
                        placeholder="xxxxx-xxxxx"
                        className="font-mono"
                      />
                      {lookupNode.messages.map((msg, i) => (
                        <p key={i} className="text-xs text-destructive">
                          {msg}
                        </p>
                      ))}
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex flex-col gap-3 pt-2">
                  <Button
                    type="submit"
                    name="method"
                    value="lookup_secret"
                    className="w-full"
                  >
                    Use backup code
                  </Button>
                </CardFooter>
              </>
            )}

            {/* ── Primary methods ── */}
            {!is2FA && (
              <>
                <CardHeader className="pb-4">
                  <CardTitle className="text-base">Sign in</CardTitle>
                  <CardDescription>
                    Choose how you&apos;d like to sign in
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Shared identifier (used by password + code) */}
                  {identifierNode && (hasPassword || hasCode) && (
                    <div className="space-y-2">
                      <Label htmlFor="identifier">
                        {identifierNode.label ?? "Email or Username"}
                      </Label>
                      <Input
                        id="identifier"
                        name="identifier"
                        type="text"
                        autoComplete="username email"
                        autoFocus
                        defaultValue={identifierNode.value}
                        disabled={identifierNode.disabled}
                        placeholder="you@example.com"
                      />
                      {identifierNode.messages.map((msg, i) => (
                        <p key={i} className="text-xs text-destructive">
                          {msg}
                        </p>
                      ))}
                    </div>
                  )}

                  {/* Password */}
                  {hasPassword && passwordNode && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password">
                          {passwordNode.label ?? "Password"}
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
                          defaultValue={passwordNode.value}
                          disabled={passwordNode.disabled}
                          placeholder="••••••••"
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          aria-label={
                            showPassword ? "Hide password" : "Show password"
                          }
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      {passwordNode.messages.map((msg, i) => (
                        <p key={i} className="text-xs text-destructive">
                          {msg}
                        </p>
                      ))}
                    </div>
                  )}

                  {/* Code (OTP) — code input stage (after identifier submitted) */}
                  {hasCode && codeNode && (
                    <div className="space-y-2">
                      <Label htmlFor="code">One-time code</Label>
                      <Input
                        id="code"
                        name="code"
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        placeholder="000000"
                        maxLength={6}
                        className="tracking-widest text-center text-lg font-mono"
                      />
                      {codeNode.messages.map((msg, i) => (
                        <p key={i} className="text-xs text-destructive">
                          {msg}
                        </p>
                      ))}
                    </div>
                  )}
                </CardContent>

                <CardFooter className="flex flex-col gap-3 pt-2">
                  {/* Password submit */}
                  {hasPassword && (
                    <Button
                      type="submit"
                      name="method"
                      value="password"
                      className="w-full"
                    >
                      Sign in with password
                    </Button>
                  )}

                  {/* Code: request code (identifier stage) */}
                  {hasCode && !codeNode && (
                    <Button
                      type="submit"
                      name="method"
                      value="code"
                      variant="outline"
                      className="w-full"
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Send sign-in code
                    </Button>
                  )}

                  {/* Code: submit code */}
                  {hasCode && codeNode && (
                    <Button
                      type="submit"
                      name="method"
                      value="code"
                      className="w-full"
                    >
                      Verify code
                    </Button>
                  )}

                  {/* WebAuthn */}
                  {hasWebAuthn && (
                    <>
                      {(hasPassword || hasCode) && <Separator />}
                      <Button
                        type="submit"
                        name="method"
                        value="webauthn"
                        variant="outline"
                        className="w-full"
                        id="webauthn-button"
                      >
                        <Key className="h-4 w-4 mr-2" />
                        Use security key
                      </Button>
                    </>
                  )}

                  {/* Passkey */}
                  {hasPasskey && (
                    <>
                      {(hasPassword || hasCode || hasWebAuthn) && <Separator />}
                      <Button
                        type="submit"
                        name="method"
                        value="passkey"
                        variant="outline"
                        className="w-full"
                        id="passkey-button"
                      >
                        <Fingerprint className="h-4 w-4 mr-2" />
                        Use passkey
                      </Button>
                    </>
                  )}

                  {/* OIDC providers */}
                  {hasOidc && (
                    <>
                      {(hasPassword || hasCode || hasWebAuthn || hasPasskey) && (
                        <div className="relative my-1">
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
              </>
            )}
          </KratosForm>
        </Card>

        {!is2FA && (
          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link
              href="/auth/registration"
              className="font-medium text-primary hover:underline"
            >
              Create one
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
