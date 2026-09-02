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

  const title = "Payment received";
  const footer = isModal ? (
    <AdminFormActions
      formId={formId}
      onCancel={handleCancel}
      submitLabel="Record payment"
      pending={pending}
    />
  ) : undefined;

  const summarySidebar = selectedInvoice ? (
    <div className="space-y-3 rounded-lg border p-4 text-sm">
      <p className="font-semibold">Invoice summary</p>
      <div className="flex justify-between gap-3">
        <span className="text-muted-foreground">Invoice</span>
        <span className="font-medium">{selectedInvoice.invoice_number}</span>
      </div>
      <div className="flex justify-between gap-3">
        <span className="text-muted-foreground">Total</span>
        <span className="tabular-nums">{formatCurrencyAmount(selectedInvoice.total_amount)}</span>
      </div>
      <div className="flex justify-between gap-3">
        <span className="text-muted-foreground">Paid</span>
        <span className="tabular-nums">{formatCurrencyAmount(selectedInvoice.amount_paid)}</span>
      </div>
      <div className="flex justify-between gap-3 border-t pt-3">
        <span className="font-medium">Balance due</span>
        <span className="font-semibold tabular-nums">
          {formatCurrencyAmount(selectedInvoice.balance_due)}
        </span>
      </div>
    </div>
  ) : undefined;

  const formContent = (
    <AdminFormModalLayout sidebar={summarySidebar}>
      <AdminFormSection title="Payment details">
        <AdminFormGrid cols={3}>
          <ErpDocumentNumberField kind="PR" />
          <AdminFormField label="Invoice" required className="sm:col-span-2">
            <InvoiceSearchSelect
              value={invoiceId || null}
              selectedLabel={invoiceLabel || undefined}
              openOnly
              onChange={(id, option) => {
                setInvoiceId(id ?? "");
                setInvoiceLabel(option?.label ?? "");
                if (!id) setSelectedInvoice(null);
              }}
            />
          </AdminFormField>
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
          {selectedInvoice ? (
            <>
              <AdminFormField label="Payment date">
                <Input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                />
              </AdminFormField>
              <AdminFormField label="Payment type">
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                >
                  {PAYMENT_MODE_OPTIONS.map((mode) => (
                    <option key={mode} value={mode}>
                      {paymentModeDisplay(mode)}
                    </option>
                  ))}
                </select>
              </AdminFormField>
              <AdminFormField label="Deposit To" required>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                >
                  <option value="">Select deposit account</option>
                  {depositAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </AdminFormField>
              <AdminFormField label="Amount received">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </AdminFormField>
              <AdminFormField label="Bank charges">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={bankCharges}
                  onChange={(e) => setBankCharges(e.target.value)}
                  placeholder="0.00"
                />
              </AdminFormField>
              {showBankChargesAccount ? (
                <AdminFormField label="Bank charges expense account" required>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                    value={bankChargesAccountId}
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
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Cheque / txn ref"
                />
              </AdminFormField>
              <AdminFormField label="Notes" className="sm:col-span-2">
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
              </AdminFormField>
            </>
          ) : null}
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
      description="Record a customer payment against an invoice."
      backHref="/admin/erp/payments"
      breadcrumb={[
        { label: "Payments", href: "/admin/erp/payments" },
        { label: title },
      ]}
      size="lg"
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
