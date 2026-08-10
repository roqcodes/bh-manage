import "server-only";

import {
  DEFAULT_CURRENCY_SETTINGS,
  type CurrencySettings,
} from "@/lib/format-currency";
import { requireAdminOrManagerProfile } from "@/modules/admin/services/rbac.service";
import { createSupabaseServerClient } from "@/lib/integrations/supabase/server";
import type { AppSettingsPatch } from "@/modules/settings/types";

function rowToSettings(
  row: Record<string, unknown>,
  showMrpDefault = true,
  capturePaymentsDefault = true,
): CurrencySettings {
  return {
    country_code: String(row.country_code ?? DEFAULT_CURRENCY_SETTINGS.country_code),
    country_name: String(row.country_name ?? DEFAULT_CURRENCY_SETTINGS.country_name),
    currency_code: String(row.currency_code ?? DEFAULT_CURRENCY_SETTINGS.currency_code),
    currency_symbol: String(row.currency_symbol ?? DEFAULT_CURRENCY_SETTINGS.currency_symbol),
    locale: String(row.locale ?? DEFAULT_CURRENCY_SETTINGS.locale),
    show_mrp:
      "show_mrp" in row ? row.show_mrp !== false : showMrpDefault,
    capture_payments:
      "capture_payments" in row
        ? row.capture_payments !== false
        : capturePaymentsDefault,
  };
}

const APP_SETTINGS_BASE_SELECT =
  "country_code,country_name,currency_code,currency_symbol,locale";

async function fetchAppSettingsRow(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
) {
  const withFlags = await supabase
    .from("app_settings")
    .select(`${APP_SETTINGS_BASE_SELECT},show_mrp,capture_payments`)
    .eq("id", 1)
    .maybeSingle();

  if (!withFlags.error) return withFlags;

  if (/show_mrp|capture_payments/i.test(withFlags.error.message)) {
    const withMrp = await supabase
      .from("app_settings")
      .select(`${APP_SETTINGS_BASE_SELECT},show_mrp`)
      .eq("id", 1)
      .maybeSingle();

    if (!withMrp.error) return withMrp;

    if (/show_mrp/i.test(withMrp.error.message)) {
      return supabase
        .from("app_settings")
        .select(APP_SETTINGS_BASE_SELECT)
        .eq("id", 1)
        .maybeSingle();
    }

    return withMrp;
  }

  return withFlags;
}

export async function getAppSettings(): Promise<CurrencySettings> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await fetchAppSettingsRow(supabase);

  if (error) throw new Error(error.message);
  if (!data) return { ...DEFAULT_CURRENCY_SETTINGS };
  return rowToSettings(data, true);
}

export async function getAppSettingsForAdmin(): Promise<CurrencySettings> {
  await requireAdminOrManagerProfile();
  return getAppSettings();
}

export async function updateAppSettings(
  patch: AppSettingsPatch,
): Promise<CurrencySettings> {
  await requireAdminOrManagerProfile();
  const supabase = await createSupabaseServerClient();

  const current = await getAppSettings();
  const next: CurrencySettings = {
    country_code: patch.country_code?.trim() || current.country_code,
    country_name: patch.country_name?.trim() || current.country_name,
    currency_code: patch.currency_code?.trim().toUpperCase() || current.currency_code,
    currency_symbol: patch.currency_symbol?.trim() || current.currency_symbol,
    locale: patch.locale?.trim() || current.locale,
    show_mrp: patch.show_mrp ?? current.show_mrp,
    capture_payments: patch.capture_payments ?? current.capture_payments,
  };

  const updatedAt = new Date().toISOString();
  const upsertPayload = {
    id: 1,
    ...next,
    updated_at: updatedAt,
  };

  let { error } = await supabase.from("app_settings").upsert(upsertPayload);

  if (error && /show_mrp|capture_payments/i.test(error.message)) {
    const {
      show_mrp: _omitMrp,
      capture_payments: _omitCapture,
      ...withoutFlags
    } = upsertPayload;
    ({ error } = await supabase.from("app_settings").upsert(withoutFlags));
  }

  if (error) throw new Error(error.message);
  return next;
}
