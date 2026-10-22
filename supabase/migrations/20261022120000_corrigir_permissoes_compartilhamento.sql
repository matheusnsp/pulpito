-- Púlpito: correção de segurança do compartilhamento (22/10/2026).
--
-- Problema: nas funções abaixo, a checagem era
--   if pulpito_papel_projeto(id) <> 'dono' then raise exception ...
-- Para quem NÃO tem nenhum papel no projeto, pulpito_papel_projeto devolve NULL,
-- e "NULL <> 'dono'" é NULL (não é verdadeiro), então a exceção NÃO era lançada.
-- Resultado: qualquer conta logada que soubesse o id de uma mensagem podia criar
-- um convite de editor para ela (e aceitar), ver a lista de participantes,
-- mudar permissões e revogar convites.
--
-- Correção: "is distinct from 'dono'", que é verdadeiro também quando o papel é NULL.
-- Rode este arquivo inteiro no SQL Editor do Supabase. Pode rodar mais de uma vez.

create or replace function public.pulpito_criar_convite(
 p_mensagem_id uuid, p_permissao text, p_max_usos integer default 1, p_horas integer default 168)
returns table(codigo text, expira_em timestamptz)
language plpgsql volatile security definer set search_path = '' as $$
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
end $$;

create or replace function public.pulpito_listar_colaboradores(p_mensagem_id uuid)
returns table(usuario_id uuid, usuario text, permissao text, bloqueado boolean, adicionado_em timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if public.pulpito_papel_projeto(p_mensagem_id) is distinct from 'dono' then raise exception 'Sem permissão'; end if;
  return query select c.usuario_id, split_part(u.email,'@',1),c.permissao,c.bloqueado,c.adicionado_em
    from public.projeto_colaboradores c join auth.users u on u.id=c.usuario_id
    where c.mensagem_id=p_mensagem_id order by c.adicionado_em desc;
end $$;

create or replace function public.pulpito_listar_convites(p_mensagem_id uuid)
returns table(id uuid, permissao text, expira_em timestamptz, usos integer, max_usos integer, revogado_em timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if public.pulpito_papel_projeto(p_mensagem_id) is distinct from 'dono' then raise exception 'Sem permissão'; end if;
  return query select c.id,c.permissao,c.expira_em,c.usos,c.max_usos,c.revogado_em
    from public.projeto_convites c where c.mensagem_id=p_mensagem_id order by c.criado_em desc limit 50;
end $$;

create or replace function public.pulpito_alterar_colaborador(p_mensagem_id uuid,p_usuario_id uuid,p_permissao text,p_bloqueado boolean default false)
returns void language plpgsql volatile security definer set search_path = '' as $$
begin
  if public.pulpito_papel_projeto(p_mensagem_id) is distinct from 'dono' then raise exception 'Sem permissão'; end if;
  if p_permissao not in ('leitor','editor') or p_usuario_id=auth.uid() then raise exception 'Operação inválida'; end if;
  update public.projeto_colaboradores set permissao=p_permissao,bloqueado=p_bloqueado
    where mensagem_id=p_mensagem_id and usuario_id=p_usuario_id;
  if not found then raise exception 'Participante não encontrado'; end if;
end $$;

create or replace function public.pulpito_revogar_convite(p_mensagem_id uuid,p_convite_id uuid)
returns void language plpgsql volatile security definer set search_path = '' as $$
begin
  if public.pulpito_papel_projeto(p_mensagem_id) is distinct from 'dono' then raise exception 'Sem permissão'; end if;
  update public.projeto_convites set revogado_em=now() where id=p_convite_id and mensagem_id=p_mensagem_id;
end $$;

-- Por garantia: só quem é dono cria e consulta convites.
revoke all on function public.pulpito_criar_convite(uuid,text,integer,integer) from public;
revoke all on function public.pulpito_listar_colaboradores(uuid) from public;
revoke all on function public.pulpito_listar_convites(uuid) from public;
revoke all on function public.pulpito_alterar_colaborador(uuid,uuid,text,boolean) from public;
revoke all on function public.pulpito_revogar_convite(uuid,uuid) from public;
grant execute on function public.pulpito_criar_convite(uuid,text,integer,integer) to authenticated;
grant execute on function public.pulpito_listar_colaboradores(uuid) to authenticated;
grant execute on function public.pulpito_listar_convites(uuid) to authenticated;
grant execute on function public.pulpito_alterar_colaborador(uuid,uuid,text,boolean) to authenticated;
grant execute on function public.pulpito_revogar_convite(uuid,uuid) to authenticated;

-- Conferência: lista quem entrou em projetos por convite criado por alguém que não é o dono.
-- Se aparecer alguma linha, alguém usou a falha. Bloqueie em Compartilhar projeto ou apague a linha.
select c.mensagem_id, m.titulo, cv.criado_por as convite_criado_por, c.usuario_id as entrou, c.permissao, c.adicionado_em
from public.projeto_convites cv
join public.mensagens m on m.id = cv.mensagem_id
join public.projeto_colaboradores c on c.mensagem_id = cv.mensagem_id
where cv.criado_por <> m.proprietario_compartilhamento;

notify pgrst, 'reload schema';
