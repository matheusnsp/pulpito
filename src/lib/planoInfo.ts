/*
  O que cada plano inclui, preços e textos. Tudo que é decisão de produto mora aqui,
  para mudar num lugar só. A regra de verdade está no banco (eh_premium, políticas).
*/
export type Plano = 'gratuito' | 'premium'
export type StatusPlano = 'ativa' | 'teste' | 'cancelada'

export type EstadoPlano = {
  plano: Plano
  status: StatusPlano
  valida_ate: string | null
  premium: boolean
  mensagens_ativas: number
  limite: number
}

export const PLANO_PADRAO: EstadoPlano = { plano: 'gratuito', status: 'ativa', valida_ate: null, premium: false, mensagens_ativas: 0, limite: 5 }

export const PRECOS = { mensal: 9.9, anual: 89 }
export const DIAS_TESTE = 14

/* WhatsApp do dono, só dígitos com DDD (ex.: 5521999999999). Vazio: a página aponta para o site do autor. */
export const CONTATO_ASSINATURA = ''

export type RecursoPremium = 'mensagens' | 'slides' | 'respostas' | 'colaboracao' | 'historico' | 'agenda' | 'planilha'

export const RECURSOS_PREMIUM: { id: RecursoPremium; nome: string; texto: string }[] = [
  { id: 'mensagens', nome: 'Mensagens ilimitadas', texto: 'No Gratuito são até 5 mensagens ativas.' },
  { id: 'slides', nome: 'Slides e telão', texto: 'Slides por tópico, fotos, importação de PowerPoint e telão pelo celular.' },
  { id: 'respostas', nome: 'Respostas ao vivo', texto: 'A turma responde pelo celular; mural, quiz e placar.' },
  { id: 'colaboracao', nome: 'Colaboração', texto: 'Convide pessoas para editar ou ver o projeto, com presença ao vivo.' },
  { id: 'historico', nome: 'Histórico de versões', texto: 'Volte para como a mensagem estava em qualquer momento.' },
  { id: 'agenda', nome: 'Agenda', texto: 'Compromissos ligados às mensagens e assinatura no calendário do celular.' },
  { id: 'planilha', nome: 'Exportar respostas', texto: 'Planilha com quem respondeu o quê, por aula.' },
]

export const GRATUITO_INCLUI = [
  'Até 5 mensagens ativas', 'Bíblia ARA, ARC e NAA offline', 'Modo pregação com cronômetro',
  'Esboço para copiar e PDF', 'Modelos prontos', 'Baixar seus dados a qualquer hora',
]

export const formatarPreco = (valor: number) =>
  valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

/* Dias inteiros até o vencimento; 0 se já venceu ou não há vencimento */
export function diasRestantes(validaAte: string | null | undefined, agora = new Date()) {
  if (!validaAte) return 0
  const ms = new Date(validaAte).getTime() - agora.getTime()
  return ms <= 0 ? 0 : Math.ceil(ms / 86_400_000)
}

export const emTeste = (p: EstadoPlano) => p.premium && p.status === 'teste'

export const mensagensRestantes = (p: EstadoPlano) =>
  p.premium ? Infinity : Math.max(0, p.limite - p.mensagens_ativas)

export const podeCriarMensagem = (p: EstadoPlano) => mensagensRestantes(p) > 0

/* Link do botão Assinar: WhatsApp com mensagem pronta, ou nulo quando o contato não foi definido */
export function linkAssinar(periodo: 'mensal' | 'anual', nome: string, email: string | null) {
  if (!CONTATO_ASSINATURA) return null
  const texto = `Olá! Quero assinar o Pulpito Premium (${periodo === 'anual' ? 'anual' : 'mensal'}, ${formatarPreco(PRECOS[periodo])}). Minha conta: ${nome}${email ? ` (${email})` : ''}.`
  return `https://wa.me/${CONTATO_ASSINATURA}?text=${encodeURIComponent(texto)}`
}
