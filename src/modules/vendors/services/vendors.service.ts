import "server-only";

import {
  requireAdminOnlyProfile,
  requireAdminOrManagerProfile,
} from "@/modules/admin/services/rbac.service";
import { createSupabaseServerClient } from "@/lib/integrations/supabase/server";
import type {
  Paginated,
  Vendor,
  VendorCatalogStats,
  VendorProductWithVariant,
  VariantWithProduct,
} from "@/common/admin/types";
import { PAGE_SIZE } from "@/common/admin/types";

export async function getVendors(page = 0): Promise<Paginated<Vendor>> {
  await requireAdminOrManagerProfile();
  const supabase = await createSupabaseServerClient();
  const from = page * PAGE_SIZE;

  const [dataResult, countResult] = await Promise.all([
    supabase
      .from("vendors")
      .select("id,name,contact,is_active,created_at")
      .order("created_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1),
    supabase
      .from("vendors")
      .select("id", { count: "exact", head: true }),
  ]);

  return {
    data: (dataResult.data ?? []) as Vendor[],
    total: countResult.count ?? 0,
  };
}

export async function getVendorCatalogStats(): Promise<VendorCatalogStats> {
  await requireAdminOrManagerProfile();
  const supabase = await createSupabaseServerClient();

  const [totalRes, activeRes, linesRes] = await Promise.all([
    supabase.from("vendors").select("id", { count: "exact", head: true }),
    supabase
      .from("vendors")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
    supabase.from("vendor_products").select("id", { count: "exact", head: true }),
  ]);

  const total = totalRes.count ?? 0;
  const active = activeRes.count ?? 0;
  return {
    total,
    active,
    inactive: Math.max(0, total - active),
    supplyLines: linesRes.count ?? 0,
  };
}

/** Lightweight list for admin PO filter dropdowns */
export async function listVendorsForPurchaseOrderFilter(): Promise<
  Pick<Vendor, "id" | "name">[]
> {
  await requireAdminOrManagerProfile();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("vendors")
    .select("id,name")
    .order("name", { ascending: true })
    .limit(500);

  return (data ?? []) as Pick<Vendor, "id" | "name">[];
}

export async function getVendorById(id: string): Promise<Vendor | null> {
  await requireAdminOrManagerProfile();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("vendors")
    .select("id,name,contact,is_active,created_at")
    .eq("id", id)
    .maybeSingle();
  return data as Vendor | null;
}

export async function getVendorProducts(
  vendorId: string,
): Promise<VendorProductWithVariant[]> {
  await requireAdminOrManagerProfile();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("vendor_products")
    .select(
      "id,vendor_id,variant_id,base_price,stock,created_at,product_variants(id,name,products(id,name))",
    )
    .eq("vendor_id", vendorId)
    .order("created_at", { ascending: false });

  return (data ?? []) as unknown as VendorProductWithVariant[];
}

export async function getAvailableVariants(
  vendorId: string,
): Promise<VariantWithProduct[]> {
  await requireAdminOrManagerProfile();
  const supabase = await createSupabaseServerClient();

  const [allVariants, assigned] = await Promise.all([
    supabase
      .from("product_variants")
      .select("id,product_id,name,price,mrp,created_at,products(id,name)")
      .order("created_at", { ascending: false }),
    supabase
      .from("vendor_products")
      .select("variant_id")
      .eq("vendor_id", vendorId),
  ]);

  const assignedIds = new Set(
    (assigned.data ?? []).map((r) => r.variant_id).filter(Boolean),
  );

  return (
    (allVariants.data ?? []) as unknown as VariantWithProduct[]
  ).filter((v) => !assignedIds.has(v.id));
}

export async function countVendorProductsForVendor(
  vendorId: string,
): Promise<number> {
  const supabase = await createSupabaseServerClient();
  const { count } = await supabase
    .from("vendor_products")
    .select("id", { count: "exact", head: true })
    .eq("vendor_id", vendorId);
  return count ?? 0;
}

export async function insertVendor(input: {
  name: string;
  contact: string;
}): Promise<void> {
  await requireAdminOrManagerProfile();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("vendors")
    .insert({ name: input.name, contact: input.contact, is_active: true });
  if (error) throw new Error(error.message);
}

export async function updateVendorById(
  id: string,
  input: { name: string; contact: string },
): Promise<void> {
  await requireAdminOrManagerProfile();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("vendors")
    .update({ name: input.name, contact: input.contact })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function setVendorActive(
  id: string,
  isActive: boolean,
): Promise<void> {
  await requireAdminOrManagerProfile();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("vendors")
    .update({ is_active: isActive })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function setVendorsActiveByIds(
  ids: string[],
  isActive: boolean,
): Promise<void> {
  if (ids.length === 0) return;

  await requireAdminOrManagerProfile();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("vendors")
    .update({ is_active: isActive })
    .in("id", ids);
  if (error) throw new Error(error.message);
}

export async function deleteVendorIfNoProducts(vendorId: string): Promise<void> {
  await requireAdminOnlyProfile();
  const n = await countVendorProductsForVendor(vendorId);
  if (n > 0) {
    throw new Error("Cannot delete vendor while vendor_products exist.");
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("vendors").delete().eq("id", vendorId);
  if (error) throw new Error(error.message);
}

export async function insertVendorProduct(input: {
  vendorId: string;
  variantId: string;
  basePrice: number;
  stock: number;
}): Promise<void> {
  await requireAdminOrManagerProfile();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("vendor_products").insert({
    vendor_id: input.vendorId,
    variant_id: input.variantId,
    base_price: input.basePrice,
    stock: input.stock,
  });
  if (error) throw new Error(error.message);
}

export async function updateVendorProductById(
  id: string,
  input: { basePrice: number; stock: number },
): Promise<void> {
  await requireAdminOrManagerProfile();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("vendor_products")
    .update({ base_price: input.basePrice, stock: input.stock })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteVendorProductById(id: string): Promise<void> {
  await requireAdminOnlyProfile();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("vendor_products").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
