"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Package, Plus, Search, Trash2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CustomerSearchSelect } from "@/modules/admin/ui";
import { BillingMetricsBar } from "@/modules/billing/components/billing-metrics-bar";
import {
  formatBillingInr,
  roundMoney2,
} from "@/modules/billing/components/billing-ui";
import {
  searchBillingVariants,
  type BillingVariantSearchResult,
} from "@/app/admin/billing/actions";

interface CartItem extends BillingVariantSearchResult {
  cartQuantity: number;
  discount: number;
  finalPrice: number;
}

export function BillingPanel() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<BillingVariantSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [cart, setCart] = useState<CartItem[]>([]);

  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerLabel, setCustomerLabel] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [gstNumber, setGstNumber] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setIsSearching(true);
      searchBillingVariants(searchQuery)
        .then((res) => {
          setSearchResults(res);
          setIsSearching(false);
        })
        .catch(() => {
          setIsSearching(false);
        });
    }, 200);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const totals = useMemo(() => {
    const subtotal = cart.reduce(
      (sum, item) => sum + item.price * item.cartQuantity,
      0,
    );
    const totalDiscount = cart.reduce(
      (sum, item) => sum + item.discount * item.cartQuantity,
      0,
    );
    const tax = 0;
    const grandTotal = subtotal - totalDiscount + tax;
    const itemCount = cart.reduce((sum, item) => sum + item.cartQuantity, 0);
    return { subtotal, totalDiscount, tax, grandTotal, itemCount };
  }, [cart]);

  const hasStockIssue = cart.some((item) => item.cartQuantity > item.stock);

  function addToCart(variant: BillingVariantSearchResult) {
    setCart((prev) => {
      const existing = prev.find((item) => item.variantId === variant.variantId);
      if (existing) {
        if (existing.cartQuantity >= variant.stock) return prev;
        return prev.map((item) =>
          item.variantId === variant.variantId
            ? { ...item, cartQuantity: item.cartQuantity + 1 }
            : item,
        );
      }
      return [
        ...prev,
        {
          ...variant,
          cartQuantity: 1,
          discount: 0,
          finalPrice: variant.price,
        },
      ];
    });
  }

  function updateCartItem(variantId: string, updates: Partial<CartItem>) {
    setCart((prev) =>
      prev.map((item) => {
        if (item.variantId !== variantId) return item;
        const updated = { ...item, ...updates };
        if (updates.discount !== undefined) {
          updated.finalPrice = Math.max(0, updated.price - updated.discount);
        }
        if (updates.finalPrice !== undefined) {
          updated.discount = Math.max(0, updated.price - updated.finalPrice);
        }
        return updated;
      }),
    );
  }

  function removeCartItem(variantId: string) {
    setCart((prev) => prev.filter((item) => item.variantId !== variantId));
  }

  function clearBill() {
    setCart([]);
    setCustomerId(null);
    setCustomerLabel("");
    setCustomerName("");
    setPhone("");
    setCompany("");
    setGstNumber("");
    setSubmitMessage(null);
  }

  async function handleSaveInvoice() {
    if (cart.length === 0) {
      setSubmitMessage({ type: "error", text: "Cart is empty." });
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage(null);

    try {
      const payload = {
        userId: customerId ?? undefined,
        customerName: customerId ? undefined : customerName || undefined,
        phone,
        company,
        gstNumber,
        subtotal: totals.subtotal,
        tax: totals.tax,
        discount: totals.totalDiscount,
        totalAmount: totals.grandTotal,
        items: cart.map((item) => ({
          variantId: item.variantId,
          quantity: item.cartQuantity,
          unitPrice: item.finalPrice,
        })),
      };

      const res = await fetch("/api/admin/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to save sale");
      }

      const data = (await res.json()) as { orderId: string };
      setSubmitMessage({ type: "success", text: "Sale recorded in Online Sales." });
      router.push(`/admin/orders/${data.orderId}`);
    } catch (err) {
      setSubmitMessage({
        type: "error",
        text: err instanceof Error ? err.message : "An error occurred.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <BillingMetricsBar
        itemCount={totals.itemCount}
        lineCount={cart.length}
        subtotal={totals.subtotal}
        totalDiscount={totals.totalDiscount}
        grandTotal={totals.grandTotal}
        onClear={clearBill}
        onSave={handleSaveInvoice}
        canSave={cart.length > 0 && !hasStockIssue}
        isSubmitting={isSubmitting}
      />

      {submitMessage ? (
        <Alert variant={submitMessage.type === "error" ? "destructive" : "default"}>
          <AlertDescription>{submitMessage.text}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] lg:items-start">
        <Card className="border border-border ring-0 lg:sticky lg:top-20">
          <CardHeader className="border-b border-border">
            <CardTitle>Products</CardTitle>
            <CardDescription>Search catalog variants to add to the sale.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 pt-4">
            <InputGroup className="h-9">
              <InputGroupAddon align="inline-start">
                <Search aria-hidden />
              </InputGroupAddon>
              <InputGroupInput
                type="search"
                placeholder="Search product or variant..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </InputGroup>

            <div className="max-h-[min(60vh,520px)] overflow-y-auto pr-1">
              {isSearching ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Searching…
                </p>
              ) : searchResults.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                  <Package className="size-10 text-muted-foreground/40" aria-hidden />
                  <p className="text-sm text-muted-foreground">No products found.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {searchResults.map((item) => (
                    <div
                      key={item.variantId}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {item.productName}
                        </p>
                        {item.variantName ? (
                          <p className="truncate text-xs text-muted-foreground">
                            {item.variantName}
                          </p>
                        ) : null}
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <span className="text-xs font-semibold tabular-nums">
                            {formatBillingInr(item.price)}
                          </span>
                          <Badge
                            variant="outline"
                            className={
                              item.stock <= 0
                                ? "border-rose-200 bg-rose-50 text-rose-700"
                                : undefined
                            }
                          >
                            {item.stock.toLocaleString("en-IN")} in stock
                          </Badge>
                        </div>
                      </div>
                      <Button
                        size="icon-sm"
                        variant="outline"
                        disabled={item.stock <= 0}
                        onClick={() => addToCart(item)}
                        aria-label={`Add ${item.productName}`}
                      >
                        <Plus />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="border border-border ring-0">
            <CardHeader className="border-b border-border">
              <CardTitle>Customer</CardTitle>
              <CardDescription>
                Link a registered customer or enter walk-in details.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 pt-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Registered customer</Label>
                <CustomerSearchSelect
                  value={customerId}
                  selectedLabel={customerLabel || undefined}
                  onChange={(id, option) => {
                    setCustomerId(id);
                    setCustomerLabel(option?.label ?? "");
                    if (id) {
                      setCustomerName("");
                    }
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="billing-customer-name">Walk-in name</Label>
                <Input
                  id="billing-customer-name"
                  placeholder="Guest name"
                  value={customerName}
                  disabled={Boolean(customerId)}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="billing-phone">Phone</Label>
                <Input
                  id="billing-phone"
                  placeholder="Enter phone number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="billing-company">Company</Label>
                <Input
                  id="billing-company"
                  placeholder="Company name"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="billing-gst">GST number</Label>
                <Input
                  id="billing-gst"
                  placeholder="GST number"
                  value={gstNumber}
                  onChange={(e) => setGstNumber(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border ring-0">
            <CardHeader className="border-b border-border">
              <CardTitle>Sale items</CardTitle>
              <CardDescription>
                Adjust quantity and per-unit discount before completing the sale.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
                  <Package className="size-10 text-muted-foreground/40" aria-hidden />
                  <p className="text-sm text-muted-foreground">
                    No items added to this bill yet.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Product</TableHead>
                      <TableHead className="w-24">Qty</TableHead>
                      <TableHead>Unit price</TableHead>
                      <TableHead>Discount</TableHead>
                      <TableHead className="text-right">Line total</TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cart.map((item) => (
                      <TableRow key={item.variantId}>
                        <TableCell>
                          <div className="min-w-0">
                            <p className="text-sm font-medium">{item.productName}</p>
                            {item.variantName ? (
                              <p className="text-xs text-muted-foreground">
                                {item.variantName}
                              </p>
                            ) : null}
                            {item.cartQuantity > item.stock ? (
                              <p className="text-xs text-rose-600">
                                Exceeds stock ({item.stock})
                              </p>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            className="h-8 w-20 tabular-nums"
                            type="number"
                            min={1}
                            max={item.stock}
                            value={item.cartQuantity}
                            onChange={(e) =>
                              updateCartItem(item.variantId, {
                                cartQuantity: Math.max(
                                  1,
                                  parseInt(e.target.value, 10) || 1,
                                ),
                              })
                            }
                          />
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {formatBillingInr(item.price)}
                        </TableCell>
                        <TableCell>
                          <Input
                            className="h-8 w-24 tabular-nums"
                            type="number"
                            min={0}
                            step="0.01"
                            value={roundMoney2(item.discount).toFixed(2)}
                            onChange={(e) =>
                              updateCartItem(item.variantId, {
                                discount: roundMoney2(
                                  parseFloat(e.target.value) || 0,
                                ),
                              })
                            }
                          />
                        </TableCell>
                        <TableCell className="text-right text-sm font-semibold tabular-nums">
                          {formatBillingInr(item.finalPrice * item.cartQuantity)}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            onClick={() => removeCartItem(item.variantId)}
                            aria-label={`Remove ${item.productName}`}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              <div className="flex flex-col items-end gap-2 border-t px-4 py-4 text-sm">
                <div className="flex w-full max-w-xs justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="tabular-nums text-foreground">
                    {formatBillingInr(totals.subtotal)}
                  </span>
                </div>
                <div className="flex w-full max-w-xs justify-between text-muted-foreground">
                  <span>Total discount</span>
                  <span className="tabular-nums text-emerald-700">
                    -{formatBillingInr(totals.totalDiscount)}
                  </span>
                </div>
                <div className="flex w-full max-w-xs justify-between text-muted-foreground">
                  <span>Tax</span>
                  <span className="tabular-nums text-foreground">
                    {formatBillingInr(totals.tax)}
                  </span>
                </div>
                <div className="mt-1 flex w-full max-w-xs justify-between border-t border-border pt-2 text-base font-semibold">
                  <span>Grand total</span>
                  <span className="tabular-nums">
                    {formatBillingInr(totals.grandTotal)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
