"use client";

import Link from "next/link";
import { FileStack } from "lucide-react";

import { ProcurementWorkspace } from "@/modules/procurement/components/procurement-workspace";

export function AdminProcurementView() {
  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6 sm:py-8 lg:py-10">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <header className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            Procurement & pricing
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm font-medium leading-relaxed text-slate-500 sm:text-[15px]">
            Shortage planning from open customer orders, vendor allocation, and
            approval into purchase orders. Use the pricing preview to validate
            margin math before you run the engine.
          </p>
        </header>

      </div>

      <ProcurementWorkspace />
    </div>
  );
}
