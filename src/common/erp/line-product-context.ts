export type LineProductContext = {
  productId: string;
  availableStock: number;
  avgPurchasePrice: number | null;
  lastPurchasePrice: number | null;
  lastSellingPrice: number | null;
  counterpartyLastPrice: number | null;
};

export type LineProductContextMap = Record<string, LineProductContext>;
