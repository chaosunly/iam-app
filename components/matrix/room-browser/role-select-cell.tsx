"use client";

import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useApiMutation } from "@/lib/hooks/use-api-mutation";
import { MATRIX_ROLES, ROLE_LABELS, ROLE_CLASSES } from "./role-badge";
import type { MatrixResourceType } from "./types";

interface RoleSelectCellProps {
  userId: string;
  resourceType: MatrixResourceType;
  resourceId: string;
  role: string;
  onRefresh: () => void;
}

export function RoleSelectCell({
  userId,
  resourceType,
  resourceId,
  role,
  onRefresh,
}: RoleSelectCellProps) {
  const { mutate, isPending } = useApiMutation<
    { userId: string; resourceType: string; resourceId: string; newRole: string },
    { assignment: unknown }
  >("/api/admin/matrix/roles", {
    method: "PUT",
    onSuccess: () => {
      toast.success("Role updated");
      onRefresh();
    },
  });

  return (
    <Select
      value={role}
      onValueChange={(newRole) =>
        mutate({ userId, resourceType, resourceId, newRole })
      }
      disabled={isPending}
    >
      <SelectTrigger
        className={`h-auto w-auto gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold shadow-none focus:ring-0 ${ROLE_CLASSES[role] ?? ""}`}
      >
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
  );
}
