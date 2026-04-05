import { AlertCircle, RotateCcw } from "lucide-react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

interface TableErrorStateProps {
  message: string;
  colSpan: number;
  onRetry: () => void;
}

export function TableErrorState({
  message,
  colSpan,
  onRetry,
}: TableErrorStateProps) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={colSpan} className="py-16 text-center">
        <AlertCircle className="mx-auto mb-3 h-8 w-8 text-destructive" />
        <p className="mb-1 font-semibold">Failed to load data</p>
        <p className="mb-4 text-sm text-muted-foreground">{message}</p>
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
          Try again
        </Button>
      </TableCell>
    </TableRow>
  );
}
