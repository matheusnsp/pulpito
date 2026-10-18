export type Mensagem = {
  id: string
  titulo: string
  texto_base: string | null
  tempo_minutos: number
  pasta_id: string | null
  criado_em: string
  atualizado_em: string
}

export type Topico = {
  id: string
  mensagem_id: string
  ordem: number
  titulo: string
  versiculo: string | null
  observacao: string | null
  aplicacao: string | null
  ilustracao: string | null
  frase_chave: string | null
  notas: string | null
}

export const CAMPOS_TOPICO = [
  { chave: 'frase_chave', rotulo: 'Frase-chave', dica: 'A frase que resume o ponto' },
  { chave: 'observacao', rotulo: 'Observação', dica: 'O que o texto diz' },
  { chave: 'aplicacao', rotulo: 'Aplicação', dica: 'Como isso se aplica à vida' },
  { chave: 'ilustracao', rotulo: 'Ilustração', dica: 'História, exemplo ou comparação' },
  { chave: 'notas', rotulo: 'Notas pessoais', dica: 'Lembretes só para você' },
] as const satisfies readonly { chave: keyof Topico; rotulo: string; dica: string }[]

export type Evento = {
  id: string
  titulo: string
  local: string | null
  inicio: string
  mensagem_id: string | null
  lembretes: number[]
}

export const OPCOES_LEMBRETE = [
  { minutos: 1440, rotulo: '1 dia antes' },
  { minutos: 180, rotulo: '3 horas antes' },
  { minutos: 60, rotulo: '1 hora antes' },
  { minutos: 15, rotulo: '15 min antes' },
]

export type Pasta = {
  id: string
  nome: string
}

export type EstiloSlide = {
  cor: string
  alinhamento: 'left' | 'center'
  tamanho: 'p' | 'm' | 'g'
  fonte: 'sans' | 'serif'
  escurecer: number // 0 a 0.8, usado só com imagem de fundo
  ajuste: 'cobrir' | 'conter' // foto preenche o slide ou aparece inteira
  layout?: LayoutSlide // como o conteúdo é arrumado (slides gerados a partir dos tópicos)
  destaque?: string // cor de destaque (referências, faixa, aspas)
}

export type LayoutSlide = 'livre' | 'capa' | 'topico' | 'versiculo' | 'frase'

export const ESTILO_PADRAO: EstiloSlide = {
  cor: '#ffffff', alinhamento: 'center', tamanho: 'm', fonte: 'sans', escurecer: 0.45, ajuste: 'cobrir',
}

export type Slide = {
  id: string
  mensagem_id: string
  topico_id: string | null
  ordem: number
  titulo: string | null
  subtitulo: string | null
  texto: string | null
  fundo: string | null // cor, degradê CSS ou "img:URL"
  estilo: Partial<EstiloSlide>
}

export const FUNDOS_PRONTOS = [
  { nome: 'Noite dourada', valor: 'radial-gradient(120% 90% at 85% 110%, #3A2800 0%, #120D02 45%, #050505 100%)' },
  { nome: 'Preto', valor: '#000000' },
  { nome: 'Grafite', valor: '#1c1c1e' },
  { nome: 'Azul noite', valor: 'linear-gradient(135deg, #0f172a, #1e3a8a)' },
  { nome: 'Vinho', valor: 'linear-gradient(135deg, #2a0a12, #7f1d1d)' },
  { nome: 'Floresta', valor: 'linear-gradient(135deg, #052e16, #166534)' },
  { nome: 'Aurora', valor: 'linear-gradient(135deg, #1e1b4b, #6d28d9 55%, #db2777)' },
  { nome: 'Areia', valor: 'linear-gradient(135deg, #fef3c7, #fde68a)' },
  { nome: 'Branco', valor: '#ffffff' },
]