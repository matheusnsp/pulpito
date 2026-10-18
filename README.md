# Pulpito

Prepare, pregue e projete suas mensagens. App web instalável (PWA) para celular, tablet e computador.

## O que faz

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

## Visual

Paleta quente com destaque âmbar, definida em `src/index.css`:

- `--acao` é a cor de preenchimento (botões, seleção); `--tinta` é a cor de texto de destaque (links, referências).
- Tema claro para preparar, escuro para pregar. O modo pregação e o telão são sempre escuros.
- Fontes: Plus Jakarta Sans (títulos), Atkinson Hyperlegible Next (interface) e Literata (texto bíblico).
