
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE TABLE public.admin_emails (
  email text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.admin_emails TO authenticated;
GRANT ALL ON public.admin_emails TO service_role;
ALTER TABLE public.admin_emails ENABLE ROW LEVEL SECURITY;
INSERT INTO public.admin_emails (email) VALUES ('bhskradh2060@gmail.com');

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_emails a
    WHERE lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

CREATE POLICY "admin_emails_select_admin" ON public.admin_emails FOR SELECT TO authenticated USING (public.is_admin());

CREATE TABLE public.questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  question text NOT NULL,
  option_a text NOT NULL,
  option_b text NOT NULL,
  option_c text NOT NULL,
  option_d text NOT NULL,
  correct_option text NOT NULL CHECK (correct_option IN ('A','B','C','D')),
  explanation text,
  difficulty text NOT NULL DEFAULT 'medium',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX questions_subject_idx ON public.questions (subject);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.questions TO authenticated;
GRANT ALL ON public.questions TO service_role;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "questions_admin_all" ON public.questions FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE public.tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  test_type text NOT NULL DEFAULT 'subject' CHECK (test_type IN ('full','subject')),
  subject text,
  duration_minutes integer NOT NULL DEFAULT 60,
  is_published boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tests TO authenticated;
GRANT ALL ON public.tests TO service_role;
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tests_select_published" ON public.tests FOR SELECT TO authenticated USING (is_published OR public.is_admin());
CREATE POLICY "tests_admin_write" ON public.tests FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE public.test_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  q_order integer NOT NULL DEFAULT 0,
  UNIQUE (test_id, question_id)
);
CREATE INDEX test_questions_test_idx ON public.test_questions (test_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.test_questions TO authenticated;
GRANT ALL ON public.test_questions TO service_role;
ALTER TABLE public.test_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "test_questions_admin_all" ON public.test_questions FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE public.attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  test_id uuid NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  correct_count integer NOT NULL DEFAULT 0,
  wrong_count integer NOT NULL DEFAULT 0,
  unanswered_count integer NOT NULL DEFAULT 0,
  total_questions integer NOT NULL DEFAULT 0,
  percentage numeric(5,2) NOT NULL DEFAULT 0,
  time_taken_seconds integer NOT NULL DEFAULT 0,
  submitted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX attempts_user_idx ON public.attempts (user_id);
CREATE INDEX attempts_submitted_idx ON public.attempts (submitted_at);
GRANT SELECT ON public.attempts TO authenticated;
GRANT ALL ON public.attempts TO service_role;
ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "attempts_select_own_or_admin" ON public.attempts FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());

CREATE OR REPLACE FUNCTION public.get_test_question_count(p_test_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*)::int FROM public.test_questions WHERE test_id = p_test_id;
$$;

CREATE OR REPLACE FUNCTION public.get_test_questions(p_test_id uuid)
RETURNS TABLE (
  id uuid, q_order integer, subject text, question text,
  option_a text, option_b text, option_c text, option_d text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT q.id, tq.q_order, q.subject, q.question, q.option_a, q.option_b, q.option_c, q.option_d
  FROM public.test_questions tq
  JOIN public.questions q ON q.id = tq.question_id
  JOIN public.tests t ON t.id = tq.test_id
  WHERE tq.test_id = p_test_id
    AND (t.is_published OR public.is_admin())
    AND auth.uid() IS NOT NULL
  ORDER BY tq.q_order, q.created_at;
$$;

CREATE OR REPLACE FUNCTION public.submit_attempt(p_test_id uuid, p_answers jsonb, p_time_taken integer)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_total int; v_correct int; v_wrong int; v_unanswered int; v_id uuid; v_pct numeric;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.tests t WHERE t.id = p_test_id AND (t.is_published OR public.is_admin())) THEN
    RAISE EXCEPTION 'Test not available';
  END IF;

  SELECT count(*)::int,
         count(*) FILTER (WHERE p_answers ->> q.id::text = q.correct_option)::int,
         count(*) FILTER (WHERE (p_answers ->> q.id::text) IS NOT NULL AND p_answers ->> q.id::text <> q.correct_option)::int,
         count(*) FILTER (WHERE (p_answers ->> q.id::text) IS NULL)::int
    INTO v_total, v_correct, v_wrong, v_unanswered
  FROM public.test_questions tq JOIN public.questions q ON q.id = tq.question_id
  WHERE tq.test_id = p_test_id;

  v_pct := CASE WHEN v_total > 0 THEN round((v_correct::numeric * 100) / v_total, 2) ELSE 0 END;

  INSERT INTO public.attempts (user_id, test_id, answers, correct_count, wrong_count, unanswered_count, total_questions, percentage, time_taken_seconds)
  VALUES (auth.uid(), p_test_id, coalesce(p_answers, '{}'::jsonb), v_correct, v_wrong, v_unanswered, v_total, v_pct, coalesce(p_time_taken, 0))
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_attempt_review(p_attempt_id uuid)
RETURNS TABLE (
  question_id uuid, q_order integer, subject text, question text,
  option_a text, option_b text, option_c text, option_d text,
  correct_option text, explanation text, chosen_option text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT q.id, tq.q_order, q.subject, q.question, q.option_a, q.option_b, q.option_c, q.option_d,
         q.correct_option, q.explanation, a.answers ->> q.id::text
  FROM public.attempts a
  JOIN public.test_questions tq ON tq.test_id = a.test_id
  JOIN public.questions q ON q.id = tq.question_id
  WHERE a.id = p_attempt_id
    AND (a.user_id = auth.uid() OR public.is_admin())
  ORDER BY tq.q_order;
$$;

CREATE OR REPLACE FUNCTION public.get_weekly_leaderboard(p_min_tests integer DEFAULT 3)
RETURNS TABLE (
  user_id uuid, full_name text, avatar_url text,
  tests_taken integer, average_percentage numeric, best_percentage numeric
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.user_id,
         coalesce(p.full_name, 'Student'),
         p.avatar_url,
         count(*)::int,
         round(avg(a.percentage), 2),
         max(a.percentage)
  FROM public.attempts a
  LEFT JOIN public.profiles p ON p.id = a.user_id
  WHERE a.submitted_at >= date_trunc('week', now())
    AND auth.uid() IS NOT NULL
  GROUP BY a.user_id, p.full_name, p.avatar_url
  HAVING count(*) >= greatest(coalesce(p_min_tests, 3), 1)
  ORDER BY round(avg(a.percentage), 2) DESC, count(*) DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS TABLE (total_students bigint, total_questions bigint, total_tests bigint, total_attempts bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    (SELECT count(*) FROM public.profiles),
    (SELECT count(*) FROM public.questions),
    (SELECT count(*) FROM public.tests),
    (SELECT count(*) FROM public.attempts)
  WHERE public.is_admin();
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_test_question_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_test_questions(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_attempt(uuid, jsonb, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_attempt_review(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_weekly_leaderboard(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_stats() TO authenticated;
