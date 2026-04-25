"use client";

import { useState } from "react";
import { SettingsFlow } from "@ory/client-fetch";
import { KratosForm } from "@/components/auth/kratos-form";
import { getNodeByName } from "@/lib/auth/ory-flow-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface PasswordFormProps {
  flow: SettingsFlow;
}

export function PasswordForm({ flow }: PasswordFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const passwordNode = getNodeByName(flow.ui.nodes, "password");

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="border-b py-5">
        <CardTitle className="text-base">Password</CardTitle>
        <CardDescription>Change your account password.</CardDescription>
      </CardHeader>
      <CardContent className="py-6">
        {!passwordNode ? (
          <p className="text-sm text-muted-foreground">
            Password management is not enabled for this account.
          </p>
        ) : (
          <KratosForm
            action={flow.ui.action}
            nodes={flow.ui.nodes.filter((n) => n.group === "password" || n.group === "default")}
            messages={flow.ui.messages}
            className="space-y-6"
          >
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <div className="relative max-w-sm">
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
              <p className="text-xs text-muted-foreground">
                Use at least 8 characters including a number and a symbol.
              </p>
            </div>

            <div className="pt-2">
              <Button type="submit" name="method" value="password">
                Update password
              </Button>
            </div>
          </KratosForm>
        )}
      </CardContent>
    </Card>
  );
}
