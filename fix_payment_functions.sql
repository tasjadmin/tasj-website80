-- Function to mark event registration as paid (SECURITY DEFINER to bypass RLS)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark membership as paid (SECURITY DEFINER to bypass RLS)
CREATE OR REPLACE FUNCTION mark_membership_paid(
  p_member_id UUID,
  p_payment_method TEXT,
  p_transaction_id TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE members
  SET 
    payment_status = 'paid',
    status = 'active', -- Set status to active (approved)
    payment_method = p_payment_method,
    transaction_id = p_transaction_id,
    updated_at = NOW()
  WHERE id = p_member_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
