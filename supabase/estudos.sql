-- Modo Estudos do Pulpito
-- Cole no Supabase: SQL Editor > New query > Run. Pode rodar mais de uma vez sem problema.

-- Tipo do projeto: pregação (como sempre foi) ou estudo
alter table public.mensagens
  add column if not exists tipo text not null default 'pregacao',
  add column if not exists detalhes jsonb not null default '{}'::jsonb; -- objetivo, público, material, referências

-- Cada tópico vira um "bloco" com tipo (explicação, pergunta, atividade…) e dados extras (minutos, link…)
alter table public.topicos
  add column if not exists tipo text not null default 'topico',
  add column if not exists extra jsonb not null default '{}'::jsonb;

-- Garante valores válidos
do $$ begin
  alter table public.mensagens add constraint mensagens_tipo_valido check (tipo in ('pregacao', 'estudo'));
exception when duplicate_object then null; end $$;

-- Atualiza o cache da API para enxergar as colunas novas na hora
notify pgrst, 'reload schema';
