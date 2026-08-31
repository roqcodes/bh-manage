"use client";

import type { ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { SortDirection } from "@/modules/admin/ui/use-sortable-data";

export function AdminDataTable({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <Table className={cn("text-sm", className)}>
      {children}
    </Table>
  );
}

export function AdminTableHeader({ children }: { children: ReactNode }) {
  return (
    <TableHeader>
      <TableRow className="bg-muted/40 hover:bg-muted/40">{children}</TableRow>
    </TableHeader>
  );
}

export function SortableTableHead({
  label,
  sortKey,
  activeKey,
  direction,
  onSort,
  className,
  align = "left",
}: {
  label: string;
  sortKey: string;
  activeKey: string | null;
  direction: SortDirection;
  onSort: (key: string) => void;
  className?: string;
  align?: "left" | "right" | "center";
}) {
  const active = activeKey === sortKey;
  const Icon = active ? (direction === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;

  return (
    <TableHead
      className={cn(
        "whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-muted-foreground",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          "inline-flex items-center gap-1 transition hover:text-foreground",
          align === "right" && "ml-auto",
          align === "center" && "mx-auto",
          active && "text-foreground",
        )}
      >
        {label}
        <Icon className="size-3.5 opacity-60" aria-hidden />
      </button>
    </TableHead>
  );
}

export function AdminTableBody({ children }: { children: ReactNode }) {
  return <TableBody>{children}</TableBody>;
}

export function AdminTableRow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <TableRow className={cn("hover:bg-muted/30", className)}>
      {children}
    </TableRow>
  );
}

export function AdminTableCell({
  children,
  className,
  align,
}: {
  children: ReactNode;
  className?: string;
  align?: "left" | "right" | "center";
}) {
  return (
    <TableCell
      className={cn(
        align === "right" && "text-right",
        align === "center" && "text-center",
        className,
      )}
    >
      {children}
    </TableCell>
  );
}
