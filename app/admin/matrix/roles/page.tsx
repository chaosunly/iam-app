"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { RoleSelectCell } from "@/components/matrix/room-browser/role-select-cell";
import { MATRIX_ROLES, ROLE_LABELS } from "@/components/matrix/room-browser/role-badge";

// ─── Types ──────────────────────────────────────────────────────────────────

type MatrixResourceType = "org" | "space" | "room";

interface Identity {
  id: string;
  traits: { email?: string; name?: string };
}

interface MatrixOrg   { id: string; name: string }
interface MatrixSpace { id: string; name: string; orgId: string; org?: MatrixOrg | null }
interface MatrixRoom  { id: string; name: string; spaceId: string; space?: MatrixSpace | null }

interface MatrixRoleAssignment {
  id: string;
  userId: string;
  resourceType: MatrixResourceType;
  resourceId: string;
  role: string;
  createdAt: string;
}

interface SyncResult {
  synced: boolean;
  skipped: boolean;
  error?: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const ROLE_BADGE_CLASSES: Record<string, string> = {
  matrix_admin: "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200",
  moderator:    "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200",
  support:      "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200",
  member:       "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200",
  viewer:       "bg-secondary text-secondary-foreground",
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function MatrixRolesPage() {
  const searchParams = useSearchParams();

  const [resourceType, setResourceType] = useState<MatrixResourceType>(
    (searchParams.get("resourceType") as MatrixResourceType) || "org",
  );
  const [resourceId, setResourceId] = useState(searchParams.get("resourceId") || "");
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState<string>("member");
  const [roleFilter, setRoleFilter] = useState("");
  const [userSearch, setUserSearch] = useState("");

  const [orgs, setOrgs] = useState<MatrixOrg[]>([]);
  const [spaces, setSpaces] = useState<MatrixSpace[]>([]);
  const [rooms, setRooms] = useState<MatrixRoom[]>([]);
  const [identities, setIdentities] = useState<Identity[]>([]);
  const [members, setMembers] = useState<MatrixRoleAssignment[]>([]);

  const [loading, setLoading] = useState(false);
  const [membersLoading, setMembersLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [syncStatus, setSyncStatus] = useState<SyncResult | null>(null);

  useEffect(() => {
    fetchOrgs();
    fetchIdentities();
  }, []);

  useEffect(() => {
    if (resourceType === "space" || resourceType === "room") fetchSpaces();
    if (resourceType === "room") fetchRooms();
    setResourceId("");
  }, [resourceType]);

  useEffect(() => {
    if (resourceId) fetchMembers();
    else setMembers([]);
  }, [resourceType, resourceId]);

  async function fetchOrgs() {
    try {
      const res = await fetch("/api/admin/matrix/orgs");
      if (res.ok) { const data = await res.json(); setOrgs(data.orgs || []); }
    } catch { /* non-blocking */ }
  }

  async function fetchSpaces() {
    try {
      const res = await fetch("/api/admin/matrix/spaces");
      if (res.ok) { const data = await res.json(); setSpaces(data.spaces || []); }
    } catch { /* non-blocking */ }
  }

  async function fetchRooms() {
    try {
      const res = await fetch("/api/admin/matrix/rooms");
      if (res.ok) { const data = await res.json(); setRooms(data.rooms || []); }
    } catch { /* non-blocking */ }
  }

  async function fetchIdentities() {
    try {
      const res = await fetch("/api/admin/identities?per_page=250");
      if (res.ok) { const json = await res.json(); setIdentities(json.data || []); }
    } catch { /* non-blocking */ }
  }

  async function fetchMembers() {
    if (!resourceId) return;
    try {
      setMembersLoading(true);
      const res = await fetch(
        `/api/admin/matrix/roles?resourceType=${resourceType}&resourceId=${resourceId}`,
      );
      if (res.ok) { const data = await res.json(); setMembers(data.members || []); }
    } catch { /* non-blocking */ }
    finally { setMembersLoading(false); }
  }

  async function handleAssignRole(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSuccess(""); setSyncStatus(null); setLoading(true);

    try {
      const res = await fetch("/api/admin/matrix/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, resourceType, resourceId, role }),
      });
      if (!res.ok) { const data = await res.json(); throw new Error(data.error || "Failed to assign role"); }
      const data = await res.json();
      setSyncStatus(data.sync ?? null);
      setSuccess(`Role "${ROLE_LABELS[role]}" assigned successfully.`);
      setUserId("");
      fetchMembers();
    } catch (err: any) {
      setError(err.message || "Failed to assign role");
    } finally {
      setLoading(false);
    }
  }

  async function handleRemoveRole(assignment: MatrixRoleAssignment) {
    if (!confirm(`Remove ${ROLE_LABELS[assignment.role] ?? assignment.role} role from user ${assignment.userId}?`)) return;

    try {
      const res = await fetch("/api/admin/matrix/roles", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: assignment.userId,
          resourceType: assignment.resourceType,
          resourceId: assignment.resourceId,
          role: assignment.role,
        }),
      });
      if (!res.ok) { const data = await res.json(); throw new Error(data.error || "Failed to remove role"); }
      fetchMembers();
    } catch (err: any) {
      alert(err.message || "Failed to remove role");
    }
  }

  const resourceOptions: { id: string; label: string }[] = resourceType === "org"
    ? orgs.map((o) => ({ id: o.id, label: o.name }))
    : resourceType === "space"
    ? spaces.map((s) => ({ id: s.id, label: s.org ? `${s.org.name} / ${s.name}` : s.name }))
    : rooms.map((r) => ({
        id: r.id,
        label: r.space
          ? `${r.space.org?.name ? r.space.org.name + " / " : ""}${r.space.name} / #${r.name}`
          : `#${r.name}`,
      }));

  const filteredIdentities = userSearch
    ? identities.filter(
        (i) =>
          i.traits?.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
          i.traits?.name?.toLowerCase().includes(userSearch.toLowerCase()),
      )
    : identities;

  const filteredMembers = roleFilter ? members.filter((m) => m.role === roleFilter) : members;

  function identityLabel(id: string): string {
    const identity = identities.find((i) => i.id === id);
    return identity?.traits?.email || identity?.traits?.name || id;
  }

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div>
        <h1 className="text-3xl font-bold">Matrix Role Assignments</h1>
        <p className="text-muted-foreground mt-1">
          Assign and manage Matrix roles for users across orgs, spaces, and rooms
        </p>
      </div>

      {/* Assign Role Form */}
      <Card>
        <CardHeader>
          <CardTitle>Assign Role</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert className="mb-4 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 [&>svg]:text-green-800 dark:[&>svg]:text-green-200">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                {success}
                {syncStatus && (
                  <span className="ml-3 inline-flex items-center gap-1 text-xs">
                    {syncStatus.skipped ? (
                      <Badge variant="secondary">Matrix sync disabled</Badge>
                    ) : syncStatus.synced ? (
                      <Badge className="bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300">
                        ✓ Synced to Matrix
                      </Badge>
                    ) : (
                      <Badge className="bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200" title={syncStatus.error}>
                        ⚠ Sync failed — {syncStatus.error}
                      </Badge>
                    )}
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleAssignRole} className="space-y-4">
            {/* Row 1: resource type + resource */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Resource Type</Label>
                <Select
                  value={resourceType}
                  onValueChange={(v) => setResourceType(v as MatrixResourceType)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="org">Org</SelectItem>
                    <SelectItem value="space">Space</SelectItem>
                    <SelectItem value="room">Room</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Resource</Label>
                <Select value={resourceId} onValueChange={setResourceId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={`Select a ${resourceType}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {resourceOptions.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 2: user + role */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>User</Label>
                <Input
                  type="text"
                  placeholder="Search by email or name..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="mb-2"
                />
                <select
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  required
                  size={4}
                  className="w-full rounded-md border border-input bg-transparent px-2 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30"
                >
                  <option value="">Select a user</option>
                  {filteredIdentities.map((identity) => (
                    <option key={identity.id} value={identity.id}>
                      {identity.traits?.email || identity.traits?.name || identity.id}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label>Role</Label>
                <div className="space-y-2">
                  {MATRIX_ROLES.map((r) => (
                    <label
                      key={r}
                      className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                        role === r
                          ? "border-ring bg-accent"
                          : "border-input hover:bg-muted/50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value={r}
                        checked={role === r}
                        onChange={() => setRole(r)}
                        className="sr-only"
                      />
                      <Badge className={ROLE_BADGE_CLASSES[r]}>{ROLE_LABELS[r]}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {r === "matrix_admin" && "Full control — manage users, roles, spaces, rooms"}
                        {r === "moderator"    && "Manage rooms and users within their scope"}
                        {r === "support"      && "Impersonation + read-only audit access"}
                        {r === "member"       && "Regular participant"}
                        {r === "viewer"       && "Read-only presence"}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <Button type="submit" disabled={loading || !resourceId || !userId}>
              {loading ? "Assigning..." : "Assign Role"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Current Members */}
      {resourceId && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>
              Current Members{members.length > 0 && ` (${members.length})`}
            </CardTitle>
            <Select
              value={roleFilter || "__all__"}
              onValueChange={(v) => setRoleFilter(v === "__all__" ? "" : v)}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All roles</SelectItem>
                {MATRIX_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            {membersLoading ? (
              <p className="py-8 text-center text-muted-foreground">Loading members...</p>
            ) : filteredMembers.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Assigned</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <p className="text-sm font-medium">{identityLabel(member.userId)}</p>
                        <p className="text-xs text-muted-foreground font-mono">{member.userId}</p>
                      </TableCell>
                      <TableCell>
                        <RoleSelectCell
                          userId={member.userId}
                          resourceType={member.resourceType}
                          resourceId={member.resourceId}
                          role={member.role}
                          onRefresh={fetchMembers}
                        />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(member.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleRemoveRole(member)}
                        >
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center py-8 text-muted-foreground text-sm">
                {roleFilter
                  ? `No members with role "${ROLE_LABELS[roleFilter]}" on this ${resourceType}.`
                  : `No role assignments yet for this ${resourceType}.`}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Role reference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Role Descriptions</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-2.5 text-sm">
            {MATRIX_ROLES.map((r) => (
              <div key={r} className="flex gap-3">
                <dt>
                  <Badge className={ROLE_BADGE_CLASSES[r]}>{ROLE_LABELS[r]}</Badge>
                </dt>
                <dd className="text-muted-foreground">
                  {r === "matrix_admin" &&
                    "Full control at assigned scope — manage users, roles, spaces, rooms, view audit"}
                  {r === "moderator" &&
                    "Manage rooms and users within their space/room; view audit at scope"}
                  {r === "support" &&
                    "Impersonate users for support sessions; view audit. Cannot manage roles."}
                  {r === "member" && "Regular participant. No administrative capability."}
                  {r === "viewer" &&
                    "Read-only presence. Cannot send messages (enforced in Matrix)."}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-xs text-muted-foreground">
            Roles assigned at org level are inherited by all spaces and rooms in that org via Keto{" "}
            <code className="font-mono bg-muted px-1 rounded">#parent</code>{" "}
            relation tuples. Direct grants at lower levels override inherited roles additively (Keto
            has no deny primitive; for restrictive overrides use explicit grants only).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
