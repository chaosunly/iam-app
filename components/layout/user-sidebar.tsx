"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  type LucideIcon,
  Home,
  UsersRound,
  FolderKanban,
  Settings,
  Menu,
  LogOut,
  Shield,
  ChevronsUpDown,
} from "lucide-react";
import { useSidebar } from "@/components/layout/sidebar-context";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
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

interface UserSidebarProps {
  isAdmin: boolean;
  userName?: string;
  userEmail?: string;
}

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

type NavSection = {
  label: string;
  items: NavItem[];
};

const sections: NavSection[] = [
  {
    label: "General",
    items: [{ href: "/dashboard", label: "Dashboard", icon: Home }],
  },
  {
    label: "Workspace",
    items: [
      { href: "/dashboard/groups", label: "My Groups", icon: UsersRound },
      { href: "/dashboard/projects", label: "My Projects", icon: FolderKanban },
    ],
  },
];

interface UserProfileDropdownProps {
  isCollapsed: boolean;
  initials: string;
  userName: string;
  userEmail: string;
  isAdmin: boolean;
}

function UserProfileDropdown({
  isCollapsed,
  initials,
  userName,
  userEmail,
  isAdmin,
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
        <DropdownMenuGroup>
          {isAdmin && (
            <DropdownMenuItem asChild>
              <Link href="/admin" className="cursor-pointer">
                <Shield className="h-4 w-4" />
                Admin Panel
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem asChild>
            <Link href="/dashboard/settings" className="cursor-pointer">
              <Settings className="h-4 w-4" />
              Account Settings
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
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

export function UserSidebar({
  isAdmin,
  userName = "User",
  userEmail = "",
}: UserSidebarProps) {
  const { collapsed } = useSidebar();
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname.startsWith(href);
  };

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
          <div className="flex h-16 items-center gap-3 px-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Home className="h-4 w-4" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-sm font-semibold">IAM App</span>
              <span className="text-xs text-muted-foreground">User Portal</span>
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
                  {section.items.map((item) => {
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
                  })}
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
              isAdmin={isAdmin}
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
                <Home className="h-4 w-4" />
              </div>
            </div>
          ) : (
            <div className="flex h-16 items-center gap-3 px-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Home className="h-4 w-4" />
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-sm font-semibold">IAM App</span>
                <span className="text-xs text-muted-foreground">
                  User Portal
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
                  {section.items.map((item) => {
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
                  })}
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
              isAdmin={isAdmin}
            />
          </div>
        </aside>
      </TooltipProvider>
    </>
  );
}
