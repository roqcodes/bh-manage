"use client";

import Link from "next/link";

import { ProcurementWorkspace } from "@/modules/procurement/components/procurement-workspace";

export function AdminProcurementView() {
  return (
    <div className="mx-auto w-full max-w-[1200px] px-3 py-3 sm:px-4 sm:py-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <header className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            Procurement
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm font-medium leading-relaxed text-slate-500 sm:text-[15px]">
            Refill central warehouse when customer orders exceed on-hand stock. Vendor prices here
            are purchase costs — customer list prices are managed on each{" "}
            <Link href="/admin/products" className="font-bold text-[#2563EB] hover:underline">
              product page
            </Link>
            .
          </p>
        </header>
      </div>

      <ProcurementWorkspace />
    </div>
  );
}
