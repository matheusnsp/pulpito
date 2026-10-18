import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import SlideVisual from '../components/SlideVisual'
import type { Slide, Topico } from './tipos'

/*
  Exporta os slides como aparecem no telão.
  Cada slide é desenhado em 1920x1080 e vira uma imagem; o PowerPoint leva
  as notas pessoais de cada tópico como "anotações do apresentador".
*/

const LARGURA = 1920
const ALTURA = 1080

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

/* Desenha os slides fora da tela e devolve um JPEG (data URL) de cada um */
async function renderizar(slides: Slide[], aoProgredir?: (feito: number, total: number) => void) {
  const { toJpeg } = await import('html-to-image')
  const palco = document.createElement('div')
  palco.style.cssText = `position:fixed;left:-${LARGURA * 2}px;top:0;width:${LARGURA}px;pointer-events:none;`
  document.body.appendChild(palco)
  const raiz = createRoot(palco)

  try {
    raiz.render(createElement('div', null, slides.map((s) =>
      createElement('div', { key: s.id, 'data-slide': '', style: { width: LARGURA, height: ALTURA } },
        createElement(SlideVisual, { slide: s, preencher: true })))))

    await Promise.all(slides
      .filter((s) => s.fundo?.startsWith('img:'))
      .map((s) => carregarImagem(s.fundo!.slice(4))))
    await document.fonts.ready
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))

    const quadros = Array.from(palco.querySelectorAll<HTMLElement>('[data-slide]'))
    const imagens: string[] = []
    for (const [i, q] of quadros.entries()) {
      imagens.push(await toJpeg(q, { width: LARGURA, height: ALTURA, pixelRatio: 1, cacheBust: true, quality: 0.9, backgroundColor: '#000000' }))
      aoProgredir?.(i + 1, quadros.length)
    }
    return imagens
  } finally {
    raiz.unmount()
    palco.remove()
  }
}

/* Notas pessoais do tópico vão no primeiro slide de cada tópico */
function notasPorSlide(slides: Slide[], topicos: Topico[]) {
  const vistos = new Set<string>()
  return slides.map((s) => {
    if (!s.topico_id || vistos.has(s.topico_id)) return ''
    vistos.add(s.topico_id)
    const t = topicos.find((x) => x.id === s.topico_id)
    if (!t) return ''
    return [
      t.titulo,
      t.observacao && `Observação: ${t.observacao}`,
      t.aplicacao && `Aplicação: ${t.aplicacao}`,
      t.ilustracao && `Ilustração: ${t.ilustracao}`,
      t.notas && `Notas: ${t.notas}`,
    ].filter(Boolean).join('\n\n')
  })
}

export async function exportarPowerPoint(titulo: string, slides: Slide[], topicos: Topico[],
  aoProgredir?: (feito: number, total: number) => void) {
  const [imagens, { default: PptxGenJS }] = await Promise.all([renderizar(slides, aoProgredir), import('pptxgenjs')])
  const pptx = new PptxGenJS()
  pptx.layout = 'LAYOUT_WIDE' // 16:9
  pptx.title = titulo
  const notas = notasPorSlide(slides, topicos)
  imagens.forEach((img, i) => {
    const slide = pptx.addSlide()
    slide.background = { color: '000000' }
    slide.addImage({ data: img, x: 0, y: 0, w: '100%', h: '100%' })
    if (notas[i]) slide.addNotes(notas[i])
  })
  await pptx.writeFile({ fileName: `${nomeArquivo(titulo)}.pptx` })
}

export async function exportarPdf(titulo: string, slides: Slide[],
  aoProgredir?: (feito: number, total: number) => void) {
  const [imagens, { jsPDF }] = await Promise.all([renderizar(slides, aoProgredir), import('jspdf')])
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [LARGURA, ALTURA], compress: true })
  imagens.forEach((img, i) => {
    if (i > 0) pdf.addPage([LARGURA, ALTURA], 'landscape')
    pdf.addImage(img, 'JPEG', 0, 0, LARGURA, ALTURA)
  })
  pdf.setProperties({ title: titulo })
  pdf.save(`${nomeArquivo(titulo)}.pdf`)
}
