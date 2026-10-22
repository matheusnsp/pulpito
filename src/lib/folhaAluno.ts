import type { Mensagem, Topico } from './tipos'
import { defBloco, ehBloco, itensDaLista, nomeFormato } from './blocos'
import { formatarReferencia, lerReferencia, parseReferencia, dividirReferencias } from './biblia'
import { lerVersao } from './preferencias'

/*
  Folha impressa em PDF (A4), para quem participa: cabeçalho com formato e série,
  objetivo, nome/data, texto base por extenso, e cada item com seu visual:
  tópicos com versículos, frase-chave e linhas para anotar; perguntas e atividades
  com linhas para responder; múltipla escolha com quadradinhos para marcar.
  O que é só de quem conduz (notas, "como conduzir", observação/aplicação/ilustração) fica de fora.
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

type Cor = [number, number, number]
const TINTA: Cor = [26, 24, 20]
const CINZA: Cor = [112, 108, 100]
const CLARO: Cor = [200, 196, 188]
const OURO: Cor = [176, 128, 0]
const OURO_FUNDO: Cor = [253, 246, 224]

export async function gerarFolhaAluno(m: Mensagem, blocos: Topico[]) {
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
  const M = 18, L = 210 - 2 * M, FIM = 297 - 18
  let y = 0
  const versao = lerVersao()
  const d = m.detalhes ?? {}
  const ehEstudo = m.tipo === 'estudo'

  const novaPagina = () => { pdf.addPage(); y = 20 }
  const quebra = (altura: number) => { if (y + altura > FIM) novaPagina() }
  const fonte = (tam: number, estilo: 'normal' | 'bold' | 'italic' | 'bolditalic' = 'normal', cor: Cor = TINTA) => {
    pdf.setFont('helvetica', estilo); pdf.setFontSize(tam); pdf.setTextColor(...cor)
  }
  const altLinha = (tam: number) => tam * 0.46
  // Escreve com quebra de linha; devolve as linhas usadas (para medir caixas)
  const linhasDe = (texto: string, tam: number, largura: number, estilo: 'normal' | 'bold' | 'italic' | 'bolditalic' = 'normal') => {
    fonte(tam, estilo)
    return pdf.splitTextToSize(texto, largura) as string[]
  }
  const escrever = (texto: string, tam: number, estilo: 'normal' | 'bold' | 'italic' | 'bolditalic' = 'normal', cor: Cor = TINTA, recuo = 0, largura = L - recuo) => {
    const ls = linhasDe(texto, tam, largura, estilo)
    fonte(tam, estilo, cor)
    for (const l of ls) { quebra(altLinha(tam)); pdf.text(l, M + recuo, y); y += altLinha(tam) }
  }
  const linhasResposta = (n: number, recuo = 0) => {
    quebra(n * 9 + 3) // as linhas de resposta ficam juntas na mesma página
    pdf.setDrawColor(...CLARO); pdf.setLineWidth(0.25)
    for (let i = 0; i < n; i++) { quebra(10); y += 9; pdf.line(M + recuo, y, M + L, y) }
    y += 3
  }
  // Rótulo pequeno em "pílula" colorida
  const pilula = (texto: string, cor: Cor, x = M) => {
    fonte(7.5, 'bold', [255, 255, 255])
    const w = pdf.getTextWidth(texto) + 5
    pdf.setFillColor(...cor); pdf.roundedRect(x, y - 3.6, w, 5.2, 2.6, 2.6, 'F')
    pdf.text(texto, x + 2.5, y)
    return w
  }

  // Versículos por extenso numa caixa clara, com a referência em destaque
  const caixaVersiculos = async (valor: string | null, recuo = 0) => {
    for (const ref of dividirReferencias(valor)) {
      const r = parseReferencia(ref)
      const titulo = r ? `${formatarReferencia(r)}  ·  ${versao}` : ref
      let corpo = ''
      if (r) { try { corpo = (await lerReferencia(versao, r)).map((v) => `${v.numero} ${v.texto}`).join(' ') } catch { /* sem internet */ } }
      const largura = L - recuo - 10
      const ls = corpo ? linhasDe(corpo, 10.5, largura, 'normal') : []
      const altura = 9 + ls.length * altLinha(10.5) + 3
      quebra(Math.min(altura, 60))
      const topo = y
      // Caixa (se o texto passar de página, a caixa fica só no pedaço desta página)
      const alturaAqui = Math.min(altura, FIM - topo + 2)
      pdf.setFillColor(...OURO_FUNDO); pdf.roundedRect(M + recuo, topo, L - recuo, alturaAqui, 2.5, 2.5, 'F')
      pdf.setFillColor(...OURO); pdf.rect(M + recuo, topo, 1.2, alturaAqui, 'F')
      y = topo + 6
      fonte(9.5, 'bold', OURO); pdf.text(titulo, M + recuo + 5, y); y += 5.5
      fonte(10.5, 'normal', [55, 52, 46])
      for (const l of ls) { if (y + altLinha(10.5) > FIM) { novaPagina() } pdf.text(l, M + recuo + 5, y); y += altLinha(10.5) }
      y = Math.max(y, topo + alturaAqui) + 4
    }
  }

  // ── Cabeçalho ──
  pdf.setFillColor(...OURO); pdf.rect(0, 0, 210, 3, 'F')
  y = 16
  const rotulo = [ehEstudo ? 'ESTUDO' : nomeFormato(d.formato).toUpperCase(), d.serie ? `${d.serie.toUpperCase()}${d.serieNumero ? ` · ${d.serieNumero}` : ''}` : ''].filter(Boolean).join('   ·   ')
  fonte(8, 'bold', OURO); pdf.text(rotulo, M, y); y += 8
  escrever(m.titulo || 'Sem título', 22, 'bold')
  y += 1
  const info = [m.texto_base, `${m.tempo_minutos} min`, d.publico, d.material && `Material: ${d.material}`].filter(Boolean).join('   ·   ')
  if (info) escrever(info, 9.5, 'normal', CINZA)
  y += 3
  if (d.objetivo) {
    const ls = linhasDe(d.objetivo, 10.5, L - 12, 'normal')
    const h = 8 + ls.length * altLinha(10.5) + 2
    pdf.setFillColor(245, 243, 238); pdf.roundedRect(M, y, L, h, 2.5, 2.5, 'F')
    fonte(7.5, 'bold', CINZA); pdf.text('OBJETIVO', M + 5, y + 5.5)
    fonte(10.5, 'normal', TINTA); ls.forEach((l, k) => pdf.text(l, M + 5, y + 10.5 + k * altLinha(10.5)))
    y += h + 5
  }
  // Nome e data
  fonte(9, 'normal', CINZA)
  pdf.text('Nome', M, y + 4); pdf.text('Data', M + L - 42, y + 4)
  pdf.setDrawColor(...CLARO); pdf.setLineWidth(0.25)
  pdf.line(M + 11, y + 4.6, M + L - 48, y + 4.6); pdf.line(M + L - 33, y + 4.6, M + L, y + 4.6)
  y += 13

  // Texto base por extenso
  if (m.texto_base?.trim()) {
    fonte(8, 'bold', CINZA); pdf.text('TEXTO BASE', M, y); y += 3
    await caixaVersiculos(m.texto_base)
    y += 2
  }

  // ── Itens ──
  let nTopico = 0
  for (const b of blocos) {
    if (!ehEstudo && !ehBloco(b.tipo)) {
      // Tópico: número em círculo, título, versículos, frase-chave e espaço para anotar
      nTopico++
      quebra(30)
      pdf.setFillColor(234, 179, 8); pdf.circle(M + 4, y - 1.5, 4, 'F')
      fonte(10.5, 'bold', TINTA); pdf.text(String(nTopico), M + 4, y - 0.1, { align: 'center' })
      escrever(b.titulo || 'Sem título', 14, 'bold', TINTA, 11)
      y += 2
      if (b.versiculo) await caixaVersiculos(b.versiculo, 11)
      if (b.frase_chave?.trim()) {
        const topo = y
        escrever(`“${b.frase_chave.trim().replace(/^["“]|["”]$/g, '')}”`, 11.5, 'bolditalic', OURO, 15)
        pdf.setDrawColor(234, 179, 8); pdf.setLineWidth(0.8); pdf.line(M + 12, topo - 3.6, M + 12, y - 2.6)
        y += 1
      }
      fonte(7.5, 'bold', CINZA); quebra(8); pdf.text('ANOTAÇÕES', M + 11, y + 2); y += 1
      linhasResposta(3, 11)
      y += 4
      continue
    }
    const def = defBloco(b)
    const tipo = b.tipo ?? 'explicacao'
    const cor = hexParaRgb(def.cor)
    // Pergunta e atividade não se separam das linhas de resposta
    const multipla = tipo === 'pergunta' && (b.extra?.opcoes ?? []).filter((o) => o.trim()).length >= 2
    quebra(tipo === 'pergunta' && !multipla ? 64 : tipo === 'atividade' ? 56 : 26)
    pilula(`${def.nome.toUpperCase()}${b.extra?.minutos && (tipo === 'atividade' || tipo === 'pergunta') ? `  ·  ${b.extra.minutos} MIN` : ''}`, cor)
    y += 6.5

    if (tipo === 'citacao') {
      const topo = y
      escrever(`“${(b.titulo || '').replace(/^["“]|["”]$/g, '')}”`, 13, 'italic', TINTA, 5)
      if (b.extra?.autor) escrever(`— ${b.extra.autor}`, 10, 'normal', CINZA, 5)
      pdf.setDrawColor(...cor); pdf.setLineWidth(0.8); pdf.line(M + 1, topo - 4, M + 1, y - 3)
    } else if (tipo === 'definicao') {
      escrever(b.titulo || '', 15, 'bold')
      if (b.frase_chave) escrever(b.frase_chave, 10, 'italic', CINZA)
      y += 1
      if (b.observacao) escrever(b.observacao, 11)
    } else {
      if (b.titulo) escrever(b.titulo, tipo === 'pergunta' ? 13 : 12.5, 'bold')
      y += 0.5
      if (tipo === 'lista') {
        for (const it of itensDaLista(b.observacao)) {
          quebra(6)
          pdf.setFillColor(...cor); pdf.circle(M + 2, y - 1.3, 0.9, 'F')
          escrever(it, 11, 'normal', TINTA, 6)
          y += 0.8
        }
      } else if (tipo !== 'pergunta' && b.observacao) escrever(b.observacao, 11)
      if (b.versiculo && def.referencia) { y += 1; await caixaVersiculos(b.versiculo) }
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
    const opcoes = tipo === 'pergunta' ? (b.extra?.opcoes ?? []).filter((o) => o.trim()) : []
    if (opcoes.length >= 2) {
      y += 2
      opcoes.forEach((o, k) => {
        quebra(7)
        pdf.setDrawColor(...CINZA); pdf.setLineWidth(0.3); pdf.roundedRect(M + 1, y - 3.6, 4.4, 4.4, 0.8, 0.8, 'S')
        escrever(`${'ABCDEF'[k]})  ${o}`, 11, 'normal', TINTA, 8)
        y += 1.5
      })
    } else if (tipo === 'pergunta') linhasResposta(4)
    else if (tipo === 'atividade') linhasResposta(3)
    y += 7
  }

  // Rodapé
  const paginas = pdf.getNumberOfPages()
  for (let p = 1; p <= paginas; p++) {
    pdf.setPage(p)
    pdf.setDrawColor(230, 228, 222); pdf.setLineWidth(0.3); pdf.line(M, 297 - 13, M + L, 297 - 13)
    fonte(8, 'normal', [150, 146, 138])
    pdf.text(m.titulo || 'Sem título', M, 297 - 8.5)
    pdf.text(`${p} / ${paginas}`, M + L, 297 - 8.5, { align: 'right' })
  }
  pdf.save(`${nomeArquivo(m.titulo)}-folha.pdf`)
}
