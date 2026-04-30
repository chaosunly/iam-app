// app/admin/identities/identities-list.tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus } from "lucide-react";
import { DeleteDialog } from "@/components/admin/delete-dialog";

const PAGE_SIZE = 15;

interface Identity {
  id: string;
  schema_id: string;
  traits: {
    email?: string;
    name?: { first?: string; last?: string };
  };
  state: string;
  created_at: string;
  updated_at: string;
}

interface Props {
  identities: Identity[];
}

export function IdentitiesList({ identities }: Props) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; email: string } | null>(null);

  const filteredIdentities = useMemo(() => {
    const search = searchTerm.toLowerCase();
    return identities.filter((identity) => {
      const email = identity.traits.email?.toLowerCase() || "";
      const name = `${identity.traits.name?.first || ""} ${identity.traits.name?.last || ""}`.toLowerCase();
      return email.includes(search) || name.includes(search) || identity.id.includes(search);
    });
  }, [identities, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredIdentities.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const paginatedIdentities = filteredIdentities.slice(startIndex, startIndex + PAGE_SIZE);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    const response = await fetch(`/api/admin/identities/${deleteTarget.id}`, { method: "DELETE" });
    if (!response.ok) throw new Error("Failed to delete identity");
    router.refresh();
  };

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold mb-2">Identities</h2>
          <p className="text-muted-foreground">Manage all user identities</p>
        </div>
        <Button asChild>
          <Link href="/admin/identities/new">
            <Plus className="w-4 h-4 mr-2" />
            Create Identity
          </Link>
        </Button>
      </div>

      <div className="mb-6">
        <Input
          type="text"
          placeholder="Search by email, name, or ID..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
        />
      </div>

      <div className="rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedIdentities.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                    {searchTerm ? "No identities found matching your search" : "No identities found"}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedIdentities.map((identity) => (
                  <TableRow key={identity.id}>
                    <TableCell>
                      <div className="font-medium">{identity.traits.email || "No email"}</div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {identity.id.substring(0, 8)}...
                      </div>
                    </TableCell>
                    <TableCell>
                      {identity.traits.name?.first || identity.traits.name?.last
                        ? `${identity.traits.name?.first || ""} ${identity.traits.name?.last || ""}`.trim()
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{identity.state}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(identity.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/admin/identities/${identity.id}`}>View</Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() =>
                            setDeleteTarget({ id: identity.id, email: identity.traits.email || identity.id })
                          }
                        >
                          Delete
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

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-4">
        <p className="text-sm text-muted-foreground">
          Showing{" "}
          {filteredIdentities.length === 0 ? 0 : startIndex + 1}-
          {Math.min(startIndex + PAGE_SIZE, filteredIdentities.length)} of{" "}
          {filteredIdentities.length} identities
        </p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
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
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={safePage >= totalPages}
          >
            Next
          </Button>
        </div>
      </div>

      <DeleteDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Identity"
        description={
          deleteTarget
            ? `This will permanently delete ${deleteTarget.email}. This action cannot be undone.`
            : ""
        }
        successMessage="Identity deleted successfully"
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
