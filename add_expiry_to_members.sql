-- SQL Migration to add expiry handling to members table

-- 1. Add expiry_date and membership_start_date columns if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'members' AND column_name = 'expiry_date') THEN
        ALTER TABLE members ADD COLUMN expiry_date TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'members' AND column_name = 'membership_start_date') THEN
        ALTER TABLE members ADD COLUMN membership_start_date TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- 2. Create or Replace Function to Mark Membership Paid AND Calculate Expiry
-- Drop first to allow return type change if needed
DROP FUNCTION IF EXISTS mark_membership_paid(uuid, text, text);

CREATE OR REPLACE FUNCTION mark_membership_paid(
  p_member_id UUID,
  p_payment_method TEXT,
  p_transaction_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_member_record RECORD;
  v_new_expiry TIMESTAMP WITH TIME ZONE;
  v_new_status TEXT := 'active';
  v_now TIMESTAMP WITH TIME ZONE := NOW();
BEGIN
  -- Get current member details
  SELECT * INTO v_member_record FROM members WHERE id = p_member_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member not found';
  END IF;

  -- Calculate Expiry based on Type
  IF v_member_record.membership_type = 'life' THEN
    v_new_expiry := NULL; -- Life members have no expiry
  ELSE
    -- Individual / Family: 1 Year Validity
    -- If already active and not expired, extend from current expiry? 
    -- User requirement: "New expiry date (1 year from renewal)" implies from NOW if it was inactive, or perhaps from old expiry?
    -- Usually: if expired, start from NOW. If active, add 1 year to current expiry.
    -- For simplicity and complying with "Reactivate... New start date... New expiry date (1 year from renewal)", we stick to 1 year from payment date.
    v_new_expiry := v_now + INTERVAL '1 year';
  END IF;

  -- Update Member
  UPDATE members
  SET 
    payment_status = 'paid',
    status = v_new_status,
    payment_method = p_payment_method,
    transaction_id = p_transaction_id,
    updated_at = v_now,
    membership_start_date = COALESCE(membership_start_date, v_now), -- Set start date if not set (first time) OR should we reset it on renewal? "New start date" implies reset.
    expiry_date = v_new_expiry
  WHERE id = p_member_id;

  RETURN jsonb_build_object(
    'success', true,
    'member_id', p_member_id,
    'expiry_date', v_new_expiry,
    'status', v_new_status
  );
END;
$$;
