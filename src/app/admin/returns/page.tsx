"use client";

import { useEffect, useState } from "react";
import { Package, CheckCircle, XCircle } from "lucide-react";

interface ReturnItem {
  id: string;
  product: {
    id: string;
    name: string | null;
    image_url: string | null;
  };
  variant: {
    id: string;
    name: string | null;
    price: number | null;
  };
  quantity: number;
}

interface ReturnRow {
  id: string;
  return_number: string;
  order_id: string;
  order_number: string;
  status: "pending" | "approved" | "rejected" | "picked_up" | "completed" | "cancelled";
  reason: string;
  refund_amount: number;
  refund_method: "wallet" | "original" | null;
  items: ReturnItem[];
  created_at: string;
  updated_at: string;
}

interface ReturnsResponse {
  data: ReturnRow[];
  total: number;
  page: number;
  status: string;
}

const STATUS_FILTERS = ["all", "pending", "approved", "rejected", "picked_up", "completed", "cancelled"];

export default function AdminReturnsPage() {
  const [data, setData] = useState<ReturnsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  useEffect(() => {
    setIsLoading(true);
    fetch(`/api/returns?page=${page}&status=${statusFilter}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch returns");
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
  }, [page, statusFilter]);

  const handleUpdateStatus = async (returnId: string, newStatus: "approved" | "rejected") => {
    setProcessingId(returnId);
    try {
      const res = await fetch(`/api/returns/${returnId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        // Refresh data
        const result = await fetch(`/api/returns?page=${page}&status=${statusFilter}`);
        const data = await result.json();
        setData(data);
      } else {
        alert("Failed to update return status");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to update return status");
    } finally {
      setProcessingId(null);
    }
  };

  const statusColors: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800",
    approved: "bg-blue-100 text-blue-800",
    rejected: "bg-red-100 text-red-800",
    picked_up: "bg-purple-100 text-purple-800",
    completed: "bg-emerald-100 text-emerald-800",
    cancelled: "bg-slate-100 text-slate-800",
  };

  const formatMoney = (n: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(n);

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-6xl px-8 py-10">
        <div className="flex h-64 items-center justify-center">
          <div className="text-center">
            <Package className="mx-auto h-12 w-12 animate-spin text-slate-400" />
            <p className="mt-4 text-sm text-slate-500">Loading returns...</p>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="mx-auto w-full max-w-6xl px-8 py-10">
        <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white">
          <div className="text-center">
            <Package className="mx-auto h-12 w-12 text-slate-400" />
            <p className="mt-4 text-sm text-slate-500">Failed to load returns</p>
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
    <div className="mx-auto w-full max-w-6xl px-8 py-10">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Returns Management</h1>
        <p className="mt-1 text-sm text-slate-500">
          Review and approve customer return requests
        </p>
      </div>

      {/* Status Filters */}
      <div className="mb-6 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((status) => (
          <button
            key={status}
            onClick={() => {
              setStatusFilter(status);
              setPage(0);
            }}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              statusFilter === status
                ? "bg-slate-900 text-white"
                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Returns List */}
      {data.data.length === 0 ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white">
          <div className="text-center">
            <Package className="mx-auto h-12 w-12 text-slate-300" />
            <h2 className="mt-4 text-lg font-bold text-slate-900">
              No {statusFilter} returns
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              {statusFilter === "pending"
                ? "No pending return requests to review"
                : `No returns with status "${statusFilter}"`}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {data.data.map((ret) => (
            <div
              key={ret.id}
              className="rounded-2xl border border-slate-200 bg-white p-6"
            >
              {/* Header */}
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-slate-900">
                      Return #{ret.return_number}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        statusColors[ret.status]
                      }`}
                    >
                      {ret.status.charAt(0).toUpperCase() + ret.status.slice(1)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    Order #{ret.order_number}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Requested: {new Date(ret.created_at).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-500">Refund Amount</p>
                  <p className="text-lg font-bold text-emerald-600">
                    {formatMoney(ret.refund_amount)}
                  </p>
                  {ret.refund_method && (
                    <p className="text-xs text-slate-500">
                      via {ret.refund_method === "wallet" ? "Wallet" : "Original Payment"}
                    </p>
                  )}
                </div>
              </div>

              {/* Items */}
              <div className="mb-4 rounded-lg bg-slate-50 p-4">
                <p className="mb-2 text-xs font-semibold text-slate-500">Items</p>
                <div className="flex flex-wrap gap-2">
                  {ret.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-2 rounded-lg bg-white px-3 py-2"
                    >
                      {item.product.image_url ? (
                        <img
                          src={item.product.image_url}
                          alt={item.product.name ?? "Product"}
                          className="h-8 w-8 rounded object-cover"
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded bg-slate-200">
                          <Package className="h-4 w-4 text-slate-400" />
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-semibold text-slate-900">
                          {item.product.name ?? "Product"}
                        </p>
                        <p className="text-xs text-slate-500">
                          Qty: {item.quantity} • {item.variant.name ?? "Default"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reason */}
              <div className="mb-4 rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Reason</p>
                <p className="text-sm font-medium text-slate-700 capitalize">
                  {ret.reason.replace(/_/g, " ")}
                </p>
              </div>

              {/* Actions */}
              {ret.status === "pending" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleUpdateStatus(ret.id, "approved")}
                    disabled={processingId === ret.id}
                    className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Approve
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(ret.id, "rejected")}
                    disabled={processingId === ret.id}
                    className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-40"
                  >
                    <XCircle className="h-4 w-4" />
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {data.total > 0 && (
        <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-6">
          <p className="text-sm text-slate-500">
            Showing{" "}
            <span className="font-semibold text-slate-900">
              {page * 20 + 1}–{Math.min((page + 1) * 20, data.total)}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-slate-900">{data.total}</span> returns
          </p>
          <div className="flex gap-2">
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              disabled={(page + 1) * 20 >= data.total}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
