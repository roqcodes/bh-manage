"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export type ErpFormModalMode = "new" | "edit";

export function useErpFormModal(listPath?: string) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const basePath = listPath ?? pathname;
  const formMode = searchParams.get("form") as ErpFormModalMode | null;
  const editId = searchParams.get("id");
  const isOpen = formMode === "new" || (formMode === "edit" && Boolean(editId));

  const extraParams = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("form");
    params.delete("id");
    return params;
  }, [searchParams]);

  const buildUrl = useCallback(
    (form: ErpFormModalMode | null, id?: string | null, extra?: Record<string, string>) => {
      const params = new URLSearchParams(extraParams.toString());
      if (extra) {
        for (const [key, value] of Object.entries(extra)) {
          if (value) params.set(key, value);
        }
      }
      if (form) {
        params.set("form", form);
        if (form === "edit" && id) params.set("id", id);
      }
      const qs = params.toString();
      return qs ? `${basePath}?${qs}` : basePath;
    },
    [basePath, extraParams],
  );

  const openNew = useCallback(
    (extra?: Record<string, string>) => {
      router.push(buildUrl("new", null, extra));
    },
    [router, buildUrl],
  );

  const openEdit = useCallback(
    (id: string, extra?: Record<string, string>) => {
      router.push(buildUrl("edit", id, extra));
    },
    [router, buildUrl],
  );

  const close = useCallback(() => {
    router.push(buildUrl(null));
  }, [router, buildUrl]);

  return {
    isOpen,
    formMode,
    editId,
    mode: formMode === "edit" ? ("edit" as const) : ("create" as const),
    openNew,
    openEdit,
    close,
    modalProps: {
      open: isOpen,
      onOpenChange: (open: boolean) => {
        if (!open) close();
      },
    },
  };
}
