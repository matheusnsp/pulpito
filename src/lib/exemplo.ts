import { supabase } from './supabase'

/*
  Mensagem de exemplo para quem acabou de chegar: um esboço curto e real, com texto base,
  três tópicos preenchidos e frase-chave, para a pessoa ver o resultado antes de escrever.
  Criada só quando ela toca em "Ver um exemplo pronto"; pode ser apagada como qualquer outra.
*/
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
