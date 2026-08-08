"use client";

import { createContext, useContext, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  DEFAULT_CURRENCY_SETTINGS,
  formatCurrency,
  formatCurrencyCompact,
  getCurrencySymbol,
  setCurrencySettings,
  type CurrencySettings,
} from "@/lib/format-currency";
import { adminGet } from "@/modules/admin/lib/admin-api-client";
import { adminQueryKeys } from "@/modules/admin/lib/admin-query-keys";

type CurrencyContextValue = {
  settings: CurrencySettings;
  format: typeof formatCurrency;
  formatCompact: typeof formatCurrencyCompact;
  symbol: string;
  isLoading: boolean;
};

const CurrencyContext = createContext<CurrencyContextValue>({
  settings: DEFAULT_CURRENCY_SETTINGS,
  format: formatCurrency,
  formatCompact: formatCurrencyCompact,
  symbol: DEFAULT_CURRENCY_SETTINGS.currency_symbol,
  isLoading: true,
});

export function CurrencySettingsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data, isLoading } = useQuery({
    queryKey: adminQueryKeys.appSettings(),
    queryFn: () =>
      adminGet<{ settings: CurrencySettings }>("settings").then((r) => r.settings),
    staleTime: 60_000,
  });

  const settings = data ?? DEFAULT_CURRENCY_SETTINGS;

  useEffect(() => {
    setCurrencySettings(settings);
  }, [settings]);

  return (
    <CurrencyContext.Provider
      value={{
        settings,
        format: formatCurrency,
        formatCompact: formatCurrencyCompact,
        symbol: settings.currency_symbol || getCurrencySymbol(),
        isLoading,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrencySettings() {
  return useContext(CurrencyContext);
}
