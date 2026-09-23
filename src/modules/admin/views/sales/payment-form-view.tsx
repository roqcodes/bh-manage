"use client";

import { useEffect, useId, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import type { PaidThroughAccountOption } from "@/common/erp/sales-types";
import { PAYMENT_MODE_OPTIONS } from "@/common/erp/finance-types";
import { adminGet, adminPost } from "@/modules/admin/lib/admin-api-client";
import {
  AdminFormActions,
  AdminFormField,
  AdminFormGrid,
  AdminFormModalLayout,
  AdminFormSection,
  AdminFormShell,
  CustomerSearchSelect,
  ErpDocumentNumberField,
  InvoiceSearchSelect,
  type ErpFormViewBaseProps,
} from "@/modules/admin/ui";
import { formatCurrencyAmount } from "@/lib/format-currency";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useErpStores } from "@/modules/erp/components/use-erp-stores";

type InvoiceDetail = {
  id: string;
  user_id: string;
  balance_due: number;
  invoice_number: string;
  store_id: string | null;
  total_amount: number;
  amount_paid: number;
  users: { name: string | null; email: string | null } | null;
};

export type PaymentFormViewProps = ErpFormViewBaseProps;

function invoiceCustomerLabel(detail: InvoiceDetail) {
  return detail.users?.name ?? detail.users?.email ?? "";
}

function loadInvoiceFromApi(id: string) {
  return adminGet<InvoiceDetail>(`erp/invoices/${id}`);
}

function paymentModeDisplay(mode: string) {
  if (mode === "CreditCard") return "Card";
  if (mode === "BankRemittance") return "Bank remittance";
  if (mode === "BankTransfer") return "Bank transfer";
  return mode;
}

export function PaymentFormView({
  variant = "page",
  open = true,
  onOpenChange,
  onSuccess,
}: PaymentFormViewProps) {
  const router = useRouter();
  const formId = useId();
  const searchParams = useSearchParams();
  const preselectedInvoiceId = searchParams.get("invoiceId") ?? "";
  const preselectedCustomerId = searchParams.get("customerId") ?? "";
  const { activeStoreId } = useErpStores();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isModal = variant === "modal";

  const [depositAccounts, setDepositAccounts] = useState<PaidThroughAccountOption[]>([]);
  const [expenseAccounts, setExpenseAccounts] = useState<PaidThroughAccountOption[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceDetail | null>(null);

  const [customerId, setCustomerId] = useState("");
  const [customerLabel, setCustomerLabel] = useState("");
  const [invoiceId, setInvoiceId] = useState("");
  const [invoiceLabel, setInvoiceLabel] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMode, setPaymentMode] = useState<string>(PAYMENT_MODE_OPTIONS[0]);
  const [accountId, setAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [bankCharges, setBankCharges] = useState("");
  const [bankChargesAccountId, setBankChargesAccountId] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const storeId = activeStoreId ?? "";

  function loadInvoice(id: string) {
    return loadInvoiceFromApi(id).then((detail) => {
      setSelectedInvoice(detail);
      setInvoiceId(detail.id);
      setInvoiceLabel(detail.invoice_number);
      setCustomerId(detail.user_id);
      setCustomerLabel(invoiceCustomerLabel(detail));
      setAmount(String(detail.balance_due));
    });
  }

  useEffect(() => {
    if (!preselectedInvoiceId) return;
    loadInvoice(preselectedInvoiceId).catch(() => undefined);
  }, [preselectedInvoiceId]);

  useEffect(() => {
    if (!preselectedCustomerId || preselectedInvoiceId) return;
    setCustomerId(preselectedCustomerId);
  }, [preselectedCustomerId, preselectedInvoiceId]);

  useEffect(() => {
    if (!invoiceId || preselectedInvoiceId === invoiceId) return;
    loadInvoice(invoiceId).catch(() => undefined);
  }, [invoiceId, preselectedInvoiceId]);

  useEffect(() => {
    if (!storeId) return;
    adminGet<{ data: PaidThroughAccountOption[] }>(
      `erp/payments?view=accounts&storeId=${encodeURIComponent(storeId)}`,
    ).then((res) => {
      setDepositAccounts(res.data ?? []);
      setAccountId("");
    });
    adminGet<{ data: PaidThroughAccountOption[] }>(
      `erp/payments?view=expense-accounts&storeId=${encodeURIComponent(storeId)}`,
    ).then((res) => {
      setExpenseAccounts(res.data ?? []);
      setBankChargesAccountId("");
    });
  }, [storeId]);

  const bankChargesAmount = parseFloat(bankCharges) || 0;
  const showBankChargesAccount = bankChargesAmount > 0;

  function handleCancel() {
    if (isModal) {
      onOpenChange?.(false);
    } else {
      router.push("/admin/erp/payments");
    }
  }

  function handleSuccessNavigate(id?: string) {
    if (isModal) {
      onOpenChange?.(false);
      onSuccess?.(id);
      return;
    }
    router.push(id ? `/admin/erp/payments/${id}` : "/admin/erp/payments");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!customerId) {
      setError("Customer is required");
      return;
    }
    if (!invoiceId || !selectedInvoice) {
      setError("Invoice is required");
      return;
    }
    if (!accountId) {
      setError("Deposit To account is required");
      return;
    }
    const paidAmount = parseFloat(amount);
    if (!paidAmount || paidAmount <= 0) {
      setError("Paid amount must be greater than zero");
      return;
    }
    if (paidAmount > selectedInvoice.balance_due) {
      setError("Paid amount cannot exceed invoice balance");
      return;
    }
    if (bankChargesAmount >= paidAmount) {
      setError("Bank charges must be less than payment amount");
      return;
    }
    if (bankChargesAmount > 0 && !bankChargesAccountId) {
      setError("Expense account is required for bank charges");
      return;
    }

    startTransition(async () => {
      try {
        const res = await adminPost<{ id: string }>("erp/payments", {
          userId: customerId,
          storeId: selectedInvoice.store_id ?? storeId ?? undefined,
          paymentDate,
          paymentMode,
          accountId,
          totalAmount: paidAmount,
          bankCharges: bankChargesAmount,
          bankChargesAccountId: bankChargesAmount > 0 ? bankChargesAccountId : undefined,
          reference: reference.trim() || undefined,
          notes: notes.trim() || undefined,
          allocations: [{ invoiceId, amount: paidAmount }],
        });
        handleSuccessNavigate(res.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to record payment");
      }
    });
  }

  if (isModal && !open) return null;

  const paidAmount = parseFloat(amount) || 0;
  const remainingAfterPayment = selectedInvoice
    ? Math.max(0, selectedInvoice.balance_due - paidAmount)
    : 0;
  const netReceived = Math.max(0, paidAmount - bankChargesAmount);
  const paymentFieldsDisabled = !selectedInvoice;
  const selectClassName =
    "flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50";

  const title = "Payment received";
  const footer = isModal ? (
    <AdminFormActions
      formId={formId}
      onCancel={handleCancel}
      submitLabel="Record payment"
      pending={pending}
    />
  ) : undefined;

  const summarySidebar = (
    <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4 text-sm">
      <p className="font-semibold tracking-tight">Invoice summary</p>
      {selectedInvoice ? (
        <>
          <div className="space-y-2.5">
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Customer</span>
              <span className="max-w-[58%] truncate text-right font-medium">
                {customerLabel || "—"}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Invoice</span>
              <span className="font-medium">{selectedInvoice.invoice_number}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Invoice total</span>
              <span className="tabular-nums">{formatCurrencyAmount(selectedInvoice.total_amount)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Already paid</span>
              <span className="tabular-nums">{formatCurrencyAmount(selectedInvoice.amount_paid)}</span>
            </div>
            <div className="flex justify-between gap-3 border-t border-border/80 pt-2.5">
              <span className="font-medium">Balance due</span>
              <span className="font-semibold tabular-nums">
                {formatCurrencyAmount(selectedInvoice.balance_due)}
              </span>
            </div>
          </div>
          {paidAmount > 0 ? (
            <div className="space-y-2 rounded-md border border-border/80 bg-background/80 p-3">
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">This payment</span>
                <span className="font-semibold tabular-nums">{formatCurrencyAmount(paidAmount)}</span>
              </div>
              {bankChargesAmount > 0 ? (
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Bank charges</span>
                  <span className="tabular-nums text-rose-600">
                    −{formatCurrencyAmount(bankChargesAmount)}
                  </span>
                </div>
              ) : null}
              <div className="flex justify-between gap-3 border-t border-border/60 pt-2">
                <span className="font-medium">Net received</span>
                <span className="font-semibold tabular-nums">{formatCurrencyAmount(netReceived)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Remaining</span>
                <span className="font-medium tabular-nums">
                  {formatCurrencyAmount(remainingAfterPayment)}
                </span>
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <p className="text-xs leading-relaxed text-muted-foreground">
          Select an open invoice to view balances and enter payment details.
        </p>
      )}
    </div>
  );

  const formContent = (
    <AdminFormModalLayout
      sidebar={summarySidebar}
      className="lg:grid-cols-[minmax(0,1fr)_minmax(240px,300px)]"
    >
      <AdminFormSection title="Invoice & customer">
        <div className="space-y-3">
          <AdminFormField label="Invoice" required>
            <InvoiceSearchSelect
              value={invoiceId || null}
              selectedLabel={invoiceLabel || undefined}
              storeId={storeId || undefined}
              openOnly
              disabled={!storeId}
              onChange={(id, option) => {
                setInvoiceId(id ?? "");
                setInvoiceLabel(option?.label ?? "");
                if (!id) {
                  setSelectedInvoice(null);
                  setAmount("");
                }
              }}
            />
            {!storeId ? (
              <p className="mt-1.5 text-xs text-muted-foreground">
                Select an active store to search open invoices.
              </p>
            ) : null}
          </AdminFormField>
          <AdminFormGrid cols={2}>
            <AdminFormField label="Customer" required>
              <CustomerSearchSelect
                value={customerId || null}
                selectedLabel={customerLabel || undefined}
                disabled={Boolean(selectedInvoice)}
                onChange={(id, option) => {
                  setCustomerId(id ?? "");
                  setCustomerLabel(option?.label ?? "");
                }}
              />
            </AdminFormField>
            <ErpDocumentNumberField kind="PR" />
          </AdminFormGrid>
        </div>
      </AdminFormSection>

      <AdminFormSection title="Payment details">
        {!selectedInvoice ? (
          <p className="mb-3 text-xs text-muted-foreground">
            Choose an invoice above to enable payment fields.
          </p>
        ) : null}
        <AdminFormGrid cols={3}>
          <AdminFormField label="Payment date" required>
            <Input
              type="date"
              value={paymentDate}
              disabled={paymentFieldsDisabled}
              onChange={(e) => setPaymentDate(e.target.value)}
              required
            />
          </AdminFormField>
          <AdminFormField label="Payment type" required>
            <select
              className={selectClassName}
              value={paymentMode}
              disabled={paymentFieldsDisabled}
              onChange={(e) => setPaymentMode(e.target.value)}
            >
              {PAYMENT_MODE_OPTIONS.map((mode) => (
                <option key={mode} value={mode}>
                  {paymentModeDisplay(mode)}
                </option>
              ))}
            </select>
          </AdminFormField>
          <AdminFormField label="Deposit to" required>
            <select
              className={selectClassName}
              value={accountId}
              disabled={paymentFieldsDisabled}
              onChange={(e) => setAccountId(e.target.value)}
              required
            >
              <option value="">Select deposit account</option>
              {depositAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </AdminFormField>
          <AdminFormField label="Amount received" required className="sm:col-span-2">
            <div className="flex flex-wrap gap-2">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                disabled={paymentFieldsDisabled}
                onChange={(e) => setAmount(e.target.value)}
                className="min-w-[140px] flex-1"
                required
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-10 shrink-0"
                disabled={paymentFieldsDisabled}
                onClick={() => setAmount(String(selectedInvoice?.balance_due ?? 0))}
              >
                Pay full balance
              </Button>
            </div>
          </AdminFormField>
          <AdminFormField label="Bank charges">
            <Input
              type="number"
              min="0"
              step="0.01"
              value={bankCharges}
              disabled={paymentFieldsDisabled}
              onChange={(e) => setBankCharges(e.target.value)}
              placeholder="0.00"
            />
          </AdminFormField>
          {showBankChargesAccount ? (
            <AdminFormField label="Bank charges expense account" required className="sm:col-span-2">
              <select
                className={selectClassName}
                value={bankChargesAccountId}
                disabled={paymentFieldsDisabled}
                onChange={(e) => setBankChargesAccountId(e.target.value)}
              >
                <option value="">Select expense account</option>
                {expenseAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </AdminFormField>
          ) : null}
          <AdminFormField label="Reference">
            <Input
              value={reference}
              disabled={paymentFieldsDisabled}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Cheque / transaction ref"
            />
          </AdminFormField>
          <AdminFormField label="Notes" className="sm:col-span-2">
            <Textarea
              value={notes}
              disabled={paymentFieldsDisabled}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Internal notes (optional)"
            />
          </AdminFormField>
        </AdminFormGrid>
      </AdminFormSection>
    </AdminFormModalLayout>
  );

  return (
    <AdminFormShell
      variant={variant}
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={
        isModal
          ? "Select an open invoice, then enter how much was received."
          : "Record a customer payment against an invoice."
      }
      backHref="/admin/erp/payments"
      breadcrumb={[
        { label: "Payments", href: "/admin/erp/payments" },
        { label: title },
      ]}
      size={isModal ? "landscape" : "lg"}
      formId={formId}
      footer={footer}
    >
      <form id={formId} onSubmit={handleSubmit} className="space-y-4">
        {formContent}
        {error ? (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        ) : null}
        {!isModal ? (
          <div className="flex flex-wrap justify-end gap-2">
            <Link href="/admin/erp/payments" className={buttonVariants({ variant: "ghost" })}>
              Cancel
            </Link>
            <Button type="submit" disabled={pending || !selectedInvoice}>
              {pending ? "Saving…" : "Record payment"}
            </Button>
          </div>
        ) : null}
      </form>
    </AdminFormShell>
  );
}
