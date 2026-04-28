-- Automated Inventory Deduction Trigger
-- Decrements stock from `inventory` (if vendor is admin) or `vendor_products` 
-- whenever an order's payment_status becomes 'paid'.

CREATE OR REPLACE FUNCTION process_order_inventory()
RETURNS TRIGGER AS $$
DECLARE
  v_item RECORD;
  v_is_admin BOOLEAN;
BEGIN
  -- Only execute if the payment_status transitions to 'paid'
  IF NEW.payment_status = 'paid' AND OLD.payment_status != 'paid' THEN
    -- Loop through all items for this order
    FOR v_item IN SELECT variant_id, quantity, vendor_id FROM order_items WHERE order_id = NEW.id LOOP
      
      -- Determine if the vendor is an admin
      SELECT EXISTS (
        SELECT 1 FROM users WHERE id = v_item.vendor_id AND role = 'admin'
      ) INTO v_is_admin;
      
      IF v_is_admin THEN
        -- Deduct from central inventory
        UPDATE inventory 
        SET stock = GREATEST(stock - v_item.quantity, 0),
            updated_at = NOW()
        WHERE variant_id = v_item.variant_id;
      ELSE
        -- Deduct from vendor products
        UPDATE vendor_products 
        SET stock = GREATEST(stock - v_item.quantity, 0)
        WHERE variant_id = v_item.variant_id AND vendor_id = v_item.vendor_id;
      END IF;
      
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists (for idempotency during dev)
DROP TRIGGER IF EXISTS trg_deduct_inventory ON orders;

CREATE TRIGGER trg_deduct_inventory
AFTER UPDATE OF payment_status ON orders
FOR EACH ROW
WHEN (NEW.payment_status = 'paid' AND OLD.payment_status != 'paid')
EXECUTE FUNCTION process_order_inventory();
