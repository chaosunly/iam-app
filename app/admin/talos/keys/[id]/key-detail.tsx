"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Trash, Clipboard } from "lucide-react";

type ApiKey = {
  id: string;
  name?: string;
  created_at?: string;
  expires_at?: string | null;
  note?: string;
};

export function KeyDetail({ id }: { id: string }) {
  const [key, setKey] = useState<ApiKey | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/talos/admin/api-keys/${encodeURIComponent(id)}`, { cache: "no-store" });
      if (!res.ok) {
        const txt = await res.text();
        toast.error(txt || "Failed to load key");
        setKey(null);
        return;
      }
      const data = await res.json();
      setKey(data as ApiKey);
    } catch (err) {
      toast.error("Network error");
      setKey(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleRevoke() {
    if (!confirm("Revoke this API key?")) return;
    try {
      const res = await fetch(`/api/admin/talos/admin/api-keys/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) {
        const txt = await res.text();
        toast.error(txt || "Failed to revoke");
        return;
      }
      toast.success("Key revoked");
      setKey(null);
    } catch {
      toast.error("Network error");
    }
  }

  return (
    <div className="space-y-4 p-6 md:p-8">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Key Details</h2>
          <p className="text-sm text-muted-foreground">Inspect and manage this API key</p>
        </div>
        <div className="flex gap-2">
          <Button variant="destructive" onClick={handleRevoke}>
            <Trash className="w-4 h-4" />
            Revoke
          </Button>
        </div>
      </div>

      {loading ? (
        <p>Loading…</p>
      ) : key ? (
        <div className="rounded border p-4">
          <p><strong>ID:</strong> {key.id}</p>
          <p><strong>Name:</strong> {key.name || "-"}</p>
          <p><strong>Note:</strong> {key.note || "-"}</p>
          <p><strong>Created:</strong> {key.created_at || "-"}</p>
          <p><strong>Expires:</strong> {key.expires_at || "-"}</p>
        </div>
      ) : (
        <div className="text-muted-foreground">Key not found or revoked.</div>
      )}
    </div>
  );
}
