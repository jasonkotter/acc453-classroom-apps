-- Bank Run — Supabase backend.
-- Paste this whole file into the Supabase SQL editor and run it once. It is safe to re-run.
-- Tested 2026-11-24 against a local PostgreSQL 17 through the anon role (a full two-round session:
-- join, guesses, windows, undo, late joiner, reveal, export, and every rejection). Not yet run on Supabase.
--
-- Design
--   * Browsers never read or write tables. Row-level security is on with no policies, so the
--     anon key can do nothing except call the br_* functions below.
--   * Whether a depositor needs cash, when they withdrew, and what they guessed are returned
--     only to that depositor. Everyone else sees the number of withdrawals in each window
--     once that window has ended, and the last window only after the reveal.
--   * Instructor actions need the session's host secret, which only the browser that created
--     the session holds. Creating a session needs the instructor passphrase (step 2 below).
--   * The server counts withdrawals window by window. Payouts are a published function of
--     (settings, depositors, withdrawals per window), computed by model.js on every screen.
--     The server does not know when the bank has run out of money; the screens work that
--     out from the published counts and stop offering withdrawals.
--   * Only a display name is stored. No email, no university ID (plan decision D8).

create table if not exists br_admin (
  id int primary key default 1 check (id = 1),
  key_hash text not null
);

create table if not exists br_sessions (
  code text primary key,
  host_secret uuid not null default gen_random_uuid(),
  phase text not null default 'lobby'
    check (phase in ('lobby','instructions','open','closed','revealed','debrief')),
  round_no int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists br_rounds (
  code text not null references br_sessions(code) on delete cascade,
  round_no int not null,
  label text not null,
  settings jsonb not null,
  cur_window int not null default 0,          -- the window now open (0 before the round opens)
  by_window jsonb not null default '[]'::jsonb, -- new withdrawals in each window that has ended
  n_players int,                              -- frozen when the round opens
  n_need int,                                 -- depositors told they need cash today
  n_guessed int,                              -- frozen when the round closes
  beliefs jsonb,                              -- guesses summarized by what each depositor went on to do
  revealed boolean not null default false,
  primary key (code, round_no)
);

create table if not exists br_players (
  id uuid primary key default gen_random_uuid(),
  code text not null references br_sessions(code) on delete cascade,
  secret uuid not null default gen_random_uuid(),
  name text not null,
  eligible_from int not null,
  created_at timestamptz not null default now()
);
create index if not exists br_players_code on br_players(code);

-- One row per depositor per round, created when they are assigned a cash need, guess, or withdraw.
create table if not exists br_choices (
  code text not null references br_sessions(code) on delete cascade,
  round_no int not null,
  player_id uuid not null references br_players(id) on delete cascade,
  need boolean not null default false,        -- needs cash today (withdraws in window 1)
  withdrew_window int,                        -- null = holding
  guess int check (guess between 0 and 100),  -- share of the class expected to withdraw
  updated_at timestamptz not null default now(),
  primary key (code, round_no, player_id)
);

alter table br_admin    enable row level security;
alter table br_sessions enable row level security;
alter table br_rounds   enable row level security;
alter table br_players  enable row level security;
alter table br_choices  enable row level security;

-- ---------------------------------------------------------------------------------------
-- Shared state: what every screen polls. p_player/p_secret are optional (the projector
-- sends neither) and add that one depositor's own name, cash need, withdrawals, and guesses.
create or replace function br_state(p_code text, p_player uuid default null, p_secret uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  s br_sessions; r br_rounds; me br_players;
  v_joined int; v_players int := 0; v_guessed int := 0; v_hist jsonb; v_me jsonb := null;
  v_need jsonb; v_wd jsonb; v_guess jsonb; v_by jsonb := '[]'::jsonb;
begin
  select * into s from br_sessions where code = upper(trim(p_code));
  if not found then raise exception 'No session with that code.'; end if;

  select count(*) into v_joined from br_players where code = s.code;
  if s.round_no > 0 then
    select * into r from br_rounds where code = s.code and round_no = s.round_no;
    if r.n_players is not null then v_players := r.n_players;
    else select count(*) into v_players from br_players where code = s.code and eligible_from <= s.round_no;
    end if;
    if r.n_guessed is not null then v_guessed := r.n_guessed;
    else select count(*) into v_guessed from br_choices where code = s.code and round_no = s.round_no and guess is not null;
    end if;
    v_by := r.by_window;
    -- The window that ended the round stays hidden until the reveal.
    if s.phase = 'closed' and jsonb_array_length(v_by) > 0 then
      v_by := v_by - (jsonb_array_length(v_by) - 1);
    end if;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'roundNo', round_no, 'label', label, 'settings', settings,
           'nPlayers', n_players, 'nGuessed', n_guessed, 'nNeed', n_need,
           'byWindow', by_window, 'beliefs', beliefs) order by round_no), '[]'::jsonb)
    into v_hist from br_rounds where code = s.code and revealed;

  if p_player is not null then
    select * into me from br_players where id = p_player and secret = p_secret and code = s.code;
    if found then
      select coalesce(jsonb_object_agg(round_no::text, true) filter (where need), '{}'::jsonb),
             coalesce(jsonb_object_agg(round_no::text, withdrew_window) filter (where withdrew_window is not null), '{}'::jsonb),
             coalesce(jsonb_object_agg(round_no::text, guess) filter (where guess is not null), '{}'::jsonb)
        into v_need, v_wd, v_guess from br_choices where code = s.code and player_id = me.id;
      v_me := jsonb_build_object('id', me.id, 'name', me.name, 'eligibleFrom', me.eligible_from,
                                 'need', v_need, 'withdrew', v_wd, 'guess', v_guess);
    end if;
  end if;

  return jsonb_build_object(
    'code', s.code, 'phase', s.phase, 'roundNo', s.round_no,
    'label', r.label, 'settings', r.settings,
    'nJoined', v_joined, 'nPlayers', v_players, 'nGuessed', v_guessed, 'nNeed', r.n_need,
    'window', coalesce(r.cur_window, 0), 'byWindow', v_by,
    'history', v_hist, 'me', v_me);
end $$;

-- ---------------------------------------------------------------------------------------
create or replace function br_create_session(p_key text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_hash text; v_code text; v_secret uuid; i int; tries int := 0;
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ';   -- no I or O
begin
  select key_hash into v_hash from br_admin where id = 1;
  if v_hash is null then raise exception 'Set the instructor passphrase first (see schema.sql, step 2).'; end if;
  if v_hash <> encode(sha256(convert_to(coalesce(p_key, ''), 'UTF8')), 'hex') then
    raise exception 'Wrong instructor passphrase.';
  end if;
  loop
    v_code := '';
    for i in 1..4 loop
      v_code := v_code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    begin
      insert into br_sessions(code) values (v_code) returning host_secret into v_secret;
      exit;
    exception when unique_violation then
      tries := tries + 1;
      if tries > 20 then raise exception 'Could not create a session code. Try again.'; end if;
    end;
  end loop;
  return jsonb_build_object('code', v_code, 'hostSecret', v_secret);
end $$;

-- ---------------------------------------------------------------------------------------
-- Join with a display name. Someone who joins after a round has opened plays from the next round.
create or replace function br_join(p_code text, p_name text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare s br_sessions; v_name text; v_from int; v_id uuid; v_secret uuid; v_count int;
begin
  select * into s from br_sessions where code = upper(trim(p_code)) for update;
  if not found then raise exception 'No session with that code.'; end if;
  v_name := left(trim(coalesce(p_name, '')), 24);
  if v_name = '' then raise exception 'Enter a display name.'; end if;
  select count(*) into v_count from br_players where code = s.code;
  if v_count >= 400 then raise exception 'This session is full.'; end if;
  v_from := case when s.phase = 'instructions' then s.round_no else s.round_no + 1 end;
  insert into br_players(code, name, eligible_from) values (s.code, v_name, v_from)
    returning id, secret into v_id, v_secret;
  return jsonb_build_object('id', v_id, 'secret', v_secret);
end $$;

-- ---------------------------------------------------------------------------------------
-- Guess what share of the class will withdraw. Accepted, and revisable, during window 1 only,
-- so it is recorded before anyone has seen a count.
create or replace function br_guess(p_code text, p_player uuid, p_secret uuid, p_guess int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare s br_sessions; r br_rounds; me br_players;
begin
  select * into s from br_sessions where code = upper(trim(p_code)) for share;
  if not found then raise exception 'No session with that code.'; end if;
  select * into me from br_players where id = p_player and secret = p_secret and code = s.code;
  if not found then raise exception 'Not a participant in this session.'; end if;
  if s.phase <> 'open' then raise exception 'Withdrawals are not open.'; end if;
  if me.eligible_from > s.round_no then raise exception 'You joined after this round began. You are in for the next one.'; end if;
  if p_guess is null or p_guess < 0 or p_guess > 100 then raise exception 'Guess a share between 0%% and 100%%.'; end if;
  select * into r from br_rounds where code = s.code and round_no = s.round_no;
  if r.cur_window <> 1 then raise exception 'Guesses close when the first window ends.'; end if;
  insert into br_choices(code, round_no, player_id, guess) values (s.code, s.round_no, me.id, p_guess)
    on conflict (code, round_no, player_id) do update set guess = excluded.guess, updated_at = now();
  return br_state(s.code, p_player, p_secret);
end $$;

-- ---------------------------------------------------------------------------------------
-- Withdraw (p_on true) or undo a withdrawal made in the window that is still open (p_on false).
-- Once a window has ended its withdrawals are final. Depositors who need cash cannot undo.
create or replace function br_withdraw(p_code text, p_player uuid, p_secret uuid, p_on boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare s br_sessions; r br_rounds; me br_players; c br_choices;
begin
  select * into s from br_sessions where code = upper(trim(p_code)) for share;
  if not found then raise exception 'No session with that code.'; end if;
  select * into me from br_players where id = p_player and secret = p_secret and code = s.code;
  if not found then raise exception 'Not a participant in this session.'; end if;
  if s.phase <> 'open' then raise exception 'Withdrawals are not open.'; end if;
  if me.eligible_from > s.round_no then raise exception 'You joined after this round began. You are in for the next one.'; end if;
  select * into r from br_rounds where code = s.code and round_no = s.round_no;
  select * into c from br_choices where code = s.code and round_no = s.round_no and player_id = me.id;
  if coalesce(p_on, false) then
    if c.withdrew_window is null then
      insert into br_choices(code, round_no, player_id, withdrew_window) values (s.code, s.round_no, me.id, r.cur_window)
        on conflict (code, round_no, player_id) do update set withdrew_window = excluded.withdrew_window, updated_at = now();
    end if;
  elsif c.withdrew_window is not null then
    if c.need then raise exception 'You need your cash today.'; end if;
    if c.withdrew_window <> r.cur_window then raise exception 'That withdrawal is final.'; end if;
    update br_choices set withdrew_window = null, updated_at = now()
      where code = s.code and round_no = s.round_no and player_id = me.id;
  end if;
  return br_state(s.code, p_player, p_secret);
end $$;

-- ---------------------------------------------------------------------------------------
-- Instructor actions:
--   setup   payload {label, settings}: show a new round, or update the one being shown
--   open    freeze the depositor list, pick who needs cash, open window 1
--   next    end the open window and publish its count; open the next window, or close the
--           round if that was the last one
--   close   end the open window and close the round now (used when the bank has run out)
--   reveal, debrief
-- An action that does not fit the current phase changes nothing, so a double tap is harmless.
create or replace function br_host(p_code text, p_secret uuid, p_action text, p_payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  s br_sessions; r br_rounds; v_label text; v_settings jsonb;
  v_n int; v_need int; v_pct numeric; v_windows int; v_count int; v_last boolean; v_beliefs jsonb;
begin
  select * into s from br_sessions where code = upper(trim(p_code)) for update;
  if not found then raise exception 'No session with that code.'; end if;
  if s.host_secret <> p_secret then raise exception 'Not authorized.'; end if;
  if s.round_no > 0 then
    select * into r from br_rounds where code = s.code and round_no = s.round_no;
  end if;

  if p_action = 'setup' then
    v_label := left(coalesce(nullif(trim(p_payload->>'label'), ''), 'Round'), 60);
    v_settings := coalesce(p_payload->'settings', '{}'::jsonb);
    if s.phase = 'instructions' then
      update br_rounds set label = v_label, settings = v_settings where code = s.code and round_no = s.round_no;
    elsif s.phase in ('lobby', 'revealed', 'debrief') then
      insert into br_rounds(code, round_no, label, settings) values (s.code, s.round_no + 1, v_label, v_settings);
      update br_sessions set round_no = round_no + 1, phase = 'instructions' where code = s.code;
    end if;

  elsif p_action = 'open' and s.phase = 'instructions' then
    select count(*) into v_n from br_players where code = s.code and eligible_from <= s.round_no;
    v_pct := least(100, greatest(0, coalesce((r.settings->>'needPct')::numeric, 0)));
    v_need := round(v_n * v_pct / 100.0);
    delete from br_choices where code = s.code and round_no = s.round_no;
    insert into br_choices(code, round_no, player_id, need, withdrew_window)
      select s.code, s.round_no, id, true, 1 from br_players
      where code = s.code and eligible_from <= s.round_no order by random() limit v_need;
    update br_rounds set n_players = v_n, n_need = v_need, cur_window = 1, by_window = '[]'::jsonb
      where code = s.code and round_no = s.round_no;
    update br_sessions set phase = 'open' where code = s.code;

  elsif p_action in ('next', 'close') and s.phase = 'open' then
    v_windows := least(5, greatest(1, coalesce(round((r.settings->>'windows')::numeric)::int, 1)));
    select count(*) into v_count from br_choices
      where code = s.code and round_no = s.round_no and withdrew_window = r.cur_window;
    v_last := p_action = 'close' or r.cur_window >= v_windows;
    if not v_last then
      update br_rounds set by_window = by_window || to_jsonb(v_count), cur_window = cur_window + 1
        where code = s.code and round_no = s.round_no;
    else
      -- Summarize the guesses by what each depositor went on to do: needed cash, ran, or held.
      -- Bins are steps of ten percent (0, 10, …, 100).
      with x as (
        select case when need then 'need' when withdrew_window is not null then 'run' else 'hold' end as g, guess
        from br_choices where code = s.code and round_no = s.round_no and guess is not null),
      agg as (select g, count(*) as n, round(avg(guess), 1) as mean from x group by g)
      select coalesce(jsonb_object_agg(a.g, jsonb_build_object('n', a.n, 'mean', a.mean, 'bins',
               (select jsonb_agg((select count(*) from x where x.g = a.g and round(x.guess / 10.0)::int = i) order by i)
                  from generate_series(0, 10) as i))), '{}'::jsonb)
        into v_beliefs from agg a;
      update br_rounds set by_window = by_window || to_jsonb(v_count), beliefs = v_beliefs,
        n_guessed = (select count(*) from br_choices where code = s.code and round_no = s.round_no and guess is not null)
        where code = s.code and round_no = s.round_no;
      update br_sessions set phase = 'closed' where code = s.code;
    end if;

  elsif p_action = 'reveal' and s.phase = 'closed' then
    update br_rounds set revealed = true where code = s.code and round_no = s.round_no;
    update br_sessions set phase = 'revealed' where code = s.code;
  elsif p_action = 'debrief' and s.phase = 'revealed' then
    update br_sessions set phase = 'debrief' where code = s.code;
  end if;
  return br_state(s.code);
end $$;

-- ---------------------------------------------------------------------------------------
-- Instructor export: one row per depositor per closed round.
create or replace function br_export(p_code text, p_secret uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare s br_sessions; v jsonb;
begin
  select * into s from br_sessions where code = upper(trim(p_code));
  if not found then raise exception 'No session with that code.'; end if;
  if s.host_secret <> p_secret then raise exception 'Not authorized.'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
           'roundNo', r.round_no, 'name', p.name, 'need', coalesce(c.need, false),
           'window', c.withdrew_window, 'guess', c.guess)
           order by r.round_no, p.created_at), '[]'::jsonb)
    into v
    from br_rounds r
    join br_players p on p.code = r.code and p.eligible_from <= r.round_no
    left join br_choices c on c.code = r.code and c.round_no = r.round_no and c.player_id = p.id
    where r.code = s.code and r.n_guessed is not null;
  return v;
end $$;

revoke all on function br_state(text, uuid, uuid), br_create_session(text), br_join(text, text),
  br_guess(text, uuid, uuid, int), br_withdraw(text, uuid, uuid, boolean),
  br_host(text, uuid, text, jsonb), br_export(text, uuid) from public;
grant execute on function br_state(text, uuid, uuid), br_create_session(text), br_join(text, text),
  br_guess(text, uuid, uuid, int), br_withdraw(text, uuid, uuid, boolean),
  br_host(text, uuid, text, jsonb), br_export(text, uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------------------
-- STEP 2 (run separately, once, with your own passphrase in place of the placeholder).
-- Only its hash is stored. Do not save the edited line anywhere in the repository.
--
--   insert into br_admin (id, key_hash)
--   values (1, encode(sha256(convert_to('CHANGE-ME', 'UTF8')), 'hex'))
--   on conflict (id) do update set key_hash = excluded.key_hash;
--
-- Housekeeping, whenever you like: delete from br_sessions where created_at < now() - interval '14 days';
