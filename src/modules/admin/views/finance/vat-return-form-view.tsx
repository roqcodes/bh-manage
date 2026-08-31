"use client";

import { useEffect, useId, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { adminPost } from "@/modules/admin/lib/admin-api-client";
import {
  AdminFormActions,
  AdminFormField,
  AdminFormGrid,
  AdminFormSection,
  AdminFormShell,
  type ErpFormViewBaseProps,
} from "@/modules/admin/ui";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StoreSelect, useErpStores } from "@/modules/erp/components/use-erp-stores";

export type VatReturnFormViewProps = ErpFormViewBaseProps;

export function VatReturnFormView({
  variant = "page",
  open = true,
  onOpenChange,
  onSuccess,
}: VatReturnFormViewProps) {
  const router = useRouter();
  const formId = useId();
  const { stores, activeStoreId } = useErpStores();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [storeId, setStoreId] = useState(activeStoreId ?? "");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [notes, setNotes] = useState("");
  const isModal = variant === "modal";

  useEffect(() => {
    if (activeStoreId && !storeId) setStoreId(activeStoreId);
  }, [activeStoreId, storeId]);

  function handleCancel() {
    if (isModal) {
      onOpenChange?.(false);
    } else {
      router.push("/admin/erp/vat-returns");
    }
  }

  function handleSuccessNavigate() {
    if (isModal) {
      onOpenChange?.(false);
      onSuccess?.();
      return;
    }
    router.push("/admin/erp/vat-returns");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!storeId) return setError("Store is required.");
    if (!periodStart || !periodEnd) return setError("Period dates are required.");
    if (periodEnd < periodStart) return setError("End date must be on or after start date.");

    startTransition(async () => {
      try {
        await adminPost("erp/vat-returns", {
          storeId,
          periodStart,
          periodEnd,
          notes: notes.trim() || undefined,
        });
        handleSuccessNavigate();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save VAT return.");
      }
    });
  }

  if (isModal && !open) return null;

  const title = "Add VAT return";
  const footer = isModal ? (
    <AdminFormActions
      formId={formId}
      onCancel={handleCancel}
      submitLabel="Save VAT return"
      pending={isPending}
    />
  ) : undefined;

  return (
    <AdminFormShell
      variant={variant}
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description="Create a VAT return for a store and reporting period."
      backHref="/admin/erp/vat-returns"
      breadcrumb={[
        { label: "VAT returns", href: "/admin/erp/vat-returns" },
        { label: title },
      ]}
      size="md"
      formId={formId}
      footer={footer}
    >
      <form id={formId} onSubmit={handleSubmit} className="space-y-4">
        <AdminFormSection title="Return details">
          <AdminFormGrid cols={3}>
            <AdminFormField label="Store" required>
              <StoreSelect value={storeId} onChange={setStoreId} stores={stores} label="" />
            </AdminFormField>
            <AdminFormField label="VAT return start date" required>
              <Input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                required
              />
            </AdminFormField>
            <AdminFormField label="VAT return end date" required>
              <Input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                required
              />
            </AdminFormField>
            <AdminFormField label="Note" className="sm:col-span-2 lg:col-span-3">
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} />
            </AdminFormField>
          </AdminFormGrid>
        </AdminFormSection>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {!isModal ? (
          <div className="flex flex-wrap justify-end gap-2">
            <Link href="/admin/erp/vat-returns" className={buttonVariants({ variant: "outline" })}>
              Cancel
            </Link>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : "Save VAT return"}
            </Button>
          </div>
        ) : null}
      </form>
    </AdminFormShell>
  );
}
