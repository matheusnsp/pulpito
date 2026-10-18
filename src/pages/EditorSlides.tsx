import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowDown, ArrowUp, Check, ChevronLeft, CircleAlert, Copy, ImagePlus, ListPlus, LoaderCircle,
  Play, Plus, Redo2, Trash2, Undo2, Upload, X,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useSalvamento } from '../lib/salvamento'
import { useHistorico } from '../lib/historico'
import { lerArquivos } from '../lib/importar'
import SlideVisual from '../components/SlideVisual'
import {
  ESTILO_PADRAO, FUNDOS_PRONTOS, type EstiloSlide, type Mensagem, type Slide, type Topico,
} from '../lib/tipos'
import { formatarReferencia, lerReferencia, parseReferencia, type VersaoId } from '../lib/biblia'

const CORES_TEXTO = ['#ffffff', '#000000', '#fde68a', '#7dd3fc', '#fca5a5']
const CAMPOS_SLIDE = ['topico_id', 'ordem', 'titulo', 'subtitulo', 'texto', 'fundo', 'estilo'] as const
const versaoAtual = () => (localStorage.getItem('pulpito-versao') as VersaoId) || 'ARA'
const botaoPequeno = 'botao-secundario px-3 py-1.5 text-sm'
const iconeBotao = 'flex h-9 w-9 items-center justify-center rounded-xl text-texto-2 hover:bg-superficie-2 hover:text-texto disabled:opacity-25'
const diferente = (a: unknown, b: unknown) => JSON.stringify(a) !== JSON.stringify(b)

function referenciaBonita(ref: string | null) {
  const r = ref ? parseReferencia(ref) : null
  return r ? formatarReferencia(r) : ref?.trim() || null
}

async function textoDoVersiculo(ref: string | null) {
  const r = ref ? parseReferencia(ref) : null
  if (!r?.inicio) return ''
  try {
    const vs = await lerReferencia(versaoAtual(), r)
    let t = vs.map((v) => v.texto).join(' ')
    if (t.length > 400) t = t.slice(0, 400).trimEnd() + '…'
    return t
  } catch {
    return ''
  }
}

function Campo({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-texto-2">{rotulo}</span>
      {children}
    </label>
  )
}

function Segmentos<T extends string>({ valor, opcoes, onChange }: {
  valor: T; opcoes: { valor: T; rotulo: string }[]; onChange: (v: T) => void
}) {
  return (
    <div className="inline-flex rounded-xl border border-borda bg-superficie p-1">
      {opcoes.map((o) => (
        <button key={o.valor} onClick={() => onChange(o.valor)} aria-pressed={valor === o.valor}
          className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${valor === o.valor
            ? 'bg-acao text-acao-texto' : 'text-texto-2 hover:text-texto'}`}>
          {o.rotulo}
        </button>
      ))}
    </div>
  )
}

export default function EditorSlides() {
  const { id } = useParams()
  const { sessao } = useAuth()
  const { status, agendar, cancelar } = useSalvamento()
  const historico = useHistorico<Slide[]>()
  const [mensagem, setMensagem] = useState<Mensagem | null | undefined>(undefined)
  const [topicos, setTopicos] = useState<Topico[]>([])
  const [slides, setSlides] = useState<Slide[]>([])
  const [selId, setSelId] = useState<string | null>(null)
  const [comFrase, setComFrase] = useState(false)
  const [gerando, setGerando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [painelImportar, setPainelImportar] = useState(false)
  const [destinoImport, setDestinoImport] = useState('')
  const [importando, setImportando] = useState<string | null>(null)
  const [erro, setErro] = useState('')
  const arquivo = useRef<HTMLInputElement>(null)
  const arquivoImport = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let ativo = true
    Promise.all([
      supabase.from('mensagens').select('*').eq('id', id!).maybeSingle(),
      supabase.from('topicos').select('*').eq('mensagem_id', id!).order('ordem'),
      supabase.from('slides').select('*').eq('mensagem_id', id!).order('ordem'),
    ]).then(([m, t, s]) => {
      if (!ativo) return
      const lista = (s.data as Slide[]) ?? []
      setMensagem((m.data as Mensagem) ?? null)
      setTopicos((t.data as Topico[]) ?? [])
      setSlides(lista)
      setSelId(lista[0]?.id ?? null)
    })
    return () => { ativo = false }
  }, [id])

  // Atalhos de teclado: Cmd/Ctrl + Z desfaz; com Shift (ou Ctrl + Y) refaz
  useEffect(() => {
    function tecla(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey)) return
      const k = e.key.toLowerCase()
      if (k === 'z' && !e.shiftKey) { e.preventDefault(); desfazerAgora() }
      else if ((k === 'z' && e.shiftKey) || k === 'y') { e.preventDefault(); refazerAgora() }
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  })

  const sel = slides.find((s) => s.id === selId) ?? slides[0] ?? null
  const iSel = sel ? slides.findIndex((s) => s.id === sel.id) : -1
  const estilo = { ...ESTILO_PADRAO, ...(sel?.estilo ?? {}) }
  const imagemAtual = sel?.fundo?.startsWith('img:') ? sel.fundo.slice(4) : null

  function rotuloTopico(topicoId: string | null) {
    if (!topicoId) return 'Capa'
    const i = topicos.findIndex((t) => t.id === topicoId)
    return i < 0 ? 'Tópico removido' : `Tópico ${i + 1}`
  }

  function alterar(sid: string, campos: Partial<Slide>) {
    const chave = `s:${sid}:${Object.keys(campos).join(',')}`
    historico.registrar(slides, chave)
    setSlides((lista) => lista.map((s) => (s.id === sid ? { ...s, ...campos } : s)))
    agendar(chave, () => supabase.from('slides').update(campos).eq('id', sid))
  }

  function alterarEstilo(campos: Partial<EstiloSlide>) {
    if (!sel) return
    alterar(sel.id, { estilo: { ...sel.estilo, ...campos } })
  }

  function salvarOrdem(nova: Slide[]) {
    const renumerada = nova.map((s, k) => ({ ...s, ordem: k }))
    renumerada.forEach((s) => {
      const antigo = slides.find((o) => o.id === s.id)
      if (antigo && antigo.ordem !== s.ordem)
        agendar(`s:${s.id}:ordem`, () => supabase.from('slides').update({ ordem: s.ordem }).eq('id', s.id))
    })
    return renumerada
  }

  async function inserirDepois(base: Partial<Slide>) {
    const antes = slides
    const pos = iSel >= 0 ? iSel + 1 : slides.length
    setErro('')
    const { data, error } = await supabase.from('slides').insert({
      mensagem_id: id,
      topico_id: base.topico_id !== undefined ? base.topico_id : sel?.topico_id ?? null,
      ordem: pos,
      titulo: base.titulo ?? 'Novo slide',
      subtitulo: base.subtitulo ?? null,
      texto: base.texto ?? null,
      fundo: base.fundo ?? sel?.fundo ?? '#000000',
      estilo: base.estilo ?? sel?.estilo ?? {},
    }).select().single()
    if (error || !data) { setErro('Não foi possível criar o slide.'); return }
    historico.registrar(antes)
    const lista = [...slides]
    lista.splice(pos, 0, data as Slide)
    setSlides(salvarOrdem(lista))
    setSelId(data.id)
  }

  async function excluir() {
    if (!sel) return
    historico.registrar(slides)
    cancelar(`s:${sel.id}:`)
    const restantes = slides.filter((s) => s.id !== sel.id)
    setSlides(salvarOrdem(restantes))
    setSelId(restantes[Math.min(iSel, restantes.length - 1)]?.id ?? null)
    const { error } = await supabase.from('slides').delete().eq('id', sel.id)
    if (error) setErro('Não foi possível excluir.')
  }

  function mover(dir: -1 | 1) {
    const j = iSel + dir
    if (iSel < 0 || j < 0 || j >= slides.length) return
    historico.registrar(slides)
    const lista = [...slides]
    ;[lista[iSel], lista[j]] = [lista[j], lista[iSel]]
    setSlides(salvarOrdem(lista))
  }

  async function gerar() {
    if (!mensagem) return
    const antes = slides
    setGerando(true)
    setErro('')
    const fundo = sel?.fundo ?? '#000000'
    const estiloBase = sel?.estilo ?? {}
    const linhas: Omit<Slide, 'id'>[] = []

    linhas.push({
      mensagem_id: mensagem.id, topico_id: null, ordem: 0, titulo: mensagem.titulo,
      subtitulo: referenciaBonita(mensagem.texto_base), texto: null, fundo, estilo: estiloBase,
    })
    for (const t of topicos) {
      const textoV = await textoDoVersiculo(t.versiculo)
      linhas.push({
        mensagem_id: mensagem.id, topico_id: t.id, ordem: linhas.length,
        titulo: t.titulo || 'Sem título', subtitulo: referenciaBonita(t.versiculo),
        texto: textoV || t.frase_chave?.trim() || null, fundo, estilo: estiloBase,
      })
      if (comFrase && textoV && t.frase_chave?.trim()) {
        linhas.push({
          mensagem_id: mensagem.id, topico_id: t.id, ordem: linhas.length,
          titulo: null, subtitulo: null, texto: t.frase_chave.trim(), fundo, estilo: estiloBase,
        })
      }
    }

    slides.forEach((s) => cancelar(`s:${s.id}:`))
    const apagar = await supabase.from('slides').delete().eq('mensagem_id', mensagem.id)
    if (apagar.error) { setErro('Não foi possível gerar os slides.'); setGerando(false); return }
    const { data, error } = await supabase.from('slides').insert(linhas).select()
    setGerando(false)
    if (error || !data) { setErro('Não foi possível gerar os slides.'); return }
    historico.registrar(antes)
    const lista = (data as Slide[]).sort((a, b) => a.ordem - b.ordem)
    setSlides(lista)
    setSelId(lista[0]?.id ?? null)
  }

  async function aplicarATodos() {
    if (!sel || !mensagem) return
    historico.registrar(slides)
    const { fundo, estilo: est } = sel
    slides.forEach((s) => { cancelar(`s:${s.id}:fundo`); cancelar(`s:${s.id}:estilo`) })
    setSlides((lista) => lista.map((s) => ({ ...s, fundo, estilo: est })))
    const { error } = await supabase.from('slides').update({ fundo, estilo: est }).eq('mensagem_id', mensagem.id)
    if (error) setErro('Não foi possível aplicar a todos.')
  }

  async function enviarImagem(file: File) {
    if (!sel || !sessao) return
    if (!file.type.startsWith('image/')) { setErro('Escolha um arquivo de imagem.'); return }
    if (file.size > 5 * 1024 * 1024) { setErro('Imagem muito grande. O máximo é 5 MB.'); return }
    setEnviando(true)
    setErro('')
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const caminho = `${sessao.user.id}/${crypto.randomUUID()}.${ext}`
    const { error } = await supabase.storage.from('fundos')
      .upload(caminho, file, { cacheControl: '31536000', contentType: file.type })
    setEnviando(false)
    if (error) { setErro('Não foi possível enviar a imagem.'); return }
    const { data } = supabase.storage.from('fundos').getPublicUrl(caminho)
    alterar(sel.id, { fundo: `img:${data.publicUrl}` })
  }

  async function importar(lista: FileList | null) {
    if (!lista?.length || !mensagem || !sessao) return
    const antes = slides
    setErro('')
    try {
      setImportando('Lendo arquivos…')
      const lidos = await lerArquivos(Array.from(lista), setImportando)
      if (!lidos.length) { setErro('Nenhum slide encontrado no arquivo.'); return }

      const linhas: Omit<Slide, 'id'>[] = []
      for (const [i, s] of lidos.entries()) {
        let fundo = sel?.fundo ?? '#000000'
        let est: Partial<EstiloSlide> = sel?.estilo ?? {}
        if (s.imagem) {
          setImportando(`Enviando ${i + 1} de ${lidos.length}…`)
          const caminho = `${sessao.user.id}/${crypto.randomUUID()}.jpg`
          const { error } = await supabase.storage.from('fundos')
            .upload(caminho, s.imagem, { contentType: 'image/jpeg', cacheControl: '31536000' })
          if (error) throw new Error('Falha ao enviar uma das páginas. Verifique a internet.')
          fundo = `img:${supabase.storage.from('fundos').getPublicUrl(caminho).data.publicUrl}`
          est = { escurecer: 0, ajuste: 'conter' }
        }
        linhas.push({
          mensagem_id: mensagem.id, topico_id: destinoImport || null, ordem: slides.length + i,
          titulo: s.titulo ?? null, subtitulo: s.subtitulo ?? null, texto: s.texto ?? null,
          fundo, estilo: est,
        })
      }

      setImportando('Salvando slides…')
      const { data, error } = await supabase.from('slides').insert(linhas).select()
      if (error || !data) throw new Error('Não foi possível salvar os slides.')
      historico.registrar(antes)
      const novos = (data as Slide[]).sort((a, b) => a.ordem - b.ordem)
      setSlides((atual) => [...atual, ...novos])
      setSelId(novos[0].id)
      setPainelImportar(false)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível importar.')
    } finally {
      setImportando(null)
    }
  }

  /* Leva a tela e o banco para uma foto anterior (ou posterior) */
  async function aplicar(destino: Slide[]) {
    const atual = slides
    setSlides(destino)
    if (!destino.some((s) => s.id === selId)) setSelId(destino[0]?.id ?? null)

    const antes = new Map(atual.map((s) => [s.id, s]))
    const depois = new Set(destino.map((s) => s.id))

    for (const s of destino) {
      const a = antes.get(s.id)
      if (!a) continue
      for (const k of CAMPOS_SLIDE) {
        if (diferente(s[k], a[k])) {
          const valor = s[k]
          agendar(`s:${s.id}:${k}`, () => supabase.from('slides').update({ [k]: valor }).eq('id', s.id))
        }
      }
    }

    const recriar = destino.filter((s) => !antes.has(s.id))
    const remover = atual.filter((s) => !depois.has(s.id)).map((s) => s.id)
    remover.forEach((sid) => cancelar(`s:${sid}:`))

    if (recriar.length) {
      const { error } = await supabase.from('slides').upsert(recriar)
      if (error) setErro('Não foi possível restaurar os slides. Verifique a internet.')
    }
    if (remover.length) {
      const { error } = await supabase.from('slides').delete().in('id', remover)
      if (error) setErro('Não foi possível desfazer. Verifique a internet.')
    }
  }

  function desfazerAgora() {
    const f = historico.desfazer(slides)
    if (f) aplicar(f)
  }

  function refazerAgora() {
    const f = historico.refazer(slides)
    if (f) aplicar(f)
  }

  if (mensagem === undefined) return <p className="p-6 text-texto-2">Carregando…</p>
  if (mensagem === null) return (
    <div className="p-6">
      <p className="mb-3">Mensagem não encontrada.</p>
      <Link to="/" className="botao-secundario">Voltar para mensagens</Link>
    </div>
  )

  const indicador = {
    salvo: <><Check size={16} /> Salvo</>,
    salvando: <><LoaderCircle size={16} className="animate-spin" /> Salvando</>,
    erro: <><CircleAlert size={16} /> Não salvou</>,
  }[status]

  const opcoesTopico = (
    <>
      <option value="">Capa</option>
      {topicos.map((t, i) => <option key={t.id} value={t.id}>{i + 1}. {t.titulo || 'Sem título'}</option>)}
    </>
  )

  const blocoGerar = (
    <div className="space-y-3">
      <label className="flex items-center gap-2.5 text-sm">
        <input type="checkbox" checked={comFrase} onChange={(e) => setComFrase(e.target.checked)}
          className="h-4 w-4 accent-[var(--acao)]" />
        Criar também um slide com a frase-chave de cada tópico
      </label>
      <button onClick={gerar} disabled={gerando} className={slides.length ? 'botao-secundario' : 'botao-primario'}>
        <ListPlus size={18} />
        {gerando ? 'Gerando…' : slides.length ? 'Gerar de novo a partir dos tópicos' : 'Gerar a partir dos tópicos'}
      </button>
    </div>
  )

  return (
    <div className="mx-auto max-w-6xl px-4 pb-28 pt-4 md:pt-8">
      {/* Barra do topo */}
      <div className="flex items-center gap-1">
        <Link to={`/mensagem/${mensagem.id}`} className="botao-fantasma -ml-2 px-2">
          <ChevronLeft size={20} /> Mensagem
        </Link>
        <span className={`ml-auto mr-2 flex items-center gap-1.5 text-sm ${status === 'erro' ? 'text-perigo' : 'text-texto-2'}`}>
          {indicador}
        </span>
        <button onClick={desfazerAgora} disabled={!historico.podeDesfazer}
          aria-label="Desfazer" title="Desfazer (Cmd + Z)" className={iconeBotao}>
          <Undo2 size={18} />
        </button>
        <button onClick={refazerAgora} disabled={!historico.podeRefazer}
          aria-label="Refazer" title="Refazer (Cmd + Shift + Z)" className={iconeBotao}>
          <Redo2 size={18} />
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-escritura text-3xl font-semibold">Slides</h1>
          <p className="truncate text-texto-2">{mensagem.titulo}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setPainelImportar((v) => !v)} className="botao-secundario">
            <Upload size={18} /> Importar
          </button>
          <Link to={`/pregar/${mensagem.id}`} className="botao-primario">
            <Play size={18} /> Pregar
          </Link>
        </div>
      </div>

      {erro && <p role="alert" className="mt-4 text-sm text-perigo">{erro}</p>}

      {painelImportar && (
        <section className="mt-6 space-y-4 rounded-3xl border border-borda bg-superficie p-5">
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-escritura text-xl font-semibold">Importar apresentação</h2>
            <button onClick={() => setPainelImportar(false)} aria-label="Fechar" className={iconeBotao}>
              <X size={18} />
            </button>
          </div>
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-2xl bg-superficie-2 p-4">
              <p className="font-semibold">PDF ou imagens</p>
              <p className="mt-1 text-texto-2">
                Cada página vira um slide idêntico ao original. No PowerPoint, Keynote ou Google Slides,
                use Arquivo e depois Salvar como PDF.
              </p>
            </div>
            <div className="rounded-2xl bg-superficie-2 p-4">
              <p className="font-semibold">PowerPoint (.pptx)</p>
              <p className="mt-1 text-texto-2">Traz só os textos, para você aplicar o visual do Pulpito.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <Campo rotulo="Os slides vão aparecer em">
              <select value={destinoImport} onChange={(e) => setDestinoImport(e.target.value)} className="campo w-auto">
                {opcoesTopico}
              </select>
            </Campo>
            <input ref={arquivoImport} type="file" multiple accept=".pdf,.pptx,image/*" className="hidden"
              onChange={(e) => { importar(e.target.files); e.target.value = '' }} />
            <button onClick={() => arquivoImport.current?.click()} disabled={!!importando} className="botao-primario">
              {importando ? <LoaderCircle size={18} className="animate-spin" /> : <Upload size={18} />}
              {importando ?? 'Escolher arquivos'}
            </button>
          </div>
        </section>
      )}

      {slides.length === 0 ? (
        <section className="mt-6 space-y-5 rounded-3xl border border-borda bg-superficie p-6">
          <div>
            <h2 className="font-escritura text-2xl font-semibold">Monte os slides desta mensagem</h2>
            <p className="mt-1 max-w-xl text-texto-2">
              Gere uma capa e um slide por tópico, com título e versículo, e depois personalize.
              Ou importe uma apresentação pronta. Enquanto não houver slides, o telão usa o visual automático.
            </p>
          </div>
          {blocoGerar}
          <button onClick={() => inserirDepois({ topico_id: null, titulo: mensagem.titulo })}
            className="botao-fantasma -ml-2 px-2 text-sm">
            <Plus size={16} /> Começar com um slide em branco
          </button>
        </section>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
          {/* Miniaturas */}
          <aside className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 lg:mx-0 lg:max-h-[80dvh] lg:flex-col lg:overflow-y-auto lg:overflow-x-visible lg:px-0">
            {slides.map((s, i) => (
              <button key={s.id} onClick={() => setSelId(s.id)}
                className={`w-40 shrink-0 rounded-xl p-1 text-left transition lg:w-full ${s.id === sel?.id
                  ? 'bg-superficie ring-2 ring-acao' : 'ring-1 ring-borda hover:ring-texto-2'}`}>
                <SlideVisual slide={s} className="rounded-lg" />
                <p className="mt-1.5 truncate px-1 pb-0.5 text-xs text-texto-2">
                  <b className="text-texto">{i + 1}</b> {rotuloTopico(s.topico_id)}
                </p>
              </button>
            ))}
            <button onClick={() => inserirDepois({})}
              className="flex w-40 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-dashed border-borda py-4 text-sm font-semibold text-texto-2 hover:border-acao hover:text-acao lg:w-full">
              <Plus size={16} /> Slide
            </button>
          </aside>

          {sel && (
            <section className="min-w-0 space-y-5">
              <SlideVisual slide={sel} className="rounded-2xl ring-1 ring-borda" />

              <div className="flex flex-wrap items-center gap-2">
                <button onClick={() => mover(-1)} disabled={iSel === 0} className={botaoPequeno}>
                  <ArrowUp size={16} /> Antes
                </button>
                <button onClick={() => mover(1)} disabled={iSel === slides.length - 1} className={botaoPequeno}>
                  <ArrowDown size={16} /> Depois
                </button>
                <button onClick={() => inserirDepois({ ...sel })} className={botaoPequeno}>
                  <Copy size={16} /> Duplicar
                </button>
                <button onClick={excluir} className={`${botaoPequeno} hover:text-perigo`}>
                  <Trash2 size={16} /> Excluir
                </button>
                <label className="ml-auto flex items-center gap-2 text-sm text-texto-2">
                  Aparece em
                  <select value={sel.topico_id ?? ''} className="campo w-auto py-1.5"
                    onChange={(e) => alterar(sel.id, { topico_id: e.target.value || null })}>
                    {opcoesTopico}
                  </select>
                </label>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {/* Textos */}
                <div className="space-y-4">
                  <Campo rotulo="Título">
                    <input value={sel.titulo ?? ''} className="campo"
                      onChange={(e) => alterar(sel.id, { titulo: e.target.value })} />
                  </Campo>
                  <Campo rotulo="Subtítulo">
                    <input value={sel.subtitulo ?? ''} className="campo"
                      onChange={(e) => alterar(sel.id, { subtitulo: e.target.value })} />
                  </Campo>
                  <Campo rotulo="Texto">
                    <textarea rows={6} value={sel.texto ?? ''} className="campo resize-y leading-relaxed"
                      onChange={(e) => alterar(sel.id, { texto: e.target.value })} />
                  </Campo>
                </div>

                {/* Visual */}
                <div className="space-y-5 rounded-2xl border border-borda bg-superficie p-4">
                  <div>
                    <span className="mb-2 block text-sm font-semibold text-texto-2">Fundo</span>
                    <div className="flex flex-wrap items-center gap-2">
                      {FUNDOS_PRONTOS.map((f) => (
                        <button key={f.nome} title={f.nome} aria-label={f.nome}
                          onClick={() => alterar(sel.id, { fundo: f.valor })} style={{ background: f.valor }}
                          className={`h-9 w-9 rounded-xl ${sel.fundo === f.valor ? 'ring-2 ring-acao ring-offset-2 ring-offset-superficie' : 'ring-1 ring-borda'}`} />
                      ))}
                      <label title="Cor personalizada"
                        className="relative h-9 w-9 cursor-pointer overflow-hidden rounded-xl ring-1 ring-borda"
                        style={{ background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)' }}>
                        <input type="color" className="absolute inset-0 cursor-pointer opacity-0"
                          value={sel.fundo?.startsWith('#') ? sel.fundo : '#000000'}
                          onChange={(e) => alterar(sel.id, { fundo: e.target.value })} />
                      </label>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <input ref={arquivo} type="file" accept="image/*" className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) enviarImagem(f); e.target.value = '' }} />
                      <button onClick={() => arquivo.current?.click()} disabled={enviando} className={botaoPequeno}>
                        <ImagePlus size={16} /> {enviando ? 'Enviando…' : 'Usar foto de fundo'}
                      </button>
                      {imagemAtual && (
                        <button onClick={() => alterar(sel.id, { fundo: '#000000' })} className="botao-fantasma px-3 py-1.5 text-sm">
                          Remover foto
                        </button>
                      )}
                    </div>
                  </div>

                  {imagemAtual && (
                    <div className="space-y-4">
                      <div>
                        <span className="mb-2 block text-sm font-semibold text-texto-2">Encaixe da foto</span>
                        <Segmentos valor={estilo.ajuste}
                          opcoes={[{ valor: 'cobrir', rotulo: 'Preencher' }, { valor: 'conter', rotulo: 'Mostrar inteira' }]}
                          onChange={(v) => alterarEstilo({ ajuste: v })} />
                      </div>
                      <label className="block">
                        <span className="mb-2 block text-sm font-semibold text-texto-2">Escurecer a foto</span>
                        <input type="range" min={0} max={0.8} step={0.05} value={estilo.escurecer}
                          onChange={(e) => alterarEstilo({ escurecer: Number(e.target.value) })}
                          className="w-full accent-[var(--acao)]" />
                      </label>
                    </div>
                  )}

                  <div>
                    <span className="mb-2 block text-sm font-semibold text-texto-2">Cor do texto</span>
                    <div className="flex flex-wrap items-center gap-2">
                      {CORES_TEXTO.map((c) => (
                        <button key={c} onClick={() => alterarEstilo({ cor: c })} style={{ background: c }}
                          aria-label={`Texto na cor ${c}`}
                          className={`h-8 w-8 rounded-full ${estilo.cor === c ? 'ring-2 ring-acao ring-offset-2 ring-offset-superficie' : 'ring-1 ring-borda'}`} />
                      ))}
                      <input type="color" value={estilo.cor} onChange={(e) => alterarEstilo({ cor: e.target.value })}
                        aria-label="Cor personalizada do texto" className="h-8 w-10 cursor-pointer rounded bg-transparent" />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-x-5 gap-y-4">
                    <div>
                      <span className="mb-2 block text-sm font-semibold text-texto-2">Alinhamento</span>
                      <Segmentos valor={estilo.alinhamento}
                        opcoes={[{ valor: 'center', rotulo: 'Centro' }, { valor: 'left', rotulo: 'Esquerda' }]}
                        onChange={(v) => alterarEstilo({ alinhamento: v })} />
                    </div>
                    <div>
                      <span className="mb-2 block text-sm font-semibold text-texto-2">Tamanho</span>
                      <Segmentos valor={estilo.tamanho}
                        opcoes={[{ valor: 'p', rotulo: 'P' }, { valor: 'm', rotulo: 'M' }, { valor: 'g', rotulo: 'G' }]}
                        onChange={(v) => alterarEstilo({ tamanho: v })} />
                    </div>
                    <div>
                      <span className="mb-2 block text-sm font-semibold text-texto-2">Fonte</span>
                      <Segmentos valor={estilo.fonte}
                        opcoes={[{ valor: 'sans', rotulo: 'Moderna' }, { valor: 'serif', rotulo: 'Clássica' }]}
                        onChange={(v) => alterarEstilo({ fonte: v })} />
                    </div>
                  </div>

                  <button onClick={aplicarATodos} className={`${botaoPequeno} w-full`}>
                    Aplicar este fundo e estilo a todos os slides
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-borda bg-superficie p-4">{blocoGerar}</div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}