-- Prevent authenticated users from escalating their own privileges.
-- Service role (auth.uid() IS NULL) bypasses this — webhooks and admin
-- routes that use createServiceClient() are unaffected.

-- profiles: lock role, plan, stripe fields, subscription_status
CREATE OR REPLACE FUNCTION prevent_profile_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Service role has no JWT → auth.uid() is null → allow all changes
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Authenticated users cannot change these fields via the client
  NEW.role                   := OLD.role;
  NEW.plan                   := OLD.plan;
  NEW.subscription_status    := OLD.subscription_status;
  NEW.stripe_customer_id     := OLD.stripe_customer_id;
  NEW.stripe_subscription_id := OLD.stripe_subscription_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profiles_sensitive_columns ON profiles;
CREATE TRIGGER protect_profiles_sensitive_columns
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_profile_privilege_escalation();

-- builder_profiles: lock letter quota fields
CREATE OR REPLACE FUNCTION prevent_builder_profile_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  NEW.letters_remaining       := OLD.letters_remaining;
  NEW.letters_used_this_month := OLD.letters_used_this_month;
  NEW.quota_reset_at          := OLD.quota_reset_at;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_builder_profiles_sensitive_columns ON builder_profiles;
CREATE TRIGGER protect_builder_profiles_sensitive_columns
  BEFORE UPDATE ON builder_profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_builder_profile_privilege_escalation();
