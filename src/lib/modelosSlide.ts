import type { Elemento, EstiloSlide } from './tipos'

/*
  Modelos editáveis: em vez de um desenho fixo, cada modelo monta elementos soltos
  (textos, formas, fotos) a partir do conteúdo do slide. Depois de aplicado,
  tudo pode ser movido, redimensionado e estilizado à vontade.
*/

type Conteudo = { titulo?: string | null; subtitulo?: string | null; texto?: string | null }
type Cores = { texto: string; destaque: string; fonteTitulo?: string; fonteTexto?: string }
type Fabrica = (c: Conteudo, k: Cores) => Elemento[]

const id = () => crypto.randomUUID()
const linhas = (t?: string | null) => (t ?? '').split('\n').map((l) => l.replace(/^[-•*]\s*/, '').trim()).filter(Boolean)

const texto = (k: Cores, campos: Partial<Elemento> & { x: number; y: number; w: number; h: number; texto: string }): Elemento => ({
  id: id(), tipo: 'texto', cor: k.texto, destaque: k.destaque, fonte: k.fonteTitulo ?? 'moderna', peso: 800, tam: 4, ...campos,
})
const forma = (tipo: Elemento['tipo'], campos: Partial<Elemento> & { x: number; y: number; w: number; h: number }): Elemento => ({
  id: id(), tipo, ...campos,
})

const tituloGrande: Fabrica = (c, k) => [
  forma('retangulo', { x: 45, y: 26, w: 10, h: 1.6, cor: k.destaque, preenchido: true, raio: 1 }),
  texto(k, { x: 5, y: 30, w: 90, h: 32, texto: c.titulo || 'Título', tam: 6.4, caixaAlta: true, entrelinha: 1.02, espaco: -0.02 }),
  texto(k, { x: 8, y: 65, w: 84, h: 10, texto: c.subtitulo || c.texto?.split('\n')[0] || 'Subtítulo', tam: 2.4, cor: k.destaque, peso: 700 }),
]

const topico: Fabrica = (c, k) => [
  texto(k, { x: 5, y: 20, w: 90, h: 8, texto: c.subtitulo || 'Tópico 1', tam: 1.8, cor: k.destaque, caixaAlta: true, espaco: 0.18 }),
  texto(k, { x: 4, y: 30, w: 92, h: 34, texto: c.titulo || 'Título do tópico', tam: 5.8, caixaAlta: true, entrelinha: 1.04 }),
  texto(k, { x: 6, y: 66, w: 88, h: 13, texto: c.texto || 'Referência', tam: 2.6, cor: k.destaque, peso: 700 }),
]

const tituloTexto: Fabrica = (c, k) => [
  texto(k, { x: 4, y: 3.5, w: 92, h: 13, texto: c.titulo || 'Título', tam: 4.8, alinh: 'left' }),
  forma('retangulo', { x: 4, y: 18, w: 8, h: 1.1, cor: k.destaque, preenchido: true, raio: 1 }),
  texto(k, { x: 4, y: 22, w: 92, h: 74, texto: c.texto || c.subtitulo || 'Escreva o texto aqui', tam: 3.4, peso: 500, alinh: 'left', alinhV: 'top', entrelinha: 1.32, fonte: k.fonteTexto ?? 'moderna' }),
]

const versiculo: Fabrica = (c, k) => [
  texto(k, { x: 4, y: 7, w: 92, h: 69, texto: c.texto || 'Texto do versículo', tam: 3.6, peso: 400, fonte: k.fonteTexto ?? 'classica', entrelinha: 1.4 }),
  forma('linha', { x: 44, y: 76, w: 12, h: 2, cor: k.destaque, borda: 0.3 }),
  texto(k, { x: 10, y: 79, w: 80, h: 9, texto: c.titulo || 'Referência', tam: 2.2, cor: k.destaque }),
]

const citacao: Fabrica = (c, k) => [
  texto(k, { x: 6, y: 4, w: 20, h: 34, texto: '“', tam: 18, cor: k.destaque, fonte: 'elegante', alinh: 'left', alinhV: 'top' }),
  texto(k, { x: 6, y: 22, w: 88, h: 48, texto: c.texto || c.titulo || 'Uma frase que marca', tam: 4.4, italico: true, fonte: k.fonteTitulo ?? 'elegante', peso: 700, entrelinha: 1.2 }),
  texto(k, { x: 10, y: 73, w: 80, h: 9, texto: c.subtitulo || (c.texto ? c.titulo : '') || '— Autor', tam: 2, cor: k.destaque, peso: 700 }),
]

const lista: Fabrica = (c, k) => {
  const itens = linhas(c.texto).slice(0, 5)
  const pontos = itens.length ? itens : ['Primeiro ponto', 'Segundo ponto', 'Terceiro ponto']
  const passo = Math.min(15, 74 / pontos.length)
  return [
    texto(k, { x: 4, y: 3.5, w: 92, h: 14, texto: c.titulo || 'Título da lista', tam: 4.4, alinh: 'left' }),
    ...pontos.flatMap((t, i) => [
      forma('circulo', { x: 4.5, y: 21 + i * passo + passo / 2 - 2.3, w: 2.6, h: 4.6, cor: k.destaque, preenchido: true }),
      texto(k, { x: 9.5, y: 21 + i * passo, w: 86, h: passo, texto: t, tam: 2.8, peso: 600, alinh: 'left', fonte: k.fonteTexto ?? 'moderna' }),
    ]),
  ]
}

const duasColunas: Fabrica = (c, k) => {
  const ls = linhas(c.texto)
  const meio = Math.ceil(ls.length / 2)
  const [a, b] = ls.length >= 2 ? [ls.slice(0, meio).join('\n'), ls.slice(meio).join('\n')] : ['Antes', 'Depois']
  const caixa = (x: number, t: string, destaque: boolean): Elemento[] => [
    forma('retangulo', { x, y: 26, w: 43, h: 66, cor: destaque ? k.destaque : '#FFFFFF', preenchido: true, raio: 2, opac: destaque ? 0.18 : 0.08 }),
    texto(k, { x: x + 2.5, y: 29.5, w: 38, h: 59, texto: t, tam: 2.6, peso: 600, alinhV: 'top', fonte: k.fonteTexto ?? 'moderna', entrelinha: 1.35 }),
  ]
  return [
    texto(k, { x: 4, y: 5, w: 92, h: 15, texto: c.titulo || 'Comparação', tam: 4.4 }),
    ...caixa(4, a, false),
    ...caixa(53, b, true),
  ]
}

const pergunta: Fabrica = (c, k) => [
  forma('circulo', { x: 42.5, y: 10, w: 15, h: 26.7, cor: k.destaque, preenchido: true }),
  texto(k, { x: 42.5, y: 10, w: 15, h: 26.7, texto: '?', tam: 9, cor: '#111111', fonte: 'geometrica', peso: 900 }),
  texto(k, { x: 5, y: 41, w: 90, h: 33, texto: c.titulo || c.texto || 'Qual é a sua pergunta?', tam: 4.4, entrelinha: 1.15 }),
  texto(k, { x: 8, y: 76, w: 84, h: 14, texto: c.subtitulo || 'Converse com quem está ao seu lado', tam: 2.4, peso: 600, cor: k.destaque }),
]

const linhaTempo: Fabrica = (c, k) => {
  const ls = linhas(c.texto).slice(0, 5)
  const marcos = ls.length >= 2 ? ls : ['Início', 'Meio', 'Virada', 'Fim']
  const n = marcos.length
  return [
    texto(k, { x: 4, y: 5, w: 92, h: 15, texto: c.titulo || 'Linha do tempo', tam: 4.4 }),
    forma('linha', { x: 8, y: 50, w: 84, h: 2, cor: k.destaque, borda: 0.35 }),
    ...marcos.flatMap((t, i) => {
      const cx = 8 + (84 / (n - 1 || 1)) * i
      return [
        forma('circulo', { x: cx - 1.6, y: 47.2, w: 3.2, h: 5.6, cor: k.destaque, preenchido: true, corBorda: '#000000', borda: 0.35 }),
        texto(k, { x: cx - 9, y: i % 2 ? 28 : 57, w: 18, h: 15, texto: t, tam: 2, peso: 700, alinhV: i % 2 ? 'bottom' : 'top' }),
      ]
    }),
  ]
}

const grade: Fabrica = (c, k) => [
  texto(k, { x: 4, y: 4, w: 92, h: 13, texto: c.titulo || 'Galeria', tam: 4 }),
  ...[0, 1, 2, 3].map((i) => forma('foto', { x: 4 + (i % 2) * 47, y: 20 + Math.floor(i / 2) * 39, w: 45, h: 36, raio: 1.5 })),
]

const numero: Fabrica = (c, k) => {
  const n = (c.titulo || '').match(/\d[\d.,%]*/)?.[0] || '3'
  return [
    texto(k, { x: 10, y: 10, w: 80, h: 48, texto: n, tam: 17, cor: k.destaque, fonte: 'impacto' }),
    texto(k, { x: 12, y: 58, w: 76, h: 14, texto: c.subtitulo || (c.titulo || '').replace(n, '').trim() || 'coisas que mudam tudo', tam: 3.6 }),
    texto(k, { x: 15, y: 74, w: 70, h: 10, texto: c.texto?.split('\n')[0] || '', tam: 2, peso: 500 }),
  ]
}

const definicao: Fabrica = (c, k) => [
  texto(k, { x: 4, y: 13, w: 92, h: 20, texto: c.titulo || 'Graça', tam: 7, fonte: k.fonteTitulo ?? 'elegante', peso: 700, alinh: 'left' }),
  texto(k, { x: 4, y: 34.5, w: 92, h: 7, texto: c.subtitulo || 'substantivo feminino · do grego charis', tam: 1.9, italico: true, peso: 400, alinh: 'left', cor: k.destaque }),
  forma('linha', { x: 4, y: 43.5, w: 92, h: 2, cor: k.texto, borda: 0.12, opac: 0.4 }),
  texto(k, { x: 4, y: 48, w: 92, h: 45, texto: c.texto || 'Favor imerecido; o amor de Deus dado a quem não merece.', tam: 2.8, peso: 500, alinh: 'left', alinhV: 'top', fonte: k.fonteTexto ?? 'livro', entrelinha: 1.4 }),
]

const destaqueFaixa: Fabrica = (c, k) => [
  texto(k, { x: 5, y: 22, w: 90, h: 56, texto: c.titulo || 'Uma frase com *força*', tam: 6, caixaAlta: true, faixa: k.destaque, cor: '#111111', destaque: '#FFFFFF', entrelinha: 1.3 }),
]

export const MODELOS: { id: string; nome: string; fabrica: Fabrica }[] = [
  { id: 'titulo', nome: 'Título', fabrica: tituloGrande },
  { id: 'topico', nome: 'Tópico', fabrica: topico },
  { id: 'tituloTexto', nome: 'Título e texto', fabrica: tituloTexto },
  { id: 'versiculo', nome: 'Versículo', fabrica: versiculo },
  { id: 'citacao', nome: 'Citação', fabrica: citacao },
  { id: 'lista', nome: 'Lista', fabrica: lista },
  { id: 'duasColunas', nome: 'Duas colunas', fabrica: duasColunas },
  { id: 'pergunta', nome: 'Pergunta', fabrica: pergunta },
  { id: 'linhaTempo', nome: 'Linha do tempo', fabrica: linhaTempo },
  { id: 'grade', nome: 'Grade de fotos', fabrica: grade },
  { id: 'numero', nome: 'Número', fabrica: numero },
  { id: 'definicao', nome: 'Definição', fabrica: definicao },
  { id: 'faixa', nome: 'Faixa', fabrica: destaqueFaixa },
  { id: 'branco', nome: 'Em branco', fabrica: () => [] },
]

/* Qual modelo editável equivale ao modelo automático atual ("Editar livremente") */
export const MODELO_DO_LAYOUT: Record<string, string> = {
  capa: 'titulo', topico: 'topico', versiculo: 'versiculo', frase: 'citacao', livre: 'tituloTexto',
}

export function coresDoEstilo(e: Partial<EstiloSlide>): Cores {
  return { texto: e.cor || '#FFFFFF', destaque: e.destaque || '#FFC107', fonteTitulo: e.fonteTitulo, fonteTexto: e.fonteTexto }
}
