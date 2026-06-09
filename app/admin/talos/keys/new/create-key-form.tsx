"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function CreateKeyForm() {
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const router = useRouter();

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

      // Try several common response fields for the secret
      const secret = data.key || data.secret || data.api_key || data.value || null;
      const id = data.id || data.key_id || data.api_key_id || data.name || null;
      if (secret) {
        setCreatedSecret(secret);
        setCreatedId(id || null);
      } else {
        toast.success("API key created");
        router.push("/admin/talos/keys");
      }
    } catch (err) {
      toast.error("Network error. Could not create key.");
    } finally {
      setIsPending(false);
    }
  }

  function handleDone() {
    router.push("/admin/talos/keys");
  }

  return (
    <div>
      {!createdSecret ? (
        <form onSubmit={handleSubmit} className="space-y-4 p-6 md:p-8">
          <div>
            <label className="text-sm font-medium">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div>
            <label className="text-sm font-medium">Note</label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} />
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creating…" : "Create Key"}
            </Button>
            <Button variant="ghost" onClick={() => router.push("/admin/talos/keys")}>Cancel</Button>
          </div>
        </form>
      ) : (
        <div className="space-y-4 p-6 md:p-8">
          <h2 className="text-lg font-semibold">API Key Created</h2>
          <p className="text-sm text-muted-foreground">This is the only time the secret will be shown — copy it now.</p>
          <div className="mt-4 p-4 rounded border bg-muted">
            <pre className="whitespace-pre-wrap">{createdSecret}</pre>
          </div>
          <div className="flex gap-2 mt-4">
            <Button
              onClick={() => {
                navigator.clipboard?.writeText(createdSecret).then(() => {
                  toast.success("Copied to clipboard");
                });
              }}
            >
              Copy secret
            </Button>
            <Button variant="ghost" onClick={handleDone}>Done</Button>
          </div>
        </div>
      )}
    </div>
  );
}
