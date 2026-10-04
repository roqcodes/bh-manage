"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Barcode,
  Building2,
  ChevronDown,
  Mail,
  MapPin,
  Phone,
  Store,
  Tag,
} from "lucide-react";
import type { ReactNode } from "react";

import type { AdminUser, ProductWithCategoryListItem, Vendor } from "@/common/admin/types";
import { formatCurrencyAmount } from "@/lib/format-currency";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  formatCreditLimit,
  formatCustomerId,
  isCustomerBlocked,
} from "@/modules/customers/components/customers-ui";
import {
  formatProductPrice,
  formatSkuLabel,
} from "@/modules/products/components/products-ui";
import { formatVendorId } from "@/modules/vendors/components/vendors-ui";

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function AdminTableGlanceShell({
  label,
  title,
  subtitle,
  children,
  footer,
  className,
}: {
  label: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col overflow-hidden", className)}>
      <div className="border-b border-border/60 bg-muted/25 px-3 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </p>
        <p className="mt-0.5 text-[13px] font-semibold leading-snug text-foreground">{title}</p>
        {subtitle ? (
          <p className="mt-0.5 text-[10px] font-medium text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      <div className="flex flex-col gap-1.5 px-3 py-2">{children}</div>
      {footer ? (
        <div className="border-t border-border/60 bg-muted/10 px-3 py-2">{footer}</div>
      ) : null}
    </div>
  );
}

export function AdminTableGlanceMetaRow({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <p className="flex items-start gap-1.5 text-[11px] leading-snug text-muted-foreground">
      <Icon className="mt-0.5 size-3 shrink-0 text-muted-foreground/70" aria-hidden />
      <span className="min-w-0 break-all">{children}</span>
    </p>
  );
}

export function AdminTableGlanceStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md border border-border/50 bg-background/80 px-2 py-1.5">
      <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 truncate text-[11px] font-semibold tabular-nums text-foreground">
        {value}
      </p>
    </div>
  );
}

export function AdminTableGlanceFooterLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex text-[11px] font-semibold text-primary hover:underline"
    >
      {children}
    </Link>
  );
}

function AdminTableGlancePopover({
  triggerLabel,
  triggerClassName,
  shellLabel,
  title,
  subtitle,
  footerHref,
  footerLabel,
  stats,
  meta,
  avatarInitials,
  mutedTrigger,
}: {
  triggerLabel: string;
  triggerClassName?: string;
  shellLabel: string;
  title: string;
  subtitle?: string;
  footerHref?: string;
  footerLabel?: string;
  stats?: { label: string; value: string }[];
  meta?: { icon: LucideIcon; content: ReactNode }[];
  avatarInitials?: string;
  mutedTrigger?: boolean;
}) {
  const trimmedTitle = title.trim();
  if (!trimmedTitle || trimmedTitle === "—") {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            className={cn(
              "inline-flex max-w-full items-center gap-1 text-left text-[13px] leading-snug hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              mutedTrigger ? "font-normal text-muted-foreground" : "font-medium text-foreground",
              triggerClassName,
            )}
          />
        }
      >
        <span className="min-w-0 truncate">{triggerLabel}</span>
        <ChevronDown className="size-3.5 shrink-0 opacity-50" aria-hidden />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[17.5rem] gap-0 p-0">
        <AdminTableGlanceShell
          label={shellLabel}
          title={trimmedTitle}
          subtitle={subtitle}
          footer={
            footerHref && footerLabel ? (
              <AdminTableGlanceFooterLink href={footerHref}>{footerLabel}</AdminTableGlanceFooterLink>
            ) : null
          }
        >
          {avatarInitials ? (
            <div className="flex items-center gap-2">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                {avatarInitials}
              </span>
            </div>
          ) : null}
          {meta?.map((row, i) => (
            <AdminTableGlanceMetaRow key={i} icon={row.icon}>
              {row.content}
            </AdminTableGlanceMetaRow>
          ))}
          {stats && stats.length > 0 ? (
            <div
              className={cn(
                "grid gap-1.5",
                stats.length >= 2 ? "grid-cols-2" : "grid-cols-1",
              )}
            >
              {stats.map((stat) => (
                <AdminTableGlanceStat key={stat.label} label={stat.label} value={stat.value} />
              ))}
            </div>
          ) : null}
        </AdminTableGlanceShell>
      </PopoverContent>
    </Popover>
  );
}

export function ErpCustomerTableGlance({
  userId,
  name,
  subtitle,
  stats,
  email,
  phone,
  company,
}: {
  userId?: string | null;
  name?: string | null;
  subtitle?: string;
  stats?: { label: string; value: string }[];
  email?: string | null;
  phone?: string | null;
  company?: string | null;
}) {
  const display = name?.trim() || company?.trim() || "—";
  const meta: { icon: LucideIcon; content: ReactNode }[] = [];
  if (company?.trim() && company.trim() !== name?.trim()) {
    meta.push({ icon: Building2, content: company.trim() });
  }
  if (email?.trim()) meta.push({ icon: Mail, content: email.trim() });
  if (phone?.trim()) meta.push({ icon: Phone, content: phone.trim() });

  return (
    <AdminTableGlancePopover
      triggerLabel={display === "—" ? "—" : display}
      shellLabel="Customer"
      title={display}
      subtitle={subtitle}
      avatarInitials={display !== "—" ? initialsFromName(display) : undefined}
      meta={meta.length > 0 ? meta : undefined}
      stats={stats}
      footerHref={userId ? `/admin/customers/${userId}` : undefined}
      footerLabel={userId ? "View customer profile →" : undefined}
    />
  );
}

export function ErpVendorTableGlance({
  vendorId,
  name,
  contact,
  email,
  subtitle,
  stats,
}: {
  vendorId?: string | null;
  name?: string | null;
  contact?: string | null;
  email?: string | null;
  subtitle?: string;
  stats?: { label: string; value: string }[];
}) {
  const display = name?.trim() || "—";
  const meta: { icon: LucideIcon; content: ReactNode }[] = [];
  if (contact?.trim()) meta.push({ icon: Phone, content: contact.trim() });
  if (email?.trim()) meta.push({ icon: Mail, content: email.trim() });

  return (
    <AdminTableGlancePopover
      triggerLabel={display}
      shellLabel="Vendor"
      title={display}
      subtitle={subtitle}
      avatarInitials={display !== "—" ? initialsFromName(display) : undefined}
      meta={meta.length > 0 ? meta : undefined}
      stats={stats}
      footerHref={vendorId ? `/admin/vendors/${vendorId}/erp` : undefined}
      footerLabel={vendorId ? "View vendor ERP profile →" : undefined}
    />
  );
}

export function ErpStoreTableGlance({
  storeId,
  name,
}: {
  storeId?: string | null;
  name?: string | null;
}) {
  const display = name?.trim() || "—";
  return (
    <AdminTableGlancePopover
      triggerLabel={display}
      mutedTrigger
      shellLabel="Store / branch"
      title={display}
      meta={[{ icon: Store, content: "Inventory and sales are scoped to this branch." }]}
      footerHref={storeId ? `/admin/erp/stores/${storeId}/edit` : undefined}
      footerLabel={storeId ? "Open store settings →" : undefined}
    />
  );
}

export function ErpDocumentTableGlance({
  triggerLabel,
  shellLabel,
  title,
  subtitle,
  viewHref,
  viewLabel,
  stats,
}: {
  triggerLabel: string;
  shellLabel: string;
  title: string;
  subtitle?: string;
  viewHref: string;
  viewLabel: string;
  stats?: { label: string; value: string }[];
}) {
  return (
    <AdminTableGlancePopover
      triggerLabel={triggerLabel}
      shellLabel={shellLabel}
      title={title}
      subtitle={subtitle}
      stats={stats}
      footerHref={viewHref}
      footerLabel={viewLabel}
    />
  );
}

export function CatalogCustomerTableGlance({ user }: { user: AdminUser }) {
  const name = user.name ?? user.company_name ?? "Unnamed customer";
  const blocked = isCustomerBlocked(user);
  const stats: { label: string; value: string }[] = [];
  if (user.receivables != null) {
    stats.push({ label: "Receivables", value: formatCurrencyAmount(user.receivables) });
  }
  if (user.credit_limit != null) {
    stats.push({ label: "Credit limit", value: formatCreditLimit(user.credit_limit) });
  }
  if (user.order_count != null) {
    stats.push({ label: "Orders", value: user.order_count.toLocaleString("en-IN") });
  }

  const meta: { icon: LucideIcon; content: ReactNode }[] = [];
  if (user.company_name?.trim() && user.company_name !== user.name) {
    meta.push({ icon: Building2, content: user.company_name });
  }
  if (user.email?.trim()) meta.push({ icon: Mail, content: user.email });
  if (user.phone?.trim()) meta.push({ icon: Phone, content: user.phone });
  if (user.location?.trim()) meta.push({ icon: MapPin, content: user.location });

  return (
    <AdminTableGlancePopover
      triggerLabel={name}
      shellLabel="Customer"
      title={name}
      subtitle={`${formatCustomerId(user)}${blocked ? " · Blocked" : ""}`}
      avatarInitials={initialsFromName(name)}
      meta={meta.length > 0 ? meta : undefined}
      stats={stats.length > 0 ? stats : undefined}
      footerHref={`/admin/customers/${user.id}`}
      footerLabel="View customer profile →"
    />
  );
}

export function CatalogVendorTableGlance({ vendor }: { vendor: Vendor }) {
  const name = vendor.name ?? "Unnamed vendor";
  const meta: { icon: LucideIcon; content: ReactNode }[] = [];
  if (vendor.contact?.trim()) meta.push({ icon: Phone, content: vendor.contact });

  return (
    <AdminTableGlancePopover
      triggerLabel={name}
      shellLabel="Vendor"
      title={name}
      subtitle={formatVendorId(vendor)}
      avatarInitials={initialsFromName(name)}
      meta={meta.length > 0 ? meta : undefined}
      stats={[
        {
          label: "Status",
          value: vendor.is_active ? "Active" : "Inactive",
        },
      ]}
      footerHref={`/admin/vendors/${vendor.id}`}
      footerLabel="View vendor profile →"
    />
  );
}

export function CatalogProductTableGlance({
  product,
  storeName,
}: {
  product: ProductWithCategoryListItem;
  storeName?: string | null;
}) {
  const name = product.name ?? "Untitled item";
  const displayStore = product.store_name ?? storeName ?? "—";
  const stats: { label: string; value: string }[] = [
    { label: "Stock", value: product.stock_total.toLocaleString("en-IN") },
    { label: "Sales price", value: formatProductPrice(product.price_min) },
  ];
  if (product.purchase_price != null) {
    stats.push({
      label: "Purchase",
      value: formatCurrencyAmount(product.purchase_price),
    });
  }

  const meta: { icon: LucideIcon; content: ReactNode }[] = [];
  const sku = product.product_code ? `Code: ${product.product_code}` : formatSkuLabel(product);
  if (sku && sku !== "—") meta.push({ icon: Tag, content: sku });
  if (product.barcode?.trim()) meta.push({ icon: Barcode, content: product.barcode });

  return (
    <AdminTableGlancePopover
      triggerLabel={name}
      shellLabel="Product"
      title={name}
      subtitle={product.categories?.name ?? "Uncategorized"}
      stats={stats.slice(0, 4)}
      meta={
        meta.length > 0
          ? meta
          : displayStore !== "—"
            ? [{ icon: Store, content: displayStore }]
            : undefined
      }
      footerHref={`/admin/products/${product.id}`}
      footerLabel="View product →"
    />
  );
}
