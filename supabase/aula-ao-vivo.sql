-- Respostas ao vivo do Pulpito (modo aula)
-- Cole no Supabase: SQL Editor > New query > Run. Pode rodar mais de uma vez sem problema.
-- Precisa ter rodado antes o supabase/estudos.sql.

-- Uma "aula ao vivo" por vez que o professor abre as respostas
create table if not exists public.aulas_ao_vivo (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  mensagem_id uuid not null references public.mensagens(id) on delete cascade,
  dono uuid not null default auth.uid() references auth.users(id) on delete cascade,
  mostrar_respostas boolean not null default true, -- alunos veem as respostas dos outros no celular
  aberta boolean not null default true,
  criado_em timestamptz not null default now(),
  encerrada_em timestamptz
);
create index if not exists aulas_ao_vivo_mensagem on public.aulas_ao_vivo (mensagem_id, criado_em desc);

-- Cada resposta de um aluno a um bloco (pergunta ou atividade)
create table if not exists public.respostas (
  id uuid primary key default gen_random_uuid(),
  aula_id uuid not null references public.aulas_ao_vivo(id) on delete cascade,
  bloco_id uuid not null references public.topicos(id) on delete cascade,
  participante uuid not null, -- número gerado no celular do aluno (sem login)
  nome text not null check (char_length(nome) between 1 and 60),
  texto text check (char_length(texto) <= 1000),
  opcao int, -- múltipla escolha: índice da opção escolhida
  oculta boolean not null default false, -- o professor pode esconder uma resposta
  destaque boolean not null default false,
  criado_em timestamptz not null default now(),
  unique (aula_id, bloco_id, participante)
);
create index if not exists respostas_aula on public.respostas (aula_id, bloco_id);

alter table public.aulas_ao_vivo enable row level security;
alter table public.respostas enable row level security;

-- Só o dono vê e mexe nas suas aulas e nas respostas delas
drop policy if exists "dono das aulas" on public.aulas_ao_vivo;
create policy "dono das aulas" on public.aulas_ao_vivo
  for all using (dono = auth.uid()) with check (dono = auth.uid());

drop policy if exists "dono das respostas" on public.respostas;
create policy "dono das respostas" on public.respostas
  for all using (exists (select 1 from public.aulas_ao_vivo a where a.id = aula_id and a.dono = auth.uid()))
  with check (exists (select 1 from public.aulas_ao_vivo a where a.id = aula_id and a.dono = auth.uid()));

-- Alunos (sem login) respondem por esta função: só entra quem tem o código de uma aula aberta.
-- Na múltipla escolha vale a primeira resposta; na pergunta aberta dá para corrigir.
create or replace function public.responder_aula(
  p_codigo text, p_bloco uuid, p_participante uuid, p_nome text, p_texto text default null, p_opcao int default null
) returns void
language plpgsql security definer set search_path = public as $$
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
end $$;

revoke all on function public.responder_aula(text, uuid, uuid, text, text, int) from public;
grant execute on function public.responder_aula(text, uuid, uuid, text, text, int) to anon, authenticated;

notify pgrst, 'reload schema';
