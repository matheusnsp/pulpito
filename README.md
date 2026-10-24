# Pulpito

Prepare, pregue e projete suas mensagens. App web instalável (PWA) para celular, tablet e computador.

Versão **2.1.0**. Idealizado e criado por **[Matheus Neves](https://www.matheusnsp.com.br)** ([@matheusnsp](https://github.com/matheusnsp)).

## O que faz

- **Palavra | Estudos**: dois lados no mesmo app. Na Palavra, pregação, célula, estudo bíblico (EBD), devocional e discipulado; em Estudos, aula de curso, palestra e treinamento sobre qualquer assunto.
- **Blocos** (explicação, pergunta, atividade, lista, citação, definição, referência, imagem e link), que podem ser misturados aos tópicos.
- **Respostas ao vivo**: a turma entra pelo celular com um código, responde perguntas abertas (mural) e de múltipla escolha (quiz com placar), e tudo fica guardado, com exportação em planilha.
- **Folha impressa** em PDF e **banco de perguntas** reaproveitáveis.
- **Colaboração**: convite por link ou código (editar ou só ver), presença de quem está no projeto e mudanças chegando na hora.
- **Lixeira** de 30 dias e **histórico de versões** com restaurar.
- **Séries** com progresso, **modelos próprios**, **tempo por item** no modo pregação e **esboço em PDF**.
- **Mensagens** em tópicos, com versículo, observação, aplicação, ilustração, frase-chave e notas. Pastas com arrastar e soltar, busca (atalho `/`), duplicar e desfazer exclusão.
- **Editor** com salvamento automático, desfazer/refazer (`Ctrl/Cmd + Z`), prévia do versículo enquanto digita e **esboço** pronto para copiar ou compartilhar no WhatsApp.
- **Modo pregação** com cronômetro (amarelo na metade, vermelho em 80%, moldura piscando ao estourar), mapa de tópicos para pular direto, prévia do próximo tópico, tela sempre acesa e passador de slides (setas, `PageUp/PageDown`, espaço para o cronômetro).
- **Telão** sincronizado pelo celular via código de 6 dígitos ou QR Code (`/projetar` no computador do projetor).
- **Slides** personalizados por tópico, com importação de PowerPoint e PDF.
- **Bíblia** ARA, ARC e NAA, offline: seletor de livro e capítulo, deslizar para trocar de capítulo, tamanho da letra, selecionar versículos para copiar, compartilhar ou marcar.
- **Agenda** com calendário, compromissos ligados às mensagens e assinatura no calendário do celular.

## Rodar localmente

```bash
cp .env.example .env   # preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

`npm run build` gera a versão de produção em `dist/` (deploy na Vercel, ver `vercel.json`).

`npm test` roda os testes das bibliotecas puras (Vitest). O CI do GitHub roda tipos, lint, testes e build em todo push.

## Subir do zero (Supabase)

O banco inteiro está em `supabase/migrations`: a migração base tem tabelas, RLS, funções, triggers e o bucket
de fotos; as seguintes são incrementais. Num projeto Supabase novo:

```bash
npm i -g supabase            # ou npx supabase
supabase login
supabase link --project-ref SEU_REF
supabase db push             # aplica as migrações
supabase functions deploy agenda-ics --no-verify-jwt
supabase functions deploy limpar-fotos --no-verify-jwt
```

Para rodar tudo na sua máquina, `supabase start` sobe Postgres, Auth e Storage locais com as mesmas migrações
(ver `supabase/config.toml`); aponte o `.env` para as URLs que o comando imprime.

As Edge Functions ficam em `supabase/functions`:

- **agenda-ics**: feed `.ics` da agenda por token, para assinar no calendário do celular.
- **limpar-fotos**: apaga do bucket `fundos` as fotos que não estão em nenhum slide há mais de um dia.
  Espera o cabeçalho `x-cron-secret` igual ao segredo `CRON_SECRET` da função; agende a chamada
  (pg_cron ou cron externo) se quiser que rode sozinha.

## Colaboração

O compartilhamento é por projeto. Convite por link ou código, com permissão de editar ou só ver, 1 a 20 usos
e validade de 7 dias; o código fica guardado só como hash. As permissões valem no banco, por RLS: o dono faz tudo,
o editor edita conteúdo e slides mas não exclui, não move de pasta nem muda o dono; o leitor só lê; quem foi
bloqueado perde o acesso, inclusive ao que criou. Edições simultâneas no mesmo campo seguem "a última salva vence".

## Planos

Gratuito: até 5 mensagens ativas, Bíblia, modo pregação, esboço e exportar os dados. Premium (R$ 9,90/mês ou
R$ 89/ano): mensagens ilimitadas, slides e telão, respostas ao vivo, colaboração, histórico de versões, agenda e
exportação em planilha. Conta nova ganha 14 dias de Premium. Quando o Premium acaba, nada é apagado: a pessoa
continua lendo tudo, só não cria nem edita o que é Premium. Em projeto compartilhado vale o plano do dono.

As regras valem no banco, por RLS e pela função `eh_premium`; a interface só mostra e orienta. Preços, textos e o
contato do botão Assinar ficam em `src/lib/planoInfo.ts` (`CONTATO_ASSINATURA` é o e-mail que recebe os pedidos).

Ativar o Premium de alguém, no SQL Editor do Supabase:

```sql
select ativar_premium('pessoa@exemplo.com', 12);   -- 12 meses; soma se já tiver
select ativar_premium('pessoa@exemplo.com', null); -- sem vencimento
```

## Login, e-mail e senha

As contas são criadas com e-mail real, e a pessoa recupera a senha sozinha em `/recuperar-senha`.
Contas antigas, criadas só com usuário (`nome.sobrenome`), continuam entrando normalmente e veem em
Ajustes um convite para adicionar um e-mail. No painel do Supabase, em **Authentication**:

- **URL Configuration**: Site URL é o endereço do app; em Redirect URLs, adicione o endereço do app e `…/nova-senha` e `…/ajustes`.
- **Providers › Email**: deixe *Secure email change* **desligado**. Contas antigas têm um e-mail interno que não recebe mensagens, então só o e-mail novo pode confirmar a troca.
- **Providers › Google** (opcional): ligue o provedor com as credenciais OAuth do Google Cloud e coloque `VITE_LOGIN_GOOGLE=1` no `.env`. Sem isso o botão não aparece.
- **Email Templates**: traduza os modelos de confirmação e redefinição de senha; os textos padrão são em inglês.

Em Ajustes, **Baixar meus dados** gera um JSON com tudo o que a pessoa criou.

## Visual

Paleta quente com destaque âmbar, definida em `src/index.css`:

- `--acao` é a cor de preenchimento (botões, seleção); `--tinta` é a cor de texto de destaque (links, referências).
- Tema claro para preparar, escuro para pregar. O modo pregação e o telão são sempre escuros.
- Fontes: Plus Jakarta Sans (títulos), Atkinson Hyperlegible Next (interface) e Literata (texto bíblico).

## Autor

**Matheus Neves** — idealização, design e desenvolvimento.

- Site: [matheusnsp.com.br](https://www.matheusnsp.com.br)
- GitHub: [@matheusnsp](https://github.com/matheusnsp)
- LinkedIn: [in/matheusnsp](https://linkedin.com/in/matheusnsp)

© 2026 Matheus Neves. Todos os direitos reservados.
