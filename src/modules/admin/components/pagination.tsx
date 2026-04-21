"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { PAGE_SIZE } from "@/common/admin/types";

interface PaginationProps {
  total: number;
  page: number;
  basePath: string;
  extraParams?: Record<string, string>;
}

export function Pagination({
  total,
  page,
  basePath,
  extraParams = {},
}: PaginationProps) {
  const router = useRouter();
  const totalPages = Math.ceil(total / PAGE_SIZE);

  if (totalPages <= 1) return null;

  function buildUrl(p: number) {
    const params = new URLSearchParams({ ...extraParams, page: String(p) });
    return `${basePath}?${params.toString()}`;
  }

  const start = page * PAGE_SIZE + 1;
  const end = Math.min((page + 1) * PAGE_SIZE, total);

  return (
    <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
      <p className="text-[13px] text-slate-500">
        <span className="font-bold text-slate-900">
          {start}–{end}
        </span>{" "}
        of {total}
      </p>
      <div className="flex gap-1.5">
        <button
          disabled={page === 0}
          onClick={() => router.push(buildUrl(page - 1))}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:opacity-40"
        >
          <ChevronLeft size={14} />
        </button>
        <button
          disabled={page >= totalPages - 1}
          onClick={() => router.push(buildUrl(page + 1))}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:opacity-40"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
