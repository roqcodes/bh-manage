"use client";

import { CustomerFormView } from "@/modules/customers/components/customer-form-view";

export function AdminCustomerFormView({
  mode,
  customerId,
  variant = "page",
  open,
  onOpenChange,
  onSuccess,
}: {
  mode: "create" | "edit";
  customerId?: string;
  variant?: "page" | "modal";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: (id?: string) => void;
}) {
  return (
    <CustomerFormView
      mode={mode}
      customerId={customerId}
      variant={variant}
      open={open}
      onOpenChange={onOpenChange}
      onSuccess={onSuccess}
    />
  );
}
