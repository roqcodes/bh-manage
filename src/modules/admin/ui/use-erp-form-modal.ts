"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export type ErpFormModalMode = "new" | "edit";

export function useErpFormModal(listPath?: string) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const basePath = listPath ?? pathname;
  const formMode = searchParams.get("form") as ErpFormModalMode | null;
  const editId = searchParams.get("id");
  const isOpenFromUrl =
    formMode === "new" || (formMode === "edit" && Boolean(editId));

  /** Immediate dismiss while URL catches up (fixes close button / overlay on slow router). */
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isOpenFromUrl) {
      setDismissed(false);
    }
  }, [isOpenFromUrl]);

  const open = isOpenFromUrl && !dismissed;

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
      setDismissed(false);
      router.push(buildUrl("new", null, extra));
    },
    [router, buildUrl],
  );

  const openEdit = useCallback(
    (id: string, extra?: Record<string, string>) => {
      setDismissed(false);
      router.push(buildUrl("edit", id, extra));
    },
    [router, buildUrl],
  );

  const close = useCallback(() => {
    setDismissed(true);
    router.push(buildUrl(null));
  }, [router, buildUrl]);

  return {
    isOpen: open,
    formMode,
    editId,
    mode: formMode === "edit" ? ("edit" as const) : ("create" as const),
    openNew,
    openEdit,
    close,
    modalProps: {
      open,
      onOpenChange: (next: boolean) => {
        if (!next) close();
      },
    },
  };
}
