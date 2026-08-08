-- 1. Create is_admin helper
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. admin_users
ALTER TABLE "public"."admin_users" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view their own roles" ON "public"."admin_users";
CREATE POLICY "Admins can view their own roles" ON "public"."admin_users" FOR SELECT USING (user_id = auth.uid());

-- 3. events (public read, admin write)
ALTER TABLE "public"."events" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view events" ON "public"."events";
CREATE POLICY "Public can view events" ON "public"."events" FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage events" ON "public"."events";
CREATE POLICY "Admins can manage events" ON "public"."events" USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 4. MEMBERS (The main sensitive table)
ALTER TABLE "public"."members" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage members" ON "public"."members";
CREATE POLICY "Admins can manage members" ON "public"."members" USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "Public can insert members" ON "public"."members";
CREATE POLICY "Public can insert members" ON "public"."members" FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Public can update members" ON "public"."members";
CREATE POLICY "Public can update members" ON "public"."members" FOR UPDATE USING (true) WITH CHECK (true);
-- NO SELECT FOR PUBLIC to prevent full table scraping.

-- RPCs for public targeted lookups
CREATE OR REPLACE FUNCTION public.get_member_by_id_public(query_id uuid)
RETURNS SETOF public.members AS $$
BEGIN
  RETURN QUERY SELECT * FROM public.members WHERE id = query_id LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_member_by_email_public(query_email text)
RETURNS SETOF public.members AS $$
BEGIN
  RETURN QUERY SELECT * FROM public.members WHERE email = query_email LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. EVENT_REGISTRATIONS
ALTER TABLE "public"."event_registrations" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage event registrations" ON "public"."event_registrations";
CREATE POLICY "Admins can manage event registrations" ON "public"."event_registrations" USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "Public can insert event registrations" ON "public"."event_registrations";
CREATE POLICY "Public can insert event registrations" ON "public"."event_registrations" FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Public can update event registrations" ON "public"."event_registrations";
CREATE POLICY "Public can update event registrations" ON "public"."event_registrations" FOR UPDATE USING (true) WITH CHECK (true);
-- NO SELECT FOR PUBLIC

CREATE OR REPLACE FUNCTION public.get_event_reg_by_id_public(query_id uuid)
RETURNS SETOF public.event_registrations AS $$
BEGIN
  RETURN QUERY SELECT * FROM public.event_registrations WHERE id = query_id LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. PAYMENTS
ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage payments" ON "public"."payments";
CREATE POLICY "Admins can manage payments" ON "public"."payments" USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "Public can insert payments" ON "public"."payments";
CREATE POLICY "Public can insert payments" ON "public"."payments" FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Public can update payments" ON "public"."payments";
CREATE POLICY "Public can update payments" ON "public"."payments" FOR UPDATE USING (true) WITH CHECK (true);
-- NO SELECT FOR PUBLIC

-- 7. Other public tables
ALTER TABLE "public"."gallery" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view gallery" ON "public"."gallery";
CREATE POLICY "Public can view gallery" ON "public"."gallery" FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage gallery" ON "public"."gallery";
CREATE POLICY "Admins can manage gallery" ON "public"."gallery" USING (public.is_admin()) WITH CHECK (public.is_admin());

ALTER TABLE "public"."leadership" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view leadership" ON "public"."leadership";
CREATE POLICY "Public can view leadership" ON "public"."leadership" FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage leadership" ON "public"."leadership";
CREATE POLICY "Admins can manage leadership" ON "public"."leadership" USING (public.is_admin()) WITH CHECK (public.is_admin());

ALTER TABLE "public"."membership_types" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view membership_types" ON "public"."membership_types";
CREATE POLICY "Public can view membership_types" ON "public"."membership_types" FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage membership_types" ON "public"."membership_types";
CREATE POLICY "Admins can manage membership_types" ON "public"."membership_types" USING (public.is_admin()) WITH CHECK (public.is_admin());

ALTER TABLE "public"."sponsors" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view sponsors" ON "public"."sponsors";
CREATE POLICY "Public can view sponsors" ON "public"."sponsors" FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage sponsors" ON "public"."sponsors";
CREATE POLICY "Admins can manage sponsors" ON "public"."sponsors" USING (public.is_admin()) WITH CHECK (public.is_admin());

ALTER TABLE "public"."site_settings" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view site_settings" ON "public"."site_settings";
CREATE POLICY "Public can view site_settings" ON "public"."site_settings" FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage site_settings" ON "public"."site_settings";
CREATE POLICY "Admins can manage site_settings" ON "public"."site_settings" USING (public.is_admin()) WITH CHECK (public.is_admin());

ALTER TABLE "public"."contact_messages" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view contact_messages" ON "public"."contact_messages";
CREATE POLICY "Admins can view contact_messages" ON "public"."contact_messages" FOR SELECT USING (public.is_admin());
DROP POLICY IF EXISTS "Admins can manage contact_messages" ON "public"."contact_messages";
CREATE POLICY "Admins can manage contact_messages" ON "public"."contact_messages" USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "Public can insert contact_messages" ON "public"."contact_messages";
CREATE POLICY "Public can insert contact_messages" ON "public"."contact_messages" FOR INSERT WITH CHECK (true);


ALTER TABLE "public"."subscription_plans" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage subscription_plans" ON "public"."subscription_plans";
CREATE POLICY "Admins can manage subscription_plans" ON "public"."subscription_plans" USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "Public can insert subscription_plans" ON "public"."subscription_plans";
CREATE POLICY "Public can insert subscription_plans" ON "public"."subscription_plans" FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Public can update subscription_plans" ON "public"."subscription_plans";
CREATE POLICY "Public can update subscription_plans" ON "public"."subscription_plans" FOR UPDATE USING (true) WITH CHECK (true);

ALTER TABLE "public"."payment_transactions" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage payment_transactions" ON "public"."payment_transactions";
CREATE POLICY "Admins can manage payment_transactions" ON "public"."payment_transactions" USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "Public can insert payment_transactions" ON "public"."payment_transactions";
CREATE POLICY "Public can insert payment_transactions" ON "public"."payment_transactions" FOR INSERT WITH CHECK (true);

