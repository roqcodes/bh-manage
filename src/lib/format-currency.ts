export type CurrencySettings = {
  country_code: string;
  country_name: string;
  currency_code: string;
  currency_symbol: string;
  locale: string;
  show_mrp: boolean;
};

export const DEFAULT_CURRENCY_SETTINGS: CurrencySettings = {
  country_code: "IN",
  country_name: "India",
  currency_code: "INR",
  currency_symbol: "₹",
  locale: "en-IN",
  show_mrp: true,
};

let activeSettings: CurrencySettings = { ...DEFAULT_CURRENCY_SETTINGS };

export function setCurrencySettings(settings: CurrencySettings) {
  activeSettings = { ...settings };
}

export function getCurrencySettings(): CurrencySettings {
  return activeSettings;
}

export function getCurrencySymbol(): string {
  return activeSettings.currency_symbol;
}

/** Label helper, e.g. "Price (₹)" */
export function currencyLabel(prefix: string): string {
  return `${prefix} (${activeSettings.currency_symbol})`;
}

export function formatCurrency(
  amount: number | null | undefined,
  options?: Intl.NumberFormatOptions,
  settings?: CurrencySettings,
): string {
  if (amount == null || !Number.isFinite(amount)) return "—";
  const s = settings ?? activeSettings;
  return new Intl.NumberFormat(s.locale, {
    style: "currency",
    currency: s.currency_code,
    maximumFractionDigits: 2,
    ...options,
  }).format(amount);
}

/** Numeric amount only — use with symbol in column headers / KPI labels. */
export function formatCurrencyAmount(
  amount: number | null | undefined,
  options?: Intl.NumberFormatOptions,
  settings?: CurrencySettings,
): string {
  if (amount == null || !Number.isFinite(amount)) return "—";
  const s = settings ?? activeSettings;
  return new Intl.NumberFormat(s.locale, {
    style: "decimal",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  }).format(amount);
}

/** Compact amounts for dashboards (e.g. $1.2K, ₹2.5L). */
export function formatCurrencyCompact(
  amount: number,
  settings?: CurrencySettings,
): string {
  const sym = (settings ?? activeSettings).currency_symbol;
  const compact = formatCurrencyCompactAmount(amount, settings);
  return `${sym}${compact}`;
}

/** Compact numeric amount without currency symbol. */
export function formatCurrencyCompactAmount(
  amount: number,
  settings?: CurrencySettings,
): string {
  const locale = (settings ?? activeSettings).locale;
  if (amount >= 1e7) {
    return `${(amount / 1e7).toFixed(amount >= 1e8 ? 1 : 2)}Cr`;
  }
  if (amount >= 1e5) {
    return `${(amount / 1e5).toFixed(amount >= 1e6 ? 1 : 2)}L`;
  }
  if (amount >= 1e3) return `${(amount / 1e3).toFixed(1)}K`;
  return amount.toLocaleString(locale, { maximumFractionDigits: 0 });
}

/** Backward-compatible alias — amount only (symbol in headers). */
export function formatInr(n: number, options?: Intl.NumberFormatOptions) {
  return formatCurrencyAmount(n, options);
}
