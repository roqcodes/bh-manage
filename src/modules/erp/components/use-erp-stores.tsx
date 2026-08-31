"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import type { ErpContext } from "@/common/erp/types";
import { adminGet, adminPost } from "@/modules/admin/lib/admin-api-client";
import { adminQueryKeys } from "@/modules/admin/lib/admin-query-keys";

type StoreOption = { id: string; name: string };

export type ErpContextQueryData = {
  context: ErpContext | null;
  stores: StoreOption[];
};

export function useErpContextQuery() {
  return useQuery({
    queryKey: adminQueryKeys.erpContext(),
    queryFn: () => adminGet<ErpContextQueryData>("erp/context"),
    staleTime: 30_000,
  });
}

export async function refreshAdminAfterStoreChange(
  queryClient: ReturnType<typeof useQueryClient>,
  router: ReturnType<typeof useRouter>,
  storeId?: string | null,
) {
  await queryClient.invalidateQueries({ queryKey: ["admin"] });
  router.refresh();
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("buyhub:erp-store-changed", { detail: storeId ?? "" }),
    );
  }
}

export function useErpStores() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { data, isPending, refetch } = useErpContextQuery();
  const [isSwitching, startTransition] = useTransition();

  const stores = data?.stores ?? [];
  const activeStoreId = data?.context?.store_id ?? "";

  function switchActiveStore(storeId: string) {
    if (!storeId || storeId === activeStoreId) return Promise.resolve();
    return new Promise<void>((resolve, reject) => {
      startTransition(async () => {
        try {
          const res = await adminPost<ErpContextQueryData>("erp/context", {
            storeId,
          });
          queryClient.setQueryData<ErpContextQueryData>(
            adminQueryKeys.erpContext(),
            (prev) => ({
              stores: prev?.stores ?? stores,
              context: res.context,
            }),
          );
          await refreshAdminAfterStoreChange(queryClient, router, res.context?.store_id);
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    });
  }

  return {
    stores,
    activeStoreId,
    setActiveStoreId: (_id: string) => {
      /* store id is owned by erp context query */
    },
    switchActiveStore,
    loading: isPending,
    isSwitching,
    reload: () => refetch().then(() => undefined),
  };
}

export function StoreSelect({
  value,
  onChange,
  stores,
  label = "Store",
  allowAll = false,
}: {
  value: string;
  onChange: (v: string) => void;
  stores: StoreOption[];
  label?: string;
  allowAll?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-slate-700">{label}</span>
      <select
        className="h-9 rounded-md border border-input px-3"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {allowAll ? <option value="">All stores</option> : <option value="">Select store</option>}
        {stores.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
    </label>
  );
}
