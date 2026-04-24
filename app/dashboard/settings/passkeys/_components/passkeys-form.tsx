"use client";

import { SettingsFlow, UiNodeInputAttributes } from "@ory/client-fetch";
import { KratosForm } from "@/components/auth/kratos-form";
import { WebAuthnScript } from "@/components/auth/webauthn-script";
import { getInputNodes } from "@/lib/auth/ory-flow-utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
    n.name.startsWith("passkey_remove_"),
  );

  if (passkeyNodes.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Passkeys</h2>
          <p className="text-sm text-muted-foreground">
            Passkeys are not available for this account.
          </p>
        </div>
        <Separator />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <WebAuthnScript nodes={flow.ui.nodes} />
      <div>
        <h2 className="text-lg font-semibold">Passkeys</h2>
        <p className="text-sm text-muted-foreground">
          Manage passkeys (Face ID, Windows Hello, Touch ID) for passwordless
          sign-in.
        </p>
      </div>

      <Separator />

      <KratosForm
        action={flow.ui.action}
        nodes={flow.ui.nodes.filter((n) => n.group === "passkey" || n.group === "default")}
        messages={flow.ui.messages}
        className="space-y-6"
      >
        {/* Registered passkeys */}
        {removeButtons.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Registered passkeys</p>
            {removeButtons.map((node) => {
              const label =
                node.label ??
                node.name.replace("passkey_remove_", "Passkey ");
              return (
                <div
                  key={node.name}
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

        {/* Add new passkey */}
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
                // eslint-disable-next-line no-new-func
                new Function(onclick)();
              }
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add passkey
          </Button>
        )}
      </KratosForm>
    </div>
  );
}
