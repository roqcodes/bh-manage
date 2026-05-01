import "server-only";

import { requireAdminOrManagerProfile } from "@/modules/admin/services/rbac.service";
import { createSupabaseServerClient } from "@/lib/integrations/supabase/server";
import { PAGE_SIZE, type Order, type AdminUser, type Paginated } from "@/common/admin/types";

export interface CustomerStats {
  total: number;
  retail: number;
  staff: number;
  active: number;
}

export interface CustomerSummary {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: string | null;
  is_verified: boolean;
  created_at: string;
}

export interface WalletTransaction {
  id: string;
  amount: number;
  type: "credit" | "debit";
  reference: string | null;
  created_at: string;
}

export interface CustomerDetailsResponse {
  summary: CustomerSummary;
  wallet: {
    balance: number;
    transactions: WalletTransaction[];
    transactionsCount: number;
  };
  orders: Order[];
}

export async function getCustomerDetails(
  userId: string,
  txPage = 0
): Promise<CustomerDetailsResponse> {
  await requireAdminOrManagerProfile();
  const supabase = await createSupabaseServerClient();

  // 1. Get user summary
  const { data: user, error: userErr } = await supabase
    .from("users")
    .select("id, name, email, phone, role, is_verified, created_at")
    .eq("id", userId)
    .single();

  if (userErr) throw new Error(userErr.message);

  // 2. Get wallet balance
  // Since we added admin RLS policies, we can query wallet directly
  const { data: walletData } = await supabase
    .from("wallet")
    .select("balance")
    .eq("user_id", userId)
    .maybeSingle();

  const balance = walletData?.balance ?? 0;

  // 3. Get transactions
  const from = txPage * PAGE_SIZE;
  const { data: txData, count: txCount } = await supabase
    .from("transactions")
    .select("id, amount, type, reference, created_at", { count: "exact" })
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  // 4. Get recent orders
  const { data: ordersData } = await supabase
    .from("orders")
    .select("id, created_at, status, total_amount")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(5);

  return {
    summary: user as CustomerSummary,
    wallet: {
      balance: Number(balance),
      transactions: (txData ?? []) as WalletTransaction[],
      transactionsCount: txCount ?? 0,
    },
    orders: (ordersData ?? []) as unknown as Order[],
  };
}

export async function getAllCustomers(page = 0): Promise<Paginated<AdminUser> & { stats: CustomerStats }> {
  await requireAdminOrManagerProfile();
  const supabase = await createSupabaseServerClient();
  const from = page * PAGE_SIZE;

  // We fetch all users (except maybe 'admin' if we want to exclude them, but let's fetch all for a complete list or just those not admin/vendor/delivery)
  // Since the user says "every customer, their type of account", we'll fetch all users.
  const [usersResult, countResult, retailCountResult, activeCountResult] = await Promise.all([
    supabase
      .from("users")
      .select("id,name,email,phone,role,is_verified,created_at")
      .neq("role", "admin") // exclude admins from customer list
      .order("created_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1),
    supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .neq("role", "admin"),
    supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .is("role", null),
    supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .neq("role", "admin")
      .eq("is_verified", true),
  ]);

  const users = (usersResult.data ?? []) as AdminUser[];
  const total = countResult.count ?? 0;
  const retail = retailCountResult.count ?? 0;
  const active = activeCountResult.count ?? 0;
  const staff = total - retail;

  const stats: CustomerStats = { total, retail, staff, active };

  if (users.length === 0) {
    return { data: [], total, stats };
  }

  const { data: orderRows } = await supabase
    .from("orders")
    .select("user_id")
    .in(
      "user_id",
      users.map((u) => u.id),
    );

  const orderCountMap = (orderRows ?? []).reduce<Record<string, number>>(
    (acc, o) => {
      if (o.user_id) acc[o.user_id] = (acc[o.user_id] ?? 0) + 1;
      return acc;
    },
    {},
  );

  return {
    data: users.map((u) => ({ ...u, order_count: orderCountMap[u.id] ?? 0 })),
    total,
    stats,
  };
}

