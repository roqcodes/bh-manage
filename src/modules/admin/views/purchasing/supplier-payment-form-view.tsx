"use client";

import { useEffect, useId, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import type { PayablePurchaseBillRow, PaidThroughAccountOption } from "@/common/erp/purchasing-types";
import { ERP_SUPPLIER_PAYMENT_MODES } from "@/common/erp/purchasing-types";
import { adminGet, adminPost } from "@/modules/admin/lib/admin-api-client";
import { formatCurrencyAmount } from "@/lib/format-currency";
import {
  AdminFormActions,
  AdminFormColumns,
  AdminFormField,
  AdminFormGrid,
  AdminFormSection,
  AdminFormShell,
  ErpDocumentNumberField,
  PurchaseBillSearchSelect,
  VendorSearchSelect,
  type ErpFormViewBaseProps,
} from "@/modules/admin/ui";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useErpStores } from "@/modules/erp/components/use-erp-stores";

export type SupplierPaymentFormViewProps = ErpFormViewBaseProps;

export function SupplierPaymentFormView({
  variant = "page",
  open = true,
  onOpenChange,
  onSuccess,
}: SupplierPaymentFormViewProps) {
  const router = useRouter();
  const formId = useId();
  const searchParams = useSearchParams();
  const { activeStoreId } = useErpStores();
  const prefillBillId = searchParams.get("billId") ?? "";
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isModal = variant === "modal";

  const [accounts, setAccounts] = useState<PaidThroughAccountOption[]>([]);
  const [expenseAccounts, setExpenseAccounts] = useState<PaidThroughAccountOption[]>([]);
  const [vendorId, setVendorId] = useState("");
  const [vendorLabel, setVendorLabel] = useState("");
  const [billId, setBillId] = useState(prefillBillId);
  const [billLabel, setBillLabel] = useState("");
  const [selectedBill, setSelectedBill] = useState<PayablePurchaseBillRow | null>(null);
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMode, setPaymentMode] = useState<string>(ERP_SUPPLIER_PAYMENT_MODES[0]);
  const [accountId, setAccountId] = useState("");
  const [bankCharges, setBankCharges] = useState("");
  const [bankChargesAccountId, setBankChargesAccountId] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const q = activeStoreId ? `&storeId=${encodeURIComponent(activeStoreId)}` : "";
    adminGet<{ data: PaidThroughAccountOption[] }>(`erp/supplier-payments?view=accounts${q}`).then(
      (res) => {
        setAccounts(res.data);
        setAccountId("");
      },
    );
    adminGet<{ data: PaidThroughAccountOption[] }>(
      `erp/supplier-payments?view=expense-accounts${q}`,
    ).then((res) => {
      setExpenseAccounts(res.data ?? []);
      setBankChargesAccountId("");
    });
  }, [activeStoreId]);

  useEffect(() => {
    if (!prefillBillId) return;
    adminGet<{ bill: { vendor_id: string; balance_due: number; purchase_bill_number: string } }>(
      `erp/purchase-bills/${prefillBillId}`,
    ).then((res) => {
      setVendorId(res.bill.vendor_id);
      setBillId(prefillBillId);
      setBillLabel(res.bill.purchase_bill_number);
      setAmount(String(res.bill.balance_due ?? 0));
    });
  }, [prefillBillId]);

  useEffect(() => {
    if (!billId) {
      setSelectedBill(null);
      return;
    }
    adminGet<{ bill: PayablePurchaseBillRow }>(`erp/purchase-bills/${billId}`).then((res) => {
      const bill = res.bill as PayablePurchaseBillRow;
      setSelectedBill(bill);
      if (!amount) setAmount(String(bill.balance_due ?? 0));
    });
  }, [billId, amount]);

  function handleCancel() {
    if (isModal) {
      onOpenChange?.(false);
    } else {
      router.push("/admin/erp/supplier-payments");
    }
  }

  function handleSuccessNavigate(id?: string) {
    if (isModal) {
      onOpenChange?.(false);
      onSuccess?.(id);
      return;
    }
    router.push(id ? `/admin/erp/supplier-payments/${id}` : "/admin/erp/supplier-payments");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const amt = parseFloat(amount);
    const bankChargesAmount = parseFloat(bankCharges) || 0;
    if (!vendorId) return setError("Vendor is required.");
    if (!billId) return setError("Bill is required.");
    if (!accountId) return setError("Paid through account is required.");
    if (!amt || amt <= 0) return setError("Amount must be positive.");
    if (bankChargesAmount >= amt) return setError("Bank charges must be less than payment amount.");
    if (bankChargesAmount > 0 && !bankChargesAccountId) {
      return setError("Expense account is required for bank charges.");
    }
    if (selectedBill && amt > selectedBill.balance_due) {
      return setError("Amount exceeds bill balance due.");
    }

    startTransition(async () => {
      try {
        const res = await adminPost<{ id: string }>("erp/supplier-payments", {
          vendorId,
          paymentDate,
          paymentMode,
          accountId,
          totalAmount: amt,
          bankCharges: bankChargesAmount,
          bankChargesAccountId: bankChargesAccountId || undefined,
          reference: reference || undefined,
          notes: notes || undefined,
          isBulk: false,
          allocations: [{ purchaseBillId: billId, amount: amt }],
        });
        handleSuccessNavigate(res.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save payment.");
      }
    });
  }

  if (isModal && !open) return null;

  const title = "Add payment made";
  const footer = isModal ? (
    <AdminFormActions
      formId={formId}
      onCancel={handleCancel}
      submitLabel="Save payment"
      pending={isPending}
    />
  ) : undefined;

  const billSummary = selectedBill ? (
    <div className="space-y-2 rounded-lg border p-4 text-sm">
      <p className="font-semibold">Bill summary</p>
      <p>Bill amount: {formatCurrencyAmount(selectedBill.total_amount)}</p>
      <p>Paid amount: {formatCurrencyAmount(selectedBill.amount_paid)}</p>
      <p className="font-semibold">Due amount: {formatCurrencyAmount(selectedBill.balance_due)}</p>
    </div>
  ) : null;

  return (
    <AdminFormShell
      variant={variant}
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description="Payment number is generated automatically on save."
      backHref="/admin/erp/supplier-payments"
      breadcrumb={[
        { label: "Payments made", href: "/admin/erp/supplier-payments" },
        { label: "Add payment" },
      ]}
      size="lg"
      formId={formId}
      footer={footer}
    >
      <form id={formId} onSubmit={handleSubmit} className="space-y-4">
        <AdminFormColumns cols={2}>
          <AdminFormSection title="Payment details">
            <AdminFormGrid cols={3}>
              <ErpDocumentNumberField kind="PM" />
              <AdminFormField label="Vendor" required className="sm:col-span-2">
                <VendorSearchSelect
                  value={vendorId || null}
                  selectedLabel={vendorLabel || undefined}
                  onChange={(id, option) => {
                    setVendorId(id ?? "");
                    setVendorLabel(option?.label ?? "");
                    setBillId("");
                    setBillLabel("");
                    setSelectedBill(null);
                  }}
                />
              </AdminFormField>
              <AdminFormField label="Payment date" required>
                <Input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  required
                />
              </AdminFormField>
              <AdminFormField label="Purchase bill" required className="sm:col-span-2">
                <PurchaseBillSearchSelect
                  value={billId || null}
                  selectedLabel={billLabel || undefined}
                  vendorId={vendorId || undefined}
                  storeId={activeStoreId || undefined}
                  disabled={!vendorId}
                  onChange={(id, option) => {
                    setBillId(id ?? "");
                    setBillLabel(option?.label ?? "");
                  }}
                />
              </AdminFormField>
              <AdminFormField label="Amount" required>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </AdminFormField>
              <AdminFormField label="Payment mode" required>
                <select
                  className="h-9 w-full rounded-md border border-input px-3 text-sm"
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                >
                  {ERP_SUPPLIER_PAYMENT_MODES.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </AdminFormField>
              <AdminFormField label="Paid through account" required className="sm:col-span-2">
                <select
                  className="h-9 w-full rounded-md border border-input px-3 text-sm"
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  required
                >
                  <option value="">Select account</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.account_type_name})
                    </option>
                  ))}
                </select>
              </AdminFormField>
              <AdminFormField label="Bank charges">
                <Input
                  type="number"
                  step="0.01"
                  value={bankCharges}
                  onChange={(e) => setBankCharges(e.target.value)}
                />
              </AdminFormField>
              <AdminFormField label="Bank charges account">
                <select
                  className="h-9 w-full rounded-md border border-input px-3 text-sm"
                  value={bankChargesAccountId}
                  onChange={(e) => setBankChargesAccountId(e.target.value)}
                >
                  <option value="">Select expense account</option>
                  {expenseAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </AdminFormField>
              <AdminFormField label="Reference #">
                <Input value={reference} onChange={(e) => setReference(e.target.value)} />
              </AdminFormField>
              <AdminFormField label="Notes" className="sm:col-span-2">
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
              </AdminFormField>
            </AdminFormGrid>
          </AdminFormSection>
          {billSummary ? <div className="lg:pt-8">{billSummary}</div> : null}
        </AdminFormColumns>

        {error ? <p className="text-sm text-rose-600">{error}</p> : null}

        {!isModal ? (
          <div className="flex flex-wrap justify-end gap-2">
            <Link href="/admin/erp/supplier-payments" className={buttonVariants({ variant: "outline" })}>
              Cancel
            </Link>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : "Save payment"}
            </Button>
          </div>
        ) : null}
      </form>
    </AdminFormShell>
  );
}
