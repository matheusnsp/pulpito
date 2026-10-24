import { supabase } from './supabase'

/*
  Exemplos para quem acabou de chegar, um de cada lado do app: uma pregação curta e uma aula
  sobre um assunto qualquer, com blocos preenchidos, para a pessoa ver o resultado antes de escrever.
  Criados só quando ela toca em "Ver um exemplo pronto"; apagam como qualquer outro.
*/
import type { TipoProjeto } from './tipos'
export const EXEMPLO = {
  titulo: 'Exemplo: O amor que não desiste',
  texto_base: 'Lc 15:11-24',
  tempo_minutos: 30,
  topicos: [
    {
      titulo: 'O filho que se afasta',
      versiculo: 'Lc 15:11-13',
      observacao: 'O filho mais novo pede a herança em vida, como se o pai já tivesse morrido para ele. Vai para longe e gasta tudo. A distância começa no coração, antes dos pés.',
      aplicacao: 'Em que área da vida você tem pedido "a sua parte" e seguido sozinho?',
      frase_chave: 'Ninguém se perde de uma vez; a gente se afasta um passo por dia.',
    },
    {
      titulo: 'O pai que espera',
      versiculo: 'Lc 15:20',
      observacao: 'O pai o viu "ainda longe". Quem vê de longe é quem está olhando a estrada todo dia. Ele corre, abraça e beija antes de qualquer pedido de desculpa.',
      ilustracao: 'Uma mãe que deixa a luz da varanda acesa todas as noites, anos a fio, "caso ele volte".',
      frase_chave: 'Deus não espera você chegar; Ele vem ao seu encontro.',
    },
    {
      titulo: 'A festa do retorno',
      versiculo: 'Lc 15:22-24',
      observacao: 'Veste, anel e sandálias: o pai devolve a dignidade de filho, não a de empregado. "Este meu filho estava morto e reviveu." O céu faz festa por um.',
      aplicacao: 'Dê um passo de volta esta semana: uma oração, uma conversa, um pedido de perdão.',
      frase_chave: 'O arrependimento é o caminho de casa; a graça é a festa que espera.',
    },
  ],
} as const

/* Lado Estudos: aula de educação financeira, montada em blocos (explicação, definição, lista, pergunta, atividade) */
export const EXEMPLO_ESTUDO = {
  titulo: 'Exemplo: Para onde vai o seu dinheiro?',
  tempo_minutos: 50,
  detalhes: { exemplo: true, objetivo: 'Ao final, a turma consegue montar um orçamento simples do mês e escolher uma meta.', publico: 'Jovens e adultos, qualquer nível' },
  blocos: [
    { tipo: 'explicacao', titulo: 'Por que o dinheiro some no fim do mês?', observacao: 'Quase ninguém sabe dizer para onde foi o salário. Não é falta de dinheiro: é falta de um mapa.\n- Gastos pequenos todo dia somam mais do que a conta grande\n- Sem anotar, a memória sempre engana a favor do gasto\n- O primeiro passo é enxergar, não cortar' },
    { tipo: 'definicao', titulo: 'Orçamento', frase_chave: 'do italiano "borsa", bolsa', observacao: 'Um plano de quanto entra e quanto sai, feito antes do mês começar. Não é prisão: é permissão para gastar sem culpa no que foi combinado.' },
    { tipo: 'lista', titulo: 'Os 3 potes', observacao: 'Gastar: contas e o dia a dia (até 70%)\nGuardar: reserva e metas (pelo menos 20%)\nDoar: generosidade planejada (10%)' },
    { tipo: 'pergunta', titulo: 'Qual compra você mais se arrependeu de ter feito?', observacao: 'Peça para 2 ou 3 pessoas contarem. Sem julgamento: todo mundo tem uma.', extra: { minutos: 5 } },
    { tipo: 'pergunta', titulo: 'Se sobrasse R$ 100 hoje, o que você faria?', extra: { minutos: 3, opcoes: ['Gastaria com algo que quero', 'Guardaria para uma meta', 'Pagaria uma dívida', 'Daria para alguém'], correta: 1 } },
    { tipo: 'atividade', titulo: 'Monte o orçamento do seu mês', observacao: 'Em duplas: anote o que entra, liste os gastos fixos e distribua o resto nos 3 potes. Escolha uma meta para guardar.', extra: { minutos: 15 } },
    { tipo: 'explicacao', titulo: 'Para levar', observacao: 'Anotar por 30 dias muda mais do que qualquer planilha. Combine com alguém da turma para se cobrarem na próxima aula.' },
  ],
} as const

export async function criarExemplo(tipo: TipoProjeto): Promise<string> {
  return tipo === 'estudo' ? criarEstudoExemplo() : criarMensagemExemplo()
}

async function criarEstudoExemplo(): Promise<string> {
  const { data, error } = await supabase.from('mensagens').insert({
    titulo: EXEMPLO_ESTUDO.titulo, tipo: 'estudo', tempo_minutos: EXEMPLO_ESTUDO.tempo_minutos, detalhes: EXEMPLO_ESTUDO.detalhes,
  }).select('id').single()
  if (error || !data) throw error ?? new Error('sem dados')
  const { error: e2 } = await supabase.from('topicos').insert(EXEMPLO_ESTUDO.blocos.map((b, i) => ({
    mensagem_id: data.id, ordem: i, tipo: b.tipo, titulo: b.titulo,
    observacao: 'observacao' in b ? b.observacao : null,
    frase_chave: 'frase_chave' in b ? b.frase_chave : null,
    extra: 'extra' in b ? b.extra : {},
  })))
  if (e2) throw e2
  return data.id as string
}

export async function criarMensagemExemplo(): Promise<string> {
  const { data, error } = await supabase.from('mensagens').insert({
    titulo: EXEMPLO.titulo, texto_base: EXEMPLO.texto_base, tempo_minutos: EXEMPLO.tempo_minutos,
    detalhes: { exemplo: true },
  }).select('id').single()
  if (error || !data) throw error ?? new Error('sem dados')
  const { error: e2 } = await supabase.from('topicos').insert(EXEMPLO.topicos.map((t, i) => ({
    mensagem_id: data.id, ordem: i, tipo: 'topico',
    titulo: t.titulo, versiculo: t.versiculo, observacao: t.observacao,
    aplicacao: 'aplicacao' in t ? t.aplicacao : null,
    ilustracao: 'ilustracao' in t ? t.ilustracao : null,
    frase_chave: t.frase_chave,
  })))
  if (e2) throw e2
  return data.id as string
}
