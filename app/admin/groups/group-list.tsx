"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users } from "lucide-react";

type Group = {
  id: string;
  name: string;
  description?: string | null;
  memberCount?: number;
};

const PAGE_SIZE = 15;

export function GroupList({ groups }: { groups: Group[] }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const filteredGroups = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    if (!search) return groups;
    return groups.filter(
      (g) =>
        g.name.toLowerCase().includes(search) ||
        (g.description || "").toLowerCase().includes(search),
    );
  }, [groups, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredGroups.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const paginatedGroups = filteredGroups.slice(startIndex, startIndex + PAGE_SIZE);

  return (
    <>
      <div className="mb-6">
        <Input
          type="text"
          placeholder="Search by name or description..."
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
        />
      </div>

      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Members</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedGroups.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center text-muted-foreground py-12"
                >
                  <Users className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
                  {searchTerm
                    ? "No groups found matching your search"
                    : "No groups yet. Create your first group to organize users."}
                </TableCell>
              </TableRow>
            ) : (
              paginatedGroups.map((group) => (
                <TableRow key={group.id}>
                  <TableCell className="font-medium">{group.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {group.description || (
                      <span className="italic text-muted-foreground/60">—</span>
                    )}
                  </TableCell>
                  <TableCell>{group.memberCount || 0}</TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/admin/groups/${encodeURIComponent(group.id)}`}>
                        View
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-4">
        <p className="text-sm text-muted-foreground">
          Showing {filteredGroups.length === 0 ? 0 : startIndex + 1}-
          {Math.min(startIndex + PAGE_SIZE, filteredGroups.length)} of {filteredGroups.length} groups
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
    </>
  );
}
