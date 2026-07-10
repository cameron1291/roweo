-- Atomic letter-quota increment used by the Stripe webhook for letter-pack
-- purchases. Using a function avoids the read-then-write race condition where
-- two concurrent webhooks for the same user could both read the same value
-- and write it back, causing one pack's letters to be silently lost.

CREATE OR REPLACE FUNCTION add_letters(p_user_id uuid, p_amount integer)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE builder_profiles
  SET letters_remaining = letters_remaining + p_amount
  WHERE user_id = p_user_id;
$$;
