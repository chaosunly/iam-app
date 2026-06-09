"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useApiMutation } from "@/lib/hooks/use-api-mutation";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function CreateKeyForm() {
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const router = useRouter();

  const { mutate, isPending } = useApiMutation<{ name?: string; note?: string }, any>(
    "/api/admin/talos/admin/api-keys",
    {
      method: "POST",
      onSuccess: (data) => {
        toast.success("API key created");
        // If the API returns the key value, show it and navigate back
        router.push("/admin/talos/keys");
      },
    },
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    await mutate({ name: name.trim(), note: note.trim() });
  }

  return (
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
  );
}
