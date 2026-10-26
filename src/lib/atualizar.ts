/*
  Atualização do app.
  - verificarVersao: pergunta ao servidor (/versao.json, nunca guardado) qual é a versão mais nova.
  - aplicarAtualizacao: usa o service worker novo, se já baixou; senão, faz a limpeza completa.
  - carregarUltimaVersao: limpeza completa — desliga o service worker, apaga as cópias guardadas e recarrega.
  O login, o tema e as mensagens não são afetados.
*/

export const VERSAO_APP = __VERSAO_APP__
export const ID_BUILD = __ID_BUILD__
export const NUMERO_VERSAO = __NUMERO_VERSAO__ // ex.: 2.0.0 (vem do package.json)

export type InfoVersao = { id: string; versao: string; numero?: string }

export async function verificarVersao(): Promise<{ nova: boolean; remota: InfoVersao } | null> {
  try {
    const r = await fetch(`/versao.json?t=${Date.now()}`, { cache: 'no-store' })
    if (!r.ok) return null
    const remota = (await r.json()) as InfoVersao
    if (!remota?.id) return null
    return { nova: Number(remota.id) > Number(ID_BUILD), remota }
  } catch {
    return null
  }
}

/* Pede ao navegador para baixar o service worker novo, se houver */
export async function buscarServiceWorkerNovo() {
  try {
    const regs = await navigator.serviceWorker?.getRegistrations() ?? []
    await Promise.all(regs.map((r) => r.update()))
  } catch { /* sem service worker */ }
}

/* Espera no máximo "ms": o Safari às vezes nunca responde ao desligar o service worker */
const noMaximo = <T,>(p: Promise<T>, ms: number) => Promise.race([p, new Promise<void>((ok) => setTimeout(ok, ms))])

export async function carregarUltimaVersao() {
  try {
    const registros = await noMaximo(navigator.serviceWorker?.getRegistrations() ?? Promise.resolve([]), 1500) ?? []
    await noMaximo(Promise.all((registros as ServiceWorkerRegistration[]).map((r) => r.unregister())), 1500)
  } catch { /* navegador sem service worker */ }
  try {
    const nomes = await noMaximo(caches.keys(), 1500) ?? []
    // Só apaga o código do app. A Bíblia baixada e a cópia dos dados (supabase-api) ficam:
    // essa cópia é o que permite abrir sem internet e até recuperar algo apagado sem querer.
    await noMaximo(Promise.all((nomes as string[]).filter((n) => n !== 'biblia' && n !== 'supabase-api').map((n) => caches.delete(n))), 1500)
  } catch { /* sem cache */ }
  // Endereço diferente, para o navegador não reaproveitar a página guardada
  const url = new URL(window.location.href)
  url.searchParams.set('v', String(Date.now()))
  window.location.replace(url.toString())
}

/* "18/10/2026, 22:10" → "18 de out., 22:10" */
export function versaoAmigavel(v: string) {
  const m = v.match(/(\d{2})\/(\d{2})\/(\d{4}),?\s*(\d{2}:\d{2})/)
  if (!m) return v
  const mes = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][Number(m[2]) - 1]
  return `${Number(m[1])} de ${mes}, ${m[4]}`
}




/* Novidades recentes, mostradas em Ajustes. A mais nova primeiro. */
export const NOVIDADES: { titulo: string; texto: string }[] = [
  {
    titulo: 'Telas ajustadas a qualquer tamanho',
    texto: 'Tablet, celular pequeno e computador: as páginas agora se organizam pela largura que sobra ao lado do menu. Nada de ícones cortados ou colunas apertadas.'
  },
  {
    titulo: 'Anotações por slide',
    texto: 'Em Slides, cada slide ganha um campo de anotações só para você, inclusive os importados de PDF e PowerPoint. Aparecem no celular no modo pregação e nas notas ao exportar.'
  },
  {
    titulo: 'Formato Livre',
    texto: 'Escreva do zero, sem campos. É a primeira opção ao criar, nos dois lados. Uma linha com # vira o título de uma parte; na Palavra, [Jo 3:16] traz o versículo.'
  },
  {
    titulo: 'Mais simples de começar',
    texto: 'Nova mensagem abre direto no editor. Texto base e tópicos primeiro; tempo, pasta e série ficam em Detalhes. Slides em um botão.'
  },
  {
    titulo: 'Entrar com e-mail e recuperar a senha',
    texto: 'Conta nova pede e-mail de verdade. Esqueceu a senha? Peça o link em Entrar. Quem tem conta antiga adiciona o e-mail em Ajustes.'
  },
  {
    titulo: 'Planos Gratuito e Premium',
    texto: 'Gratuito com até 5 mensagens, Bíblia e modo pregação. Premium libera slides, telão, respostas ao vivo, colaboração e agenda. Conta nova ganha 14 dias.'
  },
  {
    titulo: 'Seus dados são seus',
    texto: 'Em Ajustes, baixe tudo o que você criou em um arquivo. E, se quiser, exclua a conta por lá mesmo.'
  },
  {
    titulo: 'Lixeira e histórico',
    texto: 'O que você exclui fica 30 dias na lixeira. E cada projeto guarda versões: dá para voltar a como estava ontem.'
  },
  {
    titulo: 'Edição ao vivo, modelos e séries',
    texto: 'Veja quem está no projeto e receba as mudanças na hora. Salve seus próprios modelos e organize mensagens em séries com progresso.'
  },
  {
    titulo: 'Tempo por item e PDF do esboço',
    texto: 'No modo pregação, o tempo de cada tópico aparece ao lado do previsto. No editor, ⋯ › Baixar esboço em PDF.'
  },
  {
    titulo: 'Compartilhamento de projetos',
    texto: 'Nova área para convidar colaboradores por link ou código, definir permissões de edição ou visualização e gerenciar acessos. Em fase de ativação.'
  },
  {
    titulo: 'Palavra, Estudos e slides aprimorados',
    texto: 'Novos formatos, blocos personalizados, múltiplas referências bíblicas e geração de slides, esboços e materiais de estudo.'
  },
  {
    titulo: 'Interatividade ao vivo',
    texto: 'Perguntas, quizzes e mural de respostas no telão, com QR Code, participação anônima e recursos para aulas e pregações.'
  },
]
