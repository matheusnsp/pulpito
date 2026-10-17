export type SlideImportado = {
  imagem?: Blob
  titulo?: string | null
  subtitulo?: string | null
  texto?: string | null
}
type Progresso = (mensagem: string) => void

const LARGURA = 1920 // resolução Full HD, boa para qualquer projetor

function canvasParaJpeg(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((ok, falha) =>
    canvas.toBlob((b) => (b ? ok(b) : falha(new Error('Falha ao gerar imagem'))), 'image/jpeg', 0.85))
}

async function imagemReduzida(file: File) {
  const bmp = await createImageBitmap(file)
  const escala = Math.min(1, LARGURA / bmp.width)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bmp.width * escala)
  canvas.height = Math.round(bmp.height * escala)
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height)
  bmp.close()
  return canvasParaJpeg(canvas)
}

/* PDF: cada página vira uma imagem idêntica ao original */
/* PDF: cada página vira uma imagem idêntica ao original */
async function paginasDoPdf(file: File, progresso: Progresso) {
  const pdfjs = await import('pdfjs-dist')
  const { default: worker } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  pdfjs.GlobalWorkerOptions.workerSrc = worker

  const tarefa = pdfjs.getDocument({ data: await file.arrayBuffer() })
  try {
    const pdf = await tarefa.promise
    const saida: SlideImportado[] = []
    for (let i = 1; i <= pdf.numPages; i++) {
      progresso(`Convertendo página ${i} de ${pdf.numPages}…`)
      const pagina = await pdf.getPage(i)
      const base = pagina.getViewport({ scale: 1 })
      const viewport = pagina.getViewport({ scale: LARGURA / base.width })
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(viewport.width)
      canvas.height = Math.round(viewport.height)
      await pagina.render({ canvas, canvasContext: canvas.getContext('2d')!, viewport }).promise
      saida.push({ imagem: await canvasParaJpeg(canvas) })
    }
    return saida
  } finally {
    await tarefa.destroy()
  }
}

/* PowerPoint (.pptx): lê os textos de cada slide, na ordem da apresentação */
const textoDe = (el: Element) =>
  Array.from(el.getElementsByTagName('a:p'))
    .map((p) => Array.from(p.getElementsByTagName('a:t')).map((t) => t.textContent ?? '').join(''))
    .filter((linha) => linha.trim())
    .join('\n')

async function slidesDoPptx(file: File, progresso: Progresso) {
  const { default: JSZip } = await import('jszip')
  const zip = await JSZip.loadAsync(file)
  const xml = (s: string) => new DOMParser().parseFromString(s, 'application/xml')

  let caminhos: string[] = []
  const pres = await zip.file('ppt/presentation.xml')?.async('string')
  const rels = await zip.file('ppt/_rels/presentation.xml.rels')?.async('string')
  if (pres && rels) {
    const alvo = new Map(Array.from(xml(rels).getElementsByTagName('Relationship'))
      .map((r) => [r.getAttribute('Id'), r.getAttribute('Target')]))
    caminhos = Array.from(xml(pres).getElementsByTagName('p:sldId'))
      .map((s) => alvo.get(s.getAttribute('r:id')))
      .filter((t): t is string => !!t)
      .map((t) => 'ppt/' + t.replace(/^\/?ppt\//, ''))
  }
  if (!caminhos.length) {
    caminhos = Object.keys(zip.files)
      .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
      .sort((a, b) => Number(a.match(/\d+/)![0]) - Number(b.match(/\d+/)![0]))
  }

  const saida: SlideImportado[] = []
  for (const [i, caminho] of caminhos.entries()) {
    progresso(`Lendo slide ${i + 1} de ${caminhos.length}…`)
    const conteudo = await zip.file(caminho)?.async('string')
    if (!conteudo) continue
    let titulo = ''
    let subtitulo = ''
    const corpo: string[] = []
    for (const forma of Array.from(xml(conteudo).getElementsByTagName('p:sp'))) {
      const texto = textoDe(forma)
      if (!texto) continue
      const tipo = forma.getElementsByTagName('p:ph')[0]?.getAttribute('type') ?? ''
      if ((tipo === 'title' || tipo === 'ctrTitle') && !titulo) titulo = texto
      else if (tipo === 'subTitle' && !subtitulo) subtitulo = texto
      else corpo.push(texto)
    }
    if (!titulo && corpo.length) titulo = corpo.shift()!
    saida.push({ titulo: titulo || null, subtitulo: subtitulo || null, texto: corpo.join('\n\n') || null })
  }
  return saida
}

export async function lerArquivos(arquivos: File[], progresso: Progresso) {
  // Ordem natural: "slide2" antes de "slide10"
  const ordenados = [...arquivos].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
  const todos: SlideImportado[] = []
  for (const f of ordenados) {
    const nome = f.name.toLowerCase()
    if (f.type === 'application/pdf' || nome.endsWith('.pdf')) {
      todos.push(...(await paginasDoPdf(f, progresso)))
    } else if (nome.endsWith('.pptx')) {
      todos.push(...(await slidesDoPptx(f, progresso)))
    } else if (f.type.startsWith('image/')) {
      progresso(`Preparando ${f.name}…`)
      todos.push({ imagem: await imagemReduzida(f) })
    } else if (nome.endsWith('.ppt') || nome.endsWith('.key')) {
      throw new Error(`"${f.name}": salve como PDF ou .pptx antes de importar.`)
    } else {
      throw new Error(`"${f.name}": formato não suportado.`)
    }
  }
  return todos
}