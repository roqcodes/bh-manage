"use server";

import { revalidatePath } from "next/cache";

import { setStoreUserVerified } from "@/modules/users/services/users.service";

export async function blockUserAction(userId: string): Promise<void> {
  await setStoreUserVerified(userId, false);
  revalidatePath("/admin/users");
}

export async function unblockUserAction(userId: string): Promise<void> {
  await setStoreUserVerified(userId, true);
  revalidatePath("/admin/users");
}
