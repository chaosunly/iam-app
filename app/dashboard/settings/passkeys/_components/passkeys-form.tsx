"use client";

import { SettingsFlow, UiNodeInputAttributes } from "@ory/client-fetch";
import { KratosForm } from "@/components/auth/kratos-form";
import { WebAuthnScript } from "@/components/auth/webauthn-script";
import { getInputNodes } from "@/lib/auth/ory-flow-utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Fingerprint, Plus, Trash2 } from "lucide-react";

interface PasskeysFormProps {
  flow: SettingsFlow;
}

export function PasskeysForm({ flow }: PasskeysFormProps) {
  const passkeyNodes = getInputNodes(flow.ui.nodes).filter(
    (n) => n.node.group === "passkey",
  );
  const createButton = passkeyNodes.find(
    (n) => n.name === "passkey_register_trigger",
  );
  const removeButtons = passkeyNodes.filter((n) =>
    n.name === "passkey_remove" || n.name.startsWith("passkey_remove_"),
  );

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="border-b py-5">
        <CardTitle className="text-base">Passkeys</CardTitle>
        <CardDescription>
          Manage passkeys (Face ID, Windows Hello, Touch ID) for passwordless
          sign-in.
        </CardDescription>
      </CardHeader>
      <CardContent className="py-6">
        {passkeyNodes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Passkeys are not available for this account.
          </p>
        ) : (
          <>
            <WebAuthnScript nodes={flow.ui.nodes} />
            <KratosForm
              action={flow.ui.action}
              nodes={flow.ui.nodes.filter((n) => n.group === "passkey" || n.group === "default")}
              messages={flow.ui.messages}
              className="space-y-6"
            >
              {removeButtons.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Registered passkeys</p>
                  {removeButtons.map((node) => {
                    const label =
                      node.label ??
                      (node.name.includes("_remove_")
                        ? node.name.replace("passkey_remove_", "Passkey ")
                        : "Passkey");
                    return (
                      <div
                        key={node.value || node.name}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div className="flex items-center gap-3">
                          <Fingerprint className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{label}</span>
                        </div>
                        <Button
                          type="submit"
                          name={node.name}
                          value={node.value}
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}

              {createButton && (
                <Button
                  type="button"
                  name="passkey_register_trigger"
                  value={createButton.value}
                  variant="outline"
                  id="passkey-settings-create"
                  onClick={() => {
                    const onclick = (createButton.node.attributes as UiNodeInputAttributes).onclick;
                    if (onclick) {
                      try {
                        // eslint-disable-next-line no-new-func
                        new Function(onclick)();
                      } catch (err) {
                        console.error("[Passkey] Registration script error:", err);
                      }
                    }
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add passkey
                </Button>
              )}
            </KratosForm>
          </>
        )}
      </CardContent>
    </Card>
  );
}
