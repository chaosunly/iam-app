"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { KeyRound } from "lucide-react";
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
import { DeleteClientButton } from "./delete-client-button";

type OAuth2Client = {
  client_id?: string;
  client_name?: string;
  scope?: string;
  redirect_uris?: string[];
  grant_types?: string[];
  skip_consent?: boolean;
};

const PAGE_SIZE = 15;

export function ClientList({ clients }: { clients: OAuth2Client[] }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const filteredClients = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    if (!search) {
      return clients;
    }

    return clients.filter((client) => {
      const clientId = (client.client_id || "").toLowerCase();
      const name = (client.client_name || "").toLowerCase();
      const scope = (client.scope || "").toLowerCase();
      const grants = (client.grant_types || []).join(" ").toLowerCase();
      const redirects = (client.redirect_uris || []).join(" ").toLowerCase();

      return (
        clientId.includes(search) ||
        name.includes(search) ||
        scope.includes(search) ||
        grants.includes(search) ||
        redirects.includes(search)
      );
    });
  }, [clients, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredClients.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const paginatedClients = filteredClients.slice(startIndex, startIndex + PAGE_SIZE);

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">OAuth2 Clients</h1>
          <p className="text-muted-foreground mt-1">
            Manage Hydra OAuth2 clients for IAM and integrated services.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/client/new">Create Client</Link>
        </Button>
      </div>

      <div className="mb-6">
        <Input
          type="text"
          placeholder="Search by client ID, name, scope, grant type, or redirect URI..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
        />
      </div>

      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Grant Types</TableHead>
              <TableHead>Scope</TableHead>
              <TableHead>Redirect URIs</TableHead>
              <TableHead>Consent</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedClients.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-muted-foreground py-12"
                >
                  <KeyRound className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
                  {searchTerm
                    ? "No clients found matching your search"
                    : "No OAuth2 clients found."}
                </TableCell>
              </TableRow>
            ) : (
              paginatedClients.map((client, index) => (
                <TableRow key={client.client_id || `client-${startIndex + index}`}>
                  <TableCell className="font-medium">
                    {client.client_id || "-"}
                  </TableCell>
                  <TableCell>{client.client_name || "-"}</TableCell>
                  <TableCell
                    className="max-w-56 truncate"
                    title={(client.grant_types || []).join(", ")}
                  >
                    {(client.grant_types || []).join(", ") || "-"}
                  </TableCell>
                  <TableCell className="max-w-72 truncate" title={client.scope || ""}>
                    {client.scope || "-"}
                  </TableCell>
                  <TableCell className="max-w-80">
                    <div className="space-y-1">
                      {(client.redirect_uris || []).length === 0 && <span>-</span>}
                      {(client.redirect_uris || []).slice(0, 2).map((uri) => (
                        <p key={uri} className="truncate" title={uri}>
                          {uri}
                        </p>
                      ))}
                      {(client.redirect_uris || []).length > 2 && (
                        <p className="text-muted-foreground text-xs">
                          +{(client.redirect_uris || []).length - 2} more
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {client.skip_consent ? "Skip" : "Required"}
                  </TableCell>
                  <TableCell className="text-right">
                    {client.client_id ? (
                      <div className="flex justify-end gap-2">
                        <Button asChild variant="ghost" size="sm">
                          <Link
                            href={`/admin/client/${encodeURIComponent(client.client_id)}`}
                          >
                            View
                          </Link>
                        </Button>
                        <DeleteClientButton clientId={client.client_id} />
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {filteredClients.length === 0 ? 0 : startIndex + 1}-
          {Math.min(startIndex + PAGE_SIZE, filteredClients.length)} of {filteredClients.length} clients
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
    </div>
  );
}
