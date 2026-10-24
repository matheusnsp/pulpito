# Púlpito — compartilhamento de projetos

Esta atualização adiciona colaboração por **projeto** (registro em `mensagens`, com seus tópicos e slides). Não compartilha toda a conta, pastas privadas, agenda ou biblioteca.

## Instalação

1. Faça um backup do código e do banco de dados.
2. **Obrigatório:** execute `supabase/migrations/20261020224000_compartilhamento.sql` no **SQL Editor** do seu projeto Supabase (ou use `supabase db push` se a CLI já estiver vinculada ao projeto e suas migrações estiverem em ordem).
3. Rode `npm run build`, faça commit e publique o app.
4. Teste com duas contas distintas: convite de leitura, convite de edição, expiração, revogação e acesso direto por URL.

**Atenção ao esquema legado:** o código-fonte original não traz a migração que criou `mensagens`, `topicos` e `slides`. A migração procura a coluna UUID do proprietário em `usuario_id`, `user_id`, `dono_id`, `dono`, `owner_id`, `criado_por`, `autor_id` ou `proprietario_id`. Se não encontrar, ela para, em vez de atribuir projetos à pessoa errada. Identifique a coluna real e faça o mapeamento no SQL antes de aplicar.

## Como usar

- No menu ⋯ de uma mensagem própria ou no editor, escolha **Compartilhar projeto**.
- Defina **Editar** ou **Somente visualizar**, escolha 1/5/20 usos e gere um convite.
- Envie o link; ou envie o código para quem vai ao menu **Convites** do app.
- A outra pessoa entra com a **própria conta** e aceita o convite.
- O dono vê participantes, troca permissões, bloqueia/reabilita acessos e revoga convites.
- O compartilhamento é por projeto. Leitores recebem uma tela dedicada de leitura; editores usam os editores existentes.

## Segurança e limitações

- Convites duram 7 dias, são gerados aleatoriamente e armazenados apenas como hash SHA-256.
- As permissões são verificadas no banco por **Row Level Security** (RLS) para `mensagens`, `topicos` e `slides`, além do bloqueio visual no app.
- Uma pessoa bloqueada não pode reutilizar um convite antigo; links revogados não aceitam novas pessoas. Para cortar acesso completamente, **bloqueie a pessoa** e, se necessário, **revogue convites ainda ativos**.
- Esta entrega **não inclui cursores ao vivo, travas por campo, mesclagem de alterações simultâneas ou histórico de versões**. Duas pessoas podem editar o mesmo projeto, mas podem sobrescrever um campo se o alterarem ao mesmo tempo. Reabra a página para receber alterações remotas.
- Revisar separadamente as políticas antigas de `storage`, `eventos`, `aulas_ao_vivo` e `respostas`, caso seja desejado incluir esses dados no compartilhamento. Este módulo cobre conteúdo do projeto e slides.
- Como proteção extra, faça auditoria das políticas existentes de RLS e privilégios de tabelas antes do deploy em produção.
