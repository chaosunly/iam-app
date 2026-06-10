"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
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

  const loadKeys = useCallback(async () => {
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
  }, []);

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
                  role="button"
                  tabIndex={0}
                  aria-expanded={expanded}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => toggleExpand(key.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleExpand(key.id);
                    }
                  }}
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
                              aria-label="Copy key ID"
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
