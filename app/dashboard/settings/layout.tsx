import { ReactNode } from "react";
import Link from "next/link";
import { getServerSession } from "@ory/nextjs/app";
import { SettingsNav } from "./_components/settings-nav";
import { Separator } from "@/components/ui/separator";
import { isGlobalAdmin } from "@/lib/services/permission.service";
import { ChevronLeft, Shield } from "lucide-react";

export default async function SettingsLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession();
  const userId = session?.identity?.id;
  const hasAdminAccess = userId ? await isGlobalAdmin(userId) : false;

  return (
    <div className="container mx-auto max-w-5xl px-6 py-8">
      {/* Admin back link */}
      {hasAdminAccess && (
        <div className="mb-4">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            <Shield className="h-3.5 w-3.5" />
            Back to Admin Panel
          </Link>
        </div>
      )}

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
