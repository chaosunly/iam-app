"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { RecoveryFlow } from "@ory/client-fetch";
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
import Link from "next/link";
import Image from "next/image";

interface RecoveryClientProps {
  flow: RecoveryFlow;
}

export function RecoveryClient({ flow }: RecoveryClientProps) {
  const router = useRouter();

  const isExpiredFlow = (flow.ui.messages ?? []).some(
    (msg) =>
      msg.id === 4000001 ||
      (typeof msg.text === "string" && msg.text.toLowerCase().includes("expired")),
  );

  useEffect(() => {
    if (isExpiredFlow) {
      router.replace("/auth/recovery");
    }
  }, [isExpiredFlow, router]);

  if (isExpiredFlow) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm">Starting a new session&hellip;</p>
        </div>
      </div>
    );
  }

  const emailNode = getNodeByName(flow.ui.nodes, "email");
  const codeNode = getNodeByName(flow.ui.nodes, "code");

  // Determine what stage we're at
  const isCodeStage = !!codeNode;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <Image src="/rexform-logo.png" alt="REXFORM" width={140} height={27} className="dark:invert" priority />
          <h1 className="text-2xl font-bold tracking-tight">Reset password</h1>
          <p className="text-sm text-muted-foreground">
            {isCodeStage
              ? "Enter the code we sent to your email"
              : "Enter your email and we'll send you a recovery link"}
          </p>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">
              {isCodeStage ? "Enter recovery code" : "Account recovery"}
            </CardTitle>
            <CardDescription>
              {isCodeStage
                ? "Check your inbox for the 6-digit code"
                : "We'll email you a recovery link or code"}
            </CardDescription>
          </CardHeader>

          <KratosForm
            action={flow.ui.action}
            nodes={flow.ui.nodes}
            messages={flow.ui.messages}
          >
            <CardContent className="space-y-4">
              {/* Email stage */}
              {emailNode && (
                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    autoFocus
                    defaultValue={emailNode.value}
                    placeholder="you@example.com"
                  />
                  {emailNode.messages.map((msg, i) => (
                    <p key={i} className="text-xs text-destructive">{msg}</p>
                  ))}
                </div>
              )}

              {/* Code stage */}
              {codeNode && (
                <div className="space-y-2">
                  <Label htmlFor="code">Recovery code</Label>
                  <Input
                    id="code"
                    name="code"
                    type="text"
                    autoComplete="one-time-code"
                    autoFocus
                    defaultValue={codeNode.value}
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
              {!isCodeStage && (
                <Button
                  type="submit"
                  name="method"
                  value="code"
                  className="w-full"
                >
                  Send recovery email
                </Button>
              )}
              {isCodeStage && (
                <Button
                  type="submit"
                  name="method"
                  value="code"
                  className="w-full"
                >
                  Verify code
                </Button>
              )}
            </CardFooter>
          </KratosForm>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          Remember your password?{" "}
          <Link
            href="/auth/login"
            className="font-medium text-primary hover:underline"
          >
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
