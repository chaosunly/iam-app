"use client";

import { SettingsFlow } from "@ory/client-fetch";
import { KratosForm } from "@/components/auth/kratos-form";
import { getInputNodes } from "@/lib/auth/ory-flow-utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link2, Unlink } from "lucide-react";

interface ConnectedAppsProps {
  flow: SettingsFlow;
}

export function ConnectedApps({ flow }: ConnectedAppsProps) {
  const oidcNodes = getInputNodes(flow.ui.nodes).filter(
    (n) => n.name.startsWith("link:") || n.name.startsWith("unlink:"),
  );

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="border-b py-5">
        <CardTitle className="text-base">Connected Apps</CardTitle>
        <CardDescription>
          Manage third-party applications linked to your account.
        </CardDescription>
      </CardHeader>
      <CardContent className="py-6">
        {oidcNodes.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <Link2 className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-sm font-medium">No connected apps</p>
            <p className="text-xs text-muted-foreground mt-1">
              No third-party OAuth providers are configured.
            </p>
          </div>
        ) : (
          <KratosForm
            action={flow.ui.action}
            nodes={flow.ui.nodes.filter((n) => n.group === "oidc" || n.group === "default")}
            messages={flow.ui.messages}
            className="space-y-3"
          >
            {oidcNodes.map((node) => {
              const isLinked = node.name.startsWith("unlink:");
              const providerName = node.name.replace(/^(link|unlink):/, "");
              const displayName =
                providerName.charAt(0).toUpperCase() + providerName.slice(1);

              return (
                <div
                  key={node.name}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                      <Link2 className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{displayName}</p>
                      <p className="text-xs text-muted-foreground">
                        {isLinked ? "Connected" : "Not connected"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {isLinked && (
                      <Badge variant="secondary" className="text-xs">
                        Connected
                      </Badge>
                    )}
                    <Button
                      type="submit"
                      name={node.name}
                      value={node.value || providerName}
                      variant={isLinked ? "outline" : "default"}
                      size="sm"
                    >
                      {isLinked ? (
                        <>
                          <Unlink className="h-3 w-3 mr-1" />
                          Disconnect
                        </>
                      ) : (
                        <>
                          <Link2 className="h-3 w-3 mr-1" />
                          Connect
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </KratosForm>
        )}
      </CardContent>
    </Card>
  );
}
