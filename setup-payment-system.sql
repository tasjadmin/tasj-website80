-- TASJ Payment System Database Setup
-- Run this SQL script in Supabase SQL Editor

-- =====================================================
-- 1. CREATE PAYMENTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- User and reference tracking
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  payment_type VARCHAR(20) NOT NULL CHECK (payment_type IN ('event_registration', 'membership')),
  reference_id UUID NOT NULL, -- Foreign key to events or members table
  
  -- Payment details
  payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('stripe', 'check', 'cash', 'bank_transfer')),
  payment_mode VARCHAR(10) NOT NULL CHECK (payment_mode IN ('online', 'offline')),
  amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
  
  -- Stripe-specific fields
  stripe_payment_intent_id VARCHAR(255) UNIQUE,
  stripe_customer_id VARCHAR(255),
  stripe_charge_id VARCHAR(255),
  
  -- Offline payment fields
  check_number VARCHAR(100),
  transaction_reference VARCHAR(255),
  receipt_url TEXT,
  notes TEXT,
  
  -- Payer information
  payer_name VARCHAR(255),
  payer_email VARCHAR(255),
  payer_phone VARCHAR(20),
  billing_address JSONB DEFAULT '{}',
  
  -- Admin verification tracking
  verified_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  verified_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  payment_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_reference_id ON payments(reference_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_payment_type ON payments(payment_type);
CREATE INDEX IF NOT EXISTS idx_payments_payment_mode ON payments(payment_mode);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_payment_intent ON payments(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);

-- =====================================================
-- 2. CREATE PAYMENT TRANSACTIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_id UUID REFERENCES payments(id) ON DELETE CASCADE NOT NULL,
  
  -- Transaction details
  transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('charge', 'refund', 'verification', 'update', 'cancellation')),
  amount DECIMAL(10,2),
  status VARCHAR(20) NOT NULL,
  
  -- Gateway response and error tracking
  gateway_response JSONB DEFAULT '{}',
  error_message TEXT,
  
  -- Request metadata for security audit
  ip_address INET,
  user_agent TEXT,
  
  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payment_transactions_payment_id ON payment_transactions(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_created_at ON payment_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_type ON payment_transactions(transaction_type);

-- =====================================================
-- 3. CREATE SUBSCRIPTION PLANS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- User and member references
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  
  -- Subscription details
  membership_type VARCHAR(50) NOT NULL,
  stripe_subscription_id VARCHAR(255) UNIQUE,
  stripe_customer_id VARCHAR(255),
  
  -- Subscription status
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'expired', 'trialing')),
  
  -- Billing periods
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  trial_end TIMESTAMP WITH TIME ZONE,
  
  -- Cancellation tracking
  cancel_at TIMESTAMP WITH TIME ZONE,
  canceled_at TIMESTAMP WITH TIME ZONE,
  cancellation_reason TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_subscription_plans_user_id ON subscription_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_member_id ON subscription_plans(member_id);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_stripe_subscription_id ON subscription_plans(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_status ON subscription_plans(status);

-- =====================================================
-- 4. MODIFY EXISTING TABLES
-- =====================================================

-- Add payment-related columns to events table
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS registration_fee DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS payment_required BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS accept_offline_payment BOOLEAN DEFAULT true;

-- Add payment-related columns to members table
ALTER TABLE members 
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'partially_paid', 'overdue', 'pending_verification', 'rejected', 'failed', 'refunded')),
ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS subscription_id UUID REFERENCES subscription_plans(id) ON DELETE SET NULL;

-- Add payment-related columns to event_registrations table
ALTER TABLE event_registrations 
ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded', 'pending_verification', 'rejected', 'partially_paid', 'overdue'));

-- =====================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on payments table
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own payments
CREATE POLICY "Users can view own payments"
ON payments FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Admins can view all payments
CREATE POLICY "Admins can view all payments"
ON payments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM admin_users 
    WHERE user_id = auth.uid()
  )
);

-- Policy: Only admins can create offline payments
CREATE POLICY "Admins can create offline payments"
ON payments FOR INSERT
WITH CHECK (
  payment_mode = 'offline' AND
  EXISTS (
    SELECT 1 FROM admin_users 
    WHERE user_id = auth.uid()
  )
);

-- Policy: Authenticated users can create online payments
CREATE POLICY "Users can create online payments"
ON payments FOR INSERT
WITH CHECK (
  payment_mode = 'online' AND
  (auth.uid() = user_id OR user_id IS NULL)
);

-- Policy: Only admins can update payment verification
CREATE POLICY "Admins can verify payments"
ON payments FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM admin_users 
    WHERE user_id = auth.uid()
  )
);

-- Enable RLS on payment_transactions table
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all payment transactions
CREATE POLICY "Admins can view all payment transactions"
ON payment_transactions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM admin_users 
    WHERE user_id = auth.uid()
  )
);

-- Policy: Users can view transactions for their own payments
CREATE POLICY "Users can view own payment transactions"
ON payment_transactions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM payments 
    WHERE id = payment_transactions.payment_id 
    AND user_id = auth.uid()
  )
);

-- Policy: System can insert payment transactions (via Edge Functions)
CREATE POLICY "System can insert payment transactions"
ON payment_transactions FOR INSERT
WITH CHECK (true);

-- Enable RLS on subscription_plans table
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own subscriptions
CREATE POLICY "Users can view own subscriptions"
ON subscription_plans FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Admins can view all subscriptions
CREATE POLICY "Admins can view all subscriptions"
ON subscription_plans FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM admin_users 
    WHERE user_id = auth.uid()
  )
);

-- Policy: System can insert subscriptions (via Edge Functions)
CREATE POLICY "System can insert subscriptions"
ON subscription_plans FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own subscriptions (cancel)
CREATE POLICY "Users can update own subscriptions"
ON subscription_plans FOR UPDATE
USING (auth.uid() = user_id);

-- =====================================================
-- 6. HELPER FUNCTIONS
-- =====================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for payments table
DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for subscription_plans table
DROP TRIGGER IF EXISTS update_subscription_plans_updated_at ON subscription_plans;
CREATE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to get payment summary for a user
CREATE OR REPLACE FUNCTION get_user_payment_summary(p_user_id UUID)
RETURNS TABLE (
  total_payments BIGINT,
  total_amount DECIMAL,
  pending_payments BIGINT,
  completed_payments BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_payments,
    COALESCE(SUM(amount), 0)::DECIMAL as total_amount,
    COUNT(*) FILTER (WHERE status = 'pending')::BIGINT as pending_payments,
    COUNT(*) FILTER (WHERE status = 'completed')::BIGINT as completed_payments
  FROM payments
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log payment transaction
CREATE OR REPLACE FUNCTION log_payment_transaction(
  p_payment_id UUID,
  p_transaction_type VARCHAR,
  p_amount DECIMAL,
  p_status VARCHAR,
  p_gateway_response JSONB DEFAULT '{}',
  p_error_message TEXT DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_transaction_id UUID;
BEGIN
  INSERT INTO payment_transactions (
    payment_id,
    transaction_type,
    amount,
    status,
    gateway_response,
    error_message,
    ip_address,
    user_agent
  ) VALUES (
    p_payment_id,
    p_transaction_type,
    p_amount,
    p_status,
    p_gateway_response,
    p_error_message,
    p_ip_address,
    p_user_agent
  )
  RETURNING id INTO v_transaction_id;
  
  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. SAMPLE DATA (FOR TESTING - OPTIONAL)
-- =====================================================

-- Uncomment to insert sample payment data for testing

/*
INSERT INTO payments (
  user_id,
  payment_type,
  reference_id,
  payment_method,
  payment_mode,
  amount,
  status,
  payer_name,
  payer_email,
  payer_phone,
  check_number,
  notes,
  payment_date
) VALUES (
  NULL, -- Guest payment
  'event_registration',
  '00000000-0000-0000-0000-000000000000', -- Replace with actual event ID
  'check',
  'offline',
  50.00,
  'pending',
  'John Doe',
  'john.doe@example.com',
  '555-123-4567',
  'CHK-12345',
  'Test offline payment via check',
  NOW()
);
*/

-- =====================================================
-- 8. GRANT PERMISSIONS
-- =====================================================

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT ON payments TO authenticated;
GRANT SELECT, INSERT ON payment_transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON subscription_plans TO authenticated;

-- Grant full permissions to service role (for Edge Functions)
GRANT ALL ON payments TO service_role;
GRANT ALL ON payment_transactions TO service_role;
GRANT ALL ON subscription_plans TO service_role;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Payment System Database Setup Complete!';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Tables Created:';
  RAISE NOTICE '  - payments';
  RAISE NOTICE '  - payment_transactions';
  RAISE NOTICE '  - subscription_plans';
  RAISE NOTICE '';
  RAISE NOTICE 'Modified Tables:';
  RAISE NOTICE '  - events (added payment columns)';
  RAISE NOTICE '  - members (added payment columns)';
  RAISE NOTICE '  - event_registrations (added payment columns)';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '  1. Set up Stripe account and get API keys';
  RAISE NOTICE '  2. Create Supabase Edge Functions';
  RAISE NOTICE '  3. Configure environment variables';
  RAISE NOTICE '  4. Implement frontend payment components';
  RAISE NOTICE '  5. Test payment flows thoroughly';
  RAISE NOTICE '================================================';
END $$;
