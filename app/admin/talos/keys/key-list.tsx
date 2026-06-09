"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trash, KeyRound } from "lucide-react";
import { useApiMutation } from "@/lib/hooks/use-api-mutation";
import { toast } from "sonner";
import Link from "next/link";

type ApiKey = {
  id: string;
  key?: string;
  name?: string;
  created_at?: string;
  expires_at?: string | null;
};

export function TalosKeyList() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(false);

  const revoke = useApiMutation<unknown, unknown>(
    "/api/admin/talos/admin/api-keys",
    {
      method: "DELETE",
      onSuccess: () => {
        toast.success("Key revoked");
        loadKeys();
      },
    },
  );

  async function loadKeys() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/talos/admin/api-keys?limit=100", {
        cache: "no-store",
      });
      if (!res.ok) {
        const err = await res.text();
        toast.error(err || "Failed to load keys");
        setKeys([]);
        return;
      }
      const data = (await res.json()) as ApiKey[];
      setKeys(Array.isArray(data) ? data : []);
    } catch (err) {
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
    // Talos expects DELETE to /admin/api-keys/:id — use the mutation hook with explicit URL
    try {
      const res = await fetch(
        `/api/admin/talos/admin/api-keys/${encodeURIComponent(id)}`,
        {
          method: "DELETE",
        },
      );
      if (!res.ok) {
        const text = await res.text();
        toast.error(text || "Failed to revoke key");
        return;
      }
      toast.success("Key revoked");
      loadKeys();
    } catch {
      toast.error("Network error while revoking key");
    }
  }

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">API Keys</h1>
          <p className="text-muted-foreground mt-1">
            List of issued Talos API keys
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/talos/keys/new">Create Key</Link>
        </Button>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12">
                  Loading…
                </TableCell>
              </TableRow>
            ) : keys.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center text-muted-foreground py-12"
                >
                  <KeyRound className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
                  No API keys found.
                </TableCell>
              </TableRow>
            ) : (
              keys.map((k) => (
                <TableRow key={k.id}>
                  <TableCell className="font-medium">{k.id}</TableCell>
                  <TableCell>{k.name || "-"}</TableCell>
                  <TableCell>{k.created_at || "-"}</TableCell>
                  <TableCell>{k.expires_at || "-"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRevoke(k.id)}
                      >
                        <Trash className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
