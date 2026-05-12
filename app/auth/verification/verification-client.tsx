"use client";

import { VerificationFlow } from "@ory/client-fetch";
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

interface VerificationClientProps {
  flow: VerificationFlow;
}

export function VerificationClient({ flow }: VerificationClientProps) {
  const codeNode = getNodeByName(flow.ui.nodes, "code");
  const emailNode = getNodeByName(flow.ui.nodes, "email");

  // State: either asking for email or for the code
  const isCodeStage = !!codeNode;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <Image src="/rexform-logo.png" alt="REXFORM" width={140} height={27} className="dark:invert" priority />
          <h1 className="text-2xl font-bold tracking-tight">
            {isCodeStage ? "Check your inbox" : "Verify your email"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isCodeStage
              ? "Enter the verification code we sent you"
              : "Enter your email to receive a verification code"}
          </p>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Email verification</CardTitle>
            <CardDescription>
              {isCodeStage
                ? "The code expires in a few minutes"
                : "We'll send a code to confirm ownership"}
            </CardDescription>
          </CardHeader>

          <KratosForm
            action={flow.ui.action}
            nodes={flow.ui.nodes}
            messages={flow.ui.messages}
          >
            <CardContent className="space-y-4">
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

              {codeNode && (
                <div className="space-y-2">
                  <Label htmlFor="code">Verification code</Label>
                  <Input
                    id="code"
                    name="code"
                    type="text"
                    inputMode="numeric"
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
              <Button
                type="submit"
                name="method"
                value="code"
                className="w-full"
              >
                {isCodeStage ? "Verify email" : "Send verification code"}
              </Button>
            </CardFooter>
          </KratosForm>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          <Link
            href="/dashboard"
            className="font-medium text-primary hover:underline"
          >
            Skip for now
          </Link>
        </p>
      </div>
    </div>
  );
}
