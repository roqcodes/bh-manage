"use client";

import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseEnv } from "@/lib/integrations/supabase/env";
import type { Database } from "@/lib/integrations/supabase/types";

let browserClient: ReturnType<typeof createBrowserClient<Database>> | undefined;

/** Single browser client per tab — avoids duplicate auth/session listeners. */
export function createSupabaseBrowserClient() {
  if (browserClient) return browserClient;

  const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv();
  browserClient = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
  return browserClient;
}
