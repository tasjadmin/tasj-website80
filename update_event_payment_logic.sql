-- Add transaction_id column to event_registrations if it doesn't exist
ALTER TABLE event_registrations 
ADD COLUMN IF NOT EXISTS transaction_id TEXT;

-- Create or Replace the RPC function to mark registration as paid with transaction ID
CREATE OR REPLACE FUNCTION mark_event_registration_paid(
  p_reg_id UUID,
  p_payment_method TEXT,
  p_transaction_id TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE event_registrations
  SET 
    payment_status = 'paid',
    payment_method = p_payment_method,
    transaction_id = p_transaction_id,
    updated_at = NOW()
  WHERE id = p_reg_id;
END;
$$ LANGUAGE plpgsql;
