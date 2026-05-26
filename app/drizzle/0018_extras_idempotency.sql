-- 0018: Idempotency on purchased_extras via chargebee_invoice_id
CREATE UNIQUE INDEX IF NOT EXISTS purchased_extras_invoice_unique
  ON purchased_extras(chargebee_invoice_id) WHERE chargebee_invoice_id IS NOT NULL;
