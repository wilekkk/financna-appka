-- Zmazanie vlastného účtu (GDPR: právo na vymazanie).
-- Prihlásený používateľ môže zmazať len seba: funkcia berie id z jeho prihlásenia (auth.uid()),
-- nie z parametra, takže cudzí účet sa ňou zmazať nedá.
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Nie si prihlásený.';
  end if;
  delete from public.user_data where user_id = current_user_id;
  delete from auth.users where id = current_user_id;
end;
$$;

revoke execute on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;
