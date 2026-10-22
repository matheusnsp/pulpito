-- Púlpito: lixeira, histórico de versões e respostas das aulas para quem divide o projeto (22/10/2026).
-- Rode no SQL Editor do Supabase DEPOIS do 20261020224000_compartilhamento.sql
-- e do 20261022120000_corrigir_permissoes_compartilhamento.sql. Pode rodar mais de uma vez.

do $$ begin
  if to_regprocedure('public.pulpito_papel_projeto(uuid)') is null then
    raise exception 'Rode antes o SQL do compartilhamento (20261020224000_compartilhamento.sql).';
  end if;
end $$;

-- ───────────── 1. Lixeira ─────────────
-- Excluir passa a marcar a data. Depois de 30 dias o próprio app apaga de vez.
alter table public.mensagens add column if not exists excluida_em timestamptz;
create index if not exists mensagens_lixeira_idx on public.mensagens (proprietario_compartilhamento, excluida_em)
  where excluida_em is not null;

-- Projeto na lixeira some para quem não é o dono
create or replace function public.pulpito_papel_projeto(p_mensagem_id uuid)
returns text language sql stable security definer set search_path = '' as $$
  select case
    when m.proprietario_compartilhamento = auth.uid() then 'dono'
    when m.excluida_em is not null then null
    else (select c.permissao from public.projeto_colaboradores c
          where c.mensagem_id=m.id and c.usuario_id=auth.uid() and not c.bloqueado)
  end
  from public.mensagens m where m.id=p_mensagem_id
$$;
revoke all on function public.pulpito_papel_projeto(uuid) from public;
grant execute on function public.pulpito_papel_projeto(uuid) to authenticated;

-- Só o dono manda para a lixeira ou tira de lá
create or replace function public.pulpito_proteger_lixeira()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user not in ('service_role','postgres')
    and new.excluida_em is distinct from old.excluida_em
    and old.proprietario_compartilhamento is distinct from auth.uid() then
    raise exception 'Somente o dono pode excluir ou restaurar o projeto';
  end if;
  return new;
end $$;
drop trigger if exists pulpito_proteger_lixeira on public.mensagens;
create trigger pulpito_proteger_lixeira before update on public.mensagens
  for each row execute function public.pulpito_proteger_lixeira();

-- ───────────── 2. Histórico de versões ─────────────
-- Uma cópia do projeto (mensagem + tópicos + slides) a cada sessão de edição.
create table if not exists public.versoes (
  id uuid primary key default gen_random_uuid(),
  mensagem_id uuid not null references public.mensagens(id) on delete cascade,
  criado_por uuid not null default auth.uid() references auth.users(id) on delete cascade,
  criado_em timestamptz not null default now(),
  motivo text not null default 'edicao' check (motivo in ('edicao','antes-de-restaurar','manual')),
  dados jsonb not null
);
create index if not exists versoes_mensagem_idx on public.versoes (mensagem_id, criado_em desc);
alter table public.versoes enable row level security;

drop policy if exists pulpito_versoes_ler on public.versoes;
create policy pulpito_versoes_ler on public.versoes for select to authenticated
  using (public.pulpito_papel_projeto(mensagem_id) in ('dono','editor'));
drop policy if exists pulpito_versoes_criar on public.versoes;
create policy pulpito_versoes_criar on public.versoes for insert to authenticated
  with check (criado_por = auth.uid() and public.pulpito_papel_projeto(mensagem_id) in ('dono','editor'));
drop policy if exists pulpito_versoes_apagar on public.versoes;
create policy pulpito_versoes_apagar on public.versoes for delete to authenticated
  using (public.pulpito_papel_projeto(mensagem_id) in ('dono','editor'));

-- ───────────── 3. Respostas das aulas para quem divide o projeto ─────────────
-- Antes, só quem abriu a aula via as respostas. Agora o dono e os editores do projeto também veem.
-- Leitores não veem (as respostas têm os nomes da turma).
drop policy if exists pulpito_aulas_projeto on public.aulas_ao_vivo;
create policy pulpito_aulas_projeto on public.aulas_ao_vivo for select to authenticated
  using (public.pulpito_papel_projeto(mensagem_id) in ('dono','editor'));
drop policy if exists pulpito_aulas_dono_apaga on public.aulas_ao_vivo;
create policy pulpito_aulas_dono_apaga on public.aulas_ao_vivo for delete to authenticated
  using (public.pulpito_papel_projeto(mensagem_id) = 'dono');

drop policy if exists pulpito_respostas_projeto on public.respostas;
create policy pulpito_respostas_projeto on public.respostas for select to authenticated
  using (exists (select 1 from public.aulas_ao_vivo a
                 where a.id = aula_id and public.pulpito_papel_projeto(a.mensagem_id) in ('dono','editor')));

notify pgrst, 'reload schema';
