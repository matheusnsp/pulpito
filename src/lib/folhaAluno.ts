import type { Mensagem, Topico } from './tipos'
import { defBloco, itensDaLista } from './blocos'
import { formatarReferencia, lerReferencia, parseReferencia } from './biblia'
import { lerVersao } from './preferencias'

/*
  Folha do aluno em PDF (A4): título, objetivo e os blocos do estudo,
  com linhas em branco para responder as perguntas e as atividades.
  As notas "só para você" e o "como conduzir" das perguntas ficam de fora.
*/

const nomeArquivo = (t: string) =>
  (t || 'estudo').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').toLowerCase() || 'estudo'

const hexParaRgb = (h: string): [number, number, number] => {
  const n = parseInt(h.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

async function imagemComoDados(url: string) {
  try {
    const blob = await (await fetch(url)).blob()
    const dados = await new Promise<string>((ok, falha) => {
      const r = new FileReader()
      r.onload = () => ok(String(r.result))
      r.onerror = falha
      r.readAsDataURL(blob)
    })
    const img = new Image()
    await new Promise((ok) => { img.onload = ok; img.onerror = ok; img.src = dados })
    return { dados, proporcao: img.naturalWidth ? img.naturalHeight / img.naturalWidth : 0.6 }
  } catch { return null }
}

export async function gerarFolhaAluno(m: Mensagem, blocos: Topico[]) {
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
  const M = 18, L = 210 - 2 * M, FIM = 297 - 16
  let y = 20

  const quebra = (altura: number) => { if (y + altura > FIM) { pdf.addPage(); y = 20 } }
  const escrever = (texto: string, tam: number, estilo: 'normal' | 'bold' | 'italic' = 'normal', cor: [number, number, number] = [25, 25, 25], recuo = 0) => {
    pdf.setFont('helvetica', estilo)
    pdf.setFontSize(tam)
    pdf.setTextColor(...cor)
    const linhas = pdf.splitTextToSize(texto, L - recuo) as string[]
    const alt = tam * 0.42
    for (const l of linhas) { quebra(alt); pdf.text(l, M + recuo, y); y += alt }
  }
  const linhasResposta = (n: number) => {
    pdf.setDrawColor(200, 200, 200)
    pdf.setLineWidth(0.2)
    for (let i = 0; i < n; i++) { quebra(9); y += 8; pdf.line(M, y, M + L, y) }
    y += 4
  }

  // Cabeçalho
  escrever(m.titulo || 'Estudo', 20, 'bold')
  y += 1
  const d = m.detalhes ?? {}
  if (d.objetivo) escrever(`Objetivo: ${d.objetivo}`, 11, 'normal', [70, 70, 70])
  const info = [d.publico, `${m.tempo_minutos} min`, d.material && `Material: ${d.material}`].filter(Boolean).join('  ·  ')
  if (info) escrever(info, 9.5, 'normal', [120, 120, 120])
  pdf.setDrawColor(230, 230, 230); pdf.setLineWidth(0.4)
  y += 3; pdf.line(M, y, M + L, y); y += 8
  escrever('Nome: ________________________________________     Data: ____/____/______', 10, 'normal', [120, 120, 120])
  y += 6

  const versao = lerVersao()
  for (const [i, b] of blocos.entries()) {
    const def = defBloco(b)
    const tipo = b.tipo ?? 'explicacao'
    quebra(22)
    // Rótulo do bloco
    escrever(`${i + 1}. ${def.nome.toUpperCase()}${b.extra?.minutos && (tipo === 'atividade') ? `  ·  ${b.extra.minutos} min` : ''}`, 8.5, 'bold', hexParaRgb(def.cor))
    y += 0.5

    if (tipo === 'citacao') {
      escrever(`“${(b.titulo || '').replace(/^["“]|["”]$/g, '')}”`, 13, 'italic')
      if (b.extra?.autor) escrever(`— ${b.extra.autor}`, 10, 'normal', [110, 110, 110])
    } else if (tipo === 'definicao') {
      escrever(b.titulo || '', 14, 'bold')
      if (b.frase_chave) escrever(b.frase_chave, 10, 'italic', [110, 110, 110])
      if (b.observacao) escrever(b.observacao, 11)
    } else {
      if (b.titulo) escrever(b.titulo, tipo === 'pergunta' ? 13 : 12.5, 'bold')
      if (tipo === 'lista') itensDaLista(b.observacao).forEach((it) => escrever(`•  ${it}`, 11, 'normal', [25, 25, 25], 3))
      else if (tipo !== 'pergunta' && b.observacao) escrever(b.observacao, 11)
      if (tipo === 'referencia' && b.versiculo) {
        const r = parseReferencia(b.versiculo)
        if (r) {
          escrever(`${formatarReferencia(r)} (${versao})`, 10.5, 'bold', [150, 110, 0])
          try {
            const vs = await lerReferencia(versao, r)
            escrever(vs.map((v) => `${v.numero} ${v.texto}`).join(' '), 11, 'normal', [40, 40, 40])
          } catch { /* sem o texto: fica só a referência */ }
        } else escrever(b.versiculo, 10.5, 'bold', [150, 110, 0])
      }
      if (tipo === 'link' && b.extra?.url) escrever(b.extra.url, 10, 'normal', [30, 90, 200])
      if (tipo === 'imagem' && b.extra?.url) {
        const img = await imagemComoDados(b.extra.url)
        if (img) {
          const w = Math.min(L, 120), h = w * img.proporcao
          quebra(h + 4); y += 2
          try { pdf.addImage(img.dados, M, y, w, h) } catch { /* formato não suportado */ }
          y += h + 2
        }
      }
    }
    if (tipo === 'pergunta') linhasResposta(4)
    else if (tipo === 'atividade') linhasResposta(3)
    y += 5
  }

  // Rodapé com número da página
  const paginas = pdf.getNumberOfPages()
  for (let p = 1; p <= paginas; p++) {
    pdf.setPage(p)
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8); pdf.setTextColor(160, 160, 160)
    pdf.text(`${m.titulo || 'Estudo'} · página ${p} de ${paginas}`, M, 297 - 9)
  }
  pdf.save(`${nomeArquivo(m.titulo)}-folha-do-aluno.pdf`)
}
