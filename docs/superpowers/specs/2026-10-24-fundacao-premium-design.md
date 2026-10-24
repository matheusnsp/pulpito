# Pulpito premium — Parte 1: Fundação

Data: 2026-10-24. Branch: `premium/fundacao`.

## Objetivo

Transformar o Pulpito de app pessoal em produto que pastores, professores de EBD e líderes
de célula paguem para usar. A parte 1 cria a base de confiança sem a qual não faz sentido cobrar.
Planos, cobrança e página de vendas ficam para as partes 2 e 3.

## Decisões já tomadas

- Cobrança só depois da fundação. A parte 2 terá a tabela de assinaturas com Premium ativado
  manualmente no Supabase; o provedor de pagamento entra depois, numa Edge Function.
- Divisão proposta: Gratuito tem até 5 mensagens, Bíblia completa, modo pregação e esboço.
  Premium libera mensagens ilimitadas, slides e telão, respostas ao vivo, colaboração,
  histórico de versões, agenda e exportação em planilha.
- O schema real vem de `pg_dump --schema-only` do projeto de produção, lido pela variável de
  ambiente `SUPABASE_DB_URL` (segredo do ambiente, nunca no repositório).

## Escopo da parte 1

### 1. Schema no repositório
- `supabase/migrations/00000000000000_base.sql`: dump do schema atual (tabelas, constraints,
  índices, RLS, políticas, funções, triggers, publicação realtime, buckets e políticas de storage).
- `supabase/estudos.sql` e `supabase/aula-ao-vivo.sql` já estão aplicados em produção e passam
  a fazer parte do dump; os arquivos soltos são removidos.
- `supabase/config.toml` para rodar `supabase start` localmente.
- README: seção "Subir do zero" com os passos para um projeto Supabase limpo.

### 2. Login de verdade
- Criar conta pede e-mail real; o nome de usuário vira nome de exibição (`user_metadata.nome`).
- Fluxo "esqueci minha senha": `/recuperar-senha` envia o e-mail; `/nova-senha` define a nova.
- Botão "Entrar com Google" (provedor configurado pelo dono no painel do Supabase; instruções no README).
- Contas antigas `@pulpito.local` continuam entrando pelo usuário. Em Ajustes, aviso para
  adicionar um e-mail real via `supabase.auth.updateUser({ email })`.

### 3. Exportar meus dados
- Em Ajustes, botão "Baixar meus dados" gera um JSON com mensagens, tópicos, slides, pastas,
  eventos, aulas ao vivo e respostas do usuário logado. Somente leitura, sem importação nesta parte.

### 4. Testes e CI
- Vitest nas bibliotecas puras: `biblia` (parse e formatação de referências), `versiculosNoTexto`,
  `usuario`, `blocos`.
- GitHub Actions em push e pull request: `npm ci`, `tsc -b`, `eslint`, `vitest run`, `vite build`.
- Node fixado em 22.13+ via `.nvmrc` e `engines` no package.json (exigência atual das dependências).

### 5. Limpeza
- Remover `redesign-1.sh` (vazio).
- README-COLABORACAO deixa de citar `instalar_compartilhamento.py`, que não existe.
- `.claude/settings.json` com permissão para `npm ci`, `npm run build`, `npm run lint`, `npm test`.

## Fora de escopo
Planos e cobrança, página pública, onboarding, Edge Functions de push e agenda, redução do bundle,
mesclagem de edições simultâneas.

## Critério de pronto
Um projeto Supabase novo sobe com as migrações do repositório e o app funciona nele; CI verde;
uma conta nova é criada com e-mail real e recupera a senha; o JSON exportado contém tudo o que o
usuário criou.
