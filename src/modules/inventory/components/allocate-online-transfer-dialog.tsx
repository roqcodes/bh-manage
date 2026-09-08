"use client";

import { useMemo, useState, useTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";

import type { OnlineStockTransferRow } from "@/modules/inventory/services/online-stock-transfers.service";
import { adminGet, adminPatch } from "@/modules/admin/lib/admin-api-client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type AllocationRow = { variantId: string; variantName: string; quantity: number };

export function AllocateOnlineTransferDialog({
  transfer,
  open,
  onOpenChange,
  onSuccess,
}: {
  transfer: OnlineStockTransferRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}) {
  const queryClient = useQueryClient();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [allocations, setAllocations] = useState<AllocationRow[]>([]);
  const [loadingVariants, setLoadingVariants] = useState(false);

  const allocationTotal = useMemo(
    () =>
      allocations.reduce((sum, row) => sum + Math.floor(row.quantity), 0),
    [allocations],
  );

  function loadVariants(productId: string) {
    setLoadingVariants(true);
    setError(null);
    adminGet<{ data: { id: string; name: string | null }[] }>(
      `products/${productId}/variants`,
    )
      .then((res) => {
        setAllocations(
          (res.data ?? []).map((v) => ({
            variantId: v.id,
            variantName: v.name ?? "Variant",
            quantity: 0,
          })),
        );
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Failed to load variants");
      })
      .finally(() => setLoadingVariants(false));
  }

  function handleOpenChange(next: boolean) {
    if (next && transfer) {
      setAllocations([]);
      setError(null);
      loadVariants(transfer.product_id);
    }
    onOpenChange(next);
  }

  function refresh() {
    queryClient.invalidateQueries({
      queryKey: ["admin", "online-stock-transfers"],
    });
    queryClient.invalidateQueries({ queryKey: ["admin", "inventory"] });
  }

  function submit() {
    if (!transfer) return;
    setError(null);
    startTransition(async () => {
      try {
        await adminPatch("inventory/online-transfers", {
          action: "allocate",
          transferId: transfer.id,
          allocations: allocations
            .filter((a) => a.quantity > 0)
            .map((a) => ({
              variantId: a.variantId,
              quantity: Math.floor(a.quantity),
            })),
        });
        refresh();
        onSuccess?.();
        onOpenChange(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Allocation failed");
      }
    });
  }

  if (!transfer) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Allocate variants</DialogTitle>
          <DialogDescription>
            Distribute {transfer.quantity} units of {transfer.product_name} across
            variants. Total must equal {transfer.quantity}.
          </DialogDescription>
        </DialogHeader>

        {loadingVariants ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Loading variants…</p>
        ) : allocations.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No variants found for this product.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Variant</TableHead>
                <TableHead className="w-28">Quantity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allocations.map((row, idx) => (
                <TableRow key={row.variantId}>
                  <TableCell>{row.variantName}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      value={row.quantity}
                      onChange={(e) => {
                        const next = [...allocations];
                        next[idx] = {
                          ...row,
                          quantity: Math.max(0, Math.floor(Number(e.target.value) || 0)),
                        };
                        setAllocations(next);
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {error ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Allocated: {allocationTotal} / {transfer.quantity}
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={submit}
              disabled={
                pending ||
                loadingVariants ||
                allocations.length === 0 ||
                allocationTotal !== transfer.quantity
              }
            >
              {pending ? "Saving…" : "Confirm allocation"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
