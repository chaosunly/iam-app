"use client";

import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FormErrorAlert } from "@/components/ui/form-error-alert";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useApiMutation } from "@/lib/hooks/use-api-mutation";
import { ROLE_LABELS, MATRIX_ROLES } from "./role-badge";
import type { Identity } from "./types";

interface AssignRoleFormProps {
  roomId: string;
  identities: Identity[];
  onAssigned: () => void;
}

function identityLabel(identity: Identity): string {
  const n = identity.traits?.name;
  const fullName = n ? [n.first, n.last].filter(Boolean).join(" ") : "";
  return identity.traits?.email || fullName || identity.id;
}

export function AssignRoleForm({
  roomId,
  identities,
  onAssigned,
}: AssignRoleFormProps) {
  const [open, setOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [role, setRole] = useState<string>("member");

  const selectedIdentity = identities.find((i) => i.id === selectedUserId);

  const { mutate, isPending, error } = useApiMutation<
    { userId: string; resourceType: string; resourceId: string; role: string },
    { sync?: { skipped?: boolean; synced?: boolean; error?: string } }
  >("/api/admin/matrix/roles", {
    onSuccess: (data) => {
      const sync = data.sync;
      if (sync?.skipped) toast.info("Role assigned (Matrix sync disabled)");
      else if (sync?.synced) toast.success("Role assigned and synced to Matrix");
      else if (sync?.error)
        toast.warning(`Role assigned but sync failed: ${sync.error}`);
      else toast.success("Role assigned");
      setSelectedUserId("");
      setRole("member");
      onAssigned();
    },
  });

  function handleAssign() {
    if (!selectedUserId) return;
    mutate({ userId: selectedUserId, resourceType: "room", resourceId: roomId, role });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-2">
        <div className="flex-1 space-y-1">
          <p className="text-xs font-medium text-muted-foreground">User</p>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full justify-between font-normal"
              >
                {selectedIdentity
                  ? identityLabel(selectedIdentity)
                  : "Search user..."}
                <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="start">
              <Command>
                <CommandInput placeholder="Search by email or name..." />
                <CommandList>
                  <CommandEmpty>No users found.</CommandEmpty>
                  <CommandGroup>
                    {identities.map((identity) => (
                      <CommandItem
                        key={identity.id}
                        value={identityLabel(identity)}
                        onSelect={() => {
                          setSelectedUserId(identity.id);
                          setOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 size-4",
                            selectedUserId === identity.id
                              ? "opacity-100"
                              : "opacity-0",
                          )}
                        />
                        <span className="truncate">{identityLabel(identity)}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        <div className="w-36 space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Role</p>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MATRIX_ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {ROLE_LABELS[r]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={handleAssign}
          disabled={!selectedUserId || isPending}
        >
          {isPending ? "Assigning..." : "Assign"}
        </Button>
      </div>

      <FormErrorAlert error={error} />
    </div>
  );
}
