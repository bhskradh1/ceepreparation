
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_test_question_count(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_test_questions(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.submit_attempt(uuid, jsonb, integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_attempt_review(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_weekly_leaderboard(integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_admin_stats() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_test_question_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_test_questions(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_attempt(uuid, jsonb, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_attempt_review(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_weekly_leaderboard(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_stats() TO authenticated;
