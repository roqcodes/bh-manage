"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/modules/admin/components/page-header";
import { Search, Plus, Trash2, Receipt, Save, RefreshCcw } from "lucide-react";
import { searchBillingVariants, BillingVariantSearchResult } from "./actions";

interface CartItem extends BillingVariantSearchResult {
  cartQuantity: number;
  discount: number;
  finalPrice: number;
}

export default function AdminBillingPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<BillingVariantSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const [cart, setCart] = useState<CartItem[]>([]);
  
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{type: "success" | "error", text: string} | null>(null);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setIsSearching(true);
      searchBillingVariants(searchQuery)
        .then((res) => {
          setSearchResults(res);
          setIsSearching(false);
        })
        .catch((err) => {
          console.error(err);
          setIsSearching(false);
        });
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const addToCart = (variant: BillingVariantSearchResult) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.variantId === variant.variantId);
      if (existing) {
        if (existing.cartQuantity >= variant.stock) return prev; // check stock
        return prev.map((item) =>
          item.variantId === variant.variantId
            ? { ...item, cartQuantity: item.cartQuantity + 1 }
            : item
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
  };

  const updateCartItem = (variantId: string, updates: Partial<CartItem>) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.variantId !== variantId) return item;
        const updated = { ...item, ...updates };
        // If discount changed, update final price
        if (updates.discount !== undefined) {
          updated.finalPrice = Math.max(0, updated.price - updates.discount);
        }
        // If finalPrice changed, update discount
        if (updates.finalPrice !== undefined) {
          updated.discount = Math.max(0, updated.price - updates.finalPrice);
        }
        return updated;
      })
    );
  };

  const removeCartItem = (variantId: string) => {
    setCart((prev) => prev.filter((item) => item.variantId !== variantId));
  };

  const clearBill = () => {
    setCart([]);
    setCustomerName("");
    setPhone("");
    setCompany("");
    setGstNumber("");
    setSubmitMessage(null);
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.cartQuantity, 0);
  const totalDiscount = cart.reduce((sum, item) => sum + item.discount * item.cartQuantity, 0);
  // Defaulting to 0 tax for manual invoice UI unless we build a complex tax calculator.
  const tax = 0; 
  const grandTotal = subtotal - totalDiscount + tax;

  const handleSaveInvoice = async () => {
    if (cart.length === 0) {
      setSubmitMessage({ type: "error", text: "Cart is empty" });
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage(null);

    try {
      const payload = {
        customerName,
        phone,
        company,
        gstNumber,
        subtotal,
        tax,
        discount: totalDiscount,
        totalAmount: grandTotal,
        items: cart.map(item => ({
          variantId: item.variantId,
          quantity: item.cartQuantity,
          unitPrice: item.finalPrice
        }))
      };

      const res = await fetch("/api/admin/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to save invoice");
      }

      setSubmitMessage({ type: "success", text: "Invoice saved successfully!" });
      setTimeout(() => {
        clearBill();
      }, 2000);
    } catch (err) {
      setSubmitMessage({ type: "error", text: err instanceof Error ? err.message : "An error occurred" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-full flex-col p-4">
      <PageHeader
        title="Manual Billing"
        subtitle="Create invoices for offline/external customers"
      />

      {submitMessage && (
        <div className={`mb-6 rounded-xl p-4 text-sm font-medium ${submitMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
          {submitMessage.text}
        </div>
      )}

      <div className="mt-6 flex flex-1 flex-col gap-6 lg:flex-row lg:items-start">
        {/* Left Column: Product Search */}
        <div className="flex w-full flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-24 lg:h-[calc(100vh-8rem)] lg:w-1/3">
          <h2 className="text-lg font-bold text-slate-800">Products</h2>
          <div className="relative shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search by product name or SKU..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-blue-500 focus:bg-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex-1 overflow-y-auto pr-2">
            {isSearching ? (
              <p className="py-4 text-center text-sm text-slate-500">Searching...</p>
            ) : searchResults.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-500">No products found</p>
            ) : (
              <div className="flex flex-col gap-2">
                {searchResults.map((item) => (
                  <div key={item.variantId} className="flex items-center justify-between rounded-xl border border-slate-100 p-3 hover:bg-slate-50">
                    <div className="min-w-0 pr-2">
                      <p className="truncate text-sm font-bold text-slate-900">{item.productName}</p>
                      {item.variantName && <p className="truncate text-xs text-slate-500">{item.variantName}</p>}
                      <p className="text-xs font-medium text-emerald-600">Stock: {item.stock}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-sm font-bold text-slate-900">${item.price.toFixed(2)}</span>
                      <button
                        onClick={() => addToCart(item)}
                        disabled={item.stock <= 0}
                        className="flex size-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 transition-colors hover:bg-blue-100 disabled:opacity-50"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Cart & Checkout */}
        <div className="flex w-full flex-col gap-6 lg:w-2/3">
          
          {/* Customer Details */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-slate-800">Customer Details</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">Customer Name</label>
                <input
                  type="text"
                  placeholder="Enter customer name"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">Phone</label>
                <input
                  type="text"
                  placeholder="Enter phone number"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">Company (Optional)</label>
                <input
                  type="text"
                  placeholder="Company name"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">GST Number (Optional)</label>
                <input
                  type="text"
                  placeholder="GST number"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500"
                  value={gstNumber}
                  onChange={(e) => setGstNumber(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Billing Table */}
          <div className="flex flex-1 flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-slate-800">Invoice Items</h2>
            
            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="pb-3 font-semibold">Product</th>
                    <th className="pb-3 font-semibold">Qty</th>
                    <th className="pb-3 font-semibold">Unit Price</th>
                    <th className="pb-3 font-semibold">Discount</th>
                    <th className="pb-3 font-semibold text-right">Total</th>
                    <th className="pb-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {cart.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">No items added to bill</td>
                    </tr>
                  ) : (
                    cart.map((item) => (
                      <tr key={item.variantId} className="border-b border-slate-100">
                        <td className="py-3 pr-2">
                          <p className="font-medium text-slate-900">{item.productName}</p>
                          {item.variantName && <p className="text-xs text-slate-500">{item.variantName}</p>}
                          {item.cartQuantity > item.stock && <p className="text-xs text-red-500">Exceeds stock ({item.stock})</p>}
                        </td>
                        <td className="py-3">
                          <input
                            type="number"
                            min="1"
                            max={item.stock}
                            className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-slate-900 outline-none focus:border-blue-500"
                            value={item.cartQuantity}
                            onChange={(e) => updateCartItem(item.variantId, { cartQuantity: parseInt(e.target.value) || 1 })}
                          />
                        </td>
                        <td className="py-3 text-slate-900">${item.price.toFixed(2)}</td>
                        <td className="py-3">
                          <div className="flex items-center gap-1">
                            <span className="text-slate-400">$</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-slate-900 outline-none focus:border-blue-500"
                              value={item.discount}
                              onChange={(e) => updateCartItem(item.variantId, { discount: parseFloat(e.target.value) || 0 })}
                            />
                          </div>
                        </td>
                        <td className="py-3 text-right font-medium text-slate-900">
                          ${(item.finalPrice * item.cartQuantity).toFixed(2)}
                        </td>
                        <td className="py-3 pl-2 text-right">
                          <button
                            onClick={() => removeCartItem(item.variantId)}
                            className="text-slate-400 hover:text-red-500"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Summary */}
            <div className="mt-6 flex flex-col items-end gap-2 border-t border-slate-100 pt-4 text-sm">
              <div className="flex w-64 justify-between text-slate-500">
                <span>Subtotal:</span>
                <span className="text-slate-900">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex w-64 justify-between text-slate-500">
                <span>Total Discount:</span>
                <span className="text-emerald-600">-${totalDiscount.toFixed(2)}</span>
              </div>
              <div className="flex w-64 justify-between text-slate-500">
                <span>Tax:</span>
                <span className="text-slate-900">${tax.toFixed(2)}</span>
              </div>
              <div className="mt-2 flex w-64 justify-between border-t border-slate-200 pt-2 text-lg font-black text-slate-900">
                <span>Grand Total:</span>
                <span>${grandTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
              <button
                onClick={clearBill}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-600 transition-colors hover:bg-slate-50"
              >
                <RefreshCcw size={16} />
                Clear Bill
              </button>
              <button
                onClick={handleSaveInvoice}
                disabled={isSubmitting || cart.length === 0 || cart.some(i => i.cartQuantity > i.stock)}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 font-semibold text-white shadow-md shadow-blue-600/20 transition-all hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting ? "Saving..." : <><Save size={16} /> Save Invoice</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
