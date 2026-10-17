import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useSalvamento } from '../lib/salvamento'
import { lerArquivos } from '../lib/importar'
import SlideVisual from '../components/SlideVisual'
import {
  ESTILO_PADRAO, FUNDOS_PRONTOS, type EstiloSlide, type Mensagem, type Slide, type Topico,
} from '../lib/tipos'
import { formatarReferencia, lerReferencia, parseReferencia, type VersaoId } from '../lib/biblia'

const campo = 'w-full rounded-lg bg-neutral-900 px-3 py-2 ring-1 ring-neutral-800 outline-none focus:ring-neutral-600'
const botao = 'rounded-lg px-3 py-1.5 text-sm ring-1 ring-neutral-700 hover:bg-neutral-900 disabled:opacity-30'
const CORES_TEXTO = ['#ffffff', '#000000', '#fde68a', '#7dd3fc', '#fca5a5']

const versaoAtual = () => (localStorage.getItem('pulpito-versao') as VersaoId) || 'ARA'

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

function Opcao({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-sm ring-1 ${ativo ? 'bg-neutral-100 text-neutral-900 ring-neutral-100' : 'ring-neutral-700 hover:bg-neutral-900'}`}>
      {children}
    </button>
  )
}

export default function EditorSlides() {
  const { id } = useParams()
  const { sessao } = useAuth()
  const { status, agendar, cancelar } = useSalvamento()
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
    setSlides((lista) => lista.map((s) => (s.id === sid ? { ...s, ...campos } : s)))
    agendar(`s:${sid}:${Object.keys(campos).join(',')}`, () =>
      supabase.from('slides').update(campos).eq('id', sid))
  }

  function alterarEstilo(campos: Partial<EstiloSlide>) {
    if (!sel) return
    alterar(sel.id, { estilo: { ...sel.estilo, ...campos } })
  }

  // Renumera a ordem e salva só o que mudou
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
    const lista = [...slides]
    lista.splice(pos, 0, data as Slide)
    setSlides(salvarOrdem(lista))
    setSelId(data.id)
  }

  async function excluir() {
    if (!sel || !confirm('Excluir este slide?')) return
    cancelar(`s:${sel.id}:`)
    const { error } = await supabase.from('slides').delete().eq('id', sel.id)
    if (error) { setErro('Não foi possível excluir.'); return }
    const restantes = slides.filter((s) => s.id !== sel.id)
    setSlides(salvarOrdem(restantes))
    setSelId(restantes[Math.min(iSel, restantes.length - 1)]?.id ?? null)
  }

  function mover(dir: -1 | 1) {
    const j = iSel + dir
    if (iSel < 0 || j < 0 || j >= slides.length) return
    const lista = [...slides]
    ;[lista[iSel], lista[j]] = [lista[j], lista[iSel]]
    setSlides(salvarOrdem(lista))
  }

  async function gerar() {
    if (!mensagem) return
    if (slides.length && !confirm('Isso vai substituir os slides atuais. Continuar?')) return
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
    const lista = (data as Slide[]).sort((a, b) => a.ordem - b.ordem)
    setSlides(lista)
    setSelId(lista[0]?.id ?? null)
  }

  async function aplicarATodos() {
    if (!sel || !mensagem) return
    const { fundo, estilo: est } = sel
    slides.forEach((s) => { cancelar(`s:${s.id}:fundo`); cancelar(`s:${s.id}:estilo`) })
    setSlides((lista) => lista.map((s) => ({ ...s, fundo, estilo: est })))
    const { error } = await supabase.from('slides').update({ fundo, estilo: est }).eq('mensagem_id', mensagem.id)
    if (error) setErro('Não foi possível aplicar a todos.')
  }

  async function enviarImagem(file: File) {
    if (!sel || !sessao) return
    if (!file.type.startsWith('image/')) { setErro('Escolha um arquivo de imagem.'); return }
    if (file.size > 5 * 1024 * 1024) { setErro('Imagem muito grande (máximo 5 MB).'); return }
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

  /* Importa PDF, imagens ou .pptx como novos slides no fim da lista */
  async function importar(lista: FileList | null) {
    if (!lista?.length || !mensagem || !sessao) return
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

  if (mensagem === undefined) return <p className="p-6 text-neutral-500">Carregando…</p>
  if (mensagem === null) return (
    <div className="p-6">
      <p className="mb-2">Mensagem não encontrada.</p>
      <Link to="/" className="text-sky-400">Voltar</Link>
    </div>
  )

  const textoStatus = { salvo: 'Salvo', salvando: 'Salvando…', erro: 'Erro ao salvar' }[status]

  const blocoGerar = (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-sm text-neutral-300">
        <input type="checkbox" checked={comFrase} onChange={(e) => setComFrase(e.target.checked)} />
        Criar também um slide com a frase-chave de cada tópico
      </label>
      <button onClick={gerar} disabled={gerando}
        className="rounded-lg bg-neutral-100 px-4 py-2 font-medium text-neutral-900 disabled:opacity-50">
        {gerando ? 'Gerando…' : slides.length ? 'Gerar de novo a partir dos tópicos' : 'Gerar a partir dos tópicos'}
      </button>
    </div>
  )

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 pb-24">
      <div className="flex flex-wrap items-center gap-3">
        <Link to={`/mensagem/${mensagem.id}`} className="text-neutral-400 hover:text-neutral-200">← Mensagem</Link>
        <h1 className="truncate text-lg font-semibold">Slides · {mensagem.titulo}</h1>
        <span className={`ml-auto text-sm ${status === 'erro' ? 'text-red-400' : 'text-neutral-500'}`}>{textoStatus}</span>
        <button onClick={() => setPainelImportar((v) => !v)} className={botao}>⬆ Importar</button>
        <Link to={`/pregar/${mensagem.id}`} className="rounded-lg bg-neutral-100 px-4 py-2 font-medium text-neutral-900">
          Pregar
        </Link>
      </div>

      {erro && <p className="text-sm text-red-400">{erro}</p>}

      {painelImportar && (
        <div className="space-y-3 rounded-2xl p-4 ring-1 ring-neutral-800">
          <p className="font-medium">Importar apresentação</p>
          <p className="text-sm text-neutral-400">
            <b className="text-neutral-200">PDF ou imagens:</b> cada página vira um slide idêntico ao original.
            No PowerPoint, Keynote ou Google Slides, use <b className="text-neutral-200">Arquivo → Salvar como PDF</b>.
            <br />
            <b className="text-neutral-200">PowerPoint (.pptx):</b> importa só os textos, para você aplicar o visual do Pulpito.
          </p>
          <label className="flex flex-wrap items-center gap-2 text-sm text-neutral-400">
            Os slides vão aparecer em
            <select value={destinoImport} onChange={(e) => setDestinoImport(e.target.value)}
              className="rounded-lg bg-neutral-900 px-2 py-1.5 ring-1 ring-neutral-800">
              <option value="">Capa</option>
              {topicos.map((t, i) => <option key={t.id} value={t.id}>{i + 1}. {t.titulo || 'Sem título'}</option>)}
            </select>
          </label>
          <input ref={arquivoImport} type="file" multiple accept=".pdf,.pptx,image/*" className="hidden"
            onChange={(e) => { importar(e.target.files); e.target.value = '' }} />
          <button onClick={() => arquivoImport.current?.click()} disabled={!!importando}
            className="rounded-lg bg-neutral-100 px-4 py-2 font-medium text-neutral-900 disabled:opacity-60">
            {importando ?? 'Escolher arquivos'}
          </button>
        </div>
      )}

      {slides.length === 0 ? (
        <div className="space-y-4 rounded-2xl p-6 ring-1 ring-neutral-800">
          <p className="text-lg">Esta mensagem ainda não tem slides.</p>
          <p className="text-neutral-400">
            Gere automaticamente uma capa e um slide por tópico, com título e versículo, e depois personalize.
            Ou use <b className="text-neutral-200">⬆ Importar</b> para trazer uma apresentação pronta.
            Enquanto não houver slides, o telão usa o visual automático.
          </p>
          {blocoGerar}
          <button onClick={() => inserirDepois({ topico_id: null, titulo: mensagem.titulo })}
            className="text-sm text-sky-400">ou começar com um slide em branco</button>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
          {/* Miniaturas */}
          <aside className="flex gap-2 overflow-x-auto pb-2 lg:max-h-[78dvh] lg:flex-col lg:overflow-y-auto lg:overflow-x-visible">
            {slides.map((s, i) => (
              <button key={s.id} onClick={() => setSelId(s.id)}
                className={`w-40 shrink-0 rounded-lg p-1 text-left lg:w-full ${s.id === sel?.id ? 'ring-2 ring-sky-500' : 'ring-1 ring-neutral-800'}`}>
                <SlideVisual slide={s} className="rounded-md" />
                <p className="mt-1 truncate px-1 text-xs text-neutral-500">{i + 1} · {rotuloTopico(s.topico_id)}</p>
              </button>
            ))}
            <button onClick={() => inserirDepois({})}
              className="w-40 shrink-0 rounded-lg border border-dashed border-neutral-700 py-3 text-sm text-neutral-400 hover:bg-neutral-900 lg:w-full">
              + Slide
            </button>
          </aside>

          {sel && (
            <section className="min-w-0 space-y-4">
              <SlideVisual slide={sel} className="rounded-xl ring-1 ring-neutral-800" />

              <div className="flex flex-wrap items-center gap-2">
                <button onClick={() => mover(-1)} disabled={iSel === 0} className={botao}>↑ Antes</button>
                <button onClick={() => mover(1)} disabled={iSel === slides.length - 1} className={botao}>↓ Depois</button>
                <button onClick={() => inserirDepois({ ...sel })} className={botao}>Duplicar</button>
                <button onClick={excluir} className={`${botao} text-red-400`}>Excluir</button>
                <label className="ml-auto flex items-center gap-2 text-sm text-neutral-400">
                  Aparece em
                  <select value={sel.topico_id ?? ''} className="rounded-lg bg-neutral-900 px-2 py-1.5 ring-1 ring-neutral-800"
                    onChange={(e) => alterar(sel.id, { topico_id: e.target.value || null })}>
                    <option value="">Capa</option>
                    {topicos.map((t, i) => (
                      <option key={t.id} value={t.id}>{i + 1}. {t.titulo || 'Sem título'}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {/* Textos */}
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-sm text-neutral-400">Título</label>
                    <input value={sel.titulo ?? ''} className={campo}
                      onChange={(e) => alterar(sel.id, { titulo: e.target.value })} />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-neutral-400">Subtítulo</label>
                    <input value={sel.subtitulo ?? ''} className={campo}
                      onChange={(e) => alterar(sel.id, { subtitulo: e.target.value })} />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-neutral-400">Texto</label>
                    <textarea rows={5} value={sel.texto ?? ''} className={`${campo} resize-y`}
                      onChange={(e) => alterar(sel.id, { texto: e.target.value })} />
                  </div>
                </div>

                {/* Visual */}
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm text-neutral-400">Fundo</label>
                    <div className="flex flex-wrap items-center gap-2">
                      {FUNDOS_PRONTOS.map((f) => (
                        <button key={f.nome} title={f.nome} onClick={() => alterar(sel.id, { fundo: f.valor })}
                          style={{ background: f.valor }}
                          className={`h-9 w-9 rounded-lg ${sel.fundo === f.valor ? 'ring-2 ring-sky-400' : 'ring-1 ring-neutral-700'}`} />
                      ))}
                      <label title="Cor personalizada"
                        className="relative h-9 w-9 cursor-pointer overflow-hidden rounded-lg ring-1 ring-neutral-700"
                        style={{ background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)' }}>
                        <input type="color" className="absolute inset-0 cursor-pointer opacity-0"
                          value={sel.fundo?.startsWith('#') ? sel.fundo : '#000000'}
                          onChange={(e) => alterar(sel.id, { fundo: e.target.value })} />
                      </label>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <input ref={arquivo} type="file" accept="image/*" className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) enviarImagem(f); e.target.value = '' }} />
                      <button onClick={() => arquivo.current?.click()} disabled={enviando} className={botao}>
                        {enviando ? 'Enviando…' : '🖼 Usar foto de fundo'}
                      </button>
                      {imagemAtual && (
                        <button onClick={() => alterar(sel.id, { fundo: '#000000' })} className={`${botao} text-neutral-400`}>
                          Remover foto
                        </button>
                      )}
                    </div>
                    {imagemAtual && (
                      <div className="mt-3 space-y-3">
                        <div className="flex flex-wrap items-center gap-2 text-sm text-neutral-400">
                          Encaixe da foto
                          <Opcao ativo={estilo.ajuste === 'cobrir'} onClick={() => alterarEstilo({ ajuste: 'cobrir' })}>Preencher</Opcao>
                          <Opcao ativo={estilo.ajuste === 'conter'} onClick={() => alterarEstilo({ ajuste: 'conter' })}>Mostrar inteira</Opcao>
                        </div>
                        <label className="block text-sm text-neutral-400">
                          Escurecer a foto
                          <input type="range" min={0} max={0.8} step={0.05} value={estilo.escurecer}
                            onChange={(e) => alterarEstilo({ escurecer: Number(e.target.value) })}
                            className="mt-1 block w-full" />
                        </label>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="mb-2 block text-sm text-neutral-400">Cor do texto</label>
                    <div className="flex flex-wrap items-center gap-2">
                      {CORES_TEXTO.map((c) => (
                        <button key={c} onClick={() => alterarEstilo({ cor: c })} style={{ background: c }}
                          className={`h-8 w-8 rounded-full ${estilo.cor === c ? 'ring-2 ring-sky-400' : 'ring-1 ring-neutral-700'}`} />
                      ))}
                      <input type="color" value={estilo.cor} onChange={(e) => alterarEstilo({ cor: e.target.value })}
                        className="h-8 w-10 cursor-pointer rounded bg-transparent" />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4">
                    <div>
                      <label className="mb-2 block text-sm text-neutral-400">Alinhamento</label>
                      <div className="flex gap-1">
                        <Opcao ativo={estilo.alinhamento === 'center'} onClick={() => alterarEstilo({ alinhamento: 'center' })}>Centro</Opcao>
                        <Opcao ativo={estilo.alinhamento === 'left'} onClick={() => alterarEstilo({ alinhamento: 'left' })}>Esquerda</Opcao>
                      </div>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm text-neutral-400">Tamanho</label>
                      <div className="flex gap-1">
                        {(['p', 'm', 'g'] as const).map((t) => (
                          <Opcao key={t} ativo={estilo.tamanho === t} onClick={() => alterarEstilo({ tamanho: t })}>
                            {t.toUpperCase()}
                          </Opcao>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm text-neutral-400">Fonte</label>
                      <div className="flex gap-1">
                        <Opcao ativo={estilo.fonte === 'sans'} onClick={() => alterarEstilo({ fonte: 'sans' })}>Moderna</Opcao>
                        <Opcao ativo={estilo.fonte === 'serif'} onClick={() => alterarEstilo({ fonte: 'serif' })}>Clássica</Opcao>
                      </div>
                    </div>
                  </div>

                  <button onClick={aplicarATodos} className={botao}>
                    Aplicar este fundo e estilo a todos os slides
                  </button>
                </div>
              </div>

              <div className="border-t border-neutral-800 pt-4">{blocoGerar}</div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}