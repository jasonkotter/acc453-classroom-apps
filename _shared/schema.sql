-- ACC 453 classroom apps — shared Supabase backend (all games).
-- Paste this whole file into the Supabase SQL editor and run it once. It is safe to re-run.
-- It lives beside Bank Run's br_* tables in the same project and copies Bank Run's instructor
-- passphrase hash, so there is nothing else to set up if Bank Run is already installed.
--
-- Design
--   * Browsers never read or write tables. Row-level security is on with no policies, so the
--     anon key can do nothing except call the cls_* functions below.
--   * A session runs one game. Its phase is lobby → instructions → open → closed → revealed →
--     debrief, round after round. A round has steps (a withdrawal window, a question, an offer
--     stage); students submit one current answer per step.
--   * The instructor's browser assigns each student's private data when a round opens (a cash
--     budget, a role, a car's quality) and can update it between steps. A student sees only
--     their own private data and their own answers.
--   * Answers are checked here against rules carried in the round's settings (settings.input),
--     so a phone cannot submit outside the open step, outside its role, or past its budget.
--   * The instructor's browser reads the answers, computes results with the game's published
--     model, and publishes them once at the reveal with each student's private outcome.
--   * Instructor actions need the session's host secret, which only the browser that created
--     the session holds. Creating a session needs the instructor passphrase.
--   * Only a display name is stored. No email, no university ID (plan decision D8).

create table if not exists cls_admin (
  id int primary key default 1 check (id = 1),
  key_hash text not null
);

create table if not exists cls_sessions (
  code text primary key,
  game text not null,
  host_secret uuid not null default gen_random_uuid(),
  phase text not null default 'lobby'
    check (phase in ('lobby','instructions','open','closed','revealed','debrief')),
  round_no int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists cls_rounds (
  code text not null references cls_sessions(code) on delete cascade,
  round_no int not null,
  label text not null,
  settings jsonb not null default '{}'::jsonb,
  step int not null default 0,            -- 0 before the round opens
  pending boolean not null default false, -- true between a step ending and its results being published
  pub jsonb not null default '{}'::jsonb, -- public, published by the instructor during the round
  result jsonb,                           -- published once, at the reveal
  n_players int,                          -- frozen when the round opens
  primary key (code, round_no)
);

create table if not exists cls_players (
  id uuid primary key default gen_random_uuid(),
  code text not null references cls_sessions(code) on delete cascade,
  secret uuid not null default gen_random_uuid(),
  tag text not null,                      -- short public handle, e.g. for trading partners
  name text not null,
  eligible_from int not null,
  created_at timestamptz not null default now(),
  unique (code, tag)
);
create index if not exists cls_players_code on cls_players(code);

create table if not exists cls_private (
  code text not null references cls_sessions(code) on delete cascade,
  round_no int not null,
  player_id uuid not null references cls_players(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  primary key (code, round_no, player_id)
);

create table if not exists cls_moves (
  code text not null references cls_sessions(code) on delete cascade,
  round_no int not null,
  player_id uuid not null references cls_players(id) on delete cascade,
  step int not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (code, round_no, player_id, step)
);

alter table cls_admin    enable row level security;
alter table cls_sessions enable row level security;
alter table cls_rounds   enable row level security;
alter table cls_players  enable row level security;
alter table cls_private  enable row level security;
alter table cls_moves    enable row level security;

-- Reuse Bank Run's passphrase if it is set and this one is not.
do $$ begin
  if to_regclass('public.br_admin') is not null then
    insert into cls_admin (id, key_hash) select id, key_hash from br_admin where id = 1
      on conflict (id) do nothing;
  end if;
end $$;

-- ---------------------------------------------------------------------------------------
-- Check one answer against the round's rules. Raises a message the phone can show.
--   spec: {role?, lockDone?, required?: [..], sum?: {fields:[..], equals:n, label?},
--          fields: {name: {type: int|num|bool|choice|privItem|tag|text, label?, optional?,
--                          min?, max?, minPriv?, maxPriv?, in?: [..], from?: privKey, maxLen?}}}
create or replace function cls_check(p_spec jsonb, p_data jsonb, p_priv jsonb, p_code text, p_self uuid)
returns void language plpgsql set search_path = public as $$
declare
  k text; v jsonb; f jsonb; t text; lab text; n numeric; lim numeric; roles jsonb; tot numeric;
begin
  if p_spec is null or jsonb_typeof(p_spec) <> 'object' then raise exception 'Nothing to submit right now.'; end if;
  p_priv := coalesce(p_priv, '{}'::jsonb);
  if p_spec ? 'role' then
    roles := case when jsonb_typeof(p_spec->'role') = 'array' then p_spec->'role' else jsonb_build_array(p_spec->'role') end;
    if not roles @> jsonb_build_array(coalesce(p_priv->'role', 'null'::jsonb)) then
      raise exception 'Nothing for you to submit at this step.';
    end if;
  end if;
  if coalesce((p_spec->>'lockDone')::boolean, false) and coalesce((p_priv->>'done')::boolean, false) then
    raise exception 'You are done for this round.';
  end if;
  if p_data is null or jsonb_typeof(p_data) <> 'object' then raise exception 'That answer could not be read.'; end if;
  if length(p_data::text) > 2000 then raise exception 'That answer is too long.'; end if;

  for k, v in select key, value from jsonb_each(p_data) loop
    f := p_spec->'fields'->k;
    if f is null then raise exception 'That answer has an unexpected part (%).', k; end if;
    lab := coalesce(f->>'label', k);
    if jsonb_typeof(v) = 'null' then
      if coalesce((f->>'optional')::boolean, false) then continue; end if;
      raise exception 'Enter %.', lower(lab);
    end if;
    t := coalesce(f->>'type', 'num');
    if t in ('int', 'num') then
      if jsonb_typeof(v) <> 'number' then raise exception '% must be a number.', lab; end if;
      n := (v #>> '{}')::numeric;
      if t = 'int' and n <> trunc(n) then raise exception '% must be a whole number.', lab; end if;
      lim := null;
      if f ? 'min' then lim := (f->>'min')::numeric; end if;
      if f ? 'minPriv' and p_priv ? (f->>'minPriv') then lim := greatest(coalesce(lim, -1e18), (p_priv->>(f->>'minPriv'))::numeric); end if;
      if lim is not null and n < lim then raise exception '% must be at least %.', lab, lim; end if;
      lim := null;
      if f ? 'max' then lim := (f->>'max')::numeric; end if;
      if f ? 'maxPriv' then lim := least(coalesce(lim, 1e18), coalesce((p_priv->>(f->>'maxPriv'))::numeric, 0)); end if;
      if lim is not null and n > lim then raise exception '% can be at most %.', lab, lim; end if;
    elsif t = 'bool' then
      if jsonb_typeof(v) <> 'boolean' then raise exception 'That answer could not be read.'; end if;
    elsif t = 'choice' then
      if not coalesce(f->'in', '[]'::jsonb) @> jsonb_build_array(v) then raise exception 'That is not one of the choices.'; end if;
    elsif t = 'privItem' then
      if not coalesce(p_priv->(f->>'from'), '[]'::jsonb) @> jsonb_build_array(v) then raise exception 'You do not have that.'; end if;
    elsif t = 'tag' then
      if jsonb_typeof(v) <> 'string' then raise exception 'Enter a tag.'; end if;
      if not exists (select 1 from cls_players where code = p_code and tag = upper(v #>> '{}') and id <> p_self) then
        raise exception 'No one else here has the tag %.', upper(v #>> '{}');
      end if;
    elsif t = 'text' then
      if jsonb_typeof(v) <> 'string' or length(v #>> '{}') > coalesce((f->>'maxLen')::int, 200) then raise exception '% is too long.', lab; end if;
    else
      raise exception 'Unknown answer type.';
    end if;
  end loop;

  for k in select jsonb_array_elements_text(coalesce(p_spec->'required', '[]'::jsonb)) loop
    if not (p_data ? k) or jsonb_typeof(p_data->k) = 'null' then
      raise exception 'Enter %.', lower(coalesce(p_spec->'fields'->k->>'label', k));
    end if;
  end loop;

  if p_spec ? 'sum' then
    select coalesce(sum((p_data->>x)::numeric), 0) into tot
      from jsonb_array_elements_text(p_spec->'sum'->'fields') as x where jsonb_typeof(p_data->x) = 'number';
    if abs(tot - (p_spec->'sum'->>'equals')::numeric) > 0.0001 then
      raise exception '% must add up to %.', coalesce(p_spec->'sum'->>'label', 'The amounts'), p_spec->'sum'->>'equals';
    end if;
  end if;
end $$;

-- ---------------------------------------------------------------------------------------
-- Shared state: what every screen polls. p_player/p_secret are optional (the projector sends
-- neither) and add that student's own private data, answers, and offers addressed to them.
create or replace function cls_state(p_code text, p_player uuid default null, p_secret uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  s cls_sessions; r cls_rounds; me cls_players;
  v_joined int; v_players int := 0; v_moved int := 0; v_done int := 0;
  v_hist jsonb; v_me jsonb := null; v_priv jsonb; v_moves jsonb; v_inbox jsonb := '[]'::jsonb;
begin
  select * into s from cls_sessions where code = upper(trim(p_code));
  if not found then raise exception 'No session with that code.'; end if;

  select count(*) into v_joined from cls_players where code = s.code;
  if s.round_no > 0 then
    select * into r from cls_rounds where code = s.code and round_no = s.round_no;
    if r.n_players is not null then v_players := r.n_players;
    else select count(*) into v_players from cls_players where code = s.code and eligible_from <= s.round_no;
    end if;
    select count(*) into v_moved from cls_moves where code = s.code and round_no = s.round_no and step = r.step;
    select count(*) into v_done from cls_private where code = s.code and round_no = s.round_no and coalesce((data->>'done')::boolean, false);
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'roundNo', round_no, 'label', label, 'settings', settings, 'nPlayers', n_players,
           'pub', pub, 'result', result) order by round_no), '[]'::jsonb)
    into v_hist from cls_rounds where code = s.code and result is not null;

  if p_player is not null then
    select * into me from cls_players where id = p_player and secret = p_secret and code = s.code;
    if found then
      select coalesce(jsonb_object_agg(round_no::text, data), '{}'::jsonb) into v_priv
        from cls_private where code = s.code and player_id = me.id;
      select coalesce(jsonb_object_agg(step::text, data), '{}'::jsonb) into v_moves
        from cls_moves where code = s.code and round_no = s.round_no and player_id = me.id;
      if s.phase = 'open' then
        select coalesce(jsonb_agg(jsonb_build_object('tag', p.tag, 'name', p.name, 'data', m.data) order by m.updated_at), '[]'::jsonb)
          into v_inbox
          from cls_moves m join cls_players p on p.id = m.player_id
          where m.code = s.code and m.round_no = s.round_no and m.step = r.step and m.data->>'to' = me.tag;
      end if;
      v_me := jsonb_build_object('id', me.id, 'name', me.name, 'tag', me.tag, 'eligibleFrom', me.eligible_from,
                                 'priv', v_priv, 'moves', v_moves, 'inbox', v_inbox);
    end if;
  end if;

  return jsonb_build_object(
    'code', s.code, 'game', s.game, 'phase', s.phase, 'roundNo', s.round_no,
    'label', r.label, 'settings', r.settings, 'step', coalesce(r.step, 0), 'pending', coalesce(r.pending, false),
    'pub', coalesce(r.pub, '{}'::jsonb), 'nJoined', v_joined, 'nPlayers', v_players,
    'nMoved', v_moved, 'nDone', v_done, 'history', v_hist, 'me', v_me, 'now', floor(extract(epoch from clock_timestamp()) * 1000));
end $$;

-- ---------------------------------------------------------------------------------------
create or replace function cls_create_session(p_key text, p_game text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_hash text; v_code text; v_secret uuid; i int; tries int := 0;
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ';   -- no I or O
begin
  select key_hash into v_hash from cls_admin where id = 1;
  if v_hash is null then raise exception 'Set the instructor passphrase first (see schema.sql, step 2).'; end if;
  if v_hash <> encode(sha256(convert_to(coalesce(p_key, ''), 'UTF8')), 'hex') then
    raise exception 'Wrong instructor passphrase.';
  end if;
  if coalesce(p_game, '') !~ '^[a-z0-9-]{2,40}$' then raise exception 'Unknown game.'; end if;
  loop
    v_code := '';
    for i in 1..4 loop
      v_code := v_code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    begin
      insert into cls_sessions(code, game) values (v_code, p_game) returning host_secret into v_secret;
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
create or replace function cls_join(p_code text, p_name text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  s cls_sessions; v_name text; v_from int; v_id uuid; v_secret uuid; v_count int; v_tag text; tries int := 0;
  letters constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ'; digits constant text := '23456789';
begin
  select * into s from cls_sessions where code = upper(trim(p_code)) for update;
  if not found then raise exception 'No session with that code.'; end if;
  v_name := left(regexp_replace(trim(coalesce(p_name, '')), '\s+', ' ', 'g'), 24);
  if v_name = '' then raise exception 'Enter a display name.'; end if;
  select count(*) into v_count from cls_players where code = s.code;
  if v_count >= 400 then raise exception 'This session is full.'; end if;
  v_from := case when s.phase = 'instructions' then s.round_no else s.round_no + 1 end;
  loop
    v_tag := substr(letters, 1 + floor(random() * length(letters))::int, 1)
          || substr(letters, 1 + floor(random() * length(letters))::int, 1)
          || substr(digits, 1 + floor(random() * length(digits))::int, 1);
    exit when not exists (select 1 from cls_players where code = s.code and tag = v_tag);
    tries := tries + 1;
    if tries > 50 then raise exception 'Could not assign a tag. Try again.'; end if;
  end loop;
  insert into cls_players(code, name, tag, eligible_from) values (s.code, v_name, v_tag, v_from)
    returning id, secret into v_id, v_secret;
  return jsonb_build_object('id', v_id, 'secret', v_secret, 'tag', v_tag);
end $$;

-- ---------------------------------------------------------------------------------------
-- Submit (or, with p_data null, withdraw) this student's answer for the open step.
-- The rules for the step are settings.input["<step>"], or settings.input["*"].
create or replace function cls_submit(p_code text, p_player uuid, p_secret uuid, p_step int, p_data jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare s cls_sessions; r cls_rounds; me cls_players; v_priv jsonb; v_spec jsonb;
begin
  select * into s from cls_sessions where code = upper(trim(p_code)) for share;
  if not found then raise exception 'No session with that code.'; end if;
  select * into me from cls_players where id = p_player and secret = p_secret and code = s.code;
  if not found then raise exception 'Not a participant in this session.'; end if;
  if s.phase <> 'open' then raise exception 'Submissions are not open.'; end if;
  if me.eligible_from > s.round_no then raise exception 'You joined after this round began. You are in for the next one.'; end if;
  select * into r from cls_rounds where code = s.code and round_no = s.round_no;
  if r.pending or p_step is distinct from r.step then raise exception 'That step has closed.'; end if;
  if r.n_players is not null and not exists (select 1 from cls_private where code = s.code and round_no = s.round_no and player_id = me.id)
     and exists (select 1 from cls_private where code = s.code and round_no = s.round_no) then
    raise exception 'You joined after this round began. You are in for the next one.';
  end if;
  if p_data is null then
    delete from cls_moves where code = s.code and round_no = s.round_no and player_id = me.id and step = r.step;
  else
    select data into v_priv from cls_private where code = s.code and round_no = s.round_no and player_id = me.id;
    v_spec := coalesce(r.settings->'input'->(r.step::text), r.settings->'input'->'*');
    perform cls_check(v_spec, p_data, v_priv, s.code, me.id);
    if p_data ? 'to' then p_data := jsonb_set(p_data, '{to}', to_jsonb(upper(p_data->>'to'))); end if;
    insert into cls_moves(code, round_no, player_id, step, data) values (s.code, s.round_no, me.id, r.step, p_data)
      on conflict (code, round_no, player_id, step) do update set data = excluded.data, updated_at = now();
  end if;
  return cls_state(s.code, p_player, p_secret);
end $$;

-- ---------------------------------------------------------------------------------------
-- Barter Market: accept the offer that the student with tag p_from made to me in this step.
-- Holdings are private data {goods: [..], want, tokens, done, doneAt, trades}.
-- Offer kinds: swap (their give for my get), sell (their give for p tokens of mine),
-- buy (p tokens of theirs for my get). A student who receives the good they want consumes it
-- and is done. Both students' rows are locked, so two trades cannot use the same good.
create or replace function cls_trade(p_code text, p_player uuid, p_secret uuid, p_from text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  s cls_sessions; r cls_rounds; me cls_players; them cls_players; o jsonb;
  a jsonb; b jsonb;   -- a = offerer's holdings, b = mine
  price int; kind text; give text; get text; v_now bigint;
begin
  select * into s from cls_sessions where code = upper(trim(p_code)) for share;
  if not found then raise exception 'No session with that code.'; end if;
  select * into me from cls_players where id = p_player and secret = p_secret and code = s.code;
  if not found then raise exception 'Not a participant in this session.'; end if;
  if s.phase <> 'open' then raise exception 'Trading is closed.'; end if;
  select * into r from cls_rounds where code = s.code and round_no = s.round_no;
  if r.pending then raise exception 'Trading is paused.'; end if;
  select * into them from cls_players where code = s.code and tag = upper(trim(coalesce(p_from, '')));
  if not found or them.id = me.id then raise exception 'No offer from that tag.'; end if;
  select data into o from cls_moves where code = s.code and round_no = s.round_no and step = r.step and player_id = them.id;
  if o is null or o->>'to' is distinct from me.tag then raise exception 'That offer was withdrawn.'; end if;

  -- lock both holdings in a fixed order
  perform 1 from cls_private where code = s.code and round_no = s.round_no and player_id in (me.id, them.id)
    order by player_id for update;
  select data into a from cls_private where code = s.code and round_no = s.round_no and player_id = them.id;
  select data into b from cls_private where code = s.code and round_no = s.round_no and player_id = me.id;
  if a is null or b is null then raise exception 'One of you is not trading this round.'; end if;

  kind := coalesce(o->>'kind', 'swap'); give := o->>'give'; get := o->>'get';
  price := greatest(1, coalesce((r.settings->>'price')::int, 1));
  if kind <> 'swap' and not coalesce((r.settings->>'money')::boolean, false) then raise exception 'There is no money in this round.'; end if;
  if kind in ('swap', 'sell') and not coalesce(a->'goods', '[]'::jsonb) @> jsonb_build_array(give) then
    delete from cls_moves where code = s.code and round_no = s.round_no and step = r.step and player_id = them.id;
    raise exception '% no longer has that good.', them.tag;
  end if;
  if kind in ('swap', 'buy') and not coalesce(b->'goods', '[]'::jsonb) @> jsonb_build_array(get) then
    raise exception 'You no longer have that good.';
  end if;
  if kind = 'sell' and coalesce((b->>'tokens')::int, 0) < price then raise exception 'You do not have enough tokens.'; end if;
  if kind = 'buy' and coalesce((a->>'tokens')::int, 0) < price then
    delete from cls_moves where code = s.code and round_no = s.round_no and step = r.step and player_id = them.id;
    raise exception '% no longer has enough tokens.', them.tag;
  end if;

  -- move the goods: remove one unit of each traded good, then add it to the other side
  if kind in ('swap', 'sell') then
    a := jsonb_set(a, '{goods}', (a->'goods') - (select (i - 1)::int from jsonb_array_elements_text(a->'goods') with ordinality x(g, i) where g = give limit 1));
    b := jsonb_set(b, '{goods}', coalesce(b->'goods', '[]'::jsonb) || to_jsonb(give));
  end if;
  if kind in ('swap', 'buy') then
    b := jsonb_set(b, '{goods}', (b->'goods') - (select (i - 1)::int from jsonb_array_elements_text(b->'goods') with ordinality x(g, i) where g = get limit 1));
    a := jsonb_set(a, '{goods}', coalesce(a->'goods', '[]'::jsonb) || to_jsonb(get));
  end if;
  if kind = 'sell' then
    b := jsonb_set(b, '{tokens}', to_jsonb(coalesce((b->>'tokens')::int, 0) - price));
    a := jsonb_set(a, '{tokens}', to_jsonb(coalesce((a->>'tokens')::int, 0) + price));
  elsif kind = 'buy' then
    a := jsonb_set(a, '{tokens}', to_jsonb(coalesce((a->>'tokens')::int, 0) - price));
    b := jsonb_set(b, '{tokens}', to_jsonb(coalesce((b->>'tokens')::int, 0) + price));
  end if;

  -- a student who now holds the good they want consumes it
  v_now := floor(extract(epoch from clock_timestamp()) * 1000);
  if not coalesce((a->>'done')::boolean, false) and (a->'goods') @> jsonb_build_array(a->'want') then
    a := jsonb_set(a, '{goods}', (a->'goods') - (select (i - 1)::int from jsonb_array_elements_text(a->'goods') with ordinality x(g, i) where g = a->>'want' limit 1));
    a := a || jsonb_build_object('done', true, 'doneAt', v_now);
  end if;
  if not coalesce((b->>'done')::boolean, false) and (b->'goods') @> jsonb_build_array(b->'want') then
    b := jsonb_set(b, '{goods}', (b->'goods') - (select (i - 1)::int from jsonb_array_elements_text(b->'goods') with ordinality x(g, i) where g = b->>'want' limit 1));
    b := b || jsonb_build_object('done', true, 'doneAt', v_now);
  end if;
  a := jsonb_set(a, '{trades}', to_jsonb(coalesce((a->>'trades')::int, 0) + 1));
  b := jsonb_set(b, '{trades}', to_jsonb(coalesce((b->>'trades')::int, 0) + 1));

  update cls_private set data = a where code = s.code and round_no = s.round_no and player_id = them.id;
  update cls_private set data = b where code = s.code and round_no = s.round_no and player_id = me.id;
  delete from cls_moves where code = s.code and round_no = s.round_no and step = r.step and player_id = them.id;
  -- my own outgoing offer may no longer be possible; drop it so no one accepts a stale offer
  delete from cls_moves where code = s.code and round_no = s.round_no and step = r.step and player_id = me.id;
  return cls_state(s.code, p_player, p_secret);
end $$;

-- ---------------------------------------------------------------------------------------
-- Instructor actions. An action that does not fit the current phase changes nothing, so a
-- double tap is harmless.
--   setup   {label, settings}       show a new round, or update the one being shown
--   open    {private?, pub?}        freeze the roster and open step 1. If private is given it
--                                   must cover exactly the students eligible for this round;
--                                   otherwise the call fails with ROSTER_CHANGED and the
--                                   instructor's browser re-reads the roster and retries.
--   advance                         end the open step: answers to it are final, and the round
--                                   waits (pending) for the instructor to publish
--   publish {pub?, private?, step?} merge public data and private updates; clear pending.
--                                   step, if given, must equal the current step (a guard).
--   close                           end submissions for the round
--   reveal  {result, private?, pub?} publish the result once
--   debrief
create or replace function cls_host(p_code text, p_secret uuid, p_action text, p_payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  s cls_sessions; r cls_rounds; v_label text; v_n int; v_given int; v_match int; k text; v jsonb;
begin
  select * into s from cls_sessions where code = upper(trim(p_code)) for update;
  if not found then raise exception 'No session with that code.'; end if;
  if s.host_secret <> p_secret then raise exception 'Not authorized.'; end if;
  p_payload := coalesce(p_payload, '{}'::jsonb);
  if s.round_no > 0 then
    select * into r from cls_rounds where code = s.code and round_no = s.round_no for update;
  end if;

  if p_action = 'setup' then
    v_label := left(coalesce(nullif(trim(p_payload->>'label'), ''), 'Round'), 80);
    if s.phase = 'instructions' then
      update cls_rounds set label = v_label, settings = coalesce(p_payload->'settings', '{}'::jsonb)
        where code = s.code and round_no = s.round_no;
    elsif s.phase in ('lobby', 'revealed', 'debrief') then
      insert into cls_rounds(code, round_no, label, settings)
        values (s.code, s.round_no + 1, v_label, coalesce(p_payload->'settings', '{}'::jsonb));
      update cls_sessions set round_no = round_no + 1, phase = 'instructions' where code = s.code;
    end if;

  elsif p_action = 'open' and s.phase = 'instructions' then
    select count(*) into v_n from cls_players where code = s.code and eligible_from <= s.round_no;
    delete from cls_private where code = s.code and round_no = s.round_no;
    delete from cls_moves where code = s.code and round_no = s.round_no;
    if p_payload ? 'private' then
      select count(*) into v_given from jsonb_object_keys(p_payload->'private');
      select count(*) into v_match from jsonb_object_keys(p_payload->'private') as x
        join cls_players p on p.id::text = x and p.code = s.code and p.eligible_from <= s.round_no;
      if v_given <> v_n or v_match <> v_n then raise exception 'ROSTER_CHANGED'; end if;
      insert into cls_private(code, round_no, player_id, data)
        select s.code, s.round_no, x.key::uuid, x.value from jsonb_each(p_payload->'private') as x;
    end if;
    update cls_rounds set n_players = v_n, step = 1, pending = false, pub = coalesce(p_payload->'pub', '{}'::jsonb), result = null
      where code = s.code and round_no = s.round_no;
    update cls_sessions set phase = 'open' where code = s.code;

  elsif p_action = 'advance' and s.phase = 'open' and not r.pending then
    update cls_rounds set step = step + 1, pending = true where code = s.code and round_no = s.round_no;

  elsif p_action = 'publish' and s.phase in ('open', 'closed') then
    if p_payload ? 'step' and (p_payload->>'step')::int <> r.step then
      return cls_state(s.code);   -- stale publish from a double tap; ignore it
    end if;
    for k, v in select key, value from jsonb_each(coalesce(p_payload->'private', '{}'::jsonb)) loop
      insert into cls_private(code, round_no, player_id, data)
        select s.code, s.round_no, p.id, v from cls_players p where p.id::text = k and p.code = s.code
        on conflict (code, round_no, player_id) do update set data = cls_private.data || excluded.data;
    end loop;
    update cls_rounds set pub = pub || coalesce(p_payload->'pub', '{}'::jsonb), pending = false
      where code = s.code and round_no = s.round_no;

  elsif p_action = 'close' and s.phase = 'open' then
    update cls_rounds set pending = false where code = s.code and round_no = s.round_no;
    update cls_sessions set phase = 'closed' where code = s.code;

  elsif p_action = 'reveal' and s.phase = 'closed' and r.result is null then
    for k, v in select key, value from jsonb_each(coalesce(p_payload->'private', '{}'::jsonb)) loop
      insert into cls_private(code, round_no, player_id, data)
        select s.code, s.round_no, p.id, v from cls_players p where p.id::text = k and p.code = s.code
        on conflict (code, round_no, player_id) do update set data = cls_private.data || excluded.data;
    end loop;
    update cls_rounds set result = coalesce(p_payload->'result', '{}'::jsonb),
                          pub = pub || coalesce(p_payload->'pub', '{}'::jsonb)
      where code = s.code and round_no = s.round_no;
    update cls_sessions set phase = 'revealed' where code = s.code;

  elsif p_action = 'debrief' and s.phase = 'revealed' then
    update cls_sessions set phase = 'debrief' where code = s.code;
  end if;
  return cls_state(s.code);
end $$;

-- ---------------------------------------------------------------------------------------
-- Instructor read: the roster, everyone's private data, and every answer for one round
-- (the current round if p_round is null). Used to compute results and to export.
create or replace function cls_host_data(p_code text, p_secret uuid, p_round int default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare s cls_sessions; v_round int; v_players jsonb; v_priv jsonb; v_moves jsonb;
begin
  select * into s from cls_sessions where code = upper(trim(p_code));
  if not found then raise exception 'No session with that code.'; end if;
  if s.host_secret <> p_secret then raise exception 'Not authorized.'; end if;
  v_round := coalesce(p_round, s.round_no);
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'tag', tag, 'eligibleFrom', eligible_from) order by created_at), '[]'::jsonb)
    into v_players from cls_players where code = s.code;
  select coalesce(jsonb_object_agg(player_id::text, data), '{}'::jsonb)
    into v_priv from cls_private where code = s.code and round_no = v_round;
  select coalesce(jsonb_agg(jsonb_build_object('player', player_id, 'step', step, 'data', data,
           'at', floor(extract(epoch from updated_at) * 1000)) order by step, updated_at), '[]'::jsonb)
    into v_moves from cls_moves where code = s.code and round_no = v_round;
  return jsonb_build_object('roundNo', v_round, 'players', v_players, 'private', v_priv, 'moves', v_moves);
end $$;

revoke all on function cls_check(jsonb, jsonb, jsonb, text, uuid) from public;
revoke all on function cls_state(text, uuid, uuid), cls_create_session(text, text), cls_join(text, text),
  cls_submit(text, uuid, uuid, int, jsonb), cls_trade(text, uuid, uuid, text),
  cls_host(text, uuid, text, jsonb), cls_host_data(text, uuid, int) from public;
grant execute on function cls_state(text, uuid, uuid), cls_create_session(text, text), cls_join(text, text),
  cls_submit(text, uuid, uuid, int, jsonb), cls_trade(text, uuid, uuid, text),
  cls_host(text, uuid, text, jsonb), cls_host_data(text, uuid, int) to anon, authenticated;

-- ---------------------------------------------------------------------------------------
-- STEP 2, only if Bank Run's passphrase was never set in this project (otherwise it was
-- copied above). Run separately, once, with your own passphrase in place of the placeholder.
-- Only its hash is stored. Do not save the edited line anywhere in the repository.
--
--   insert into cls_admin (id, key_hash)
--   values (1, encode(sha256(convert_to('CHANGE-ME', 'UTF8')), 'hex'))
--   on conflict (id) do update set key_hash = excluded.key_hash;
--
-- Housekeeping, whenever you like: delete from cls_sessions where created_at < now() - interval '14 days';
