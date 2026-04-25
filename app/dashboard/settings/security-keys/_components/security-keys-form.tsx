"use client";

import { SettingsFlow, UiNodeInputAttributes } from "@ory/client-fetch";
import { KratosForm } from "@/components/auth/kratos-form";
import { WebAuthnScript } from "@/components/auth/webauthn-script";
import { getInputNodes } from "@/lib/auth/ory-flow-utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Key, Plus, Trash2 } from "lucide-react";

interface SecurityKeysFormProps {
  flow: SettingsFlow;
}

export function SecurityKeysForm({ flow }: SecurityKeysFormProps) {
  const webauthnNodes = getInputNodes(flow.ui.nodes).filter(
    (n) => n.node.group === "webauthn",
  );
  const registerTrigger = webauthnNodes.find(
    (n) => n.name === "webauthn_register_trigger",
  );
  const removeButtons = webauthnNodes.filter((n) =>
    n.name.startsWith("webauthn_remove_"),
  );

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="border-b py-5">
        <CardTitle className="text-base">Security keys</CardTitle>
        <CardDescription>
          Manage hardware security keys (YubiKey, etc.) for your account.
        </CardDescription>
      </CardHeader>
      <CardContent className="py-6">
        {webauthnNodes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            WebAuthn security keys are not available for this account.
          </p>
        ) : (
          <>
            <WebAuthnScript nodes={flow.ui.nodes} />
            <KratosForm
              action={flow.ui.action}
              nodes={flow.ui.nodes.filter((n) => n.group === "webauthn" || n.group === "default")}
              messages={flow.ui.messages}
              className="space-y-6"
            >
              {removeButtons.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Registered keys</p>
                  {removeButtons.map((node) => {
                    const label =
                      node.label ??
                      node.name.replace("webauthn_remove_", "Key ");
                    return (
                      <div
                        key={node.name}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div className="flex items-center gap-3">
                          <Key className="h-4 w-4 text-muted-foreground" />
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

              {registerTrigger && (
                <Button
                  type="submit"
                  name="webauthn_register_trigger"
                  value={registerTrigger.value}
                  variant="outline"
                  id="webauthn-settings-register"
                  onClick={(e) => {
                    const onclick = (registerTrigger.node.attributes as UiNodeInputAttributes).onclick;
                    if (onclick) {
                      e.preventDefault();
                      // eslint-disable-next-line no-new-func
                      new Function(onclick)();
                    }
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add security key
                </Button>
              )}
            </KratosForm>
          </>
        )}
      </CardContent>
    </Card>
  );
}
