import type { Elemento } from './tipos'

export type AcaoElemento = 'frente' | 'tras' | 'topo' | 'fundo' | 'duplicar' | 'excluir' | 'copiarEstilo' | 'colarEstilo' | 'trocarFoto'
export type AlinharNoSlide = 'esq' | 'centroH' | 'dir' | 'topo' | 'meio' | 'base' | 'inteiro'

/* Campos que formam o "estilo" de um elemento (copiar/colar estilo) */
export const CAMPOS_ESTILO: (keyof Elemento)[] = [
  'cor', 'cor2', 'preenchido', 'borda', 'corBorda', 'raio', 'opac', 'sombra', 'fonte', 'tam', 'peso', 'italico',
  'sublinhado', 'alinh', 'alinhV', 'entrelinha', 'espaco', 'caixaAlta', 'destaque', 'contorno', 'faixa',
  'forma', 'brilho', 'contraste', 'pb', 'desfoque',
]

