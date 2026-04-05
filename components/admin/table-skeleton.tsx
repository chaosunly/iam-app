import { TableBody, TableCell, TableRow } from "@/components/ui/table";

interface TableSkeletonProps {
  columns: number;
  rows?: number;
}

export function TableSkeleton({ columns, rows = 5 }: TableSkeletonProps) {
  const widths = ["w-full", "w-3/4", "w-1/2", "w-2/3", "w-1/3"];

  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <TableRow key={rowIndex} className="hover:bg-transparent">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <TableCell key={colIndex}>
              <div
                className={`h-4 animate-pulse rounded bg-muted ${
                  widths[(rowIndex + colIndex) % widths.length]
                }`}
              />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}
