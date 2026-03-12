"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Home,
  Users,
  UsersRound,
  Shield,
  GitlabIcon,
  ChevronLeft,
  Menu,
  Settings,
  LogOut,
  ChevronsUpDown,
} from "lucide-react";
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

const navItems = [
  { href: "/admin", label: "Dashboard", icon: Home },
  { href: "/admin/identities", label: "Identities", icon: Users },
  { href: "/admin/groups", label: "Groups", icon: UsersRound },
  { href: "/admin/permissions", label: "Permissions", icon: Shield },
  { href: "/admin/gitlab", label: "GitLab Access", icon: GitlabIcon },
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
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/auth/settings" className="cursor-pointer">
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

export function AdminSidebar({
  userName = "Admin",
  userEmail = "",
}: AdminSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/admin") {
      return pathname === "/admin";
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
          <nav className="flex-1 overflow-y-auto p-3 space-y-1">
            {navItems.map((item) => {
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
      <aside
        className={`hidden md:flex flex-col border-r bg-background h-screen transition-all duration-300 ${
          collapsed ? "w-18" : "w-64"
        }`}
      >
        {/* Header */}
        {collapsed ? (
          <div className="flex h-16 items-center justify-center border-b px-2">
            <button
              onClick={() => setCollapsed(false)}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Shield className="h-4 w-4" />
            </button>
          </div>
        ) : (
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
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(true)}
              className="ml-auto h-7 w-7"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center rounded-lg transition-colors ${
                  collapsed
                    ? "h-9 w-9 mx-auto justify-center"
                    : "gap-3 px-3 py-2 text-sm"
                } ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
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
    </>
  );
}
