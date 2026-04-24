"use client";

import { SettingsFlow } from "@ory/client-fetch";
import { KratosForm } from "@/components/auth/kratos-form";
import { getNodeByName } from "@/lib/auth/ory-flow-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

interface ProfileFormProps {
  flow: SettingsFlow;
}

export function ProfileForm({ flow }: ProfileFormProps) {
  const firstNameNode = getNodeByName(flow.ui.nodes, "traits.name.first");
  const lastNameNode = getNodeByName(flow.ui.nodes, "traits.name.last");
  const emailNode = getNodeByName(flow.ui.nodes, "traits.email");
  const usernameNode = getNodeByName(flow.ui.nodes, "traits.username");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Profile</h2>
        <p className="text-sm text-muted-foreground">
          Update your profile details.
        </p>
      </div>

      <Separator />

      <KratosForm
        action={flow.ui.action}
        nodes={flow.ui.nodes.filter((n) => n.group === "profile" || n.group === "default")}
        messages={flow.ui.messages}
        className="space-y-6"
      >
        {/* Name */}
        {(firstNameNode || lastNameNode) && (
          <div className="space-y-2">
            <Label>Name</Label>
            <div className="grid grid-cols-2 gap-3">
              {firstNameNode && (
                <div>
                  <Input
                    id="traits.name.first"
                    name="traits.name.first"
                    type="text"
                    autoComplete="given-name"
                    defaultValue={firstNameNode.value}
                    placeholder="First name"
                  />
                  {firstNameNode.messages.map((msg, i) => (
                    <p key={i} className="text-xs text-destructive mt-1">{msg}</p>
                  ))}
                </div>
              )}
              {lastNameNode && (
                <div>
                  <Input
                    id="traits.name.last"
                    name="traits.name.last"
                    type="text"
                    autoComplete="family-name"
                    defaultValue={lastNameNode.value}
                    placeholder="Last name"
                  />
                  {lastNameNode.messages.map((msg, i) => (
                    <p key={i} className="text-xs text-destructive mt-1">{msg}</p>
                  ))}
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              This is the name that will be displayed on your profile and in emails.
            </p>
          </div>
        )}

        {/* Username */}
        {usernameNode && (
          <div className="space-y-2">
            <Label htmlFor="traits.username">Username</Label>
            <Input
              id="traits.username"
              name="traits.username"
              type="text"
              autoComplete="username"
              defaultValue={usernameNode.value}
              placeholder="your-username"
            />
            {usernameNode.messages.map((msg, i) => (
              <p key={i} className="text-xs text-destructive">{msg}</p>
            ))}
            <p className="text-xs text-muted-foreground">
              This is your public display name. It can be your real name or a pseudonym.
            </p>
          </div>
        )}

        {/* Email */}
        {emailNode && (
          <div className="space-y-2">
            <Label htmlFor="traits.email">Email</Label>
            <Input
              id="traits.email"
              name="traits.email"
              type="email"
              autoComplete="email"
              defaultValue={emailNode.value}
              placeholder="you@example.com"
            />
            {emailNode.messages.map((msg, i) => (
              <p key={i} className="text-xs text-destructive">{msg}</p>
            ))}
            <p className="text-xs text-muted-foreground">
              You can manage verified email addresses in your email settings.
            </p>
          </div>
        )}

        <div className="pt-2">
          <Button type="submit" name="method" value="profile">
            Update profile
          </Button>
        </div>
      </KratosForm>
    </div>
  );
}
