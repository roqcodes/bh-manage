"use client";

import { useEffect, useState } from "react";
import { Package, Plus, Edit2, Check, X, Percent } from "lucide-react";

interface TaxRate {
  id: string;
  name: string;
  rate_percent: number;
  description: string | null;
  is_default: boolean;
  created_at: string;
}

interface TaxResponse {
  rates: TaxRate[];
  defaultRate: TaxRate | null;
}

export default function AdminTaxConfigPage() {
  const [data, setData] = useState<TaxResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRate, setEditingRate] = useState<TaxRate | null>(null);
  const [formState, setFormState] = useState({
    name: "",
    ratePercent: "",
    description: "",
    isDefault: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/tax/rates")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch tax rates");
        return res.json();
      })
      .then((result) => {
        setData(result);
        setIsError(false);
      })
      .catch((err) => {
        console.error(err);
        setIsError(true);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/tax/rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formState.name,
          ratePercent: parseFloat(formState.ratePercent),
          description: formState.description || null,
          isDefault: formState.isDefault,
        }),
      });
      if (res.ok) {
        // Refresh data
        const result = await fetch("/api/tax/rates");
        setData(await result.json());
        setShowAddModal(false);
        setFormState({ name: "", ratePercent: "", description: "", isDefault: false });
      } else {
        const result = await res.json();
        alert(result.error || "Failed to create tax rate");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to create tax rate");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetDefault = async (taxRateId: string) => {
    try {
      const res = await fetch(`/api/tax/rates/${taxRateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      });
      if (res.ok) {
        const result = await fetch("/api/tax/rates");
        setData(await result.json());
      } else {
        alert("Failed to set default rate");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to set default rate");
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-6">
        <div className="flex h-64 items-center justify-center">
          <div className="text-center">
            <Package className="mx-auto h-12 w-12 animate-spin text-slate-400" />
            <p className="mt-4 text-sm text-slate-500">Loading tax rates...</p>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-6">
        <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white">
          <div className="text-center">
            <Package className="mx-auto h-12 w-12 text-slate-400" />
            <p className="mt-4 text-sm text-slate-500">Failed to load tax rates</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tax Configuration</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage GST rates and tax rules
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" />
          Add Tax Rate
        </button>
      </div>

      {/* Default Rate Display */}
      {data.defaultRate && (
        <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-emerald-100 p-3">
              <Check className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-900">Default Tax Rate</p>
              <p className="text-lg font-bold text-emerald-900">
                {data.defaultRate.name} — {data.defaultRate.rate_percent}%
              </p>
              {data.defaultRate.description && (
                <p className="mt-1 text-sm text-emerald-700">
                  {data.defaultRate.description}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tax Rates Table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-bold text-slate-900">All Tax Rates</h2>
        {data.rates.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center">
            <Percent className="mx-auto h-12 w-12 text-slate-300" />
            <p className="mt-4 text-sm text-slate-600">No tax rates configured</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Name</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">Rate</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Description</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-700">Default</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.rates.map((rate) => (
                  <tr key={rate.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {rate.name}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-900">
                        {rate.rate_percent}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {rate.description || "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {rate.is_default ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                          <Check className="h-3 w-3" />
                          Yes
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSetDefault(rate.id)}
                          className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                        >
                          Set Default
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setEditingRate(rate)}
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Tax Rate Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6">
            <h2 className="mb-4 text-lg font-bold text-slate-900">Add Tax Rate</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700">
                  Name
                </label>
                <input
                  type="text"
                  value={formState.name}
                  onChange={(e) =>
                    setFormState((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="e.g., GST 18%"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700">
                  Rate (%)
                </label>
                <input
                  type="number"
                  value={formState.ratePercent}
                  onChange={(e) =>
                    setFormState((prev) => ({ ...prev, ratePercent: e.target.value }))
                  }
                  placeholder="18"
                  min="0"
                  max="100"
                  step="0.1"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700">
                  Description
                </label>
                <textarea
                  value={formState.description}
                  onChange={(e) =>
                    setFormState((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Optional description"
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                />
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formState.isDefault}
                  onChange={(e) =>
                    setFormState((prev) => ({ ...prev, isDefault: e.target.checked }))
                  }
                  className="rounded border-slate-300"
                />
                <span className="text-sm text-slate-600">Set as default rate</span>
              </label>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setFormState({ name: "", ratePercent: "", description: "", isDefault: false });
                  }}
                  className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 rounded-lg bg-slate-900 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-40"
                >
                  {isSubmitting ? "Creating..." : "Create Rate"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Tax Rate Modal */}
      {editingRate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6">
            <h2 className="mb-4 text-lg font-bold text-slate-900">Edit Tax Rate</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700">Name</label>
                <p className="mt-1 text-sm text-slate-900">{editingRate.name}</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700">Rate</label>
                <p className="mt-1 text-sm text-slate-900">{editingRate.rate_percent}%</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700">Description</label>
                <p className="mt-1 text-sm text-slate-900">{editingRate.description || "—"}</p>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingRate(null)}
                  className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
