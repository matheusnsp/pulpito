# Pulpito

Prepare, pregue e projete suas mensagens. App web instalável (PWA) para celular, tablet e computador.

Versão **2.0.0**. Idealizado e criado por **[Matheus Neves](https://www.matheusnsp.com.br)** ([@matheusnsp](https://github.com/matheusnsp)).

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
