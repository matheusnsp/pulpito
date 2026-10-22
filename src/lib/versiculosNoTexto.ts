import { parseReferencia } from './biblia'

/*
  Versículo no meio do texto: dentro da observação, ilustração, aplicação ou do texto de um bloco,
  uma referência entre colchetes, como [1Co 13:4-5], vira o versículo por extenso
  (no editor, no modo pregação, nos slides e nos PDFs). Colchetes que não são referência ficam como texto.
*/

export type ParteTexto = { tipo: 'texto'; texto: string } | { tipo: 'versiculo'; ref: string }

const MARCA = /\[([^[\]\n]{3,60})\]/g

export function partesDoTexto(texto: string | null | undefined): ParteTexto[] {
  const t = texto ?? ''
  const partes: ParteTexto[] = []
  let desde = 0
  for (const m of t.matchAll(MARCA)) {
    const ref = m[1].trim()
    if (!parseReferencia(ref)) continue
    const antes = t.slice(desde, m.index)
    if (antes.trim()) partes.push({ tipo: 'texto', texto: antes.trim() })
    partes.push({ tipo: 'versiculo', ref })
    desde = (m.index ?? 0) + m[0].length
  }
  const resto = t.slice(desde)
  if (resto.trim()) partes.push({ tipo: 'texto', texto: resto.trim() })
  return partes
}

export const referenciasNoTexto = (texto: string | null | undefined) =>
  partesDoTexto(texto).flatMap((p) => (p.tipo === 'versiculo' ? [p.ref] : []))
