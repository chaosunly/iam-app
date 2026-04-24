"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { cn } from "@/lib/utils";
import {
  User,
  Lock,
  Link2,
  Settings2,
  ShieldCheck,
  KeyRound,
  Fingerprint,
  ListChecks,
} from "lucide-react";

const navItems = [
  {
    href: "/dashboard/settings/general",
    label: "General",
    icon: Settings2,
  },
  {
    href: "/dashboard/settings/profile",
    label: "Profile",
    icon: User,
  },
  {
    href: "/dashboard/settings/password",
    label: "Password",
    icon: Lock,
  },
  {
    href: "/dashboard/settings/totp",
    label: "Two-factor auth",
    icon: ShieldCheck,
  },
  {
    href: "/dashboard/settings/lookup-secrets",
    label: "Backup codes",
    icon: ListChecks,
  },
  {
    href: "/dashboard/settings/security-keys",
    label: "Security keys",
    icon: KeyRound,
  },
  {
    href: "/dashboard/settings/passkeys",
    label: "Passkeys",
    icon: Fingerprint,
  },
  {
    href: "/dashboard/settings/connected-apps",
    label: "Connected apps",
    icon: Link2,
  },
];

function SettingsNavContent() {
  const pathname = usePathname();

  const isActive = (href: string) => pathname.startsWith(href);

  return (
    <nav className="flex flex-col gap-1 w-48 shrink-0">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function SettingsNav() {
  return (
    <Suspense
      fallback={
        <nav className="flex flex-col gap-1 w-48 shrink-0">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground"
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </div>
            );
          })}
        </nav>
      }
    >
      <SettingsNavContent />
    </Suspense>
  );
}
