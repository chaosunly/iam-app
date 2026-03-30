import { Badge } from "@/components/ui/badge";

export const ROLE_LABELS: Record<string, string> = {
  matrix_admin: "Matrix Admin",
  moderator: "Moderator",
  support: "Support",
  member: "Member",
  viewer: "Viewer",
};

const ROLE_CLASSES: Record<string, string> = {
  matrix_admin:
    "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 border-transparent",
  moderator:
    "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-transparent",
  support:
    "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border-transparent",
  member:
    "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-transparent",
  viewer: "",
};

export function RoleBadge({ role }: { role: string }) {
  const classes = ROLE_CLASSES[role];
  return (
    <Badge
      variant={classes ? "outline" : "secondary"}
      className={classes}
    >
      {ROLE_LABELS[role] ?? role}
    </Badge>
  );
}
