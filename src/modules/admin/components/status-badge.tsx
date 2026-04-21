import type { OrderStatus } from "@/common/admin/types";

/** PO / misc statuses not in customer order pipeline */
const EXTRA_STATUS_STYLES: Record<
  string,
  { bg: string; text: string; dot: string }
> = {
  accepted: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    dot: "bg-blue-400",
  },
};

const STATUS_STYLES: Record<
  OrderStatus,
  { bg: string; text: string; dot: string }
> = {
  pending: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    dot: "bg-amber-400",
  },
  processing: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    dot: "bg-blue-400",
  },
  shipped: {
    bg: "bg-purple-50",
    text: "text-purple-700",
    dot: "bg-purple-400",
  },
  delivered: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
  },
  cancelled: {
    bg: "bg-red-50",
    text: "text-red-600",
    dot: "bg-red-400",
  },
};

export function StatusBadge({ status }: { status: string }) {
  const style =
    STATUS_STYLES[status as OrderStatus] ??
    EXTRA_STATUS_STYLES[status] ?? {
      bg: "bg-slate-100",
      text: "text-slate-600",
      dot: "bg-slate-400",
    };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${style.bg} ${style.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {status}
    </span>
  );
}
