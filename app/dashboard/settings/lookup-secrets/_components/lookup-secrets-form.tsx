"use client";

import { SettingsFlow } from "@ory/client-fetch";
import { KratosForm } from "@/components/auth/kratos-form";
import { getNodeByName, getTextNodes } from "@/lib/auth/ory-flow-utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, AlertTriangle, Eye } from "lucide-react";

interface LookupSecretsFormProps {
  flow: SettingsFlow;
}

export function LookupSecretsForm({ flow }: LookupSecretsFormProps) {
  const regenerateNode = getNodeByName(
    flow.ui.nodes,
    "lookup_secret_regenerate",
  );
  const revealNode = getNodeByName(flow.ui.nodes, "lookup_secret_reveal");
  const disableNode = getNodeByName(flow.ui.nodes, "lookup_secret_disable");
  // Backup codes arrive as text nodes after reveal/generate
  const codeTextNodes = getTextNodes(flow.ui.nodes).filter(
    (n) => (n.attributes as { id?: string }).id === "lookup_secret_codes",
  );

  const hasBackupCodes = !!regenerateNode || !!revealNode || !!disableNode;

  if (!hasBackupCodes) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Backup codes</h2>
          <p className="text-sm text-muted-foreground">
            Backup codes are not available for this account.
          </p>
        </div>
        <Separator />
      </div>
    );
  }

  const codes: string[] = codeTextNodes.flatMap((n) => {
    const text =
      (n.attributes as { text?: { text: string } }).text?.text ?? "";
    return text.split(/\s+/).filter(Boolean);
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Backup codes</h2>
        <p className="text-sm text-muted-foreground">
          Use backup codes to access your account if you lose your authenticator
          device.
        </p>
      </div>

      <Separator />

      <KratosForm
        action={flow.ui.action}
        nodes={flow.ui.nodes.filter((n) => n.group === "lookup_secret" || n.group === "default")}
        messages={flow.ui.messages}
        className="space-y-6"
      >
        {/* Show revealed codes */}
        {codes.length > 0 && (
          <div className="space-y-3">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Save these codes now. They will not be shown again.
              </AlertDescription>
            </Alert>
            <div className="grid grid-cols-2 gap-2 rounded-lg border p-4 font-mono text-sm">
              {codes.map((code, i) => (
                <span
                  key={i}
                  className="text-center py-1 px-2 rounded bg-muted"
                >
                  {code}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          {regenerateNode && (
            <Button
              type="submit"
              name="lookup_secret_regenerate"
              value="true"
              variant="outline"
            >
              <Shield className="h-4 w-4 mr-2" />
              {codes.length > 0 ? "Regenerate codes" : "Generate backup codes"}
            </Button>
          )}

          {revealNode && codes.length === 0 && (
            <Button
              type="submit"
              name="lookup_secret_reveal"
              value="true"
              variant="outline"
            >
              <Eye className="h-4 w-4 mr-2" />
              Reveal existing codes
            </Button>
          )}

          {disableNode && (
            <Button
              type="submit"
              name="lookup_secret_disable"
              value="true"
              variant="destructive"
            >
              Disable backup codes
            </Button>
          )}
        </div>
      </KratosForm>
    </div>
  );
}
