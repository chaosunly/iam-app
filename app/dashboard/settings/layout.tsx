import { ReactNode } from "react";
import { Separator } from "@/components/ui/separator";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="container mx-auto max-w-2xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Update account preferences and manage integrations.
        </p>
      </div>
      <Separator className="mb-8" />
      {children}
    </div>
  );
}
