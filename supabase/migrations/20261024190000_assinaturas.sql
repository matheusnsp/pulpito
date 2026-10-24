-- Planos: Gratuito e Premium. Uma linha por usuário; a pessoa só lê a própria.
-- Ninguém grava pela API: só as funções abaixo (painel) e o trigger de conta nova.
create table if not exists public.assinaturas (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plano text not null default 'gratuito' check (plano in ('gratuito', 'premium')),
  status text not null default 'ativa' check (status in ('ativa', 'teste', 'cancelada')),
  valida_ate timestamptz,                       -- nulo = sem vencimento
  origem text not null default 'manual',        -- manual, teste, cortesia, stripe, mercadopago…
  referencia text,                              -- id no provedor de pagamento, quando houver
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
alter table public.assinaturas enable row level security;
drop policy if exists assinatura_propria on public.assinaturas;
create policy assinatura_propria on public.assinaturas for select to authenticated
  using (user_id = auth.uid());
drop trigger if exists assinaturas_atualizado on public.assinaturas;
create trigger assinaturas_atualizado before update on public.assinaturas
  for each row execute function public.tocar_atualizado_em();

-- Premium vigente? (sem linha = gratuito)
create or replace function public.eh_premium(p_usuario uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((
    select a.plano = 'premium' and (a.valida_ate is null or a.valida_ate > now())
    from public.assinaturas a where a.user_id = p_usuario
  ), false)
$$;

-- Em projeto compartilhado, o plano do dono manda
create or replace function public.projeto_premium(p_mensagem_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.eh_premium(m.proprietario_compartilhamento)
  from public.mensagens m where m.id = p_mensagem_id
$$;

-- Mensagens que contam no limite do Gratuito: minhas, fora da lixeira, que não são modelo
create or replace function public.mensagens_ativas(p_usuario uuid default auth.uid())
returns integer language sql stable security definer set search_path = '' as $$
  select count(*)::integer from public.mensagens m
  where m.proprietario_compartilhamento = p_usuario
    and m.excluida_em is null
    and coalesce((m.detalhes->>'ehModelo')::boolean, false) = false
$$;

create or replace function public.limite_mensagens_gratuito()
returns integer language sql immutable as $$ select 5 $$;

-- Tudo o que a interface precisa, numa chamada
create or replace function public.plano_atual()
returns json language sql stable security definer set search_path = '' as $$
  select json_build_object(
    'plano', coalesce(a.plano, 'gratuito'),
    'status', coalesce(a.status, 'ativa'),
    'valida_ate', a.valida_ate,
    'premium', public.eh_premium(auth.uid()),
    'mensagens_ativas', public.mensagens_ativas(auth.uid()),
    'limite', public.limite_mensagens_gratuito()
  )
  from (select auth.uid() as uid) u
  left join public.assinaturas a on a.user_id = u.uid
$$;

revoke all on function public.eh_premium(uuid), public.projeto_premium(uuid), public.mensagens_ativas(uuid), public.plano_atual() from public, anon;
grant execute on function public.eh_premium(uuid), public.projeto_premium(uuid), public.mensagens_ativas(uuid), public.plano_atual() to authenticated;

-- Conta nova: 14 dias de Premium para experimentar
create or replace function public.pulpito_nova_conta()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.assinaturas (user_id, plano, status, valida_ate, origem)
  values (new.id, 'premium', 'teste', now() + interval '14 days', 'teste')
  on conflict (user_id) do nothing;
  return new;
end $$;
drop trigger if exists pulpito_nova_conta on auth.users;
create trigger pulpito_nova_conta after insert on auth.users
  for each row execute function public.pulpito_nova_conta();

-- Ativar pelo painel: select ativar_premium('pessoa@exemplo.com', 12); meses nulo = sem vencimento
create or replace function public.ativar_premium(p_email text, p_meses integer default 12)
returns public.assinaturas language plpgsql security definer set search_path = '' as $$
declare v_usuario uuid; v_linha public.assinaturas;
begin
  select id into v_usuario from auth.users where lower(email) = lower(trim(p_email));
  if v_usuario is null then raise exception 'Nenhuma conta com o e-mail %', p_email; end if;
  insert into public.assinaturas (user_id, plano, status, valida_ate, origem)
  values (v_usuario, 'premium', 'ativa',
          case when p_meses is null then null else now() + make_interval(months => p_meses) end, 'manual')
  on conflict (user_id) do update set
    plano = 'premium', status = 'ativa', origem = 'manual',
    valida_ate = case when p_meses is null then null
                      else greatest(coalesce(public.assinaturas.valida_ate, now()), now()) + make_interval(months => p_meses) end
  returning * into v_linha;
  return v_linha;
end $$;
revoke all on function public.ativar_premium(text, integer) from public, anon, authenticated;

-- Quem já tem conta hoje: Premium por um ano, de cortesia
insert into public.assinaturas (user_id, plano, status, valida_ate, origem)
select id, 'premium', 'ativa', now() + interval '12 months', 'cortesia' from auth.users
on conflict (user_id) do nothing;

-- Regras no banco (restritivas: valem junto com as de dono/colaborador)
drop policy if exists plano_mensagens_limite on public.mensagens;
create policy plano_mensagens_limite on public.mensagens as restrictive for insert to authenticated
  with check (public.eh_premium(auth.uid()) or public.mensagens_ativas(auth.uid()) < public.limite_mensagens_gratuito());
drop policy if exists plano_slides on public.slides;
create policy plano_slides on public.slides as restrictive for insert to authenticated
  with check (public.projeto_premium(mensagem_id));
drop policy if exists plano_aulas on public.aulas_ao_vivo;
create policy plano_aulas on public.aulas_ao_vivo as restrictive for insert to authenticated
  with check (public.projeto_premium(mensagem_id));
drop policy if exists plano_eventos on public.eventos;
create policy plano_eventos on public.eventos as restrictive for insert to authenticated
  with check (public.eh_premium(auth.uid()));

-- Convidar pessoas é Premium (função é security definer, então a checagem vai dentro dela)
create or replace function public.pulpito_criar_convite(p_mensagem_id uuid, p_permissao text, p_max_usos integer default 1, p_horas integer default 168)
returns table(codigo text, expira_em timestamptz) language plpgsql security definer set search_path = '' as $$
declare v_codigo text; v_expira timestamptz;
begin
  if public.pulpito_papel_projeto(p_mensagem_id) is distinct from 'dono' then raise exception 'Somente o dono pode convidar'; end if;
  if not public.eh_premium(auth.uid()) then raise exception 'Recurso Premium'; end if;
  if p_permissao not in ('leitor','editor') or p_max_usos not between 1 and 20 or p_horas not between 1 and 720 then
    raise exception 'Parâmetros de convite inválidos';
  end if;
  v_codigo := upper(substring(replace(gen_random_uuid()::text,'-',''),1,16));
  v_expira := now() + make_interval(hours=>p_horas);
  insert into public.projeto_convites(mensagem_id,codigo_hash,permissao,criado_por,expira_em,max_usos)
  values(p_mensagem_id,encode(sha256(convert_to(v_codigo,'UTF8')),'hex'),p_permissao,auth.uid(),v_expira,p_max_usos);
  codigo := substring(v_codigo,1,4)||'-'||substring(v_codigo,5,4)||'-'||substring(v_codigo,9,4)||'-'||substring(v_codigo,13,4);
  expira_em := v_expira;
  return next;
end $$;

notify pgrst, 'reload schema';
