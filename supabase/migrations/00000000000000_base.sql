-- Pulpito: schema base, extraído do projeto de produção em 2026-10-24.
-- Sobe um projeto Supabase limpo com tudo o que o app usa: tabelas, RLS, funções, triggers e storage.
-- Idempotente onde dá: pode rodar de novo sem quebrar.

create extension if not exists pgcrypto with schema extensions;
create extension if not exists "uuid-ossp" with schema extensions;
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

-- ── Tabelas ──────────────────────────────────────────────────────────────

create table if not exists public.agenda_tokens (
  user_id uuid not null default auth.uid(),
  token text not null default replace(((gen_random_uuid())::text || (gen_random_uuid())::text), '-'::text, ''::text),
  criado_em timestamptz not null default now(),
  constraint agenda_tokens_pkey PRIMARY KEY (user_id),
  constraint agenda_tokens_token_key UNIQUE (token)
);

create table if not exists public.aulas_ao_vivo (
  id uuid not null default gen_random_uuid(),
  codigo text not null,
  mensagem_id uuid not null,
  dono uuid not null default auth.uid(),
  mostrar_respostas boolean not null default true,
  aberta boolean not null default true,
  criado_em timestamptz not null default now(),
  encerrada_em timestamptz,
  constraint aulas_ao_vivo_codigo_key UNIQUE (codigo),
  constraint aulas_ao_vivo_pkey PRIMARY KEY (id)
);

create table if not exists public.eventos (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  titulo text not null,
  local text,
  inicio timestamptz not null,
  mensagem_id uuid,
  lembretes integer[] not null default '{1440,60}'::integer[],
  constraint eventos_pkey PRIMARY KEY (id)
);

create table if not exists public.lembretes_enviados (
  evento_id uuid not null,
  minutos integer not null,
  inicio timestamptz not null,
  enviado_em timestamptz not null default now(),
  constraint lembretes_enviados_pkey PRIMARY KEY (evento_id, minutos, inicio)
);

create table if not exists public.mensagens (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  pasta_id uuid,
  titulo text not null default 'Nova mensagem'::text,
  texto_base text,
  tempo_minutos integer not null default 30,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  tipo text not null default 'pregacao'::text,
  detalhes jsonb not null default '{}'::jsonb,
  proprietario_compartilhamento uuid not null default auth.uid(),
  excluida_em timestamptz,
  constraint mensagens_pkey PRIMARY KEY (id),
  constraint mensagens_tempo_minutos_check CHECK (((tempo_minutos >= 1) AND (tempo_minutos <= 300))),
  constraint mensagens_tipo_valido CHECK ((tipo = ANY (ARRAY['pregacao'::text, 'estudo'::text])))
);

create table if not exists public.pastas (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  nome text not null,
  criado_em timestamptz not null default now(),
  constraint pastas_pkey PRIMARY KEY (id)
);

create table if not exists public.projeto_colaboradores (
  mensagem_id uuid not null,
  usuario_id uuid not null,
  permissao text not null,
  bloqueado boolean not null default false,
  adicionado_em timestamptz not null default now(),
  constraint projeto_colaboradores_permissao_check CHECK ((permissao = ANY (ARRAY['leitor'::text, 'editor'::text]))),
  constraint projeto_colaboradores_pkey PRIMARY KEY (mensagem_id, usuario_id)
);

create table if not exists public.projeto_convites (
  id uuid not null default gen_random_uuid(),
  mensagem_id uuid not null,
  codigo_hash text not null,
  permissao text not null,
  criado_por uuid not null,
  criado_em timestamptz not null default now(),
  expira_em timestamptz not null,
  max_usos integer not null,
  usos integer not null default 0,
  revogado_em timestamptz,
  constraint projeto_convites_codigo_hash_key UNIQUE (codigo_hash),
  constraint projeto_convites_max_usos_check CHECK (((max_usos >= 1) AND (max_usos <= 20))),
  constraint projeto_convites_permissao_check CHECK ((permissao = ANY (ARRAY['leitor'::text, 'editor'::text]))),
  constraint projeto_convites_pkey PRIMARY KEY (id),
  constraint projeto_convites_usos_check CHECK ((usos >= 0))
);

create table if not exists public.push_inscricoes (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  aparelho text,
  criado_em timestamptz not null default now(),
  constraint push_inscricoes_endpoint_key UNIQUE (endpoint),
  constraint push_inscricoes_pkey PRIMARY KEY (id)
);

create table if not exists public.respostas (
  id uuid not null default gen_random_uuid(),
  aula_id uuid not null,
  bloco_id uuid not null,
  participante uuid not null,
  nome text not null,
  texto text,
  opcao integer,
  oculta boolean not null default false,
  destaque boolean not null default false,
  criado_em timestamptz not null default now(),
  constraint respostas_aula_id_bloco_id_participante_key UNIQUE (aula_id, bloco_id, participante),
  constraint respostas_nome_check CHECK (((char_length(nome) >= 1) AND (char_length(nome) <= 60))),
  constraint respostas_pkey PRIMARY KEY (id),
  constraint respostas_texto_check CHECK ((char_length(texto) <= 1000))
);

create table if not exists public.slides (
  id uuid not null default gen_random_uuid(),
  mensagem_id uuid not null,
  topico_id uuid,
  user_id uuid not null default auth.uid(),
  ordem integer not null default 0,
  titulo text,
  subtitulo text,
  texto text,
  fundo text,
  estilo jsonb not null default '{}'::jsonb,
  constraint slides_pkey PRIMARY KEY (id)
);

create table if not exists public.topicos (
  id uuid not null default gen_random_uuid(),
  mensagem_id uuid not null,
  user_id uuid not null default auth.uid(),
  ordem integer not null default 0,
  titulo text not null default ''::text,
  versiculo text,
  observacao text,
  aplicacao text,
  ilustracao text,
  frase_chave text,
  notas text,
  tipo text not null default 'topico'::text,
  extra jsonb not null default '{}'::jsonb,
  constraint topicos_pkey PRIMARY KEY (id)
);

create table if not exists public.versiculos_marcados (
  user_id uuid not null default auth.uid(),
  versiculo text not null,
  criado_em timestamptz not null default now(),
  constraint versiculos_marcados_pkey PRIMARY KEY (user_id, versiculo)
);

create table if not exists public.versoes (
  id uuid not null default gen_random_uuid(),
  mensagem_id uuid not null,
  criado_por uuid not null default auth.uid(),
  criado_em timestamptz not null default now(),
  motivo text not null default 'edicao'::text,
  dados jsonb not null,
  constraint versoes_motivo_check CHECK ((motivo = ANY (ARRAY['edicao'::text, 'antes-de-restaurar'::text, 'manual'::text]))),
  constraint versoes_pkey PRIMARY KEY (id)
);

-- ── Chaves estrangeiras ─────────────────────────────────────────────────

do $$ begin
  alter table public.agenda_tokens add constraint agenda_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.aulas_ao_vivo add constraint aulas_ao_vivo_dono_fkey FOREIGN KEY (dono) REFERENCES auth.users(id) ON DELETE CASCADE;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.aulas_ao_vivo add constraint aulas_ao_vivo_mensagem_id_fkey FOREIGN KEY (mensagem_id) REFERENCES mensagens(id) ON DELETE CASCADE;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.eventos add constraint eventos_mensagem_id_fkey FOREIGN KEY (mensagem_id) REFERENCES mensagens(id) ON DELETE SET NULL;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.eventos add constraint eventos_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.lembretes_enviados add constraint lembretes_enviados_evento_id_fkey FOREIGN KEY (evento_id) REFERENCES eventos(id) ON DELETE CASCADE;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.mensagens add constraint mensagens_pasta_id_fkey FOREIGN KEY (pasta_id) REFERENCES pastas(id) ON DELETE SET NULL;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.mensagens add constraint mensagens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.pastas add constraint pastas_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.projeto_colaboradores add constraint projeto_colaboradores_mensagem_id_fkey FOREIGN KEY (mensagem_id) REFERENCES mensagens(id) ON DELETE CASCADE;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.projeto_colaboradores add constraint projeto_colaboradores_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES auth.users(id) ON DELETE CASCADE;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.projeto_convites add constraint projeto_convites_criado_por_fkey FOREIGN KEY (criado_por) REFERENCES auth.users(id);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.projeto_convites add constraint projeto_convites_mensagem_id_fkey FOREIGN KEY (mensagem_id) REFERENCES mensagens(id) ON DELETE CASCADE;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.push_inscricoes add constraint push_inscricoes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.respostas add constraint respostas_aula_id_fkey FOREIGN KEY (aula_id) REFERENCES aulas_ao_vivo(id) ON DELETE CASCADE;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.respostas add constraint respostas_bloco_id_fkey FOREIGN KEY (bloco_id) REFERENCES topicos(id) ON DELETE CASCADE;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.slides add constraint slides_mensagem_id_fkey FOREIGN KEY (mensagem_id) REFERENCES mensagens(id) ON DELETE CASCADE;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.slides add constraint slides_topico_id_fkey FOREIGN KEY (topico_id) REFERENCES topicos(id) ON DELETE SET NULL;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.slides add constraint slides_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.topicos add constraint topicos_mensagem_id_fkey FOREIGN KEY (mensagem_id) REFERENCES mensagens(id) ON DELETE CASCADE;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.topicos add constraint topicos_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.versiculos_marcados add constraint versiculos_marcados_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.versoes add constraint versoes_criado_por_fkey FOREIGN KEY (criado_por) REFERENCES auth.users(id) ON DELETE CASCADE;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.versoes add constraint versoes_mensagem_id_fkey FOREIGN KEY (mensagem_id) REFERENCES mensagens(id) ON DELETE CASCADE;
exception when duplicate_object then null; end $$;

-- ── Índices ─────────────────────────────────────────────────────────────

create index if not exists aulas_ao_vivo_mensagem ON public.aulas_ao_vivo USING btree (mensagem_id, criado_em DESC);
create index if not exists eventos_user_id_inicio_idx ON public.eventos USING btree (user_id, inicio);
create index if not exists mensagens_lixeira_idx ON public.mensagens USING btree (proprietario_compartilhamento, excluida_em) WHERE (excluida_em IS NOT NULL);
create index if not exists mensagens_proprietario_compartilhamento_idx ON public.mensagens USING btree (proprietario_compartilhamento);
create index if not exists mensagens_user_id_idx ON public.mensagens USING btree (user_id);
create index if not exists pastas_user_id_idx ON public.pastas USING btree (user_id);
create index if not exists projeto_colaboradores_usuario_idx ON public.projeto_colaboradores USING btree (usuario_id, mensagem_id) WHERE (bloqueado = false);
create index if not exists projeto_convites_mensagem_idx ON public.projeto_convites USING btree (mensagem_id, criado_em DESC);
create index if not exists respostas_aula ON public.respostas USING btree (aula_id, bloco_id);
create index if not exists slides_mensagem_id_ordem_idx ON public.slides USING btree (mensagem_id, ordem);
create index if not exists topicos_mensagem_id_ordem_idx ON public.topicos USING btree (mensagem_id, ordem);
create index if not exists versoes_mensagem_idx ON public.versoes USING btree (mensagem_id, criado_em DESC);

-- ── Funções ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.pulpito_aceitar_convite(p_codigo text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_convite public.projeto_convites%rowtype; v_usuario uuid:=auth.uid();v_normal text;
begin
  if v_usuario is null then raise exception 'É necessário entrar na conta'; end if;
  v_normal := upper(regexp_replace(coalesce(p_codigo,''),'[^A-Fa-f0-9]','','g'));
  if length(v_normal)<>16 then raise exception 'Código inválido'; end if;
  select * into v_convite from public.projeto_convites c
  where c.codigo_hash=encode(sha256(convert_to(v_normal,'UTF8')),'hex')
    and c.revogado_em is null and c.expira_em>now() and c.usos<c.max_usos
  for update;
  if not found then raise exception 'Convite inválido, expirado ou esgotado'; end if;
  if exists (select 1 from public.mensagens m where m.id=v_convite.mensagem_id and m.proprietario_compartilhamento=v_usuario) then
    raise exception 'Você já é o dono do projeto';
  end if;
  if exists (select 1 from public.projeto_colaboradores c where c.mensagem_id=v_convite.mensagem_id and c.usuario_id=v_usuario and c.bloqueado) then
    raise exception 'O dono revogou seu acesso. Solicite que ele reative seu usuário';
  end if;
  insert into public.projeto_colaboradores(mensagem_id,usuario_id,permissao)
    values(v_convite.mensagem_id,v_usuario,v_convite.permissao)
    on conflict (mensagem_id,usuario_id) do update set permissao=excluded.permissao;
  update public.projeto_convites set usos=usos+1 where id=v_convite.id;
  return v_convite.mensagem_id;
end $function$;
CREATE OR REPLACE FUNCTION public.pulpito_alterar_colaborador(p_mensagem_id uuid, p_usuario_id uuid, p_permissao text, p_bloqueado boolean DEFAULT false)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if public.pulpito_papel_projeto(p_mensagem_id) is distinct from 'dono' then raise exception 'Sem permissão'; end if;
  if p_permissao not in ('leitor','editor') or p_usuario_id=auth.uid() then raise exception 'Operação inválida'; end if;
  update public.projeto_colaboradores set permissao=p_permissao,bloqueado=p_bloqueado
    where mensagem_id=p_mensagem_id and usuario_id=p_usuario_id;
  if not found then raise exception 'Participante não encontrado'; end if;
end $function$;
CREATE OR REPLACE FUNCTION public.pulpito_criar_convite(p_mensagem_id uuid, p_permissao text, p_max_usos integer DEFAULT 1, p_horas integer DEFAULT 168)
 RETURNS TABLE(codigo text, expira_em timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_codigo text; v_expira timestamptz;
begin
  if public.pulpito_papel_projeto(p_mensagem_id) is distinct from 'dono' then raise exception 'Somente o dono pode convidar'; end if;
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
end $function$;
CREATE OR REPLACE FUNCTION public.pulpito_listar_colaboradores(p_mensagem_id uuid)
 RETURNS TABLE(usuario_id uuid, usuario text, permissao text, bloqueado boolean, adicionado_em timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if public.pulpito_papel_projeto(p_mensagem_id) is distinct from 'dono' then raise exception 'Sem permissão'; end if;
  return query select c.usuario_id, split_part(u.email,'@',1),c.permissao,c.bloqueado,c.adicionado_em
    from public.projeto_colaboradores c join auth.users u on u.id=c.usuario_id
    where c.mensagem_id=p_mensagem_id order by c.adicionado_em desc;
end $function$;
CREATE OR REPLACE FUNCTION public.pulpito_listar_convites(p_mensagem_id uuid)
 RETURNS TABLE(id uuid, permissao text, expira_em timestamp with time zone, usos integer, max_usos integer, revogado_em timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if public.pulpito_papel_projeto(p_mensagem_id) is distinct from 'dono' then raise exception 'Sem permissão'; end if;
  return query select c.id,c.permissao,c.expira_em,c.usos,c.max_usos,c.revogado_em
    from public.projeto_convites c where c.mensagem_id=p_mensagem_id order by c.criado_em desc limit 50;
end $function$;
CREATE OR REPLACE FUNCTION public.pulpito_papel_projeto(p_mensagem_id uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select case
    when m.proprietario_compartilhamento = auth.uid() then 'dono'
    when m.excluida_em is not null then null
    else (select c.permissao from public.projeto_colaboradores c
          where c.mensagem_id=m.id and c.usuario_id=auth.uid() and not c.bloqueado)
  end
  from public.mensagens m where m.id=p_mensagem_id
$function$;
CREATE OR REPLACE FUNCTION public.pulpito_prever_convite(p_codigo text)
 RETURNS TABLE(titulo text, permissao text, expira_em timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select m.titulo, c.permissao, c.expira_em
  from public.projeto_convites c join public.mensagens m on m.id=c.mensagem_id
  where c.codigo_hash=encode(sha256(convert_to(upper(regexp_replace(coalesce(p_codigo,''),'[^A-Fa-f0-9]','','g')),'UTF8')),'hex')
    and c.revogado_em is null and c.expira_em>now() and c.usos<c.max_usos
    and length(regexp_replace(coalesce(p_codigo,''),'[^A-Fa-f0-9]','','g'))=16
$function$;
CREATE OR REPLACE FUNCTION public.pulpito_proteger_dono()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare v_campo text;
begin
  if tg_op='INSERT' then
    if current_user not in ('service_role','postgres') then
      if auth.uid() is null then raise exception 'Autenticação obrigatória'; end if;
      new.proprietario_compartilhamento := auth.uid();
    end if;
  else
    if new.id is distinct from old.id
      or new.proprietario_compartilhamento is distinct from old.proprietario_compartilhamento then
      raise exception 'Não é possível mudar o dono do projeto';
    end if;
    -- Protege também a coluna legada do dono, usada por políticas antigas.
    if current_user not in ('service_role','postgres') then
      foreach v_campo in array array['usuario_id','user_id','dono_id','dono','owner_id','criado_por','autor_id','proprietario_id'] loop
        if (to_jsonb(new) ? v_campo) and (to_jsonb(new)->v_campo is distinct from to_jsonb(old)->v_campo) then
          raise exception 'Não é possível alterar a identidade do proprietário';
        end if;
      end loop;
    end if;
    if current_user not in ('service_role','postgres') and old.proprietario_compartilhamento <> auth.uid()
      and new.pasta_id is distinct from old.pasta_id then
      raise exception 'Somente o dono pode mover o projeto de pasta';
    end if;
  end if;
  return new;
end $function$;
CREATE OR REPLACE FUNCTION public.pulpito_proteger_lixeira()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if current_user not in ('service_role','postgres')
    and new.excluida_em is distinct from old.excluida_em
    and old.proprietario_compartilhamento is distinct from auth.uid() then
    raise exception 'Somente o dono pode excluir ou restaurar o projeto';
  end if;
  return new;
end $function$;
CREATE OR REPLACE FUNCTION public.pulpito_revogar_convite(p_mensagem_id uuid, p_convite_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if public.pulpito_papel_projeto(p_mensagem_id) is distinct from 'dono' then raise exception 'Sem permissão'; end if;
  update public.projeto_convites set revogado_em=now() where id=p_convite_id and mensagem_id=p_mensagem_id;
end $function$;
CREATE OR REPLACE FUNCTION public.responder_aula(p_codigo text, p_bloco uuid, p_participante uuid, p_nome text, p_texto text DEFAULT NULL::text, p_opcao integer DEFAULT NULL::integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_aula public.aulas_ao_vivo;
begin
  select * into v_aula from public.aulas_ao_vivo where codigo = upper(trim(p_codigo)) and aberta;
  if not found then raise exception 'aula fechada'; end if;
  if not exists (select 1 from public.topicos where id = p_bloco and mensagem_id = v_aula.mensagem_id) then
    raise exception 'bloco inválido';
  end if;
  insert into public.respostas (aula_id, bloco_id, participante, nome, texto, opcao)
  values (v_aula.id, p_bloco, p_participante, left(trim(p_nome), 60), left(p_texto, 1000), p_opcao)
  on conflict (aula_id, bloco_id, participante) do update
    set nome = excluded.nome, texto = excluded.texto, opcao = coalesce(respostas.opcao, excluded.opcao)
    where respostas.opcao is null;
end $function$;
CREATE OR REPLACE FUNCTION public.tocar_atualizado_em()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  new.atualizado_em = now();
  return new;
end $function$;

-- Permissões de execução (as demais funções ficam com o padrão)

revoke all on function public.pulpito_aceitar_convite(p_codigo text) from public;
grant execute on function public.pulpito_aceitar_convite(p_codigo text) to anon;
grant execute on function public.pulpito_aceitar_convite(p_codigo text) to authenticated;
grant execute on function public.pulpito_aceitar_convite(p_codigo text) to service_role;
revoke all on function public.pulpito_alterar_colaborador(p_mensagem_id uuid, p_usuario_id uuid, p_permissao text, p_bloqueado boolean) from public;
grant execute on function public.pulpito_alterar_colaborador(p_mensagem_id uuid, p_usuario_id uuid, p_permissao text, p_bloqueado boolean) to anon;
grant execute on function public.pulpito_alterar_colaborador(p_mensagem_id uuid, p_usuario_id uuid, p_permissao text, p_bloqueado boolean) to authenticated;
grant execute on function public.pulpito_alterar_colaborador(p_mensagem_id uuid, p_usuario_id uuid, p_permissao text, p_bloqueado boolean) to service_role;
revoke all on function public.pulpito_criar_convite(p_mensagem_id uuid, p_permissao text, p_max_usos integer, p_horas integer) from public;
grant execute on function public.pulpito_criar_convite(p_mensagem_id uuid, p_permissao text, p_max_usos integer, p_horas integer) to anon;
grant execute on function public.pulpito_criar_convite(p_mensagem_id uuid, p_permissao text, p_max_usos integer, p_horas integer) to authenticated;
grant execute on function public.pulpito_criar_convite(p_mensagem_id uuid, p_permissao text, p_max_usos integer, p_horas integer) to service_role;
revoke all on function public.pulpito_listar_colaboradores(p_mensagem_id uuid) from public;
grant execute on function public.pulpito_listar_colaboradores(p_mensagem_id uuid) to anon;
grant execute on function public.pulpito_listar_colaboradores(p_mensagem_id uuid) to authenticated;
grant execute on function public.pulpito_listar_colaboradores(p_mensagem_id uuid) to service_role;
revoke all on function public.pulpito_listar_convites(p_mensagem_id uuid) from public;
grant execute on function public.pulpito_listar_convites(p_mensagem_id uuid) to anon;
grant execute on function public.pulpito_listar_convites(p_mensagem_id uuid) to authenticated;
grant execute on function public.pulpito_listar_convites(p_mensagem_id uuid) to service_role;
revoke all on function public.pulpito_papel_projeto(p_mensagem_id uuid) from public;
grant execute on function public.pulpito_papel_projeto(p_mensagem_id uuid) to anon;
grant execute on function public.pulpito_papel_projeto(p_mensagem_id uuid) to authenticated;
grant execute on function public.pulpito_papel_projeto(p_mensagem_id uuid) to service_role;
revoke all on function public.pulpito_prever_convite(p_codigo text) from public;
grant execute on function public.pulpito_prever_convite(p_codigo text) to anon;
grant execute on function public.pulpito_prever_convite(p_codigo text) to authenticated;
grant execute on function public.pulpito_prever_convite(p_codigo text) to service_role;
revoke all on function public.pulpito_proteger_dono() from public;
grant execute on function public.pulpito_proteger_dono() to anon;
grant execute on function public.pulpito_proteger_dono() to authenticated;
grant execute on function public.pulpito_proteger_dono() to service_role;
revoke all on function public.pulpito_proteger_lixeira() from public;
grant execute on function public.pulpito_proteger_lixeira() to anon;
grant execute on function public.pulpito_proteger_lixeira() to authenticated;
grant execute on function public.pulpito_proteger_lixeira() to service_role;
revoke all on function public.pulpito_revogar_convite(p_mensagem_id uuid, p_convite_id uuid) from public;
grant execute on function public.pulpito_revogar_convite(p_mensagem_id uuid, p_convite_id uuid) to anon;
grant execute on function public.pulpito_revogar_convite(p_mensagem_id uuid, p_convite_id uuid) to authenticated;
grant execute on function public.pulpito_revogar_convite(p_mensagem_id uuid, p_convite_id uuid) to service_role;
revoke all on function public.responder_aula(p_codigo text, p_bloco uuid, p_participante uuid, p_nome text, p_texto text, p_opcao integer) from public;
grant execute on function public.responder_aula(p_codigo text, p_bloco uuid, p_participante uuid, p_nome text, p_texto text, p_opcao integer) to anon;
grant execute on function public.responder_aula(p_codigo text, p_bloco uuid, p_participante uuid, p_nome text, p_texto text, p_opcao integer) to authenticated;
grant execute on function public.responder_aula(p_codigo text, p_bloco uuid, p_participante uuid, p_nome text, p_texto text, p_opcao integer) to service_role;
revoke all on function public.tocar_atualizado_em() from public;
grant execute on function public.tocar_atualizado_em() to anon;
grant execute on function public.tocar_atualizado_em() to authenticated;
grant execute on function public.tocar_atualizado_em() to service_role;

-- ── Triggers ────────────────────────────────────────────────────────────

drop trigger if exists mensagens_atualizado on mensagens;
create trigger mensagens_atualizado before UPDATE on public.mensagens for each row execute function tocar_atualizado_em();
drop trigger if exists pulpito_proteger_lixeira on mensagens;
create trigger pulpito_proteger_lixeira before UPDATE on public.mensagens for each row execute function pulpito_proteger_lixeira();

-- ── RLS e políticas ─────────────────────────────────────────────────────

alter table public.agenda_tokens enable row level security;
alter table public.aulas_ao_vivo enable row level security;
alter table public.eventos enable row level security;
alter table public.lembretes_enviados enable row level security;
alter table public.mensagens enable row level security;
alter table public.pastas enable row level security;
alter table public.projeto_colaboradores enable row level security;
alter table public.projeto_convites enable row level security;
alter table public.push_inscricoes enable row level security;
alter table public.respostas enable row level security;
alter table public.slides enable row level security;
alter table public.topicos enable row level security;
alter table public.versiculos_marcados enable row level security;
alter table public.versoes enable row level security;

drop policy if exists "dono_token" on public.agenda_tokens;
create policy "dono_token" on public.agenda_tokens to authenticated
  using ((( SELECT auth.uid() AS uid) = user_id))
  with check ((( SELECT auth.uid() AS uid) = user_id));
drop policy if exists "dono das aulas" on public.aulas_ao_vivo;
create policy "dono das aulas" on public.aulas_ao_vivo to public
  using ((dono = auth.uid()))
  with check ((dono = auth.uid()));
drop policy if exists "pulpito_aulas_dono_apaga" on public.aulas_ao_vivo;
create policy "pulpito_aulas_dono_apaga" on public.aulas_ao_vivo for delete to authenticated
  using ((pulpito_papel_projeto(mensagem_id) = 'dono'::text));
drop policy if exists "pulpito_aulas_projeto" on public.aulas_ao_vivo;
create policy "pulpito_aulas_projeto" on public.aulas_ao_vivo for select to authenticated
  using ((pulpito_papel_projeto(mensagem_id) = ANY (ARRAY['dono'::text, 'editor'::text])));
drop policy if exists "dono_eventos" on public.eventos;
create policy "dono_eventos" on public.eventos to authenticated
  using ((( SELECT auth.uid() AS uid) = user_id))
  with check ((( SELECT auth.uid() AS uid) = user_id));
drop policy if exists "dono_mensagens" on public.mensagens;
create policy "dono_mensagens" on public.mensagens to authenticated
  using ((( SELECT auth.uid() AS uid) = user_id))
  with check ((( SELECT auth.uid() AS uid) = user_id));
drop policy if exists "dono_pastas" on public.pastas;
create policy "dono_pastas" on public.pastas to authenticated
  using ((( SELECT auth.uid() AS uid) = user_id))
  with check ((( SELECT auth.uid() AS uid) = user_id));
drop policy if exists "dono_push" on public.push_inscricoes;
create policy "dono_push" on public.push_inscricoes to authenticated
  using ((( SELECT auth.uid() AS uid) = user_id))
  with check ((( SELECT auth.uid() AS uid) = user_id));
drop policy if exists "dono das respostas" on public.respostas;
create policy "dono das respostas" on public.respostas to public
  using ((EXISTS ( SELECT 1
   FROM aulas_ao_vivo a
  WHERE ((a.id = respostas.aula_id) AND (a.dono = auth.uid())))))
  with check ((EXISTS ( SELECT 1
   FROM aulas_ao_vivo a
  WHERE ((a.id = respostas.aula_id) AND (a.dono = auth.uid())))));
drop policy if exists "pulpito_respostas_projeto" on public.respostas;
create policy "pulpito_respostas_projeto" on public.respostas for select to authenticated
  using ((EXISTS ( SELECT 1
   FROM aulas_ao_vivo a
  WHERE ((a.id = respostas.aula_id) AND (pulpito_papel_projeto(a.mensagem_id) = ANY (ARRAY['dono'::text, 'editor'::text]))))));
drop policy if exists "dono_slides" on public.slides;
create policy "dono_slides" on public.slides to authenticated
  using ((( SELECT auth.uid() AS uid) = user_id))
  with check ((( SELECT auth.uid() AS uid) = user_id));
drop policy if exists "dono_topicos" on public.topicos;
create policy "dono_topicos" on public.topicos to authenticated
  using ((( SELECT auth.uid() AS uid) = user_id))
  with check ((( SELECT auth.uid() AS uid) = user_id));
drop policy if exists "dono_versiculos_marcados" on public.versiculos_marcados;
create policy "dono_versiculos_marcados" on public.versiculos_marcados to authenticated
  using ((( SELECT auth.uid() AS uid) = user_id))
  with check ((( SELECT auth.uid() AS uid) = user_id));
drop policy if exists "pulpito_versoes_apagar" on public.versoes;
create policy "pulpito_versoes_apagar" on public.versoes for delete to authenticated
  using ((pulpito_papel_projeto(mensagem_id) = ANY (ARRAY['dono'::text, 'editor'::text])));
drop policy if exists "pulpito_versoes_criar" on public.versoes;
create policy "pulpito_versoes_criar" on public.versoes for insert to authenticated
  with check (((criado_por = auth.uid()) AND (pulpito_papel_projeto(mensagem_id) = ANY (ARRAY['dono'::text, 'editor'::text]))));
drop policy if exists "pulpito_versoes_ler" on public.versoes;
create policy "pulpito_versoes_ler" on public.versoes for select to authenticated
  using ((pulpito_papel_projeto(mensagem_id) = ANY (ARRAY['dono'::text, 'editor'::text])));

-- ── Storage: fotos de fundo dos slides ──────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('fundos', 'fundos', true, 5242880, array['image/jpeg','image/png','image/webp','image/gif'])
  on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists fundos_apagar on storage.objects;
create policy fundos_apagar on storage.objects for delete to authenticated
  using (((bucket_id = 'fundos'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text)));
drop policy if exists fundos_enviar on storage.objects;
create policy fundos_enviar on storage.objects for insert to authenticated
  with check (((bucket_id = 'fundos'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text)));

notify pgrst, 'reload schema';
