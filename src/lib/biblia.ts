export type VersaoId = 'ARA' | 'ARC' | 'NAA'

export const VERSOES: { id: VersaoId; nome: string }[] = [
  { id: 'ARA', nome: 'Almeida Revista e Atualizada' },
  { id: 'ARC', nome: 'Almeida Revista e Corrigida' },
  { id: 'NAA', nome: 'Nova Almeida Atualizada' },
]

type LivroJSON = { abbrev: string; chapters: string[][] }

export type Livro = { usfm: string; abrev: string; nome: string }

export const LIVROS: Livro[] = ([
  ['GEN', 'Gn', 'Gênesis'], ['EXO', 'Êx', 'Êxodo'], ['LEV', 'Lv', 'Levítico'],
  ['NUM', 'Nm', 'Números'], ['DEU', 'Dt', 'Deuteronômio'], ['JOS', 'Js', 'Josué'],
  ['JDG', 'Jz', 'Juízes'], ['RUT', 'Rt', 'Rute'], ['1SA', '1Sm', '1 Samuel'],
  ['2SA', '2Sm', '2 Samuel'], ['1KI', '1Rs', '1 Reis'], ['2KI', '2Rs', '2 Reis'],
  ['1CH', '1Cr', '1 Crônicas'], ['2CH', '2Cr', '2 Crônicas'], ['EZR', 'Ed', 'Esdras'],
  ['NEH', 'Ne', 'Neemias'], ['EST', 'Et', 'Ester'], ['JOB', 'Jó', 'Jó'],
  ['PSA', 'Sl', 'Salmos'], ['PRO', 'Pv', 'Provérbios'], ['ECC', 'Ec', 'Eclesiastes'],
  ['SNG', 'Ct', 'Cânticos'], ['ISA', 'Is', 'Isaías'], ['JER', 'Jr', 'Jeremias'],
  ['LAM', 'Lm', 'Lamentações'], ['EZK', 'Ez', 'Ezequiel'], ['DAN', 'Dn', 'Daniel'],
  ['HOS', 'Os', 'Oseias'], ['JOL', 'Jl', 'Joel'], ['AMO', 'Am', 'Amós'],
  ['OBA', 'Ob', 'Obadias'], ['JON', 'Jn', 'Jonas'], ['MIC', 'Mq', 'Miqueias'],
  ['NAM', 'Na', 'Naum'], ['HAB', 'Hc', 'Habacuque'], ['ZEP', 'Sf', 'Sofonias'],
  ['HAG', 'Ag', 'Ageu'], ['ZEC', 'Zc', 'Zacarias'], ['MAL', 'Ml', 'Malaquias'],
  ['MAT', 'Mt', 'Mateus'], ['MRK', 'Mc', 'Marcos'], ['LUK', 'Lc', 'Lucas'],
  ['JHN', 'Jo', 'João'], ['ACT', 'At', 'Atos'], ['ROM', 'Rm', 'Romanos'],
  ['1CO', '1Co', '1 Coríntios'], ['2CO', '2Co', '2 Coríntios'], ['GAL', 'Gl', 'Gálatas'],
  ['EPH', 'Ef', 'Efésios'], ['PHP', 'Fp', 'Filipenses'], ['COL', 'Cl', 'Colossenses'],
  ['1TH', '1Ts', '1 Tessalonicenses'], ['2TH', '2Ts', '2 Tessalonicenses'],
  ['1TI', '1Tm', '1 Timóteo'], ['2TI', '2Tm', '2 Timóteo'], ['TIT', 'Tt', 'Tito'],
  ['PHM', 'Fm', 'Filemom'], ['HEB', 'Hb', 'Hebreus'], ['JAS', 'Tg', 'Tiago'],
  ['1PE', '1Pe', '1 Pedro'], ['2PE', '2Pe', '2 Pedro'], ['1JN', '1Jo', '1 João'],
  ['2JN', '2Jo', '2 João'], ['3JN', '3Jo', '3 João'], ['JUD', 'Jd', 'Judas'],
  ['REV', 'Ap', 'Apocalipse'],
] as const).map(([usfm, abrev, nome]) => ({ usfm, abrev, nome }))

export const nomeDoLivro = (usfm: string) =>
  LIVROS.find((l) => l.usfm === usfm)?.nome ?? usfm

/* ── Carregamento: baixa cada versão uma vez e guarda em memória ── */

const cache = new Map<VersaoId, Promise<LivroJSON[]>>()

export function carregarVersao(versao: VersaoId): Promise<LivroJSON[]> {
  let p = cache.get(versao)
  if (!p) {
    p = fetch(`${import.meta.env.BASE_URL}biblia/${versao}.json`).then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      return r.json()
    })
    // Se falhar, tira do cache para tentar de novo quando a rede voltar
    p.catch(() => cache.delete(versao))
    cache.set(versao, p)
  }
  return p
}

function acharLivro(dados: LivroJSON[], usfm: string) {
  const i = LIVROS.findIndex((l) => l.usfm === usfm)
  if (i < 0) return undefined
  const abrev = LIVROS[i].abrev.toLowerCase()
  // Procura pela abreviação; se não achar, usa a posição do livro
  return dados.find((b) => b.abbrev?.toLowerCase() === abrev) ?? dados[i]
}

export async function lerCapitulo(versao: VersaoId, usfm: string, capitulo: number) {
  const dados = await carregarVersao(versao)
  return acharLivro(dados, usfm)?.chapters[capitulo - 1] ?? []
}

export async function totalCapitulos(versao: VersaoId, usfm: string) {
  const dados = await carregarVersao(versao)
  return acharLivro(dados, usfm)?.chapters.length ?? 0
}

/* ── Referências: entende "Jo 3:16", "1 Co 13.4-7", "salmo 23" ── */

export type Referencia = { livro: string; capitulo: number; inicio?: number; fim?: number }

const semAcento = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
const chave = (s: string) => s.toLowerCase().replace(/[\s.]/g, '')

const APELIDOS: Record<string, string> = {
  jo: 'JHN', salmo: 'PSA', cantares: 'SNG', cantico: 'SNG',
  canticodoscanticos: 'SNG', canticosdoscanticos: 'SNG',
}

export function acharLivroPorNome(texto: string): string | null {
  const comAcento = chave(texto)
  if (!comAcento) return null
  // 1) Exato com acento (diferencia "Jó" de "Jo")
  for (const l of LIVROS)
    if (chave(l.abrev) === comAcento || chave(l.nome) === comAcento) return l.usfm
  // 2) Exato sem acento, e apelidos
  const sem = semAcento(comAcento)
  if (APELIDOS[sem]) return APELIDOS[sem]
  for (const l of LIVROS)
    if (semAcento(chave(l.abrev)) === sem || semAcento(chave(l.nome)) === sem) return l.usfm
  // 3) Começo do nome ("jer" → Jeremias), a partir de 3 letras
  if (sem.length >= 3)
    for (const l of LIVROS) if (semAcento(chave(l.nome)).startsWith(sem)) return l.usfm
  return null
}

export function parseReferencia(texto: string): Referencia | null {
  const m = texto.match(
    /^\s*(\d?\s*[^\d\s][^\d]*?)\s*(\d+)(?:\s*[:.,]\s*(\d+)(?:\s*[-–]\s*(\d+))?)?\s*$/
  )
  if (!m) return null
  const livro = acharLivroPorNome(m[1])
  if (!livro) return null
  const capitulo = parseInt(m[2])
  const inicio = m[3] ? parseInt(m[3]) : undefined
  let fim = m[4] ? parseInt(m[4]) : undefined
  if (inicio && fim && fim < inicio) fim = undefined
  return { livro, capitulo, inicio, fim }
}

export function formatarReferencia(r: Referencia) {
  let s = `${nomeDoLivro(r.livro)} ${r.capitulo}`
  if (r.inicio) s += `:${r.inicio}`
  if (r.inicio && r.fim && r.fim !== r.inicio) s += `-${r.fim}`
  return s
}

/* Texto de uma referência, versículo por versículo */
export async function lerReferencia(versao: VersaoId, r: Referencia) {
  const versos = await lerCapitulo(versao, r.livro, r.capitulo)
  const de = r.inicio ?? 1
  const ate = r.fim ?? r.inicio ?? versos.length
  return versos
    .slice(de - 1, ate)
    .map((texto, i) => ({ numero: de + i, texto }))
}
/* ── Busca por palavras em toda a versão (funciona sem internet depois de baixada) ── */

export type Achado = { livro: string; capitulo: number; versiculo: number; texto: string }

const normalizar = (s: string) => semAcento(s.toLowerCase())

export async function buscarTexto(versao: VersaoId, consulta: string, limite = 300) {
  const palavras = normalizar(consulta).split(/\s+/).filter((p) => p.length > 1)
  if (!palavras.length) return { achados: [] as Achado[], total: 0 }
  const dados = await carregarVersao(versao)
  const achados: Achado[] = []
  let total = 0
  LIVROS.forEach((l) => {
    const livro = acharLivro(dados, l.usfm)
    livro?.chapters.forEach((versos, c) => {
      versos.forEach((texto, v) => {
        const t = normalizar(texto)
        if (palavras.every((p) => t.includes(p))) {
          total++
          if (achados.length < limite) achados.push({ livro: l.usfm, capitulo: c + 1, versiculo: v + 1, texto })
        }
      })
    })
  })
  return { achados, total }
}

/* Vários versículos num campo só, separados por ponto e vírgula: "Jo 3:16; Rm 8:28" */
export const dividirReferencias = (texto?: string | null) =>
  (texto ?? '').split(/[;\n]/).map((s) => s.trim()).filter(Boolean)
