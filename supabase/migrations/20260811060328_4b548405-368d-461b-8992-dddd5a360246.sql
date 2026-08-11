create or replace function public.admin_delete_questions(p_subject text default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if not public.is_admin() then
    raise exception 'Forbidden';
  end if;

  delete from public.test_questions tq
  using public.questions q
  where tq.question_id = q.id
    and (p_subject is null or q.subject = p_subject);

  delete from public.questions q
  where (p_subject is null or q.subject = p_subject);

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.admin_delete_questions(text) from public;
grant execute on function public.admin_delete_questions(text) to authenticated;