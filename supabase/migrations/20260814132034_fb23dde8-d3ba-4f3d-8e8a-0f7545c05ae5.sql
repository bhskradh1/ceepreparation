
-- Restrict profile reads to the owner (and admins)
DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;
CREATE POLICY "profiles_select_own_or_admin" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_admin());

-- Require a signed-in user for the question-count helper
CREATE OR REPLACE FUNCTION public.get_test_question_count(p_test_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT count(*)::int
  FROM public.test_questions tq
  JOIN public.tests t ON t.id = tq.test_id
  WHERE tq.test_id = p_test_id
    AND auth.uid() IS NOT NULL
    AND (t.is_published OR public.is_admin());
$$;

-- No SECURITY DEFINER function should be callable anonymously
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_delete_questions(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_admin_stats() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_attempt_review(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_weekly_leaderboard(integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_test_questions(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_test_question_count(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.submit_attempt(uuid, jsonb, integer) FROM anon, public;

-- Admin-only functions: keep them out of reach of ordinary signed-in users at the grant level too
REVOKE EXECUTE ON FUNCTION public.admin_delete_questions(text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_admin_stats() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_questions(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_test_question_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_test_question_count(uuid) TO service_role;
