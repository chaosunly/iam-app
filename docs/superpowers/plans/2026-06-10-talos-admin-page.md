# Talos Admin Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge `/admin/talos` and `/admin/talos/keys` into one page with inline-expandable rows, replacing the broken "Open Talos Admin" card.

**Architecture:** A server component shell (`page.tsx`) fetches health status and renders a `TalosKeyTable` client component. The client component owns key list state, expand/collapse state, and revoke logic. Old separate key-list, detail page, and redirect-only `/keys` route replace the current standalone pages.

**Tech Stack:** Next.js App Router, TypeScript, shadcn/ui (`Badge`, `Button`, `Table`), Lucide icons, Sonner toasts.

---

### Task 1: Create `key-table.tsx` — expandable key list component

**Files:**
- Create: `app/admin/talos/key-table.tsx`

- [ ] **Step 1: Create the file**

```tsx
"use client";

import { Fragment, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { KeyRound, ChevronDown, ChevronRight, Copy, Trash } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

type ApiKey = {
  id: string;
  name?: string;
  note?: string;
  created_at?: string;
  expires_at?: string | null;
};

function relativeDate(iso: string | null | undefined, fallback = "Never"): string {
  if (!iso) return fallback;
  const ms = new Date(iso).getTime() - Date.now();
  const abs = Math.abs(ms);
  const days = Math.floor(abs / 86400000);
  const hours = Math.floor(abs / 3600000);
  const mins = Math.floor(abs / 60000);
  const amount = days >= 1 ? `${days}d` : hours >= 1 ? `${hours}h` : `${mins}m`;
  return ms < 0 ? `${amount} ago` : `in ${amount}`;
}

function isActive(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return true;
  return new Date(expiresAt) > new Date();
}

export function TalosKeyTable() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function loadKeys() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/talos/admin/api-keys?limit=100", {
        cache: "no-store",
      });
      if (!res.ok) {
        toast.error("Failed to load API keys");
        setKeys([]);
        return;
      }
      const data = (await res.json()) as ApiKey[];
      setKeys(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Network error while loading keys");
      setKeys([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadKeys();
  }, []);

  async function handleRevoke(id: string) {
    if (!confirm("Revoke this API key? This cannot be undone.")) return;
    try {
      const res = await fetch(
        `/api/admin/talos/admin/api-keys/${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        toast.error("Failed to revoke key");
        return;
      }
      toast.success("Key revoked");
      setExpandedId(null);
      loadKeys();
    } catch {
      toast.error("Network error while revoking key");
    }
  }

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Failed to copy");
    }
  }

  if (loading) {
    return (
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3].map((i) => (
              <TableRow key={i}>
                <TableCell>
                  <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                </TableCell>
                <TableCell className="text-right">
                  <div className="h-5 w-14 bg-muted animate-pulse rounded-full ml-auto" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (keys.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <KeyRound className="w-12 h-12 text-muted-foreground/40 mb-4" />
        <p className="font-medium mb-1">No API keys yet</p>
        <p className="text-sm text-muted-foreground mb-4">
          Create your first key to get started.
        </p>
        <Button asChild>
          <Link href="/admin/talos/keys/new">Create your first key</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead className="text-right">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {keys.map((key) => {
            const active = isActive(key.expires_at);
            const expanded = expandedId === key.id;
            return (
              <Fragment key={key.id}>
                <TableRow
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => toggleExpand(key.id)}
                >
                  <TableCell className="font-medium flex items-center gap-2">
                    {expanded ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    )}
                    {key.name || key.id}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant={active ? "default" : "destructive"}
                      className={
                        active
                          ? "bg-green-900/60 text-green-300 border-green-800"
                          : undefined
                      }
                    >
                      {active ? "Active" : "Expired"}
                    </Badge>
                  </TableCell>
                </TableRow>
                {expanded && (
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableCell colSpan={2} className="py-4 px-6">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm mb-4">
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                            ID
                          </p>
                          <div className="flex items-center gap-1">
                            <span className="font-mono text-xs">
                              {key.id.slice(0, 12)}…
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(key.id);
                              }}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        {key.note && (
                          <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                              Note
                            </p>
                            <p>{key.note}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                            Created
                          </p>
                          <p>{relativeDate(key.created_at, "—")}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                            Expires
                          </p>
                          <p>{relativeDate(key.expires_at)}</p>
                        </div>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRevoke(key.id);
                        }}
                      >
                        <Trash className="w-4 h-4 mr-1" />
                        Revoke
                      </Button>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
```

- [ ] **Step 2: Check TypeScript compiles**

```bash
cd /Users/chaosunly/Developer/IAM-PLATFORM/iam-app && npx tsc --noEmit
```

Expected: no errors on the new file (there may be pre-existing errors in unrelated files — only care about `key-table.tsx`).

- [ ] **Step 3: Commit**

```bash
git add app/admin/talos/key-table.tsx
git commit -m "feat: add TalosKeyTable with inline expandable rows"
```

---

### Task 2: Rewrite `app/admin/talos/page.tsx` as merged page

**Files:**
- Modify: `app/admin/talos/page.tsx`

- [ ] **Step 1: Replace the file contents**

```tsx
import { getServerSession } from "@ory/nextjs/app";
import { redirect } from "next/navigation";
import { canAccessAdmin } from "@/lib/services/permission.service";
import { getTalosHealthReady } from "@/lib/services/talos.service";
import { TalosKeyTable } from "./key-table";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function TalosAdminPage() {
  const session = await getServerSession();

  if (!session?.identity) {
    redirect("/auth/login");
  }

  const userId = session.identity.id;
  const hasAdminAccess = await canAccessAdmin(userId);
  if (!hasAdminAccess) {
    redirect("/dashboard");
  }

  let healthy = false;
  try {
    const h = await getTalosHealthReady();
    healthy = h.status === 200;
  } catch {
    healthy = false;
  }

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">Talos API Keys</h1>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                healthy
                  ? "bg-green-900/50 text-green-300"
                  : "bg-red-900/50 text-red-300"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  healthy ? "bg-green-400" : "bg-red-400"
                }`}
              />
              {healthy ? "Healthy" : "Unreachable"}
            </span>
          </div>
          <p className="text-muted-foreground mt-1">
            Manage service API keys issued by Talos
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/talos/keys/new">+ Create Key</Link>
        </Button>
      </div>

      <TalosKeyTable />
    </div>
  );
}
```

- [ ] **Step 2: Check TypeScript compiles**

```bash
cd /Users/chaosunly/Developer/IAM-PLATFORM/iam-app && npx tsc --noEmit
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add app/admin/talos/page.tsx
git commit -m "feat: merge talos overview and key list into single page"
```

---

### Task 3: Replace `/admin/talos/keys/page.tsx` with redirect

**Files:**
- Modify: `app/admin/talos/keys/page.tsx`

- [ ] **Step 1: Replace file contents with a redirect**

```tsx
import { redirect } from "next/navigation";

export default function TalosKeysRedirect() {
  redirect("/admin/talos");
}
```

- [ ] **Step 2: Commit**

```bash
git add app/admin/talos/keys/page.tsx
git commit -m "feat: redirect /admin/talos/keys to /admin/talos"
```

---

### Task 4: Update create form redirect target

**Files:**
- Modify: `app/admin/talos/keys/new/create-key-form.tsx`

- [ ] **Step 1: Update both redirect targets from `/admin/talos/keys` to `/admin/talos`**

In `create-key-form.tsx`, find the two `router.push` calls and update them:

Change line `router.push("/admin/talos/keys")` (the cancel button) to:
```tsx
router.push("/admin/talos")
```

Change line that pushes after creation with no secret:
```tsx
router.push("/admin/talos");
```

Change the `handleDone` function:
```tsx
function handleDone() {
  router.push("/admin/talos");
}
```

The full updated `handleSubmit` and `handleDone` block (replace from `async function handleSubmit` through `function handleDone`):

```tsx
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    setIsPending(true);
    try {
      const res = await fetch("/api/admin/talos/admin/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), note: note.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data.error || data.message || "Failed to create key";
        toast.error(msg);
        return;
      }

      const secret =
        data.key || data.secret || data.api_key || data.value || null;
      if (secret) {
        setCreatedSecret(secret);
        setCreatedId(data.id || data.key_id || data.api_key_id || data.name || null);
      } else {
        toast.success("API key created");
        router.push("/admin/talos");
      }
    } catch (err) {
      toast.error("Network error. Could not create key.");
    } finally {
      setIsPending(false);
    }
  }

  function handleDone() {
    router.push("/admin/talos");
  }
```

Also update the Cancel button's `onClick`:
```tsx
<Button
  variant="ghost"
  onClick={() => router.push("/admin/talos")}
>
  Cancel
</Button>
```

- [ ] **Step 2: Commit**

```bash
git add app/admin/talos/keys/new/create-key-form.tsx
git commit -m "feat: redirect create-key flow back to /admin/talos"
```

---

### Task 5: Delete old files

**Files:**
- Delete: `app/admin/talos/keys/key-list.tsx`
- Delete: `app/admin/talos/keys/[id]/key-detail.tsx`
- Delete: `app/admin/talos/keys/[id]/page.tsx`

- [ ] **Step 1: Delete the files**

```bash
rm app/admin/talos/keys/key-list.tsx
rm app/admin/talos/keys/\[id\]/key-detail.tsx
rm app/admin/talos/keys/\[id\]/page.tsx
rmdir app/admin/talos/keys/\[id\] 2>/dev/null || true
```

- [ ] **Step 2: Verify TypeScript still compiles**

```bash
cd /Users/chaosunly/Developer/IAM-PLATFORM/iam-app && npx tsc --noEmit
```

Expected: no errors referencing the deleted files.

- [ ] **Step 3: Commit**

```bash
git add -A app/admin/talos/keys/
git commit -m "chore: remove old talos key-list and detail page files"
```

---

### Task 6: Manual smoke test

- [ ] **Step 1: Start the dev server**

```bash
cd /Users/chaosunly/Developer/IAM-PLATFORM/iam-app && npm run dev
```

- [ ] **Step 2: Visit `/admin/talos`**

Verify:
- Page shows "Talos API Keys" heading
- Health badge shows green "Healthy" or red "Unreachable" (depending on whether `ORY_TALOS_ADMIN_URL` is reachable in dev)
- "+ Create Key" button is in the top right

- [ ] **Step 3: Test empty state**

If no keys exist: centred key icon + "No API keys yet" + "Create your first key" button.

- [ ] **Step 4: Test expand/collapse**

If keys exist: click a row to expand — confirm ID (truncated), Created, Expires, and Revoke button appear. Click again to collapse. Open a second row — confirm the first one closes.

- [ ] **Step 5: Test copy ID**

Expand a row, click the copy icon next to the ID. Verify toast "Copied to clipboard" fires.

- [ ] **Step 6: Test `/admin/talos/keys` redirect**

Navigate to `/admin/talos/keys` — should immediately redirect to `/admin/talos`.

- [ ] **Step 7: Test create flow**

Click "+ Create Key", fill in name, submit. Verify secret-reveal step appears. Click Done — should return to `/admin/talos` (not `/admin/talos/keys`).

- [ ] **Step 8: Final commit if any fixes were made during smoke test**

```bash
git add -A && git commit -m "fix: smoke test corrections to talos admin page"
```
