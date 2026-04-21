"use server";

import { revalidatePath } from "next/cache";

import {
  deleteVendorIfNoProducts,
  insertVendor,
  setVendorActive,
  updateVendorById,
} from "@/modules/vendors/services/vendors.service";

export async function createVendorAction(data: {
  name: string;
  contact: string;
}): Promise<void> {
  await insertVendor({ name: data.name, contact: data.contact });
  revalidatePath("/admin/vendors");
}

export async function updateVendorAction(
  id: string,
  data: { name: string; contact: string },
): Promise<void> {
  await updateVendorById(id, { name: data.name, contact: data.contact });
  revalidatePath("/admin/vendors");
}

export async function toggleVendorAction(
  id: string,
  isActive: boolean,
): Promise<void> {
  await setVendorActive(id, isActive);
  revalidatePath("/admin/vendors");
  revalidatePath(`/admin/vendors/${id}`);
}

export async function deleteVendorAction(id: string): Promise<void> {
  await deleteVendorIfNoProducts(id);
  revalidatePath("/admin/vendors");
}
