"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Package, Pencil, Plus, Trash2 } from "lucide-react";

import type {
  Category,
  ProductAtGlanceMetrics,
  ProductVariant,
  ProductWithCategory,
} from "@/common/admin/types";
import type { PricingRuleRow } from "@/modules/pricing/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProductPricingSection } from "@/modules/products/components/product-pricing-section";
import {
  updateProductAction,
  toggleProductAction,
} from "@/modules/products/actions/products.actions";
import {
  createVariantAction,
  updateVariantAction,
  deleteVariantAction,
} from "@/modules/products/actions/variants.actions";
import {
  Modal,
  FieldLabel as LegacyFieldLabel,
  FormError,
  PrimaryBtn,
  SecondaryBtn,
  inputCls,
  selectCls,
  textareaCls,
} from "@/modules/admin/components/modal";
import { ProductImageField } from "@/modules/products/components/product-image-field";
import { VariantImagesField } from "@/modules/products/components/variant-images-field";
import { VariantImagesManager } from "@/modules/products/components/variant-images-manager";
import { adminQueryKeys } from "@/modules/admin/lib/admin-query-keys";

function formatSku(variantId: string) {
  return variantId.slice(0, 8).toUpperCase();
}

function previewImageUrl(variant: ProductVariant): string | null {
  const images = variant.images ?? [];
  const preview = images.find((img) => img.is_preview) ?? images[0];
  return preview?.url?.trim() ?? null;
}
function formatInr(n: number) {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function roundMoney2(n: number): number {
  return Math.round(n * 100) / 100;
}

function moneyInputValue(n: number | null | undefined): string {
  if (n == null || Number.isNaN(Number(n))) return "";
  return roundMoney2(Number(n)).toFixed(2);
}

function ProductHeroImage({ url }: { url: string | null | undefined }) {
  const [failed, setFailed] = useState(false);
  const trimmed = url?.trim() ?? "";
  useEffect(() => {
    setFailed(false);
  }, [trimmed]);
  if (!trimmed || failed) {
    return (
      <div className="flex size-full items-center justify-center bg-muted text-muted-foreground">
        <Package aria-hidden />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={trimmed}
      alt=""
      className="size-full object-cover object-center"
      onError={() => setFailed(true)}
    />
  );
}

function VariantThumbnail({
  variant,
  onClick,
}: {
  variant: ProductVariant;
  onClick: () => void;
}) {
  const url = previewImageUrl(variant);
  const label = variant.name ?? "variant";

  return (
    <button
      type="button"
      onClick={onClick}
      title={`Edit ${label}`}
      className="size-9 shrink-0 overflow-hidden rounded-md border border-border transition-colors hover:border-primary/40 hover:ring-2 hover:ring-primary/15"
    >
      <VariantThumb url={url} />
    </button>
  );
}

function VariantThumb({ url }: { url: string | null }) {
  const [broken, setBroken] = useState(false);
  if (!url || broken) {
    return (
      <div className="flex size-full items-center justify-center bg-muted text-muted-foreground">
        <Package aria-hidden />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      className="size-full object-cover"
      onError={() => setBroken(true)}
    />
  );
}

function GlanceMetricCard({
  title,
  value,
  description,
}: {
  title: string;
  value: ReactNode;
  description?: ReactNode;
}) {
  return (
    <Card size="sm" className="border border-border ring-0">
      <CardHeader className="border-b border-border pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1 pt-3">
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
        {description ? (
          <CardDescription className="text-xs">{description}</CardDescription>
        ) : null}
      </CardContent>
    </Card>
  );
}

function VariantTableRow({
  variant,
  productId,
  disabled,
  onEdit,
  onDelete,
}: {
  variant: ProductVariant;
  productId: string;
  disabled: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const queryClient = useQueryClient();
  const [savePending, startSave] = useTransition();
  const [priceStr, setPriceStr] = useState(moneyInputValue(variant.price));
  const [mrpStr, setMrpStr] = useState(moneyInputValue(variant.mrp));

  useEffect(() => {
    setPriceStr(moneyInputValue(variant.price));
    setMrpStr(moneyInputValue(variant.mrp));
  }, [variant.id, variant.price, variant.mrp]);

  const stock = variant.central_stock ?? 0;
  const variantLabel = variant.name ?? "Unnamed variant";

  function savePrices() {
    const price = roundMoney2(parseFloat(priceStr));
    const mrp = roundMoney2(parseFloat(mrpStr));
    if (!Number.isFinite(price) || !Number.isFinite(mrp)) return;
    if (
      price === roundMoney2(Number(variant.price ?? 0)) &&
      mrp === roundMoney2(Number(variant.mrp ?? 0))
    ) {
      return;
    }
    startSave(async () => {
      await updateVariantAction(variant.id, productId, {
        name: variant.name ?? "Unnamed variant",
        price,
        mrp,
      });
      await queryClient.invalidateQueries({
        queryKey: adminQueryKeys.productDetail(productId),
      });
      await queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
    });
  }

  return (
    <TableRow>
      <TableCell>
        <VariantThumbnail variant={variant} onClick={onEdit} />
      </TableCell>
      <TableCell className="font-medium">{variantLabel}</TableCell>
      <TableCell>
        <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
          {formatSku(variant.id)}
        </code>
      </TableCell>
      <TableCell className="tabular-nums">{stock.toLocaleString("en-IN")}</TableCell>
      <TableCell>
        <Input
          className="h-7 w-24 tabular-nums"
          type="number"
          min={0}
          step="0.01"
          value={priceStr}
          onChange={(e) => setPriceStr(e.target.value)}
          onBlur={savePrices}
          disabled={disabled || savePending}
          aria-label={`Selling price for ${variantLabel}`}
        />
      </TableCell>
      <TableCell>
        <Input
          className="h-7 w-24 tabular-nums"
          type="number"
          min={0}
          step="0.01"
          value={mrpStr}
          onChange={(e) => setMrpStr(e.target.value)}
          onBlur={savePrices}
          disabled={disabled || savePending}
          aria-label={`MRP for ${variantLabel}`}
        />
      </TableCell>
      <TableCell>
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={onEdit}
            aria-label={`Edit ${variantLabel}`}
          >
            <Pencil />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            disabled={disabled}
            onClick={onDelete}
            aria-label={`Delete ${variantLabel}`}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function VariantForm({
  productId,
  variant,
  liveVariant,
  onClose,
}: {
  productId: string;
  variant?: ProductVariant;
  liveVariant?: ProductVariant;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [imageUploading, setImageUploading] = useState(false);

  const isEdit = Boolean(variant);
  const imagesVariant = liveVariant ?? variant;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = (fd.get("name") as string).trim();
    const price = roundMoney2(parseFloat(fd.get("price") as string));
    const mrp = roundMoney2(parseFloat(fd.get("mrp") as string));
    if (!name || !Number.isFinite(price) || !Number.isFinite(mrp)) {
      return setError("All fields required.");
    }
    setError(null);
    startTransition(async () => {
      try {
        if (isEdit && variant) {
          await updateVariantAction(variant.id, productId, { name, price, mrp });
        } else {
          const orderedImages =
            previewIndex > 0 && previewIndex < images.length
              ? [images[previewIndex], ...images.filter((_, i) => i !== previewIndex)]
              : images;
          await createVariantAction(productId, {
            name,
            price,
            mrp,
            imageUrls: orderedImages,
          });
        }
        await queryClient.invalidateQueries({
          queryKey: adminQueryKeys.productDetail(productId),
        });
        await queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <LegacyFieldLabel label="Variant Name (e.g. Black, 128 GB)">
        <input
          className={inputCls}
          name="name"
          defaultValue={variant?.name ?? ""}
          placeholder="e.g. 128 GB / Black"
          required
        />
      </LegacyFieldLabel>
      <div className="grid grid-cols-2 gap-3">
        <LegacyFieldLabel label="Selling Price (₹)">
          <input
            className={inputCls}
            name="price"
            type="number"
            step="0.01"
            min="0"
            defaultValue={isEdit ? moneyInputValue(variant?.price) : undefined}
            required
          />
        </LegacyFieldLabel>
        <LegacyFieldLabel label="MRP (₹)">
          <input
            className={inputCls}
            name="mrp"
            type="number"
            step="0.01"
            min="0"
            defaultValue={isEdit ? moneyInputValue(variant?.mrp) : undefined}
            required
          />
        </LegacyFieldLabel>
      </div>
      {isEdit && imagesVariant ? (
        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-bold text-slate-700">
            Images <span className="font-medium text-slate-400">· optional</span>
          </span>
          <VariantImagesManager
            embedded
            productId={productId}
            variant={imagesVariant}
            onClose={onClose}
          />
        </div>
      ) : (
        <VariantImagesField
          images={images}
          previewIndex={previewIndex}
          onChange={(next, preview) => {
            setImages(next);
            setPreviewIndex(preview);
          }}
          onUploadingChange={setImageUploading}
        />
      )}
      <FormError message={error} />
      <div className="flex justify-end gap-2">
        <SecondaryBtn onClick={onClose}>Cancel</SecondaryBtn>
        <PrimaryBtn type="submit" disabled={isPending || imageUploading}>
          {imageUploading
            ? "Uploading…"
            : isPending
              ? "Saving…"
              : isEdit
                ? "Save changes"
                : "Add Variant"}
        </PrimaryBtn>
      </div>
    </form>
  );
}

function ProductEditForm({
  product,
  categories,
  onClose,
}: {
  product: ProductWithCategory;
  categories: Category[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState(product.image_url?.trim() ?? "");
  const [imageUploading, setImageUploading] = useState(false);

  useEffect(() => {
    setImageUrl(product.image_url?.trim() ?? "");
  }, [product.id, product.image_url]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = (fd.get("name") as string).trim();
    const description = (fd.get("description") as string).trim();
    const categoryId = (fd.get("categoryId") as string) || null;
    const imageUrlValue = imageUrl.trim() || null;
    if (!name) return setError("Name is required.");
    setError(null);
    startTransition(async () => {
      try {
        await updateProductAction(product.id, {
          name,
          description,
          categoryId,
          imageUrl: imageUrlValue,
        });
        await queryClient.invalidateQueries({
          queryKey: adminQueryKeys.productDetail(product.id),
        });
        await queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <LegacyFieldLabel label="Product Name">
        <input className={inputCls} name="name" defaultValue={product.name ?? ""} required />
      </LegacyFieldLabel>
      <ProductImageField
        value={imageUrl}
        onChange={setImageUrl}
        onUploadingChange={setImageUploading}
      />
      <LegacyFieldLabel label="Description">
        <textarea
          className={textareaCls}
          name="description"
          defaultValue={product.description ?? ""}
          rows={3}
        />
      </LegacyFieldLabel>
      <LegacyFieldLabel label="Category">
        <select name="categoryId" className={selectCls} defaultValue={product.category_id ?? ""}>
          <option value="">No category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </LegacyFieldLabel>
      <FormError message={error} />
      <div className="flex justify-end gap-2">
        <SecondaryBtn onClick={onClose}>Cancel</SecondaryBtn>
        <PrimaryBtn type="submit" disabled={isPending || imageUploading}>
          {imageUploading ? "Uploading…" : isPending ? "Saving…" : "Save Changes"}
        </PrimaryBtn>
      </div>
    </form>
  );
}

type DetailModal =
  | { kind: "editProduct" }
  | { kind: "addVariant" }
  | { kind: "manageVariant"; variant: ProductVariant }
  | null;

export function ProductDetailPanel({
  product,
  variants,
  categories,
  pricingRule,
  glance,
}: {
  product: ProductWithCategory;
  variants: ProductVariant[];
  categories: Category[];
  pricingRule: PricingRuleRow | null;
  glance: ProductAtGlanceMetrics;
}) {
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();
  const [modal, setModal] = useState<DetailModal>(null);

  function handleDelete(variantId: string) {
    if (!confirm("Delete this variant? This cannot be undone.")) return;
    startTransition(async () => {
      await deleteVariantAction(variantId, product.id);
      await queryClient.invalidateQueries({
        queryKey: adminQueryKeys.productDetail(product.id),
      });
      await queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
    });
  }

  function handleToggle() {
    startTransition(async () => {
      await toggleProductAction(product.id, !product.is_active);
      await queryClient.invalidateQueries({
        queryKey: adminQueryKeys.productDetail(product.id),
      });
      await queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
    });
  }

  const isActive = product.is_active ?? false;
  const shortId = product.id.slice(0, 8).toUpperCase();
  const smartPricingOn = product.use_smart_pricing === true;

  const listPriceValue =
    glance.listPriceMin == null ? (
      "—"
    ) : glance.listPriceMax != null &&
      Math.abs(glance.listPriceMax - glance.listPriceMin) > 0.005 ? (
      <span className="block leading-tight">
        <span>{formatInr(glance.listPriceMin)}</span>
        <span className="mt-0.5 block text-sm font-normal text-muted-foreground">
          to {formatInr(glance.listPriceMax)}
        </span>
      </span>
    ) : (
      formatInr(glance.listPriceMin)
    );

  const listPriceDescription =
    glance.listPriceMin != null
      ? `${glance.variantsInStock}/${variants.length || 1} SKUs in stock`
      : "No central stock — not sellable";

  const suggestedDescription =
    smartPricingOn && glance.suggestedPriceMin != null
      ? `Suggested ${formatInr(glance.suggestedPriceMin)}${
          glance.suggestedPriceMax != null &&
          Math.abs(glance.suggestedPriceMax - glance.suggestedPriceMin) > 0.005
            ? ` – ${formatInr(glance.suggestedPriceMax)}`
            : ""
        }`
      : undefined;

  return (
    <>
      {modal?.kind === "editProduct" && (
        <Modal title="Edit Product" onClose={() => setModal(null)}>
          <ProductEditForm
            product={product}
            categories={categories}
            onClose={() => setModal(null)}
          />
        </Modal>
      )}
      {modal?.kind === "addVariant" && (
        <Modal title="Add Variant" onClose={() => setModal(null)} size="sm">
          <VariantForm productId={product.id} onClose={() => setModal(null)} />
        </Modal>
      )}
      {modal?.kind === "manageVariant" && (
        <Modal title="Edit Variant" onClose={() => setModal(null)} size="sm">
          <VariantForm
            productId={product.id}
            variant={modal.variant}
            liveVariant={
              variants.find((v) => v.id === modal.variant.id) ?? modal.variant
            }
            onClose={() => setModal(null)}
          />
        </Modal>
      )}

      <div className="flex flex-col gap-3">
        <Card className="border border-border ring-0">
          <CardContent className="flex flex-col gap-3 py-3 lg:flex-row lg:items-start">
            <div className="relative size-16 shrink-0 overflow-hidden rounded-lg border border-border">
              <ProductHeroImage url={product.image_url} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                {isActive ? (
                  <Badge
                    variant="outline"
                    className="border-emerald-200 bg-emerald-50 text-emerald-700"
                  >
                    Active
                  </Badge>
                ) : (
                  <Badge variant="secondary">Inactive</Badge>
                )}
                {product.categories?.name ? (
                  <Badge variant="outline">{product.categories.name}</Badge>
                ) : null}
              </div>
              <h1 className="mt-2 text-2xl font-semibold">
                {product.name ?? "Untitled product"}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {product.description?.trim() || "No description yet."}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">ID · {shortId}…</p>
            </div>

            <div className="flex flex-wrap gap-2 lg:justify-end">
              <Button variant="outline" disabled={isPending} onClick={handleToggle}>
                {isActive ? "Deactivate" : "Activate"}
              </Button>
              <Button variant="outline" onClick={() => setModal({ kind: "editProduct" })}>
                <Pencil data-icon="inline-start" />
                Edit details
              </Button>
              <Button onClick={() => setModal({ kind: "addVariant" })}>
                <Plus data-icon="inline-start" />
                Add variant
              </Button>
            </div>
          </CardContent>
        </Card>

        <section aria-label="Product summary">
          <p className="mb-3 text-sm font-medium">At a glance</p>
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
            <GlanceMetricCard
              title="Variants"
              value={variants.length.toLocaleString("en-IN")}
              description={
                variants.length > 0
                  ? `${variants.length} SKU${variants.length !== 1 ? "s" : ""} configured`
                  : "Add variants to sell"
              }
            />
            <GlanceMetricCard
              title="List price"
              value={listPriceValue}
              description={
                suggestedDescription ? (
                  <>
                    {listPriceDescription}
                    <span className="block">{suggestedDescription}</span>
                  </>
                ) : (
                  listPriceDescription
                )
              }
            />
            <GlanceMetricCard
              title="Central inventory"
              value={glance.centralStockTotal.toLocaleString("en-IN")}
              description={
                glance.centralStockTotal > 0
                  ? "Units in central warehouse"
                  : "No central stock on hand"
              }
            />
            <GlanceMetricCard
              title="Vendor supply"
              value={glance.vendorCount.toLocaleString("en-IN")}
              description={
                glance.vendorCount > 0
                  ? `${glance.vendorStockTotal.toLocaleString("en-IN")} units across vendor listings`
                  : "No vendors listing this product"
              }
            />
          </div>
        </section>

        <Card className="border border-border ring-0">
          <CardHeader className="border-b border-border">
            <CardTitle>Variants</CardTitle>
            <CardDescription>
              {variants.length} SKU{variants.length !== 1 ? "s" : ""}. Edit prices inline or open a
              variant to change details and images.
            </CardDescription>
            <CardAction>
              <Button variant="outline" size="sm" onClick={() => setModal({ kind: "addVariant" })}>
                <Plus data-icon="inline-start" />
                Add variant
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {variants.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-muted/30 py-8 text-center">
                <Package className="text-muted-foreground" aria-hidden />
                <p className="max-w-sm text-sm text-muted-foreground">
                  No variants yet. Add at least one variant to make this product purchasable.
                </p>
                <Button onClick={() => setModal({ kind: "addVariant" })}>
                  <Plus data-icon="inline-start" />
                  Add first variant
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-14">Thumbnail</TableHead>
                    <TableHead>Variant</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Selling (₹)</TableHead>
                    <TableHead>MRP (₹)</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {variants.map((v) => (
                    <VariantTableRow
                      key={v.id}
                      variant={v}
                      productId={product.id}
                      disabled={isPending}
                      onEdit={() => setModal({ kind: "manageVariant", variant: v })}
                      onDelete={() => handleDelete(v.id)}
                    />
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <ProductPricingSection
          productId={product.id}
          initialRule={pricingRule}
          useSmartPricing={smartPricingOn}
        />
      </div>
    </>
  );
}
