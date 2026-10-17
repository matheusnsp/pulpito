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