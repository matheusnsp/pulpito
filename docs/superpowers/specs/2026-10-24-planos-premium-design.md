# Pulpito premium — Parte 2: Planos

Data: 2026-10-24. Branch: `premium/planos`. Depende da parte 1 (publicada).

## Decisões
- Gratuito: até 5 mensagens ativas, Bíblia, modo pregação, esboço, exportar meus dados.
- Premium: mensagens ilimitadas, slides e telão, respostas ao vivo, colaboração, histórico de versões,
  agenda, exportação em planilha. Preço: R$ 9,90/mês ou R$ 89/ano (em `src/lib/planoInfo.ts`).
- Conta nova ganha 14 dias de Premium (status `teste`). Ao vencer, cai para Gratuito sem perder nada:
  continua lendo tudo, só não cria nem edita o que é Premium.
- Em projeto compartilhado, o plano do dono do projeto manda: editor gratuito trabalha nos slides de um dono Premium.
- Cobrança manual nesta etapa: botão "Assinar" abre um e-mail para `CONTATO_ASSINATURA` com assunto e
  mensagem prontos (vazia, a página aponta para o site do autor). O dono ativa com `select ativar_premium('email', 12)`.
- Contas existentes na data da migração: Premium por 12 meses, origem `cortesia`.

## Banco (`20261024190000_assinaturas.sql`)
- `assinaturas(user_id pk, plano, status, valida_ate, origem, referencia, criado_em, atualizado_em)`; RLS: só leitura da própria linha.
- `eh_premium(uuid)`, `projeto_premium(mensagem_id)`, `mensagens_ativas(uuid)`, `plano_atual()` (json para a UI), `ativar_premium(email, meses)` (só painel).
- Trigger em `auth.users` cria o teste de 14 dias. Políticas restritivas: inserir mensagem (limite), slides, aulas ao vivo, eventos; `pulpito_criar_convite` exige Premium do dono.

## App
- `PlanoProvider`/`usePlano()` lê `plano_atual()` ao entrar e ao voltar para a aba.
- `SoPremium` envolve as rotas Premium e mostra a tela "Recurso Premium" quando não há plano.
- `CriarNovo` bloqueia a 6ª mensagem com aviso e link para `/assinatura`.
- `/assinatura`: plano atual, dias restantes do teste, recursos, preços, botão.
- Ajustes: selo do plano. Início: faixa de teste terminando ou limite perto.

## Fora de escopo
Provedor de pagamento, cupons, plano por igreja, admin visual.
