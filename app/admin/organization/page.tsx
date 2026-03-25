"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { AlertCircle, UserPlus, Users, ShieldCheck, Crown, UserRound } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, Label } from "recharts";

const PAGE_SIZE = 15;

type OrgRole = "owner" | "admin" | "member";

interface OrgMember {
  userId: string;
  email: string;
  name: string;
  role: OrgRole;
}

interface Identity {
  id: string;
  traits: {
    email?: string;
    name?: { first?: string; last?: string };
  };
}

const ROLE_OPTIONS: OrgRole[] = ["owner", "admin", "member"];

const ROLE_BADGE: Record<OrgRole, string> = {
  owner: "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400",
  admin: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400",
  member: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};

const chartConfig = {
  owner: { label: "Owner", color: "hsl(var(--chart-1))" },
  admin: { label: "Admin", color: "hsl(var(--chart-2))" },
  member: { label: "Member", color: "hsl(var(--chart-3))" },
  count: { label: "Count" },
} satisfies ChartConfig;

const STAT_CARDS = [
  {
    key: "total",
    label: "Total Members",
    icon: Users,
    color: "text-foreground",
    bg: "bg-muted",
  },
  {
    key: "owner" as OrgRole,
    label: "Owners",
    icon: Crown,
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-50 dark:bg-purple-900/20",
  },
  {
    key: "admin" as OrgRole,
    label: "Admins",
    icon: ShieldCheck,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-900/20",
  },
  {
    key: "member" as OrgRole,
    label: "Members",
    icon: UserRound,
    color: "text-zinc-600 dark:text-zinc-400",
    bg: "bg-zinc-50 dark:bg-zinc-900/20",
  },
];

export default function OrganizationPage() {
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [allIdentities, setAllIdentities] = useState<Identity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Add member form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUserId, setNewUserId] = useState("");
  const [newRole, setNewRole] = useState<OrgRole>("member");
  const [addingMember, setAddingMember] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [membersRes, identitiesRes] = await Promise.all([
        fetch("/api/admin/organization/members"),
        fetch("/api/admin/identities"),
      ]);
      if (membersRes.ok) {
        const data = await membersRes.json();
        setMembers(data.members || []);
      }
      if (identitiesRes.ok) {
        const data = await identitiesRes.json();
        setAllIdentities(Array.isArray(data.data) ? data.data : []);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newUserId) return;
    try {
      setAddingMember(true);
      const response = await fetch("/api/admin/organization/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: newUserId, role: newRole }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to add member");
      }
      setNewUserId("");
      setNewRole("member");
      setShowAddForm(false);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add member");
    } finally {
      setAddingMember(false);
    }
  };

  const handleUpdateRole = async (userId: string, role: OrgRole) => {
    try {
      setActionLoading(userId);
      const response = await fetch("/api/admin/organization/members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update role");
      }
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update role");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm("Remove this member from the organization?")) return;
    try {
      setActionLoading(userId);
      const response = await fetch(
        `/api/admin/organization/members?userId=${userId}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to remove member");
      }
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove member");
    } finally {
      setActionLoading(null);
    }
  };

  const memberUserIds = new Set(members.map((m) => m.userId));
  const availableIdentities = allIdentities.filter((i) => !memberUserIds.has(i.id));

  const getDisplayName = (identity: Identity) => {
    const first = identity.traits.name?.first || "";
    const last = identity.traits.name?.last || "";
    const full = `${first} ${last}`.trim();
    return full || identity.traits.email || identity.id;
  };

  const roleCounts = useMemo(
    () =>
      ROLE_OPTIONS.reduce(
        (acc, r) => ({ ...acc, [r]: members.filter((m) => m.role === r).length }),
        {} as Record<OrgRole, number>,
      ),
    [members],
  );

  const barData = ROLE_OPTIONS.map((role) => ({
    role: role.charAt(0).toUpperCase() + role.slice(1),
    count: roleCounts[role],
    fill: chartConfig[role].color,
  }));

  const donutData = ROLE_OPTIONS.filter((r) => roleCounts[r] > 0).map((role) => ({
    name: role,
    value: roleCounts[role],
    fill: chartConfig[role].color,
  }));

  const filteredMembers = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return members.filter(
      (m) =>
        m.email.toLowerCase().includes(term) ||
        m.name.toLowerCase().includes(term) ||
        m.userId.includes(term),
    );
  }, [members, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredMembers.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const paginatedMembers = filteredMembers.slice(startIndex, startIndex + PAGE_SIZE);

  const coveragePercent =
    allIdentities.length > 0
      ? Math.round((members.length / allIdentities.length) * 100)
      : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-muted border-t-foreground rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading organization...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold mb-1">Organization</h2>
          <p className="text-muted-foreground">Manage organization members and their roles</p>
        </div>
        <Button onClick={() => setShowAddForm((v) => !v)}>
          <UserPlus className="w-4 h-4 mr-2" />
          Add Member
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="overview">
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
        </TabsList>

        {/* ── Overview Tab ── */}
        <TabsContent value="overview" className="space-y-6">
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {STAT_CARDS.map(({ key, label, icon: Icon, color, bg }) => {
              const value =
                key === "total" ? members.length : roleCounts[key as OrgRole];
              const sub =
                key === "total"
                  ? `${coveragePercent}% of all identities`
                  : `${members.length > 0 ? Math.round((roleCounts[key as OrgRole] / members.length) * 100) : 0}% of members`;
              return (
                <Card key={key}>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm text-muted-foreground">{label}</p>
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${bg}`}>
                        <Icon className={`h-4 w-4 ${color}`} />
                      </div>
                    </div>
                    <p className="text-3xl font-bold">{value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{sub}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Bar chart — 2/3 width */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Members by Role</CardTitle>
                <CardDescription>Distribution of roles across the organization</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-55 w-full">
                  <BarChart data={barData} margin={{ top: 4, right: 16, left: -8, bottom: 0 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border" />
                    <XAxis
                      dataKey="role"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 12 }}
                      allowDecimals={false}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={64}>
                      {barData.map((entry) => (
                        <Cell key={entry.role} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Donut chart — 1/3 width */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Role Breakdown</CardTitle>
                <CardDescription>Proportion of each role</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-center">
                {donutData.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-10">No members yet</p>
                ) : (
                  <ChartContainer config={chartConfig} className="h-55 w-full">
                    <PieChart>
                      <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                      <Pie
                        data={donutData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        strokeWidth={2}
                      >
                        {donutData.map((entry) => (
                          <Cell key={entry.name} fill={entry.fill} />
                        ))}
                        <Label
                          content={({ viewBox }) => {
                            if (!viewBox || !("cx" in viewBox)) return null;
                            return (
                              <text
                                x={viewBox.cx}
                                y={viewBox.cy}
                                textAnchor="middle"
                                dominantBaseline="middle"
                              >
                                <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-2xl font-bold">
                                  {members.length}
                                </tspan>
                                <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) + 20} className="fill-muted-foreground text-xs">
                                  Total
                                </tspan>
                              </text>
                            );
                          }}
                        />
                      </Pie>
                      <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                    </PieChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Members Tab ── */}
        <TabsContent value="members" className="space-y-4">
          {/* Add member form */}
          {showAddForm && (
            <Card>
              <CardContent className="p-6">
                <h3 className="text-base font-semibold mb-4">Add Member</h3>
                <form onSubmit={handleAddMember} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">User</label>
                      {availableIdentities.length === 0 ? (
                        <p className="text-sm text-muted-foreground">All users are already members.</p>
                      ) : (
                        <select
                          value={newUserId}
                          onChange={(e) => setNewUserId(e.target.value)}
                          required
                          className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          <option value="">-- Select a user --</option>
                          {availableIdentities.map((identity) => (
                            <option key={identity.id} value={identity.id}>
                              {getDisplayName(identity)}
                              {identity.traits.email && ` (${identity.traits.email})`}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Role</label>
                      <select
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value as OrgRole)}
                        className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        {ROLE_OPTIONS.map((r) => (
                          <option key={r} value={r}>
                            {r.charAt(0).toUpperCase() + r.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={addingMember || !newUserId}>
                      {addingMember ? "Adding..." : "Add Member"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Search */}
          <Input
            placeholder="Search by name, email or ID..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          />

          {/* Table */}
          <div className="rounded-lg border overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>User ID</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedMembers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-12">
                        {members.length === 0
                          ? "No members in organization yet"
                          : "No members match your search"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedMembers.map((member) => {
                      const isLoading = actionLoading === member.userId;
                      return (
                        <TableRow key={member.userId}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{member.name}</p>
                              <p className="text-xs text-muted-foreground">{member.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs font-mono text-muted-foreground">
                              {member.userId.substring(0, 16)}...
                            </span>
                          </TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${ROLE_BADGE[member.role]}`}
                            >
                              {member.role}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <select
                                value={member.role}
                                disabled={isLoading}
                                onChange={(e) =>
                                  handleUpdateRole(member.userId, e.target.value as OrgRole)
                                }
                                className="text-xs px-2 py-1 border border-input rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                              >
                                {ROLE_OPTIONS.map((r) => (
                                  <option key={r} value={r}>
                                    {r.charAt(0).toUpperCase() + r.slice(1)}
                                  </option>
                                ))}
                              </select>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                disabled={isLoading}
                                onClick={() => handleRemoveMember(member.userId)}
                              >
                                {isLoading ? "..." : "Remove"}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Pagination */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {filteredMembers.length === 0 ? 0 : startIndex + 1}–
              {Math.min(startIndex + PAGE_SIZE, filteredMembers.length)} of{" "}
              {filteredMembers.length} members
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {safePage} of {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
