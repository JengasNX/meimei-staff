-- Целостность данных на уровне PostgreSQL: держится даже если код обойдён.

-- ── Append-only: историю не переписать ────────────────────────
create or replace function forbid_mutation() returns trigger as $$
begin
  raise exception 'Таблица % неизменяема (append-only)', tg_table_name;
end;
$$ language plpgsql;

drop trigger if exists rating_events_append_only on rating_events;
create trigger rating_events_append_only
  before update or delete on rating_events
  for each row execute function forbid_mutation();

drop trigger if exists disciplinary_actions_append_only on disciplinary_actions;
create trigger disciplinary_actions_append_only
  before update or delete on disciplinary_actions
  for each row execute function forbid_mutation();

drop trigger if exists audit_logs_append_only on audit_logs;
create trigger audit_logs_append_only
  before update or delete on audit_logs
  for each row execute function forbid_mutation();

drop trigger if exists staff_terms_append_only on staff_terms;
create trigger staff_terms_append_only
  before update or delete on staff_terms
  for each row execute function forbid_mutation();

-- ── Рейтинг согласован с ledger ───────────────────────────────
-- users.rating обязан совпадать с последним balance_after пользователя.
create or replace function check_rating_ledger() returns trigger as $$
declare
  latest int;
begin
  select balance_after into latest
  from rating_events
  where user_id = new.id
  order by at desc, id desc
  limit 1;

  if latest is not null and new.rating <> latest then
    raise exception 'users.rating (%) не совпадает с ledger (%)', new.rating, latest;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists users_rating_ledger on users;
create trigger users_rating_ledger
  before update of rating on users
  for each row execute function check_rating_ledger();

-- ── updated_at обновляется автоматически ──────────────────────
create or replace function touch_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists users_touch on users;
create trigger users_touch before update on users
  for each row execute function touch_updated_at();

drop trigger if exists news_touch on news;
create trigger news_touch before update on news
  for each row execute function touch_updated_at();
