-- Clear transactional / test data — keep users, catalog, and org/config masters.
-- Run in Supabase SQL Editor as postgres (or service role).
--
-- KEPT: users, products, variants, categories, brands, media, tax_rates,
--       app_settings, procurement_settings, pricing_rules, item_units,
--       companies, stores (non-test), user_store_access, vendors, vendor_products,
--       account_types, accounts, erp_posting_rules, erp_landed_cost_items,
--       user_erp_preferences
--
-- CLEARED: orders, carts, wallets, invoices, ERP docs, inventory movements,
--          store stock, analytics, notifications, audit logs, test stores

BEGIN;

-- ─── 1. Transactional tables (FK-safe single TRUNCATE) ─────────────────────

TRUNCATE TABLE
  public.order_fulfillment_items,
  public.order_fulfillments,
  public.order_funnel_reach,
  public.order_items,
  public.orders,
  public.invoice_items,
  public.invoices,
  public.returns,
  public.cart_items,
  public.carts,
  public.cart_reach,
  public.shopping_list_items,
  public.shopping_lists,
  public.transactions,
  public.wallet,
  public.addresses,
  public.notifications,
  public.product_view_reach,
  public.stock_movements,
  public.purchase_order_items,
  public.purchase_orders,
  public.audit_logs,
  public.customer_credit_limits,
  public.erp_payment_allocations,
  public.erp_credit_note_applications,
  public.erp_vendor_credit_applications,
  public.erp_supplier_payment_allocations,
  public.journal_entry_lines,
  public.erp_purchase_bill_landed_costs,
  public.erp_store_transfer_lines,
  public.erp_transfer_request_lines,
  public.erp_stock_adjustment_lines,
  public.erp_credit_note_lines,
  public.erp_estimate_lines,
  public.erp_vendor_credit_lines,
  public.erp_purchase_bill_lines,
  public.erp_customer_payments,
  public.erp_credit_notes,
  public.erp_estimates,
  public.erp_vendor_credits,
  public.erp_supplier_payments,
  public.erp_purchase_bills,
  public.erp_expenses,
  public.erp_transfer_payments,
  public.erp_store_transfers,
  public.erp_transfer_requests,
  public.erp_stock_adjustments,
  public.journal_entries,
  public.erp_account_transactions,
  public.erp_vat_payments,
  public.erp_vat_returns,
  public.erp_fixed_assets,
  public.store_inventory
RESTART IDENTITY;

-- ─── 2. Reset central inventory (catalog variants remain) ───────────────────

UPDATE public.inventory
SET stock = 0, updated_at = now();

-- ─── 3. Reset ERP document counters ─────────────────────────────────────────

UPDATE public.erp_document_sequences
SET next_number = 1, updated_at = now();

-- ─── 4. Reset customer opening balances on user rows ──────────────────────────

UPDATE public.users
SET opening_balance = 0
WHERE opening_balance IS DISTINCT FROM 0;

-- ─── 5. Remove integration-test stores ──────────────────────────────────────
-- Repoint FKs that reference test stores BEFORE delete (app_settings blocks DELETE).

UPDATE public.app_settings
SET default_store_id = (
  SELECT s.id
  FROM public.stores s
  WHERE s.is_active = true
    AND NOT (s.code IN ('TSTA', 'TSTB') OR s.name LIKE 'TEST-STORE-%')
  ORDER BY s.is_default DESC NULLS LAST, s.created_at
  LIMIT 1
)
WHERE id = 1
  AND default_store_id IN (
    SELECT id FROM public.stores
    WHERE code IN ('TSTA', 'TSTB') OR name LIKE 'TEST-STORE-%'
  );

UPDATE public.app_settings
SET default_store_id = NULL
WHERE id = 1
  AND default_store_id IN (
    SELECT id FROM public.stores
    WHERE code IN ('TSTA', 'TSTB') OR name LIKE 'TEST-STORE-%'
  );

UPDATE public.user_erp_preferences
SET active_store_id = NULL
WHERE active_store_id IN (
  SELECT id FROM public.stores
  WHERE code IN ('TSTA', 'TSTB') OR name LIKE 'TEST-STORE-%'
);

DELETE FROM public.user_store_access
WHERE store_id IN (
  SELECT id FROM public.stores
  WHERE code IN ('TSTA', 'TSTB') OR name LIKE 'TEST-STORE-%'
);

DELETE FROM public.stores
WHERE code IN ('TSTA', 'TSTB') OR name LIKE 'TEST-STORE-%';

-- Ensure app_settings points at a valid store if any remain
UPDATE public.app_settings
SET default_store_id = (
  SELECT s.id
  FROM public.stores s
  WHERE s.is_active = true
  ORDER BY s.is_default DESC NULLS LAST, s.created_at
  LIMIT 1
)
WHERE id = 1
  AND default_store_id IS NULL
  AND EXISTS (SELECT 1 FROM public.stores s WHERE s.is_active = true);

COMMIT;

-- ─── Verification (should be 0 for transactional; users/products > 0) ───────

SELECT 'orders' AS entity, count(*)::bigint AS rows FROM public.orders
UNION ALL SELECT 'order_fulfillments', count(*) FROM public.order_fulfillments
UNION ALL SELECT 'store_inventory', count(*) FROM public.store_inventory
UNION ALL SELECT 'stock_movements', count(*) FROM public.stock_movements
UNION ALL SELECT 'erp_purchase_bills', count(*) FROM public.erp_purchase_bills
UNION ALL SELECT 'journal_entries', count(*) FROM public.journal_entries
UNION ALL SELECT 'wallet', count(*) FROM public.wallet
UNION ALL SELECT 'carts', count(*) FROM public.carts
UNION ALL SELECT 'users', count(*) FROM public.users
UNION ALL SELECT 'products', count(*) FROM public.products
UNION ALL SELECT 'product_variants', count(*) FROM public.product_variants
UNION ALL SELECT 'stores', count(*) FROM public.stores
ORDER BY entity;
