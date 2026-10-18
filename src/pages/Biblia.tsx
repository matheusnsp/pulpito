import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  Check, ChevronDown, ChevronLeft, ChevronRight, CloudDownload, Copy, Highlighter, Minus, Plus, Search,
  Share2, X,
} from 'lucide-react'
import {
  LIVROS, VERSOES, type VersaoId, type Achado, buscarTexto, lerCapitulo, totalCapitulos, parseReferencia, nomeDoLivro,
} from '../lib/biblia'
import { usePinca } from '../lib/pinca'

const CHAVE_VERSAO = 'pulpito-versao'
const CHAVE_MARCADOS = 'pulpito-marcados'
const CHAVE_POSICAO = 'pulpito-biblia-posicao'
const CHAVE_ESCALA = 'pulpito-biblia-escala'
const ESCALA_MIN = 0.8
const ESCALA_MAX = 2.2
const AT = LIVROS.slice(0, 39)
const NT = LIVROS.slice(39)

type Resultado = { chave: string; versos: string[]; total: number; erro: boolean }
type Destaque = { inicio: number; fim: number } | null

function lerJSON<T>(chave: string, padrao: T): T {
  try { return JSON.parse(localStorage.getItem(chave) || 'null') ?? padrao }
  catch { return padrao }
}

/* [1, 2, 3, 5] → "1-3,5" */
function faixas(nums: number[]) {
  const ord = [...nums].sort((a, b) => a - b)
  const partes: string[] = []
  for (let i = 0; i < ord.length; i++) {
    const ini = ord[i]
    while (ord[i + 1] === ord[i] + 1) i++
    partes.push(ini === ord[i] ? `${ini}` : `${ini}-${ord[i]}`)
  }
  return partes.join(',')
}

const semAcento = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

/* Destaca as palavras buscadas no texto (ignorando acentos) */
function Destacado({ texto, palavras }: { texto: string; palavras: string[] }) {
  const base = semAcento(texto)
  const marcas = new Array(texto.length).fill(false)
  for (const p of palavras) {
    let i = base.indexOf(p)
    while (i >= 0) { for (let k = i; k < i + p.length; k++) marcas[k] = true; i = base.indexOf(p, i + p.length) }
  }
  const partes: { t: string; m: boolean }[] = []
  for (let i = 0; i < texto.length; i++) {
    const ultimo = partes[partes.length - 1]
    if (ultimo && ultimo.m === marcas[i]) ultimo.t += texto[i]
    else partes.push({ t: texto[i], m: marcas[i] })
  }
  return <>{partes.map((p, i) => p.m ? <mark key={i} className="rounded bg-acao/35 px-0.5 text-texto">{p.t}</mark> : p.t)}</>
}

/* ── Resultados da busca por palavras ── */
function Resultados({ versao, consulta, onEscolher, onFechar }: {
  versao: VersaoId
  consulta: string
  onEscolher: (a: Achado) => void
  onFechar: () => void
}) {
  const [res, setRes] = useState<{ achados: Achado[]; total: number } | null>(null)
  const [erro, setErro] = useState(false)
  const palavras = semAcento(consulta).split(/\s+/).filter((p) => p.length > 1)

  useEffect(() => {
    let ativo = true
    buscarTexto(versao, consulta)
      .then((r) => { if (ativo) setRes(r) })
      .catch(() => { if (ativo) setErro(true) })
    return () => { ativo = false }
  }, [versao, consulta])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-[2px] md:items-center" onClick={onFechar}>
      <div onClick={(e) => e.stopPropagation()}
        className="flex max-h-[88dvh] w-full max-w-2xl animate-subir flex-col rounded-t-3xl border border-borda bg-superficie md:animate-entrar md:rounded-3xl">
        <div className="flex items-center gap-3 border-b border-borda p-4">
          <div className="min-w-0 flex-1">
            <p className="rotulo">Busca em {versao}</p>
            <h2 className="truncate font-display text-xl font-extrabold">“{consulta}”</h2>
          </div>
          <button onClick={onFechar} aria-label="Fechar" className="rounded-xl p-2 text-texto-2 hover:bg-superficie-2">
            <X size={20} />
          </button>
        </div>
        <div className="overflow-y-auto p-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {!res && !erro && <p className="py-10 text-center text-texto-2">Procurando…</p>}
          {erro && <p className="py-10 text-center text-perigo">Não foi possível buscar. Verifique a conexão.</p>}
          {res && res.total === 0 && <p className="py-10 text-center text-texto-2">Nenhum versículo com essas palavras.</p>}
          {res && res.total > 0 && (
            <p className="px-3 pb-2 pt-1 text-sm text-texto-2">
              {res.total} {res.total === 1 ? 'versículo' : 'versículos'}
              {res.total > res.achados.length && `, mostrando os ${res.achados.length} primeiros`}
            </p>
          )}
          <ul>
            {res?.achados.map((a) => (
              <li key={`${a.livro}.${a.capitulo}.${a.versiculo}`}>
                <button onClick={() => onEscolher(a)} className="w-full rounded-xl px-3 py-2.5 text-left hover:bg-superficie-2">
                  <span className="text-sm font-bold text-tinta">{nomeDoLivro(a.livro)} {a.capitulo}:{a.versiculo}</span>
                  <span className="mt-0.5 line-clamp-3 block font-escritura leading-relaxed text-texto/90">
                    <Destacado texto={a.texto} palavras={palavras} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

/* ── Seletor de livro e capítulo ── */
function Seletor({ versao, livroAtual, onEscolher, onFechar }: {
  versao: VersaoId
  livroAtual: string
  onEscolher: (livro: string, capitulo: number) => void
  onFechar: () => void
}) {
  const [livro, setLivro] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [filtro, setFiltro] = useState('')

  useEffect(() => {
    if (!livro) return
    let ativo = true
    totalCapitulos(versao, livro).then((t) => { if (ativo) setTotal(t) }).catch(() => {})
    return () => { ativo = false }
  }, [livro, versao])

  const sem = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  const f = sem(filtro.trim())
  const passa = (l: (typeof LIVROS)[number]) => !f || sem(l.nome).includes(f) || sem(l.abrev).startsWith(f)

  const botaoLivro = (l: (typeof LIVROS)[number]) => (
    <button key={l.usfm} onClick={() => { setTotal(0); setLivro(l.usfm) }}
      className={`truncate rounded-xl px-3 py-2.5 text-left text-sm font-bold transition-colors ${l.usfm === livroAtual
        ? 'bg-acao text-acao-texto' : 'bg-superficie-2/70 hover:bg-superficie-2'}`}>
      {l.nome}
    </button>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-[2px] md:items-center" onClick={onFechar}>
      <div onClick={(e) => e.stopPropagation()}
        className="flex max-h-[88dvh] w-full max-w-2xl animate-subir flex-col rounded-t-3xl border border-borda bg-superficie md:animate-entrar md:rounded-3xl">
        <div className="flex items-center gap-2 border-b border-borda p-4">
          {livro ? (
            <>
              <button onClick={() => setLivro(null)} aria-label="Voltar para os livros"
                className="rounded-xl p-2 text-texto-2 hover:bg-superficie-2"><ChevronLeft size={20} /></button>
              <h2 className="flex-1 font-display text-xl font-extrabold">{nomeDoLivro(livro)}</h2>
            </>
          ) : (
            <div className="relative flex-1">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-texto-2" />
              <input value={filtro} onChange={(e) => setFiltro(e.target.value)}
                placeholder="Procurar livro" className="campo py-2 pl-9" />
            </div>
          )}
          <button onClick={onFechar} aria-label="Fechar" className="rounded-xl p-2 text-texto-2 hover:bg-superficie-2">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          {!livro && (
            <>
              {AT.some(passa) && <p className="rotulo mb-2">Antigo Testamento</p>}
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">{AT.filter(passa).map(botaoLivro)}</div>
              {NT.some(passa) && <p className="rotulo mb-2 mt-5">Novo Testamento</p>}
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">{NT.filter(passa).map(botaoLivro)}</div>
            </>
          )}
          {livro && (
            <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-8">
              {total === 0 && <p className="col-span-full py-6 text-center text-texto-2">Carregando…</p>}
              {Array.from({ length: total }, (_, i) => (
                <button key={i} onClick={() => onEscolher(livro, i + 1)}
                  className="aspect-square rounded-xl bg-superficie-2/70 font-display font-bold tabular-nums hover:bg-acao hover:text-acao-texto">
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Biblia() {
  const [inicial] = useState(() => lerJSON(CHAVE_POSICAO, { livro: 'JHN', capitulo: 1 }))
  const [versao, setVersao] = useState<VersaoId>(
    () => (localStorage.getItem(CHAVE_VERSAO) as VersaoId) || 'ARA'
  )
  const [livro, setLivro] = useState(inicial.livro)
  const [capitulo, setCapitulo] = useState(inicial.capitulo)
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const [destaque, setDestaque] = useState<Destaque>(null)
  const [busca, setBusca] = useState('')
  const [erroBusca, setErroBusca] = useState('')
  const [marcados, setMarcados] = useState<Set<string>>(() => new Set(lerJSON<string[]>(CHAVE_MARCADOS, [])))
  const [selecao, setSelecao] = useState<number[]>([])
  const [escala, setEscala] = useState(() => Number(localStorage.getItem(CHAVE_ESCALA)) || 1)
  const [seletor, setSeletor] = useState(false)
  const [buscaPalavras, setBuscaPalavras] = useState<string | null>(null)
  const [aviso, setAviso] = useState('')
  const [download, setDownload] = useState<'' | 'baixando' | 'ok' | 'erro'>('')
  const toque = useRef<{ x: number; y: number } | null>(null)
  const texto = useRef<HTMLElement>(null)
  const multitoque = useRef(false)
  const [indicador, setIndicador] = useState(false)
  const timerIndicador = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const topo = useRef<HTMLDivElement>(null)

  const chaveAtual = `${versao}.${livro}.${capitulo}`
  const carregando = resultado?.chave !== chaveAtual
  const versos = carregando ? [] : resultado?.versos ?? []
  const nomeCap = `${nomeDoLivro(livro)} ${capitulo}`
  const ehPrimeiro = livro === 'GEN' && capitulo === 1
  const ehUltimo = livro === 'REV' && !!resultado && !carregando && capitulo >= resultado.total

  useEffect(() => { localStorage.setItem(CHAVE_VERSAO, versao) }, [versao])
  useEffect(() => { localStorage.setItem(CHAVE_ESCALA, String(escala)) }, [escala])

  function mudarEscala(n: number) {
    setEscala(Math.round(Math.min(ESCALA_MAX, Math.max(ESCALA_MIN, n)) * 100) / 100)
    setIndicador(true)
    clearTimeout(timerIndicador.current)
    timerIndicador.current = setTimeout(() => setIndicador(false), 900)
  }
  usePinca(texto, escala, mudarEscala, { min: ESCALA_MIN, max: ESCALA_MAX })
  useEffect(() => { localStorage.setItem(CHAVE_POSICAO, JSON.stringify({ livro, capitulo })) }, [livro, capitulo])
  useEffect(() => { localStorage.setItem(CHAVE_MARCADOS, JSON.stringify([...marcados])) }, [marcados])

  useEffect(() => {
    let ativo = true
    Promise.all([lerCapitulo(versao, livro, capitulo), totalCapitulos(versao, livro)])
      .then(([v, t]) => { if (ativo) setResultado({ chave: chaveAtual, versos: v, total: t, erro: false }) })
      .catch(() => { if (ativo) setResultado({ chave: chaveAtual, versos: [], total: 0, erro: true }) })
    return () => { ativo = false }
  }, [versao, livro, capitulo, chaveAtual])

  // Ao trocar de capítulo: rola até o versículo buscado, ou volta ao topo
  useEffect(() => {
    if (carregando) return
    if (destaque) document.getElementById(`v-${destaque.inicio}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    else topo.current?.scrollIntoView({ block: 'start' })
  }, [carregando, destaque])

  function avisar(t: string) {
    setAviso(t)
    setTimeout(() => setAviso(''), 2200)
  }

  function ir(l: string, c: number, d: Destaque = null) {
    setLivro(l); setCapitulo(c); setDestaque(d); setSelecao([])
  }

  function irPara(e: FormEvent) {
    e.preventDefault()
    const ref = parseReferencia(busca)
    if (!ref) {
      if (busca.trim().length < 3) { setErroBusca('Digite uma referência ("Jo 3:16") ou palavras para buscar.'); return }
      setErroBusca('')
      ;(document.activeElement as HTMLElement | null)?.blur()
      setBuscaPalavras(busca.trim())
      return
    }
    setErroBusca('')
    setBusca('')
    ;(document.activeElement as HTMLElement | null)?.blur()
    ir(ref.livro, ref.capitulo, ref.inicio ? { inicio: ref.inicio, fim: ref.fim ?? ref.inicio } : null)
  }

  async function anterior() {
    if (ehPrimeiro) return
    if (capitulo > 1) return ir(livro, capitulo - 1)
    const i = LIVROS.findIndex((l) => l.usfm === livro)
    const prev = LIVROS[i - 1].usfm
    ir(prev, Math.max(await totalCapitulos(versao, prev), 1))
  }

  function proximo() {
    if (ehUltimo || carregando) return
    if (resultado && capitulo < resultado.total) return ir(livro, capitulo + 1)
    const i = LIVROS.findIndex((l) => l.usfm === livro)
    if (i < LIVROS.length - 1) ir(LIVROS[i + 1].usfm, 1)
  }

  // Setas do teclado mudam de capítulo; Esc limpa a seleção
  useEffect(() => {
    function tecla(e: KeyboardEvent) {
      if ((e.target as HTMLElement).closest('input, textarea, select') || seletor || buscaPalavras) return
      if (e.key === 'ArrowRight') proximo()
      if (e.key === 'ArrowLeft') anterior()
      if (e.key === 'Escape') setSelecao([])
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  })

  function alternarSelecao(n: number) {
    setSelecao((s) => (s.includes(n) ? s.filter((x) => x !== n) : [...s, n]))
  }

  const ordenada = [...selecao].sort((a, b) => a - b)
  const refSelecao = `${nomeCap}:${faixas(ordenada)}`
  const textoSelecao = () =>
    `${ordenada.map((n) => `${ordenada.length > 1 ? `${n} ` : ''}${versos[n - 1]}`).join(' ')}\n— ${refSelecao} (${versao})`

  async function copiar() {
    try {
      await navigator.clipboard.writeText(textoSelecao())
      avisar('Copiado')
      setSelecao([])
    } catch { avisar('Não foi possível copiar') }
  }

  async function compartilhar() {
    if (!navigator.share) return copiar()
    try { await navigator.share({ text: textoSelecao() }); setSelecao([]) } catch { /* cancelado */ }
  }

  const todosMarcados = ordenada.length > 0 && ordenada.every((n) => marcados.has(`${livro}.${capitulo}.${n}`))

  function marcar() {
    const ids = ordenada.map((n) => `${livro}.${capitulo}.${n}`)
    setMarcados((atual) => {
      const novo = new Set(atual)
      ids.forEach((id) => (todosMarcados ? novo.delete(id) : novo.add(id)))
      return novo
    })
    setSelecao([])
  }

  async function baixarTodas() {
    setDownload('baixando')
    try {
      await Promise.all(VERSOES.map((v) =>
        fetch(`${import.meta.env.BASE_URL}biblia/${v.id}.json`).then((r) => { if (!r.ok) throw new Error() })))
      setDownload('ok')
    } catch { setDownload('erro') }
  }

  const botaoNav = 'flex h-11 w-11 items-center justify-center rounded-full border border-borda bg-superficie text-texto-2 shadow-cartao hover:text-texto disabled:opacity-30'

  return (
    <div className="mx-auto max-w-3xl px-4 pb-10 pt-2 md:px-8 md:pt-10">
      <div ref={topo} className="scroll-mt-4" />

      {/* Topo: busca, versão e tamanho da letra */}
      <div className="flex flex-wrap items-center gap-2">
        <form onSubmit={irPara} className="relative min-w-0 flex-1 basis-56">
          <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-texto-2" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} enterKeyHint="go"
            placeholder='"Jo 3:16" ou palavras' className="campo rounded-2xl pl-10" />
        </form>
        <div role="radiogroup" aria-label="Versão" className="inline-flex rounded-xl border border-borda bg-superficie p-1">
          {VERSOES.map((v) => (
            <button key={v.id} role="radio" aria-checked={versao === v.id} title={v.nome}
              onClick={() => setVersao(v.id)}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors ${versao === v.id
                ? 'bg-texto text-fundo' : 'text-texto-2 hover:text-texto'}`}>
              {v.id}
            </button>
          ))}
        </div>
        <div className="inline-flex items-center rounded-xl border border-borda bg-superficie p-1">
          <button onClick={() => mudarEscala(escala - 0.1)} disabled={escala <= ESCALA_MIN} aria-label="Diminuir letra"
            className="rounded-lg p-1.5 text-texto-2 hover:text-texto disabled:opacity-30"><Minus size={16} /></button>
          <span className="px-1 font-escritura text-sm font-semibold" aria-hidden>A</span>
          <button onClick={() => mudarEscala(escala + 0.1)} disabled={escala >= ESCALA_MAX}
            aria-label="Aumentar letra" className="rounded-lg p-1.5 text-texto-2 hover:text-texto disabled:opacity-30"><Plus size={16} /></button>
        </div>
      </div>
      {erroBusca && <p className="mt-2 text-sm text-perigo">{erroBusca}</p>}

      {/* Título do capítulo: toque para escolher livro e capítulo */}
      <div className="mt-8 flex items-center justify-between gap-3">
        <button onClick={anterior} disabled={ehPrimeiro} aria-label="Capítulo anterior" className={`${botaoNav} hidden md:flex`}>
          <ChevronLeft size={22} />
        </button>
        <button onClick={() => setSeletor(true)} className="group mx-auto text-center">
          <span className="rotulo">{versao} · toque para trocar</span>
          <span className="mt-1 flex items-center justify-center gap-1.5 font-display text-3xl font-extrabold tracking-tight md:text-4xl">
            {nomeCap}
            <ChevronDown size={24} className="text-texto-2 transition group-hover:translate-y-0.5" />
          </span>
        </button>
        <button onClick={proximo} disabled={ehUltimo} aria-label="Próximo capítulo" className={`${botaoNav} hidden md:flex`}>
          <ChevronRight size={22} />
        </button>
      </div>

      {/* Texto: toque nos versículos para selecionar, deslize para trocar de capítulo */}
      <article ref={texto} className="mt-6 touch-pan-y"
        onTouchStart={(e) => {
          if (e.touches.length > 1) multitoque.current = true
          else { multitoque.current = false; toque.current = { x: e.touches[0].clientX, y: e.touches[0].clientY } }
        }}
        onTouchEnd={(e) => {
          const t = toque.current
          if (e.touches.length === 0) toque.current = null
          if (!t || multitoque.current || e.touches.length > 0) return
          const dx = e.changedTouches[0].clientX - t.x
          const dy = e.changedTouches[0].clientY - t.y
          if (Math.abs(dx) > 80 && Math.abs(dx) > Math.abs(dy) * 1.5) {
            if (dx < 0) proximo()
            else anterior()
          }
        }}>
        {carregando && (
          <div className="space-y-3" aria-label="Carregando">
            {[92, 100, 85, 97, 70, 88].map((w, i) => (
              <div key={i} className="h-5 animate-pulse rounded-md bg-superficie-2" style={{ width: `${w}%` }} />
            ))}
          </div>
        )}
        {!carregando && resultado?.erro && (
          <p className="rounded-2xl bg-perigo/10 p-4 text-perigo">Não foi possível carregar a versão {versao}. Verifique a conexão.</p>
        )}
        {!carregando && !resultado?.erro && versos.length === 0 && (
          <p className="text-texto-2">Capítulo não encontrado.</p>
        )}

        <div className="font-escritura leading-[1.85]" style={{ fontSize: `${1.125 * escala}rem` }}>
          {versos.map((texto, i) => {
            const n = i + 1
            const id = `${livro}.${capitulo}.${n}`
            const emDestaque = !!destaque && n >= destaque.inicio && n <= destaque.fim
            const selecionado = selecao.includes(n)
            const marcado = marcados.has(id)
            return (
              <span key={id} id={`v-${n}`} onClick={() => alternarSelecao(n)}
                className={`cursor-pointer rounded-md decoration-acao decoration-2 underline-offset-[6px] transition-colors
                  ${marcado ? 'bg-ouro-suave' : ''}
                  ${emDestaque && !selecionado ? 'bg-acao/20' : ''}
                  ${selecionado ? 'underline decoration-dotted' : 'hover:bg-superficie-2'}`}>
                <sup className="mr-1 select-none font-sans text-[0.6em] font-bold text-tinta">{n}</sup>
                {texto}{' '}
              </span>
            )
          })}
        </div>
      </article>

      {/* Navegação entre capítulos */}
      {!carregando && versos.length > 0 && (
        <div className="mt-10 grid grid-cols-2 gap-3">
          <button onClick={anterior} disabled={ehPrimeiro} className="botao-secundario justify-start">
            <ChevronLeft size={18} /> Anterior
          </button>
          <button onClick={proximo} disabled={ehUltimo} className="botao-secundario justify-end">
            Próximo <ChevronRight size={18} />
          </button>
        </div>
      )}
      <p className="mt-3 text-center text-xs text-texto-2 md:hidden">Deslize para os lados para trocar de capítulo</p>

      <button onClick={baixarTodas} disabled={download === 'baixando' || download === 'ok'}
        className="mx-auto mt-8 flex items-center gap-2 text-sm font-semibold text-texto-2 hover:text-texto disabled:opacity-70">
        {download === 'ok' ? <Check size={16} className="text-sucesso" /> : <CloudDownload size={16} />}
        {{
          '': 'Baixar todas as versões para usar sem internet',
          baixando: 'Baixando…',
          ok: 'Versões salvas neste aparelho',
          erro: 'Falha ao baixar. Tente com internet.',
        }[download]}
      </button>

      {/* Ações da seleção */}
      {selecao.length > 0 && (
        <div className="fixed inset-x-3 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-30 mx-auto flex max-w-lg animate-entrar items-center gap-1 rounded-2xl bg-texto p-1.5 pl-4 text-fundo shadow-2xl md:bottom-6">
          <span className="min-w-0 flex-1 truncate text-sm font-bold">{refSelecao}</span>
          <button onClick={copiar} aria-label="Copiar" title="Copiar" className="rounded-xl p-2.5 hover:bg-fundo/15"><Copy size={18} /></button>
          <button onClick={compartilhar} aria-label="Compartilhar" title="Compartilhar" className="rounded-xl p-2.5 hover:bg-fundo/15"><Share2 size={18} /></button>
          <button onClick={marcar} aria-label={todosMarcados ? 'Desmarcar' : 'Marcar'} title={todosMarcados ? 'Desmarcar' : 'Marcar'}
            className={`rounded-xl p-2.5 hover:bg-fundo/15 ${todosMarcados ? 'text-acao' : ''}`}><Highlighter size={18} /></button>
          <button onClick={() => setSelecao([])} aria-label="Limpar seleção" className="rounded-xl p-2.5 hover:bg-fundo/15"><X size={18} /></button>
        </div>
      )}

      {indicador && (
        <div aria-hidden className="pointer-events-none fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-texto/85 px-5 py-3 font-display text-2xl font-extrabold tabular-nums text-fundo shadow-xl">
          {Math.round(escala * 100)}%
        </div>
      )}

      {aviso && (
        <div role="status" className="fixed left-1/2 top-6 z-50 -translate-x-1/2 animate-entrar rounded-full bg-texto px-4 py-2 text-sm font-bold text-fundo shadow-xl">
          {aviso}
        </div>
      )}

      {buscaPalavras && (
        <Resultados versao={versao} consulta={buscaPalavras} onFechar={() => setBuscaPalavras(null)}
          onEscolher={(a) => {
            setBuscaPalavras(null)
            setBusca('')
            ir(a.livro, a.capitulo, { inicio: a.versiculo, fim: a.versiculo })
          }} />
      )}

      {seletor && (
        <Seletor versao={versao} livroAtual={livro} onFechar={() => setSeletor(false)}
          onEscolher={(l, c) => { setSeletor(false); ir(l, c) }} />
      )}
    </div>
  )
}
