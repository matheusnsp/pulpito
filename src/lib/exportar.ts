import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import SlideVisual from '../components/SlideVisual'
import type { Slide, Topico } from './tipos'

/*
  Exporta os slides como aparecem no telão.
  Cada slide é desenhado fora da tela em 1920x1080 (o mesmo componente do telão).
  - PDF e PowerPoint "imagem": cada slide vira uma imagem, idêntica ao telão.
  - PowerPoint "editável": o fundo, as fotos e as formas viram imagem, e cada texto
    vira uma caixa de texto de verdade, no mesmo lugar, tamanho, cor e fonte.
  As anotações de cada tópico vão nas "anotações do apresentador".
*/

const LARGURA = 1920
const ALTURA = 1080
const POL_LARGURA = 13.333 // PowerPoint 16:9 (polegadas)
const pol = (px: number) => (px / LARGURA) * POL_LARGURA
const pt = (px: number) => px * 0.5 // 1920 px = 13,333 pol = 960 pt

const nomeArquivo = (titulo: string) =>
  (titulo || 'slides').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').toLowerCase() || 'slides'

function carregarImagem(url: string) {
  return new Promise<void>((ok) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => ok()
    img.onerror = () => ok()
    img.src = url
  })
}

/*
  Os slides usam unidades do contêiner (cqw). A biblioteca que tira a "foto" do slide
  não entende essas unidades e encolhia os textos: antes da foto, cada medida vira px.
*/
const MEDIDAS = ['font-size', 'line-height', 'letter-spacing', 'width', 'height', 'top', 'left', 'right', 'bottom',
  'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'gap', 'row-gap', 'column-gap', 'border-radius', 'border-width', 'text-shadow', 'box-shadow', '-webkit-text-stroke-width',
  'text-underline-offset', 'text-decoration-thickness'] as const
function congelarMedidas(raiz: HTMLElement) {
  const todos = [raiz, ...Array.from(raiz.querySelectorAll<HTMLElement>('*'))]
  const valores = todos.map((el) => {
    const cs = getComputedStyle(el)
    return MEDIDAS.map((p) => cs.getPropertyValue(p))
  })
  todos.forEach((el, i) => MEDIDAS.forEach((p, j) => {
    const v = valores[i][j]
    if (v && v !== 'auto' && v !== 'normal' && !(el instanceof SVGElement)) el.style.setProperty(p, v)
  }))
}

/* ── Textos do slide, para virarem caixas de texto no PowerPoint ── */
type Trecho = { texto: string; cor: string; transparencia: number; sobrescrito: boolean; negrito: boolean }
type Bloco = {
  x: number; y: number; w: number; h: number
  trechos: Trecho[]; tamanho: number; fonte: string; italico: boolean; sublinhado: boolean
  alinh: 'left' | 'center' | 'right'; entrelinha: number; espacamento: number
}

function corHex(css: string): { hex: string; transparencia: number } {
  const m = css.match(/rgba?\(([^)]+)\)/)
  if (!m) return { hex: 'FFFFFF', transparencia: 0 }
  const [r, g, b, a = '1'] = m[1].split(/[,\s/]+/).filter(Boolean)
  const h = (n: string) => Math.round(Number(n)).toString(16).padStart(2, '0')
  return { hex: `${h(r)}${h(g)}${h(b)}`.toUpperCase(), transparencia: Math.round((1 - Number(a)) * 100) }
}
/*
  Fonte para o PowerPoint. As fontes do app não estão instaladas na maioria dos computadores;
  as que mais mudam o tamanho do texto viram uma parecida que todo computador tem.
*/
const TROCAS: [RegExp, string][] = [[/literata/i, 'Georgia'], [/atkinson/i, 'Arial']]
function primeiraFonte(familia: string) {
  const nome = (familia.split(',')[0] ?? 'Arial').replace(/["']/g, '').replace(/\s+Variable$/i, '').trim() || 'Arial'
  return TROCAS.find(([re]) => re.test(nome))?.[1] ?? nome
}

function extrairTextos(quadro: HTMLElement): Bloco[] {
  const base = quadro.getBoundingClientRect()
  // Agrupa os pedaços de texto pelo bloco (div, p, h1…) que os contém
  const grupos = new Map<HTMLElement, Text[]>()
  const andar = document.createTreeWalker(quadro, NodeFilter.SHOW_TEXT)
  for (let n = andar.nextNode(); n; n = andar.nextNode()) {
    const t = n as Text
    if (!t.data.trim() || !t.parentElement) continue
    let bloco: HTMLElement | null = t.parentElement
    while (bloco && bloco !== quadro && getComputedStyle(bloco).display.startsWith('inline')) bloco = bloco.parentElement
    if (!bloco) continue
    grupos.set(bloco, [...(grupos.get(bloco) ?? []), t])
  }
  const blocos: Bloco[] = []
  grupos.forEach((textos, bloco) => {
    const faixa = document.createRange()
    faixa.setStartBefore(textos[0])
    faixa.setEndAfter(textos[textos.length - 1])
    const r = faixa.getBoundingClientRect()
    if (!r.width || !r.height) return
    const cs = getComputedStyle(textos[0].parentElement!)
    const csBloco = getComputedStyle(bloco)
    const tamanho = parseFloat(csBloco.fontSize) || parseFloat(cs.fontSize)
    const alinh = (['left', 'center', 'right'] as const).find((a) => csBloco.textAlign.includes(a)) ?? (csBloco.textAlign === 'end' ? 'right' : 'left')
    const linha = parseFloat(csBloco.lineHeight)
    blocos.push({
      x: r.left - base.left, y: r.top - base.top, w: r.width, h: r.height,
      tamanho, fonte: primeiraFonte(cs.fontFamily), italico: cs.fontStyle === 'italic',
      sublinhado: cs.textDecorationLine.includes('underline'),
      alinh, entrelinha: Number.isFinite(linha) ? linha : tamanho * 1.2,
      espacamento: parseFloat(csBloco.letterSpacing) || 0,
      trechos: textos.map((t) => {
        const c = getComputedStyle(t.parentElement!)
        const { hex, transparencia } = corHex(c.color)
        const caixaAlta = c.textTransform === 'uppercase'
        return {
          texto: caixaAlta ? t.data.toLocaleUpperCase('pt-BR') : t.data,
          cor: hex, transparencia,
          sobrescrito: t.parentElement!.tagName === 'SUP' || c.verticalAlign === 'super',
          negrito: (parseInt(c.fontWeight) || 400) >= 600,
        }
      }),
    })
  })
  return blocos
}

/* Esconde as letras (o fundo das faixas e o resto do slide continuam) */
function esconderTextos(quadro: HTMLElement) {
  quadro.querySelectorAll<HTMLElement>('*').forEach((el) => {
    el.style.setProperty('color', 'transparent', 'important')
    el.style.setProperty('-webkit-text-fill-color', 'transparent', 'important')
    el.style.setProperty('-webkit-text-stroke-width', '0', 'important')
    el.style.setProperty('text-shadow', 'none', 'important')
    el.style.setProperty('text-decoration-color', 'transparent', 'important')
  })
}

type Quadro = { imagem: string; textos: Bloco[] }

/* Desenha os slides fora da tela e devolve a imagem de cada um (e, se pedir, os textos separados) */
async function renderizar(slides: Slide[], separarTextos: boolean, aoProgredir?: (feito: number, total: number) => void): Promise<Quadro[]> {
  const { toJpeg } = await import('html-to-image')
  const palco = document.createElement('div')
  palco.style.cssText = `position:fixed;left:-${LARGURA * 2}px;top:0;width:${LARGURA}px;pointer-events:none;`
  document.body.appendChild(palco)
  const raiz = createRoot(palco)

  try {
    raiz.render(createElement('div', null, slides.map((s) =>
      createElement('div', { key: s.id, 'data-slide': '', style: { width: LARGURA, height: ALTURA, overflow: 'hidden' } },
        createElement(SlideVisual, { slide: s, preencher: true })))))

    const urls = slides.flatMap((s) => [
      s.fundo?.startsWith('img:') ? s.fundo.slice(4) : null,
      s.estilo?.foto ?? null,
      ...(s.estilo?.elementos ?? []).map((el) => el.url ?? null),
    ]).filter((u): u is string => !!u)
    await Promise.all(urls.map(carregarImagem))
    await document.fonts.ready
    // Espera o auto ajuste dos textos terminar
    await new Promise((r) => setTimeout(r, 150))
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))

    const quadros = Array.from(palco.querySelectorAll<HTMLElement>('[data-slide]'))
    const resultado: Quadro[] = []
    for (const [i, q] of quadros.entries()) {
      congelarMedidas(q)
      const textos = separarTextos ? extrairTextos(q) : []
      if (separarTextos) esconderTextos(q)
      const imagem = await toJpeg(q, { width: LARGURA, height: ALTURA, pixelRatio: 1, cacheBust: true, quality: 0.95, backgroundColor: '#000000' })
      resultado.push({ imagem, textos })
      aoProgredir?.(i + 1, quadros.length)
    }
    return resultado
  } finally {
    raiz.unmount()
    palco.remove()
  }
}

/* Anotações do apresentador: o conteúdo do tópico no primeiro slide de cada tópico */
function notasPorSlide(slides: Slide[], topicos: Topico[]) {
  const vistos = new Set<string>()
  return slides.map((s) => {
    if (!s.topico_id || vistos.has(s.topico_id)) return ''
    vistos.add(s.topico_id)
    const t = topicos.find((x) => x.id === s.topico_id)
    if (!t) return ''
    return [
      t.titulo,
      t.versiculo && `Versículos: ${t.versiculo}`,
      t.observacao && `Observação: ${t.observacao}`,
      t.ilustracao && `Ilustração: ${t.ilustracao}`,
      t.aplicacao && `Aplicação: ${t.aplicacao}`,
      t.frase_chave && `Frase-chave: ${t.frase_chave}`,
      t.notas && `Notas: ${t.notas}`,
    ].filter(Boolean).join('\n\n')
  })
}

export async function exportarPowerPoint(titulo: string, slides: Slide[], topicos: Topico[],
  aoProgredir?: (feito: number, total: number) => void, editavel = true) {
  const [quadros, { default: PptxGenJS }] = await Promise.all([renderizar(slides, editavel, aoProgredir), import('pptxgenjs')])
  const pptx = new PptxGenJS()
  pptx.layout = 'LAYOUT_WIDE' // 16:9
  pptx.title = titulo
  pptx.author = 'Pulpito'
  const notas = notasPorSlide(slides, topicos)
  quadros.forEach(({ imagem, textos }, i) => {
    const slide = pptx.addSlide()
    slide.background = { data: imagem }
    for (const b of textos) {
      // Caixa um pouco maior que o texto: a fonte do computador pode ser um tiquinho mais larga
      const folga = b.w * 0.06
      const x = b.alinh === 'center' ? b.x - folga / 2 : b.alinh === 'right' ? b.x - folga : b.x
      slide.addText(b.trechos.map((t) => ({
        text: t.texto,
        options: {
          color: t.cor, transparency: t.transparencia || undefined, bold: t.negrito,
          superscript: t.sobrescrito || undefined,
        },
      })), {
        x: pol(Math.max(0, x)), y: pol(b.y), w: pol(Math.min(LARGURA, b.w + folga)), h: pol(b.h + b.tamanho * 0.6),
        fontFace: b.fonte, fontSize: Math.max(4, Math.round(pt(b.tamanho) * 10) / 10),
        italic: b.italico || undefined, underline: b.sublinhado ? { style: 'sng' } : undefined,
        align: b.alinh, valign: 'top', margin: 0, wrap: true,
        // Texto de várias linhas encolhe sozinho se a fonte do computador for mais larga
        fit: b.h > b.entrelinha * 2.5 ? 'shrink' : undefined,
        // Entrelinha proporcional (não fixa): se o PowerPoint trocar a fonte, as linhas acompanham
        lineSpacingMultiple: Math.min(2.5, Math.max(0.8, Math.round((b.entrelinha / b.tamanho) * 100) / 100)),
        charSpacing: b.espacamento ? Math.round(pt(b.espacamento) * 10) / 10 : undefined,
      })
    }
    if (notas[i]) slide.addNotes(notas[i])
  })
  await pptx.writeFile({ fileName: `${nomeArquivo(titulo)}.pptx` })
}

export async function exportarPdf(titulo: string, slides: Slide[],
  aoProgredir?: (feito: number, total: number) => void) {
  const [quadros, { jsPDF }] = await Promise.all([renderizar(slides, false, aoProgredir), import('jspdf')])
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [LARGURA, ALTURA], compress: true })
  quadros.forEach(({ imagem }, i) => {
    if (i > 0) pdf.addPage([LARGURA, ALTURA], 'landscape')
    pdf.addImage(imagem, 'JPEG', 0, 0, LARGURA, ALTURA)
  })
  pdf.setProperties({ title: titulo })
  pdf.save(`${nomeArquivo(titulo)}.pdf`)
}
