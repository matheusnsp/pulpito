-- Púlpito: colaboração segura por projeto, links e códigos.
-- ATENÇÃO: aplique em homologação antes de produção. Faça backup do banco.
-- Este SQL não deve ser executado no navegador; use SQL Editor/CLI do Supabase.

-- O repositório não contém a migração original de 'mensagens'. Detecta o campo
-- de dono já existente sem supor que o nome seja sempre igual.
alter table public.mensagens add column if not exists proprietario_compartilhamento uuid;
alter table public.mensagens alter column proprietario_compartilhamento set default auth.uid();

do $owner_mapping$
declare v_campo text;
begin
  select c.column_name into v_campo
  from information_schema.columns c
  where c.table_schema='public' and c.table_name='mensagens'
    and c.column_name in ('usuario_id','user_id','dono_id','dono','owner_id','criado_por','autor_id','proprietario_id')
    and c.udt_name = 'uuid'
  order by array_position(array['usuario_id','user_id','dono_id','dono','owner_id','criado_por','autor_id','proprietario_id'],c.column_name)
  limit 1;
  if v_campo is not null then
    execute format('update public.mensagens set proprietario_compartilhamento = %I where proprietario_compartilhamento is null',v_campo);
  end if;
  if exists (select 1 from public.mensagens where proprietario_compartilhamento is null) then
    raise exception 'Não foi possível identificar o campo do dono das mensagens antigas. Inspecione as colunas de public.mensagens e preencha proprietario_compartilhamento a partir da coluna original ANTES desta migração.';
  end if;
end $owner_mapping$;
alter table public.mensagens alter column proprietario_compartilhamento set not null;
create index if not exists mensagens_proprietario_compartilhamento_idx on public.mensagens (proprietario_compartilhamento);

create table if not exists public.projeto_colaboradores (
  mensagem_id uuid not null references public.mensagens(id) on delete cascade,
  usuario_id uuid not null references auth.users(id) on delete cascade,
  permissao text not null check (permissao in ('leitor','editor')),
  bloqueado boolean not null default false,
  adicionado_em timestamptz not null default now(),
  primary key (mensagem_id,usuario_id)
);
create index if not exists projeto_colaboradores_usuario_idx on public.projeto_colaboradores(usuario_id,mensagem_id) where bloqueado=false;

create table if not exists public.projeto_convites (
  id uuid primary key default gen_random_uuid(),
  mensagem_id uuid not null references public.mensagens(id) on delete cascade,
  codigo_hash text not null unique,
  permissao text not null check (permissao in ('leitor','editor')),
  criado_por uuid not null references auth.users(id),
  criado_em timestamptz not null default now(),
  expira_em timestamptz not null,
  max_usos integer not null check (max_usos between 1 and 20),
  usos integer not null default 0 check (usos >= 0),
  revogado_em timestamptz
);
create index if not exists projeto_convites_mensagem_idx on public.projeto_convites(mensagem_id,criado_em desc);

alter table public.projeto_colaboradores enable row level security;
alter table public.projeto_convites enable row level security;
-- Sem acesso direto a estas tabelas. Só funções definidas e auditáveis.

-- O dono do projeto não pode ser alterado via API; coeditores não podem mover
-- mensagens entre pastas de outra conta. Impede apropriação de projetos.
create or replace function public.pulpito_proteger_dono()
returns trigger language plpgsql set search_path = '' as $$
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
end $$;
drop trigger if exists pulpito_proteger_dono on public.mensagens;
create trigger pulpito_proteger_dono before insert or update on public.mensagens
  for each row execute function public.pulpito_proteger_dono();

create or replace function public.pulpito_papel_projeto(p_mensagem_id uuid)
returns text language sql stable security definer set search_path = '' as $$
  select case
    when m.proprietario_compartilhamento = auth.uid() then 'dono'
    else (select c.permissao from public.projeto_colaboradores c
          where c.mensagem_id=m.id and c.usuario_id=auth.uid() and not c.bloqueado)
  end
  from public.mensagens m where m.id=p_mensagem_id
$$;
revoke all on function public.pulpito_papel_projeto(uuid) from public;
grant execute on function public.pulpito_papel_projeto(uuid) to authenticated;

-- Políticas PERMISSIVE concedem o acesso; RESTRICTIVE garantem que nenhuma
-- política legada excessivamente aberta dê acesso fora do novo escopo.
alter table public.mensagens enable row level security;
alter table public.topicos enable row level security;
alter table public.slides enable row level security;

-- As políticas antigas podem permanecer, preservando os fluxos existentes.
-- Cada comando recebe uma política permissiva + uma restritiva.
drop policy if exists pulpito_msg_read on public.mensagens;
create policy pulpito_msg_read on public.mensagens for select to authenticated
  using (public.pulpito_papel_projeto(id) is not null);
drop policy if exists pulpito_msg_read_limit on public.mensagens;
create policy pulpito_msg_read_limit as restrictive on public.mensagens for select to authenticated
  using (public.pulpito_papel_projeto(id) is not null);
drop policy if exists pulpito_msg_insert on public.mensagens;
create policy pulpito_msg_insert on public.mensagens for insert to authenticated
  with check (proprietario_compartilhamento=auth.uid());
drop policy if exists pulpito_msg_insert_limit on public.mensagens;
create policy pulpito_msg_insert_limit as restrictive on public.mensagens for insert to authenticated
  with check (proprietario_compartilhamento=auth.uid());
drop policy if exists pulpito_msg_update on public.mensagens;
create policy pulpito_msg_update on public.mensagens for update to authenticated
  using (public.pulpito_papel_projeto(id) in ('dono','editor'))
  with check (public.pulpito_papel_projeto(id) in ('dono','editor'));
drop policy if exists pulpito_msg_update_limit on public.mensagens;
create policy pulpito_msg_update_limit as restrictive on public.mensagens for update to authenticated
  using (public.pulpito_papel_projeto(id) in ('dono','editor'))
  with check (public.pulpito_papel_projeto(id) in ('dono','editor'));
drop policy if exists pulpito_msg_delete_limit on public.mensagens;
create policy pulpito_msg_delete_limit as restrictive on public.mensagens for delete to authenticated
  using (proprietario_compartilhamento=auth.uid());

-- Colaboradores podem trabalhar nos tópicos e slides; leitores apenas ler.
drop policy if exists pulpito_top_read on public.topicos;
create policy pulpito_top_read on public.topicos for select to authenticated
  using (public.pulpito_papel_projeto(mensagem_id) is not null);
drop policy if exists pulpito_top_read_limit on public.topicos;
create policy pulpito_top_read_limit as restrictive on public.topicos for select to authenticated
  using (public.pulpito_papel_projeto(mensagem_id) is not null);
drop policy if exists pulpito_top_insert on public.topicos;
create policy pulpito_top_insert on public.topicos for insert to authenticated
  with check (public.pulpito_papel_projeto(mensagem_id) in ('dono','editor'));
drop policy if exists pulpito_top_insert_limit on public.topicos;
create policy pulpito_top_insert_limit as restrictive on public.topicos for insert to authenticated
  with check (public.pulpito_papel_projeto(mensagem_id) in ('dono','editor'));
drop policy if exists pulpito_top_update on public.topicos;
create policy pulpito_top_update on public.topicos for update to authenticated
  using (public.pulpito_papel_projeto(mensagem_id) in ('dono','editor'))
  with check (public.pulpito_papel_projeto(mensagem_id) in ('dono','editor'));
drop policy if exists pulpito_top_update_limit on public.topicos;
create policy pulpito_top_update_limit as restrictive on public.topicos for update to authenticated
  using (public.pulpito_papel_projeto(mensagem_id) in ('dono','editor'))
  with check (public.pulpito_papel_projeto(mensagem_id) in ('dono','editor'));
drop policy if exists pulpito_top_delete on public.topicos;
create policy pulpito_top_delete on public.topicos for delete to authenticated
  using (public.pulpito_papel_projeto(mensagem_id) in ('dono','editor'));
drop policy if exists pulpito_top_delete_limit on public.topicos;
create policy pulpito_top_delete_limit as restrictive on public.topicos for delete to authenticated
  using (public.pulpito_papel_projeto(mensagem_id) in ('dono','editor'));

drop policy if exists pulpito_slide_read on public.slides;
create policy pulpito_slide_read on public.slides for select to authenticated
  using (public.pulpito_papel_projeto(mensagem_id) is not null);
drop policy if exists pulpito_slide_read_limit on public.slides;
create policy pulpito_slide_read_limit as restrictive on public.slides for select to authenticated
  using (public.pulpito_papel_projeto(mensagem_id) is not null);
drop policy if exists pulpito_slide_insert on public.slides;
create policy pulpito_slide_insert on public.slides for insert to authenticated
  with check (public.pulpito_papel_projeto(mensagem_id) in ('dono','editor'));
drop policy if exists pulpito_slide_insert_limit on public.slides;
create policy pulpito_slide_insert_limit as restrictive on public.slides for insert to authenticated
  with check (public.pulpito_papel_projeto(mensagem_id) in ('dono','editor'));
drop policy if exists pulpito_slide_update on public.slides;
create policy pulpito_slide_update on public.slides for update to authenticated
  using (public.pulpito_papel_projeto(mensagem_id) in ('dono','editor'))
  with check (public.pulpito_papel_projeto(mensagem_id) in ('dono','editor'));
drop policy if exists pulpito_slide_update_limit on public.slides;
create policy pulpito_slide_update_limit as restrictive on public.slides for update to authenticated
  using (public.pulpito_papel_projeto(mensagem_id) in ('dono','editor'))
  with check (public.pulpito_papel_projeto(mensagem_id) in ('dono','editor'));
drop policy if exists pulpito_slide_delete on public.slides;
create policy pulpito_slide_delete on public.slides for delete to authenticated
  using (public.pulpito_papel_projeto(mensagem_id) in ('dono','editor'));
drop policy if exists pulpito_slide_delete_limit on public.slides;
create policy pulpito_slide_delete_limit as restrictive on public.slides for delete to authenticated
  using (public.pulpito_papel_projeto(mensagem_id) in ('dono','editor'));

-- Cria código aleatório de 64 bits, consumível apenas por usuário autenticado.
-- Não armazena o código em texto claro no banco: só SHA-256.
create or replace function public.pulpito_criar_convite(
 p_mensagem_id uuid, p_permissao text, p_max_usos integer default 1, p_horas integer default 168)
returns table(codigo text, expira_em timestamptz)
language plpgsql volatile security definer set search_path = '' as $$
declare v_codigo text; v_expira timestamptz;
begin
  if public.pulpito_papel_projeto(p_mensagem_id) <> 'dono' then raise exception 'Somente o dono pode convidar'; end if;
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

create or replace function public.pulpito_prever_convite(p_codigo text)
returns table(titulo text, permissao text, expira_em timestamptz)
language sql stable security definer set search_path = '' as $$
  select m.titulo, c.permissao, c.expira_em
  from public.projeto_convites c join public.mensagens m on m.id=c.mensagem_id
  where c.codigo_hash=encode(sha256(convert_to(upper(regexp_replace(coalesce(p_codigo,''),'[^A-Fa-f0-9]','','g')),'UTF8')),'hex')
    and c.revogado_em is null and c.expira_em>now() and c.usos<c.max_usos
    and length(regexp_replace(coalesce(p_codigo,''),'[^A-Fa-f0-9]','','g'))=16
$$;

create or replace function public.pulpito_aceitar_convite(p_codigo text)
returns uuid language plpgsql volatile security definer set search_path = '' as $$
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
end $$;

-- Apenas o dono acessa lista de membros e convites do seu projeto.
create or replace function public.pulpito_listar_colaboradores(p_mensagem_id uuid)
returns table(usuario_id uuid, usuario text, permissao text, bloqueado boolean, adicionado_em timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if public.pulpito_papel_projeto(p_mensagem_id)<>'dono' then raise exception 'Sem permissão'; end if;
  return query select c.usuario_id, split_part(u.email,'@',1),c.permissao,c.bloqueado,c.adicionado_em
    from public.projeto_colaboradores c join auth.users u on u.id=c.usuario_id
    where c.mensagem_id=p_mensagem_id order by c.adicionado_em desc;
end $$;
create or replace function public.pulpito_listar_convites(p_mensagem_id uuid)
returns table(id uuid, permissao text, expira_em timestamptz, usos integer, max_usos integer, revogado_em timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if public.pulpito_papel_projeto(p_mensagem_id)<>'dono' then raise exception 'Sem permissão'; end if;
  return query select c.id,c.permissao,c.expira_em,c.usos,c.max_usos,c.revogado_em
    from public.projeto_convites c where c.mensagem_id=p_mensagem_id order by c.criado_em desc limit 50;
end $$;

create or replace function public.pulpito_alterar_colaborador(p_mensagem_id uuid,p_usuario_id uuid,p_permissao text,p_bloqueado boolean default false)
returns void language plpgsql volatile security definer set search_path = '' as $$
begin
  if public.pulpito_papel_projeto(p_mensagem_id)<>'dono' then raise exception 'Sem permissão'; end if;
  if p_permissao not in ('leitor','editor') or p_usuario_id=auth.uid() then raise exception 'Operação inválida'; end if;
  update public.projeto_colaboradores set permissao=p_permissao,bloqueado=p_bloqueado
    where mensagem_id=p_mensagem_id and usuario_id=p_usuario_id;
  if not found then raise exception 'Participante não encontrado'; end if;
end $$;
create or replace function public.pulpito_revogar_convite(p_mensagem_id uuid,p_convite_id uuid)
returns void language plpgsql volatile security definer set search_path = '' as $$
begin
  if public.pulpito_papel_projeto(p_mensagem_id)<>'dono' then raise exception 'Sem permissão'; end if;
  update public.projeto_convites set revogado_em=now() where id=p_convite_id and mensagem_id=p_mensagem_id;
end $$;

revoke all on function public.pulpito_criar_convite(uuid,text,integer,integer) from public;
revoke all on function public.pulpito_prever_convite(text) from public;
revoke all on function public.pulpito_aceitar_convite(text) from public;
revoke all on function public.pulpito_listar_colaboradores(uuid) from public;
revoke all on function public.pulpito_listar_convites(uuid) from public;
revoke all on function public.pulpito_alterar_colaborador(uuid,uuid,text,boolean) from public;
revoke all on function public.pulpito_revogar_convite(uuid,uuid) from public;
grant execute on function public.pulpito_criar_convite(uuid,text,integer,integer) to authenticated;
grant execute on function public.pulpito_prever_convite(text) to authenticated;
grant execute on function public.pulpito_aceitar_convite(text) to authenticated;
grant execute on function public.pulpito_listar_colaboradores(uuid) to authenticated;
grant execute on function public.pulpito_listar_convites(uuid) to authenticated;
grant execute on function public.pulpito_alterar_colaborador(uuid,uuid,text,boolean) to authenticated;
grant execute on function public.pulpito_revogar_convite(uuid,uuid) to authenticated;
notify pgrst, 'reload schema';
