"use client";

import { SettingsFlow } from "@ory/client-fetch";
import { KratosForm } from "@/components/auth/kratos-form";
import { getNodeByName, getImageNodes, getTextNodes } from "@/lib/auth/ory-flow-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, Info } from "lucide-react";

interface TotpFormProps {
  flow: SettingsFlow;
}

export function TotpForm({ flow }: TotpFormProps) {
  const totpCodeNode = getNodeByName(flow.ui.nodes, "totp_code");
  const totpUnlinkNode = getNodeByName(flow.ui.nodes, "totp_unlink");
  const qrNodes = getImageNodes(flow.ui.nodes);
  const secretNodes = getTextNodes(flow.ui.nodes).filter(
    (n) => (n.attributes as { id?: string }).id === "totp_secret_key",
  );
  const qrNode = qrNodes[0];
  const secretNode = secretNodes[0];

  const isSetup = !!qrNode;
  const isEnabled = !!totpUnlinkNode;

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="border-b py-5">
        <CardTitle className="text-base">Two-factor authentication</CardTitle>
        <CardDescription>
          {isEnabled
            ? "TOTP authentication is enabled on your account."
            : "Add an extra layer of security with an authenticator app."}
        </CardDescription>
      </CardHeader>
      <CardContent className="py-6">
        {!totpCodeNode && !isEnabled ? (
          <p className="text-sm text-muted-foreground">
            TOTP is not available for this account.
          </p>
        ) : (
          <KratosForm
            action={flow.ui.action}
            nodes={flow.ui.nodes.filter((n) => n.group === "totp" || n.group === "default")}
            messages={flow.ui.messages}
            className="space-y-6"
          >
            {isSetup && (
              <div className="space-y-4">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Scan the QR code with your authenticator app (Google
                    Authenticator, Authy, etc.), then enter the 6-digit code to
                    confirm.
                  </AlertDescription>
                </Alert>

                {qrNode && (
                  <div className="flex justify-center">
                    <div className="rounded-lg border p-3 bg-white">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={(qrNode.attributes as { src: string }).src}
                        alt="TOTP QR code"
                        width={160}
                        height={160}
                      />
                    </div>
                  </div>
                )}

                {secretNode && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">
                      Manual entry key:
                    </p>
                    <code className="block rounded bg-muted px-3 py-2 text-xs font-mono break-all">
                      {
                        (
                          secretNode.attributes as {
                            text?: { text: string };
                          }
                        ).text?.text
                      }
                    </code>
                  </div>
                )}

                {totpCodeNode && (
                  <div className="space-y-2">
                    <Label htmlFor="totp_code">Verification code</Label>
                    <Input
                      id="totp_code"
                      name="totp_code"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      placeholder="000000"
                      className="max-w-40 tracking-widest text-center font-mono"
                    />
                    {totpCodeNode.messages.map((msg, i) => (
                      <p key={i} className="text-xs text-destructive">
                        {msg}
                      </p>
                    ))}
                  </div>
                )}

                <Button type="submit" name="method" value="totp">
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  Enable TOTP
                </Button>
              </div>
            )}

            {isEnabled && !isSetup && (
              <div className="space-y-4">
                <Alert>
                  <ShieldCheck className="h-4 w-4" />
                  <AlertDescription>
                    TOTP is active. Removing it will disable two-factor
                    authentication.
                  </AlertDescription>
                </Alert>
                <Button
                  type="submit"
                  name="totp_unlink"
                  value="true"
                  variant="destructive"
                >
                  Remove TOTP
                </Button>
              </div>
            )}
          </KratosForm>
        )}
      </CardContent>
    </Card>
  );
}
