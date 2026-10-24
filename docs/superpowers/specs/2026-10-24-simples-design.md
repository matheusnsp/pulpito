# Pulpito simples — Parte 3: "três toques até pregar"

Data: 2026-10-24. Público: pastor ou pregador com pouca intimidade com tecnologia, no celular.
Auditoria feita com conta nova em viewport 390×844 (prints em sessão). Aprovado pelo dono em 2026-10-24.

## Princípio
A pessoa escreve e prega sem configurar nada. O resto aparece quando ela procura. Nada some, muda de lugar.

## Entrega A — início, criar e primeiro acesso (`premium/simples-a`)
1. Tutorial não abre sozinho. Continua em Ajustes › Ver tutorial.
2. Estado vazio do Início vira guia de 3 passos (texto base, tópicos, Pregar) com um botão "Nova mensagem"
   e o link "Outros formatos" (célula, EBD, devocional, estudos) que abre a folha antiga.
3. "Nova mensagem" cria uma pregação na hora e abre o editor (hook `useCriarRapido`). Limite do Gratuito
   atingido: abre a folha, que já mostra o aviso.
4. Aba Palavra | Estudos só aparece quando existe algum estudo (ou a pessoa está no lado Estudos).
5. No celular: sai o painel Resumo/Acesso rápido/Compromissos (repete a barra de baixo); "Continue de onde
   parou" só com 4+ mensagens; busca só com 6+; pastas só quando existe pasta ou 6+ mensagens; um botão de
   criar por vez (sem FAB quando a lista está vazia). Computador mantém a coluna lateral.
6. Telas Premium não mostram "Conferindo seu plano" para quem é Premium.

## Entrega B — editor (`premium/simples-b`)
Topo: voltar, título, Pregar. Texto base e tópicos primeiro. Tempo/pasta/série/agenda numa linha
"Detalhes" que expande. Tópico nasce com título, versículo e anotações; demais campos por "+ Adicionar".
Desfazer/refazer, compartilhar e ações no menu de três pontos. Blocos de estudo só no lado Estudos.

## Entrega C — slides (`premium/simples-c`)
Tela vazia com um botão "Criar slides desta mensagem" e miniatura. Tamanho do texto e "revelar aos poucos"
viram ajuste dentro do editor de slides, depois que existe slide.
