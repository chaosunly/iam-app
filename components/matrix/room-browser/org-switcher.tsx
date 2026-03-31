"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { CreateOrgSheet } from "./create-org-sheet";
import type { RoomOrg } from "./types";

interface OrgSwitcherProps {
  orgs: RoomOrg[];
  activeOrg: RoomOrg | null;
  onOrgChange: (org: RoomOrg) => void;
  onOrgCreated: (org: RoomOrg) => void;
}

export function OrgSwitcher({
  orgs,
  activeOrg,
  onOrgChange,
  onOrgCreated,
}: OrgSwitcherProps) {
  const [createOrgOpen, setCreateOrgOpen] = useState(false);

  if (!activeOrg) {
    return (
      <>
        <button
          onClick={() => setCreateOrgOpen(true)}
          className="flex h-10 w-full items-center justify-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          + New Org
        </button>
        <CreateOrgSheet
          open={createOrgOpen}
          onOpenChange={setCreateOrgOpen}
          onCreated={onOrgCreated}
        />
      </>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex w-full items-center gap-2 rounded-lg border border-input bg-background px-3 py-2 text-sm hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Avatar className="size-6 rounded-md">
              <AvatarFallback className="rounded-md text-xs font-semibold">
                {activeOrg.name[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="flex-1 truncate text-left font-medium">
              {activeOrg.name}
            </span>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="start">
          <DropdownMenuItem
            onSelect={() => setCreateOrgOpen(true)}
            className="text-muted-foreground"
          >
            + New Org
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {orgs.map((org) => (
            <DropdownMenuItem
              key={org.id}
              onSelect={() => onOrgChange(org)}
              className={cn(org.id === activeOrg.id && "bg-accent")}
            >
              <Avatar className="mr-2 size-5 rounded-sm">
                <AvatarFallback className="rounded-sm text-xs">
                  {org.name[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {org.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <CreateOrgSheet
        open={createOrgOpen}
        onOpenChange={setCreateOrgOpen}
        onCreated={onOrgCreated}
      />
    </>
  );
}
