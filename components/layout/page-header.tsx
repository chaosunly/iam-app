"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/layout/sidebar-context";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";

interface Crumb {
  label: string;
  href: string;
}

const SEGMENT_LABELS: Record<string, string> = {
  admin: "Dashboard",
  dashboard: "Dashboard",
  identities: "Identities",
  groups: "Groups",
  permissions: "Permissions",
  gitlab: "GitLab Access",
  projects: "Projects",
  roles: "Roles",
  new: "New",
};

function isId(segment: string): boolean {
  return /^[0-9a-f]{8}/.test(segment);
}

function buildCrumbs(pathname: string): Crumb[] {
  const segments = pathname.split("/").filter(Boolean);
  const crumbs: Crumb[] = [];
  let accumulated = "";

  for (const seg of segments) {
    accumulated += `/${seg}`;
    const label = isId(seg)
      ? "Detail"
      : (SEGMENT_LABELS[seg] ?? seg.charAt(0).toUpperCase() + seg.slice(1));
    crumbs.push({ label, href: accumulated });
  }

  return crumbs;
}

export function PageHeader() {
  const pathname = usePathname();
  const crumbs = buildCrumbs(pathname);
  const { toggle } = useSidebar();

  return (
    <TooltipProvider>
      <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4 md:px-6">
        <Button variant="ghost" size="icon" onClick={toggle} className="h-7 w-7">
          <PanelLeft className="h-4 w-4" />
        </Button>
        <Separator orientation="vertical" className="mx-1 h-4" />
        <nav aria-label="Breadcrumb">
          <ol className="flex items-center gap-1.5 text-sm">
            {crumbs.map((crumb, i) => {
              const isLast = i === crumbs.length - 1;
              return (
                <li key={crumb.href} className="flex items-center gap-1.5">
                  {i > 0 && (
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                  )}
                  <Tooltip delayDuration={300}>
                    <TooltipTrigger asChild>
                      {isLast ? (
                        <span className="max-w-50 truncate font-medium text-foreground cursor-default">
                          {crumb.label}
                        </span>
                      ) : (
                        <Link
                          href={crumb.href}
                          className="max-w-40 truncate text-muted-foreground transition-colors hover:text-foreground"
                        >
                          {crumb.label}
                        </Link>
                      )}
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>{crumb.label}</p>
                    </TooltipContent>
                  </Tooltip>
                </li>
              );
            })}
          </ol>
        </nav>
      </header>
    </TooltipProvider>
  );
}
