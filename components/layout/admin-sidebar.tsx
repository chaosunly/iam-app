"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  type LucideIcon,
  Home,
  Users,
  UsersRound,
  Shield,
  Building2,
  ChevronDown,
  ChevronRight,
  Menu,
  Settings,
  KeyRound,
  LogOut,
  ChevronsUpDown,
  GitBranch,
  Hash,
} from "lucide-react";
import { useSidebar } from "@/components/layout/sidebar-context";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

type PermissionsItem = {
  type: "permissions";
};

type SectionItem = NavItem | PermissionsItem;

type NavSection = {
  label: string;
  items: SectionItem[];
};

const sections: NavSection[] = [
  {
    label: "General",
    items: [
      { href: "/admin", label: "Dashboard", icon: Home },
      { href: "/dashboard/settings", label: "Account Settings", icon: Settings },
    ],
  },
  {
    label: "Directory",
    items: [
      { href: "/admin/identities", label: "Identities", icon: Users },
      { href: "/admin/groups", label: "Groups", icon: UsersRound },
      { href: "/admin/organization", label: "Organization", icon: Building2 },
    ],
  },
  {
    label: "Access",
    items: [
      { href: "/admin/client", label: "Client", icon: KeyRound },
      { type: "permissions" },
    ],
  },
];

const permissionSubItems = [
  { href: "/admin/gitlab", label: "GitLab Access", icon: GitBranch },
  { href: "/admin/matrix", label: "Matrix Access", icon: Hash },
];

interface AdminSidebarProps {
  userName?: string;
  userEmail?: string;
}

interface UserProfileDropdownProps {
  isCollapsed: boolean;
  initials: string;
  userName: string;
  userEmail: string;
}

function UserProfileDropdown({
  isCollapsed,
  initials,
  userName,
  userEmail,
}: UserProfileDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {isCollapsed ? (
          <button className="flex h-9 w-9 mx-auto items-center justify-center rounded-lg hover:bg-accent transition-colors">
            <Avatar className="h-7 w-7 rounded-lg">
              <AvatarFallback className="rounded-lg text-xs bg-primary/10">
                {initials}
              </AvatarFallback>
            </Avatar>
          </button>
        ) : (
          <button className="flex w-full items-center gap-2 rounded-lg p-2 hover:bg-accent transition-colors text-left">
            <Avatar className="h-8 w-8 rounded-lg">
              <AvatarFallback className="rounded-lg text-xs bg-primary/10">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium leading-none truncate">
                {userName}
              </p>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {userEmail}
              </p>
            </div>
            <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="top"
        align={isCollapsed ? "center" : "start"}
        className="w-56 mb-1"
      >
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-2 px-1 py-1.5">
            <Avatar className="h-8 w-8 rounded-lg">
              <AvatarFallback className="rounded-lg text-xs bg-primary/10">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col leading-none">
              <span className="text-sm font-semibold">{userName}</span>
              <span className="text-xs text-muted-foreground">{userEmail}</span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link
            href="/auth/logout"
            className="cursor-pointer text-destructive focus:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface PermissionsNavItemProps {
  mobile?: boolean;
  collapsed: boolean;
  permissionsOpen: boolean;
  isPermissionsActive: boolean;
  onToggle: () => void;
  isActive: (href: string) => boolean;
}

function PermissionsNavItem({
  mobile = false,
  collapsed,
  permissionsOpen,
  isPermissionsActive,
  onToggle,
  isActive,
}: PermissionsNavItemProps) {
  const btn = (
    <button
      onClick={onToggle}
      className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
        isPermissionsActive && (!permissionsOpen || (!mobile && collapsed))
          ? "bg-primary text-primary-foreground"
          : "hover:bg-accent hover:text-accent-foreground"
      }`}
    >
      <Shield className="h-4 w-4 shrink-0" />
      <span
        className={`flex-1 text-left overflow-hidden whitespace-nowrap transition-all duration-300 ${
          !mobile && collapsed ? "max-w-0 opacity-0" : "max-w-50 opacity-100"
        }`}
      >
        Permissions
      </span>
      <span
        className={`overflow-hidden transition-all duration-300 ${
          !mobile && collapsed ? "max-w-0 opacity-0" : "max-w-6 opacity-100"
        }`}
      >
        {permissionsOpen ? (
          <ChevronDown className="h-4 w-4 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0" />
        )}
      </span>
    </button>
  );

  return (
    <div>
      {!mobile && collapsed ? (
        <Tooltip>
          <TooltipTrigger asChild>{btn}</TooltipTrigger>
          <TooltipContent side="right">Permissions</TooltipContent>
        </Tooltip>
      ) : (
        btn
      )}

      {permissionsOpen && (mobile || !collapsed) && (
        <div className="mt-1 ml-4 pl-3 border-l space-y-1">
          {permissionSubItems.map((sub) => {
            const Icon = sub.icon;
            return (
              <Link
                key={sub.href}
                href={sub.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm ${
                  isActive(sub.href)
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{sub.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function AdminSidebar({
  userName = "Admin",
  userEmail = "",
}: AdminSidebarProps) {
  const { collapsed } = useSidebar();
  const pathname = usePathname();
  const [permissionsOpen, setPermissionsOpen] = useState(
    () =>
      pathname.startsWith("/admin/permissions") ||
      pathname.startsWith("/admin/gitlab") ||
      pathname.startsWith("/admin/matrix"),
  );

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  const isPermissionsActive =
    pathname.startsWith("/admin/permissions") ||
    pathname.startsWith("/admin/gitlab") ||
    pathname.startsWith("/admin/matrix");

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      {/* Mobile Sidebar */}
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden fixed top-4 left-4 z-40"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0 flex flex-col">
          <div className="flex h-16 items-center gap-3 border-b px-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Shield className="h-4 w-4" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-sm font-semibold">IAM Admin</span>
              <span className="text-xs text-muted-foreground">
                Identity Management
              </span>
            </div>
          </div>
          <nav className="flex-1 overflow-y-auto p-3">
            {sections.map((section, index) => (
              <div key={section.label}>
                <p
                  className={`text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 py-1${
                    index > 0 ? " mt-2" : ""
                  }`}
                >
                  {section.label}
                </p>
                <div className="space-y-1">
                  {section.items.map((item) =>
                    "type" in item ? (
                      <PermissionsNavItem
                        key="permissions"
                        mobile
                        collapsed={false}
                        permissionsOpen={permissionsOpen}
                        isPermissionsActive={isPermissionsActive}
                        onToggle={() => setPermissionsOpen((prev) => !prev)}
                        isActive={isActive}
                      />
                    ) : (
                      (() => {
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm ${
                              isActive(item.href)
                                ? "bg-primary text-primary-foreground"
                                : "hover:bg-accent hover:text-accent-foreground"
                            }`}
                          >
                            <Icon className="h-4 w-4 shrink-0" />
                            <span>{item.label}</span>
                          </Link>
                        );
                      })()
                    ),
                  )}
                </div>
              </div>
            ))}
          </nav>
          <Separator />
          <div className="p-3">
            <UserProfileDropdown
              isCollapsed={false}
              initials={initials}
              userName={userName}
              userEmail={userEmail}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <TooltipProvider delayDuration={0}>
        <aside
          className={`hidden md:flex flex-col border-r bg-background h-screen overflow-hidden transition-all duration-300 ${
            collapsed ? "w-18" : "w-64"
          }`}
        >
          {/* Header */}
          {collapsed ? (
            <div className="flex h-16 items-center justify-center px-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Shield className="h-4 w-4" />
              </div>
            </div>
          ) : (
            <div className="flex h-16 items-center gap-3 px-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Shield className="h-4 w-4" />
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-sm font-semibold">IAM Admin</span>
                <span className="text-xs text-muted-foreground">
                  Identity Management
                </span>
              </div>
            </div>
          )}

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto p-3">
            {sections.map((section, index) => (
              <div key={section.label}>
                {collapsed ? (
                  index > 0 && <Separator className="my-1" />
                ) : (
                  <p
                    className={`text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 py-1${
                      index > 0 ? " mt-2" : ""
                    }`}
                  >
                    {section.label}
                  </p>
                )}
                <div className="space-y-1">
                  {section.items.map((item) =>
                    "type" in item ? (
                      <PermissionsNavItem
                        key="permissions"
                        collapsed={collapsed}
                        permissionsOpen={permissionsOpen}
                        isPermissionsActive={isPermissionsActive}
                        onToggle={() => setPermissionsOpen((prev) => !prev)}
                        isActive={isActive}
                      />
                    ) : (
                      (() => {
                        const Icon = item.icon;
                        const active = isActive(item.href);
                        const link = (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
                              active
                                ? "bg-primary text-primary-foreground"
                                : "hover:bg-accent hover:text-accent-foreground"
                            }`}
                          >
                            <Icon className="h-4 w-4 shrink-0" />
                            <span
                              className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${
                                collapsed
                                  ? "max-w-0 opacity-0"
                                  : "max-w-50 opacity-100"
                              }`}
                            >
                              {item.label}
                            </span>
                          </Link>
                        );
                        return collapsed ? (
                          <Tooltip key={item.href}>
                            <TooltipTrigger asChild>{link}</TooltipTrigger>
                            <TooltipContent side="right">
                              {item.label}
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          link
                        );
                      })()
                    ),
                  )}
                </div>
              </div>
            ))}
          </nav>

          <Separator />

          {/* User profile */}
          <div className="p-3">
            <UserProfileDropdown
              isCollapsed={collapsed}
              initials={initials}
              userName={userName}
              userEmail={userEmail}
            />
          </div>
        </aside>
      </TooltipProvider>
    </>
  );
}
