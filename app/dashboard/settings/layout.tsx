import { ReactNode } from "react";
import { SettingsNav } from "./_components/settings-nav";
import { Separator } from "@/components/ui/separator";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="container mx-auto max-w-5xl px-6 py-8">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Update account preferences and manage integrations.
        </p>
      </div>

      <Separator className="mb-6" />

      {/* Two-column layout: left nav + right content */}
      <div className="flex gap-10">
        <SettingsNav />
        <div className="flex-1 min-w-0">
          {children}
        </div>
      </div>
    </div>
  );
}
