import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  BookOpen, Cast, ChevronDown, Clock, Timer, ChevronLeft, Maximize, Minus, MonitorPlay, Pause, Play, Plus, RotateCcw, Settings, X,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Mensagem, Slide, Topico } from '../lib/tipos'
import {
  parseReferencia, formatarReferencia, lerCapitulo, lerReferencia, nomeDoLivro, type VersaoId,
} from '../lib/biblia'
import { CHAVE_TELAO, codigoValido, useEmissorTelao, type SlideTelao } from '../lib/telao'
import { usePinca } from '../lib/pinca'

type SlideVersiculo = Extract<SlideTelao, { tipo: 'versiculo' }>

/* Tamanho da letra: escala contínua (pinça ou botões) aplicada por variáveis CSS */
const tam = { titulo: 'text-[length:var(--fs-titulo)]', corpo: 'text-[length:var(--fs-corpo)]' }
const CHAVE_ESCALA = 'pulpito-escala-pregacao-v2'
const ESCALA_MIN = 0.6
const ESCALA_MAX = 2

function fmt(ms: number) {
  const s = Math.floor(Math.abs(ms) / 1000)
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

const versaoAtual = () => (localStorage.getItem('pulpito-versao') as VersaoId) || 'ARA'

const iconeBotao = 'flex h-10 w-10 items-center justify-center rounded-xl text-texto-2 hover:bg-superficie-2 hover:text-texto'

/* ── Bíblia por cima da tela ── */
function BibliaSobreposta({ inicial, podeProjetar, projetado, onProjetar, onFechar }: {
  inicial: string
  podeProjetar: boolean
  projetado: string | null
  onProjetar: (referencia: string, texto: string, versos: { n: number; t: string }[]) => void
  onFechar: () => void
}) {
  const versao = versaoAtual()
  const [consulta, setConsulta] = useState(inicial)
  const [atual, setAtual] = useState(inicial)
  const [erro, setErro] = useState('')
  const [res, setRes] = useState<{ chave: string; versos: string[] } | null>(null)

  const ref = parseReferencia(atual)
  const chave = ref ? `${versao}:${ref.livro}.${ref.capitulo}` : ''
  const inicio = ref?.inicio
  const fim = ref?.fim ?? ref?.inicio
  const carregado = !!ref && res?.chave === chave
  const versos = carregado ? res?.versos ?? [] : []
  const nomeCap = ref ? `${nomeDoLivro(ref.livro)} ${ref.capitulo}` : ''

  useEffect(() => {
    const r = parseReferencia(atual)
    if (!r) return
    let ativo = true
    const k = `${versao}:${r.livro}.${r.capitulo}`
    lerCapitulo(versao, r.livro, r.capitulo)
      .then((v) => { if (ativo) setRes({ chave: k, versos: v }) })
      .catch(() => { if (ativo) setRes({ chave: k, versos: [] }) })
    return () => { ativo = false }
  }, [atual, versao])

  useEffect(() => {
    if (carregado && inicio)
      document.getElementById(`sv-${inicio}`)?.scrollIntoView({ block: 'center' })
  }, [carregado, inicio])

  function buscar(e: FormEvent) {
    e.preventDefault()
    if (!parseReferencia(consulta)) { setErro('Referência não reconhecida. Tente Sl 23 ou Jo 3:16.'); return }
    setErro('')
    setAtual(consulta)
  }

  const trecho = podeProjetar && carregado && inicio && fim && fim > inicio
    ? {
        referencia: `${nomeCap}:${inicio}-${fim}`,
        texto: versos.slice(inicio - 1, fim).join(' '),
        versos: versos.slice(inicio - 1, fim).map((t, i) => ({ n: inicio + i, t })),
      }
    : null

  return (
    <div className="fixed inset-0 z-40 bg-black/60" onClick={onFechar}>
      <div onClick={(e) => e.stopPropagation()}
        className="absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col rounded-t-3xl border-t border-borda bg-superficie">
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-borda" aria-hidden />
        <form onSubmit={buscar} className="flex gap-2 p-4 pb-3">
          <input value={consulta} onChange={(e) => setConsulta(e.target.value)} placeholder="Sl 23"
            className="campo min-w-0 flex-1" />
          <button className="botao-secundario">Ir</button>
          <button type="button" onClick={onFechar} aria-label="Fechar Bíblia" className={iconeBotao}>
            <X size={22} />
          </button>
        </form>

        <div className="overflow-y-auto px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          {erro && <p className="mb-3 text-sm text-perigo">{erro}</p>}
          {!ref && <p className="py-6 text-center text-texto-2">Digite uma referência para abrir.</p>}
          {ref && !carregado && <p className="py-6 text-center text-texto-2">Carregando…</p>}
          {ref && carregado && (
            <>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <h3 className="font-display text-2xl font-bold">{nomeCap}</h3>
                <span className="text-sm text-texto-2">{versao}</span>
                {trecho && (
                  <button onClick={() => onProjetar(trecho.referencia, trecho.texto, trecho.versos)}
                    className="botao ml-auto bg-acao/15 px-3 py-1.5 text-sm text-tinta">
                    <MonitorPlay size={16} /> Projetar {inicio}-{fim}
                  </button>
                )}
              </div>
              {podeProjetar && (
                <p className="mb-3 text-sm text-texto-2">
                  Toque num versículo para mostrar no telão. Ao fechar, o slide volta.
                </p>
              )}
              {versos.length === 0 && <p className="text-texto-2">Capítulo não encontrado.</p>}
              <div className="space-y-1 font-escritura">
                {versos.map((texto, i) => {
                  const n = i + 1
                  const destaque = !!inicio && n >= inicio && n <= (fim ?? inicio)
                  const rotulo = `${nomeCap}:${n}`
                  const noTelao = projetado === rotulo
                  return (
                    <p key={n} id={`sv-${n}`}
                      onClick={() => podeProjetar && onProjetar(rotulo, texto, [{ n, t: texto }])}
                      className={`rounded-xl px-3 py-1.5 text-lg leading-relaxed
                        ${podeProjetar ? 'cursor-pointer hover:bg-superficie-2' : ''}
                        ${destaque ? 'bg-acao/15 text-texto' : 'text-texto-2'}
                        ${noTelao ? 'ring-2 ring-sucesso' : ''}`}>
                      <sup className="mr-1.5 font-sans text-xs text-texto-2">{n}</sup>{texto}
                    </p>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Painel de conexão com o telão ── */
function PainelTelao({ codigo, online, apagado, onConectar, onDesconectar, onAlternarApagado, onFechar }: {
  codigo: string | null
  online: boolean
  apagado: boolean
  onConectar: (codigo: string) => void
  onDesconectar: () => void
  onAlternarApagado: () => void
  onFechar: () => void
}) {
  const [digitado, setDigitado] = useState('')

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 sm:items-center" onClick={onFechar}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm space-y-4 rounded-t-3xl border border-borda bg-superficie p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:rounded-3xl">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Telão</h2>
          <button onClick={onFechar} aria-label="Fechar" className={iconeBotao}><X size={20} /></button>
        </div>

        {!codigo ? (
          <form className="space-y-4"
            onSubmit={(e) => { e.preventDefault(); if (codigoValido(digitado)) onConectar(digitado) }}>
            <p className="text-texto-2">
              No computador do projetor, abra{' '}
              <b className="text-texto">{window.location.host}/projetar</b> e digite o código que aparecer.
            </p>
            <input inputMode="numeric" maxLength={6} autoFocus value={digitado} placeholder="000000"
              onChange={(e) => setDigitado(e.target.value.replace(/\D/g, ''))}
              className="campo py-4 text-center text-3xl font-bold tracking-[0.35em] tabular-nums" />
            <button disabled={!codigoValido(digitado)} className="botao-primario w-full">Conectar</button>
          </form>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-2xl bg-superficie-2 px-4 py-3">
              <span className={`h-2.5 w-2.5 rounded-full ${online ? 'bg-sucesso' : 'bg-aviso'}`} />
              <span className="font-semibold">{online ? 'Telão conectado' : 'Procurando o telão…'}</span>
              <span className="ml-auto tabular-nums text-texto-2">{codigo}</span>
            </div>
            {!online && (
              <p className="text-sm text-texto-2">
                Confira se a página /projetar está aberta com esse código. Se ele mudou, desconecte e digite o novo.
              </p>
            )}
            <button onClick={onAlternarApagado} className="botao-secundario w-full">
              {apagado ? 'Voltar a mostrar os slides' : 'Apagar o telão'}
            </button>
            <button onClick={onDesconectar} className="botao-fantasma w-full text-perigo hover:text-perigo">
              Desconectar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/* Texto com marcadores: linhas que começam com "-", "•" ou "*" viram lista; com aspas viram citação */
function TextoRico({ texto, className }: { texto: string; className: string }) {
  const blocos: ({ tipo: 'lista'; itens: string[] } | { tipo: 'citacao' | 'paragrafo'; t: string })[] = []
  for (const linha of texto.split('\n')) {
    const l = linha.trim()
    const item = l.match(/^[-•*]\s+(.*)$/)
    const ultimo = blocos[blocos.length - 1]
    if (item) {
      if (ultimo?.tipo === 'lista') ultimo.itens.push(item[1])
      else blocos.push({ tipo: 'lista', itens: [item[1]] })
    } else if (/^["“]/.test(l)) blocos.push({ tipo: 'citacao', t: l })
    else if (ultimo?.tipo === 'paragrafo' && l) ultimo.t += '\n' + l
    else if (l) blocos.push({ tipo: 'paragrafo', t: l })
  }
  return (
    <div className={`space-y-3 leading-relaxed ${className}`}>
      {blocos.map((b, i) => b.tipo === 'lista' ? (
        <ul key={i} className="space-y-1.5">
          {b.itens.map((it, k) => (
            <li key={k} className="flex gap-3"><span aria-hidden className="mt-[0.6em] h-1.5 w-1.5 shrink-0 rounded-full bg-acao" />{it}</li>
          ))}
        </ul>
      ) : b.tipo === 'citacao' ? (
        <p key={i} className="border-l-2 border-acao/60 pl-4 font-escritura italic text-tinta">{b.t}</p>
      ) : (
        <p key={i} className="whitespace-pre-wrap">{b.t}</p>
      ))}
    </div>
  )
}

/* ── Versículo base fixo embaixo, com o texto (recolhível) ── */
const CHAVE_VERSICULO_ABERTO = 'pulpito-pregar-versiculo-aberto'

function VersiculoBase({ referencia, onAbrir }: { referencia: string; onAbrir: () => void }) {
  const ref = parseReferencia(referencia)
  const chave = ref ? `${versaoAtual()}:${formatarReferencia(ref)}` : ''
  const [res, setRes] = useState<{ chave: string; texto: string } | null>(null)
  const [aberto, setAberto] = useState(() => localStorage.getItem(CHAVE_VERSICULO_ABERTO) === 'sim')

  useEffect(() => {
    const r = parseReferencia(referencia)
    if (!r) return
    let ativo = true
    const k = `${versaoAtual()}:${formatarReferencia(r)}`
    lerReferencia(versaoAtual(), r.inicio ? r : { ...r, inicio: 1, fim: 3 })
      .then((vs) => { if (ativo) setRes({ chave: k, texto: vs.map((v) => `${vs.length > 1 ? `${v.numero} ` : ''}${v.texto}`).join(' ') }) })
      .catch(() => { if (ativo) setRes({ chave: k, texto: '' }) })
    return () => { ativo = false }
  }, [referencia])

  if (!ref) return (
    <p className="truncate rounded-2xl border border-borda bg-superficie px-4 py-2.5 text-texto-2">
      <BookOpen size={16} className="mr-2 inline text-tinta" />{referencia}
    </p>
  )
  const texto = res?.chave === chave ? res.texto : ''

  function alternar() {
    setAberto((a) => {
      localStorage.setItem(CHAVE_VERSICULO_ABERTO, a ? 'nao' : 'sim')
      return !a
    })
  }

  return (
    <div className="rounded-2xl border border-borda bg-superficie">
      <div className="flex items-center gap-2 px-4 pt-2">
        <button onClick={onAbrir} className="flex min-w-0 flex-1 items-center gap-2 text-left">
          <BookOpen size={16} className="shrink-0 text-tinta" />
          <span className="min-w-0">
            <span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-texto-2">Versículo base</span>
            <span className="block truncate font-bold text-tinta">{formatarReferencia(ref)}</span>
          </span>
        </button>
        <button onClick={alternar} aria-label={aberto ? 'Recolher versículo' : 'Mostrar versículo'} aria-expanded={aberto}
          className="rounded-xl p-2 text-texto-2 hover:bg-superficie-2 hover:text-texto">
          <ChevronDown size={18} className={`transition-transform ${aberto ? '' : 'rotate-180'}`} />
        </button>
      </div>
      <p className={`px-4 pb-2.5 text-sm leading-relaxed text-texto/80 ${aberto ? 'max-h-[20vh] overflow-y-auto' : 'truncate'}`}>
        {texto || '…'}
      </p>
    </div>
  )
}

/* ── Tela principal ── */
export default function Pregar() {
  const { id } = useParams()
  const [mensagem, setMensagem] = useState<Mensagem | null | undefined>(undefined)
  const [topicos, setTopicos] = useState<Topico[]>([])
  const [slides, setSlides] = useState<Slide[]>([])
  const [indice, setIndice] = useState(0)
  const [subEstado, setSubEstado] = useState({ pagina: 0, sub: 0 })
  const [biblia, setBiblia] = useState<string | null>(null)
  const [painelTexto, setPainelTexto] = useState(false)
  const [listaTopicos, setListaTopicos] = useState(false)
  const [escala, setEscala] = useState(() => {
    const salvo = Number(localStorage.getItem(CHAVE_ESCALA))
    return salvo >= ESCALA_MIN && salvo <= ESCALA_MAX ? salvo : 1
  })

  // Telão
  const [codigoTelao, setCodigoTelao] = useState<string | null>(() => {
    const salvo = localStorage.getItem(CHAVE_TELAO)
    return salvo && codigoValido(salvo) ? salvo : null
  })
  const [painelTelao, setPainelTelao] = useState(false)
  const [telaoApagado, setTelaoApagado] = useState(false)
  const [versiculoProjetado, setVersiculoProjetado] = useState<SlideVersiculo | null>(null)
  const { online: telaoOnline, enviar, despedir } = useEmissorTelao(codigoTelao)

  // Cronômetro
  const [rodando, setRodando] = useState(false)
  const [acumulado, setAcumulado] = useState(0)
  const [iniciadoEm, setIniciadoEm] = useState<number | null>(null)
  const [agora, setAgora] = useState(() => Date.now())
  const toqueX = useRef<number | null>(null)
  const toqueY = useRef(0)
  const multitoque = useRef(false)
  const areaTexto = useRef<HTMLElement>(null)
  const [indicador, setIndicador] = useState(false)
  const timerIndicador = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  function mudarEscala(n: number) {
    setEscala(Math.round(Math.min(ESCALA_MAX, Math.max(ESCALA_MIN, n)) * 100) / 100)
    setIndicador(true)
    clearTimeout(timerIndicador.current)
    timerIndicador.current = setTimeout(() => setIndicador(false), 900)
  }
  usePinca(areaTexto, escala, mudarEscala, { min: ESCALA_MIN, max: ESCALA_MAX, pronto: !!mensagem })

  useEffect(() => {
    let ativo = true
    Promise.all([
      supabase.from('mensagens').select('*').eq('id', id!).maybeSingle(),
      supabase.from('topicos').select('*').eq('mensagem_id', id!).order('ordem'),
      supabase.from('slides').select('*').eq('mensagem_id', id!).order('ordem'),
    ]).then(([m, t, s]) => {
      if (!ativo) return
      setMensagem((m.data as Mensagem) ?? null)
      setTopicos((t.data as Topico[]) ?? [])
      setSlides((s.data as Slide[]) ?? [])
    })
    return () => { ativo = false }
  }, [id])

  // Slides personalizados da página atual (capa ou tópico)
  const slidesDaPagina = useMemo(() => {
    const topicoId = indice > 0 ? topicos[indice - 1]?.id ?? null : null
    return slides.filter((s) => s.topico_id === topicoId).sort((a, b) => a.ordem - b.ordem)
  }, [slides, topicos, indice])

  const sub = subEstado.pagina === indice
    ? Math.max(0, Math.min(subEstado.sub, slidesDaPagina.length - 1))
    : 0

  // Próximo/anterior: passa pelos slides do tópico antes de mudar de tópico
  const ir = useCallback((dir: -1 | 1) => {
    const qtd = slidesDaPagina.length
    if (dir === 1 && sub < qtd - 1) { setSubEstado({ pagina: indice, sub: sub + 1 }); return }
    if (dir === -1 && sub > 0) { setSubEstado({ pagina: indice, sub: sub - 1 }); return }
    const novo = Math.min(Math.max(indice + dir, 0), topicos.length)
    if (novo === indice) return
    setIndice(novo)
    setSubEstado({ pagina: novo, sub: dir === -1 ? 999 : 0 })
  }, [slidesDaPagina.length, sub, indice, topicos.length])

  useEffect(() => { localStorage.setItem(CHAVE_ESCALA, String(escala)) }, [escala])

  useEffect(() => {
    if (codigoTelao) localStorage.setItem(CHAVE_TELAO, codigoTelao)
    else localStorage.removeItem(CHAVE_TELAO)
  }, [codigoTelao])

  // Envia para o telão o que deve aparecer agora
  useEffect(() => {
    if (!mensagem || !codigoTelao) return
    if (telaoApagado) { enviar({ tipo: 'vazio' }); return }
    if (versiculoProjetado) { enviar(versiculoProjetado); return }

    const personalizado = slidesDaPagina[sub]
    if (personalizado) {
      enviar({
        tipo: 'personalizado', titulo: personalizado.titulo, subtitulo: personalizado.subtitulo,
        texto: personalizado.texto, fundo: personalizado.fundo, estilo: personalizado.estilo,
      })
      return
    }

    const topico = indice > 0 ? topicos[indice - 1] : null
    const refTexto = topico ? topico.versiculo : mensagem.texto_base
    const r = refTexto ? parseReferencia(refTexto) : null
    const referencia = r ? formatarReferencia(r) : refTexto?.trim() || undefined

    const montar = (textoVersiculo?: string): SlideTelao => topico
      ? {
          tipo: 'topico', titulo: topico.titulo || 'Sem título', numero: indice, total: topicos.length,
          referencia, textoVersiculo, frase: topico.frase_chave?.trim() || undefined,
        }
      : { tipo: 'capa', titulo: mensagem.titulo, referencia, textoVersiculo }

    enviar(montar())
    if (!r?.inicio) return

    let ativo = true
    lerReferencia(versaoAtual(), r)
      .then((vs) => {
        let t = vs.map((v) => v.texto).join(' ')
        if (t.length > 400) t = t.slice(0, 400).trimEnd() + '…'
        if (ativo && t) enviar(montar(t))
      })
      .catch(() => {})
    return () => { ativo = false }
  }, [mensagem, topicos, indice, sub, slidesDaPagina, codigoTelao, telaoApagado, versiculoProjetado, enviar])

  // Relógio: a cada segundo parado, a cada 250ms com o cronômetro rodando
  useEffect(() => {
    const intervalo = setInterval(() => setAgora(Date.now()), rodando ? 250 : 1000)
    return () => clearInterval(intervalo)
  }, [rodando])

  // Mantém a tela acesa
  useEffect(() => {
    let trava: WakeLockSentinel | null = null
    let cancelado = false
    async function pedir() {
      try {
        if (!('wakeLock' in navigator) || document.visibilityState !== 'visible') return
        const t = await navigator.wakeLock.request('screen')
        if (cancelado) t.release()
        else trava = t
      } catch { /* navegador sem suporte ou sem HTTPS */ }
    }
    pedir()
    const aoVoltar = () => { if (document.visibilityState === 'visible') pedir() }
    document.addEventListener('visibilitychange', aoVoltar)
    return () => {
      cancelado = true
      document.removeEventListener('visibilitychange', aoVoltar)
      trava?.release()
    }
  }, [])

  // Teclado e passador de slides
  useEffect(() => {
    function tecla(e: KeyboardEvent) {
      if (painelTelao) { if (e.key === 'Escape') setPainelTelao(false); return }
      if (biblia !== null) {
        if (e.key === 'Escape') { setBiblia(null); setVersiculoProjetado(null) }
        return
      }
      if (['ArrowRight', 'PageDown'].includes(e.key)) ir(1)
      if (['ArrowLeft', 'PageUp'].includes(e.key)) ir(-1)
      if (e.key === ' ' && !(e.target as HTMLElement).closest('button, input')) { e.preventDefault(); alternarCronometro() }
      if ((e.target as HTMLElement).closest('input, textarea') || e.metaKey || e.ctrlKey || e.altKey) return
      const k = e.key.toLowerCase()
      if (k === 'f') alternarTelaCheia()
      if (k === 'b') setBiblia(topicos[indice - 1]?.versiculo || mensagem?.texto_base || '')
      if (k === 't') setPainelTelao(true)
      if (e.key === '+' || e.key === '=') mudarEscala(escala + 0.1)
      if (e.key === '-') mudarEscala(escala - 0.1)
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  })

  function fecharBiblia() {
    setBiblia(null)
    setVersiculoProjetado(null)
  }

  function desconectarTelao() {
    despedir()
    setTelaoApagado(false)
    setTimeout(() => setCodigoTelao(null), 300)
  }

  function alternarCronometro() {
    const t = Date.now()
    if (rodando) {
      setAcumulado((a) => a + t - (iniciadoEm ?? t))
      setRodando(false)
    } else {
      setIniciadoEm(t)
      setAgora(t)
      setRodando(true)
    }
  }

  function alternarTelaCheia() {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    else document.documentElement.requestFullscreen?.().catch(() => {})
  }

  function zerar() {
    setRodando(false)
    setAcumulado(0)
    setIniciadoEm(null)
  }

  if (mensagem === undefined) return <div className="escuro h-dvh bg-fundo p-6 text-texto-2">Carregando…</div>
  if (mensagem === null) return (
    <div className="escuro h-dvh bg-fundo p-6 text-texto">
      <p className="mb-3">Mensagem não encontrada.</p>
      <Link to="/" className="botao-secundario">Voltar para mensagens</Link>
    </div>
  )

  const total = mensagem.tempo_minutos * 60_000
  const decorrido = acumulado + (rodando && iniciadoEm !== null ? agora - iniciadoEm : 0)
  const fracao = decorrido / total
  const corBarra = fracao >= 0.8 ? 'bg-perigo' : fracao >= 0.5 ? 'bg-aviso' : 'bg-sucesso'
  const fase = decorrido === 0 ? 'parado' : fracao >= 1 ? 'estourou' : fracao >= 0.8 ? 'final' : fracao >= 0.5 ? 'metade' : 'normal'
  // Pílula do tempo: escura (verde parado em 00:00), amarela na metade, vermelha em 80% e ao estourar
  const pilulaTempo = {
    parado: { caixa: 'bg-superficie-2 border-borda', valor: 'text-sucesso', rotulo: 'text-texto-2', bolinha: 'bg-acao text-acao-texto' },
    normal: { caixa: 'bg-superficie-2 border-borda', valor: 'text-texto', rotulo: 'text-texto-2', bolinha: 'bg-texto/15 text-texto' },
    metade: { caixa: 'bg-aviso border-aviso', valor: 'text-[#1A1200]', rotulo: 'text-[#1A1200]/70', bolinha: 'bg-black/20 text-[#1A1200]' },
    final: { caixa: 'bg-perigo border-perigo', valor: 'text-white', rotulo: 'text-white/80', bolinha: 'bg-black/25 text-white' },
    estourou: { caixa: 'bg-perigo border-perigo', valor: 'text-white', rotulo: 'text-white/80', bolinha: 'bg-black/25 text-white' },
  }[fase]
  const hora = new Date(agora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const topico = indice > 0 ? topicos[indice - 1] : null

  function irParaTopico(n: number) {
    setIndice(n)
    setSubEstado({ pagina: n, sub: 0 })
  }


  const corTelao = !telaoOnline ? 'bg-aviso' : telaoApagado ? 'bg-texto-2' : 'bg-sucesso'

  return (
    <div className="escuro flex h-dvh flex-col bg-fundo text-texto">
      {/* Perto do fim (80%): bordas com brilho vermelho. Estourou: tela toda vermelha, bordas pulsando */}
      {fase === 'final' && (
        <div aria-hidden className="pointer-events-none fixed inset-0 z-30 transition-opacity duration-700"
          style={{ boxShadow: 'inset 0 0 90px 10px rgb(244 67 54 / 0.45)' }} />
      )}
      {fase === 'estourou' && (
        <>
          <div aria-hidden className="pointer-events-none fixed inset-0 z-0"
            style={{ background: 'radial-gradient(120% 90% at 50% 50%, rgb(120 10 10 / 0.55), rgb(200 30 30 / 0.85))' }} />
          <div aria-hidden className="pointer-events-none fixed inset-0 z-30 animate-estouro"
            style={{ boxShadow: 'inset 0 0 0 4px rgb(255 70 60), inset 0 0 120px 30px rgb(255 50 40 / 0.85)' }} />
        </>
      )}

      {/* Topo: sair, hora + cronômetro, transmitir e ferramentas */}
      <header className="relative z-10 flex items-center gap-1.5 px-2 pt-[max(0.6rem,env(safe-area-inset-top))] md:px-4">
        <Link to={`/mensagem/${mensagem.id}`} aria-label="Sair do modo pregação" className={iconeBotao}>
          <ChevronLeft size={24} />
        </Link>

        <div className="flex flex-1 items-center justify-center gap-1.5">
          <div className="flex min-w-[5.5rem] flex-col items-center rounded-xl border border-borda bg-superficie-2 px-3 py-1.5">
            <span className="flex items-center gap-1 whitespace-nowrap text-[8px] font-bold uppercase tracking-[0.1em] text-texto-2">
              <Clock size={9} /> Hora atual
            </span>
            <span className="font-mono text-lg font-bold leading-tight tabular-nums">{hora}</span>
          </div>
          <button onClick={alternarCronometro} aria-label={rodando ? 'Pausar cronômetro' : 'Iniciar cronômetro'}
            title="Iniciar ou pausar (espaço)"
            className={`flex min-w-[6.5rem] flex-col items-center rounded-xl border px-3 py-1.5 transition-colors duration-500 ${pilulaTempo.caixa}`}>
            <span className={`flex max-w-[7.5rem] items-center gap-1 overflow-hidden whitespace-nowrap text-[8px] font-bold uppercase tracking-[0.1em] ${pilulaTempo.rotulo}`}>
              <Timer size={9} className="shrink-0" /> <span className="truncate">{fase === 'estourou' ? 'Tempo esgotado' : 'Tempo de mensagem'}</span>
            </span>
            <span className={`flex items-center gap-1.5 font-mono text-lg font-bold leading-tight tabular-nums ${pilulaTempo.valor}`}>
              {fmt(decorrido)}
              <span className={`flex h-4 w-4 items-center justify-center rounded-full ${pilulaTempo.bolinha}`}>
                {rodando ? <Pause size={8} fill="currentColor" /> : <Play size={8} fill="currentColor" className="ml-px" />}
              </span>
            </span>
          </button>
          {!rodando && decorrido > 0 && (
            <button onClick={zerar} aria-label="Zerar cronômetro" title="Zerar"
              className="flex h-11 w-9 items-center justify-center rounded-xl border border-borda bg-superficie-2 text-texto-2 hover:text-texto">
              <RotateCcw size={16} />
            </button>
          )}
        </div>

        <button onClick={() => setPainelTelao(true)} aria-label="Transmitir para o telão" title="Telão (T)"
          className={`relative ${iconeBotao} border border-borda ${codigoTelao && telaoOnline ? 'text-tinta' : ''}`}>
          <Cast size={21} />
          {codigoTelao && <span className={`absolute right-1.5 top-1.5 h-2 w-2 rounded-full ring-2 ring-fundo ${corTelao}`} />}
        </button>
        <button onClick={() => setPainelTexto((v) => !v)} aria-label="Ajustes da tela" title="Tamanho do texto (+ e −, ou pinça)" className={iconeBotao}>
          <Settings size={20} />
        </button>
        <button onClick={() => setBiblia(topico?.versiculo || mensagem.texto_base || '')}
          aria-label="Abrir Bíblia" title="Bíblia (B)" className={`${iconeBotao} max-sm:hidden`}>
          <BookOpen size={20} />
        </button>
        <button onClick={alternarTelaCheia} aria-label="Tela cheia" title="Tela cheia (F)" className={`${iconeBotao} max-md:hidden`}>
          <Maximize size={20} />
        </button>

        {painelTexto && (
          <div className="absolute right-3 top-full z-20 mt-2 flex items-center gap-1 rounded-2xl border border-borda bg-superficie p-1.5 shadow-xl">
            <button onClick={() => mudarEscala(escala - 0.1)} disabled={escala <= ESCALA_MIN}
              aria-label="Diminuir texto" className={`${iconeBotao} disabled:opacity-30`}><Minus size={20} /></button>
            <span className="w-14 text-center text-sm font-bold tabular-nums text-texto-2">{Math.round(escala * 100)}%</span>
            <button onClick={() => mudarEscala(escala + 0.1)}
              disabled={escala >= ESCALA_MAX}
              aria-label="Aumentar texto" className={`${iconeBotao} disabled:opacity-30`}><Plus size={20} /></button>
          </div>
        )}
      </header>

      <div className="relative px-3 md:px-6">
        <div className="mt-2 h-0.5 overflow-hidden rounded-full bg-superficie-2">
          <div className={`h-full rounded-full ${corBarra} transition-all`} style={{ width: `${Math.min(fracao, 1) * 100}%` }} />
        </div>

        {/* Próximo tópico, com lista para pular para qualquer um */}
        {topicos.length > 0 && (
          <div className="relative mx-auto mt-2 flex max-w-3xl items-center justify-between gap-3 px-3">
            <span className="rotulo shrink-0">
              {indice === 0 ? 'Capa' : `Tópico ${indice} de ${topicos.length}`}
              {slidesDaPagina.length > 1 && ` · slide ${sub + 1}/${slidesDaPagina.length}`}
            </span>
            <button onClick={() => setListaTopicos((v) => !v)} aria-expanded={listaTopicos}
              className="flex min-w-0 max-w-[65%] items-center gap-1.5 rounded-lg px-1 py-1 text-left text-xs hover:bg-superficie-2">
              <span className="shrink-0 text-texto-2">{indice < topicos.length ? 'Próximo:' : 'Último tópico'}</span>
              <span className="min-w-0 flex-1 truncate font-bold">{indice < topicos.length ? topicos[indice].titulo || 'Sem título' : ''}</span>
              <ChevronDown size={16} className={`shrink-0 text-texto-2 transition-transform ${listaTopicos ? 'rotate-180' : ''}`} />
            </button>
            {listaTopicos && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setListaTopicos(false)} />
                <ol className="absolute inset-x-3 top-full z-40 mt-2 max-h-[50vh] animate-entrar overflow-y-auto rounded-2xl border border-borda bg-superficie p-1.5 shadow-2xl">
                  {[null, ...topicos].map((t, n) => (
                    <li key={t?.id ?? 'capa'}>
                      <button onClick={() => { irParaTopico(n); setListaTopicos(false) }}
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left ${indice === n ? 'bg-ouro-suave' : 'hover:bg-superficie-2'}`}>
                        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${indice === n ? 'bg-acao text-acao-texto' : 'bg-superficie-2 text-texto-2'}`}>
                          {n === 0 ? '•' : n}
                        </span>
                        <span className="min-w-0 flex-1 truncate font-semibold">{t ? t.titulo || 'Sem título' : `Capa · ${mensagem.titulo}`}</span>
                      </button>
                    </li>
                  ))}
                </ol>
              </>
            )}
          </div>
        )}

      </div>

      {/* Conteúdo */}
      <main ref={areaTexto} className="flex-1 touch-pan-y overflow-y-auto" onClick={() => setPainelTexto(false)}
        style={{ '--fs-titulo': `${2.4 * escala}rem`, '--fs-sub': `${2.4 * escala}rem`, '--fs-topico': `${1.55 * escala}rem`, '--fs-corpo': `${1.2 * escala}rem` } as CSSProperties}
        onTouchStart={(e) => {
          if (e.touches.length > 1) multitoque.current = true
          else { multitoque.current = false; toqueX.current = e.touches[0].clientX; toqueY.current = e.touches[0].clientY }
        }}
        onTouchEnd={(e) => {
          if (toqueX.current === null || multitoque.current || e.touches.length > 0) { if (!e.touches.length) toqueX.current = null; return }
          const dx = e.changedTouches[0].clientX - toqueX.current
          const dy = e.changedTouches[0].clientY - toqueY.current
          toqueX.current = null
          if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.4) ir(dx < 0 ? 1 : -1)
        }}>
        <div key={`${indice}-${sub}`} className="mx-auto max-w-3xl animate-entrar px-6 pb-8 pt-5">
          {!topico && (
            <div className="space-y-4">
              <p className="text-texto-2">
                {topicos.length} {topicos.length === 1 ? 'tópico' : 'tópicos'} · {mensagem.tempo_minutos} min
              </p>
              <h1 className={`${tam.titulo} font-display font-extrabold uppercase leading-[1.05] tracking-tight text-tinta`}>{mensagem.titulo}</h1>
            </div>
          )}

          {topico && (
            <div className="space-y-7">
              <div className="space-y-2">
                <p className="font-display text-[length:var(--fs-sub)] font-extrabold uppercase leading-[1.05] tracking-tight text-tinta">
                  {mensagem.titulo}
                </p>
                <h1 className="font-display text-[length:var(--fs-topico)] font-extrabold uppercase leading-[1.1] tracking-tight">
                  {indice}. {topico.titulo || 'Sem título'}
                </h1>
              </div>

              {topico.observacao?.trim() && (
                <TextoRico texto={topico.observacao} className={`${tam.corpo} text-texto`} />
              )}

              {topico.frase_chave?.trim() && (
                <blockquote className={`${tam.corpo} whitespace-pre-wrap border-l-2 border-acao py-1 pl-4 font-escritura italic leading-relaxed text-tinta`}>
                  “{topico.frase_chave.replace(/^["“]|["”]$/g, '')}”
                </blockquote>
              )}

              {([['Aplicação', topico.aplicacao], ['Ilustração', topico.ilustracao]] as const)
                .filter(([, v]) => v?.trim()).map(([rotulo, valor]) => (
                  <div key={rotulo} className="rounded-2xl border border-borda bg-superficie px-4 py-3">
                    <TextoRico texto={`${rotulo}: ${valor}`} className={`${tam.corpo} italic text-texto/85`} />
                  </div>
                ))}

              {topico.notas?.trim() && (
                <TextoRico texto={topico.notas} className="text-base text-texto-2" />
              )}
            </div>
          )}
        </div>
      </main>

      {/* Navegação */}
      {/* Rodapé: versículo base. Para trocar de tópico, deslize a tela para o lado (ou use as setas do teclado) */}
      <footer className="relative z-40 mx-auto w-full max-w-5xl px-3 pb-[max(0.6rem,env(safe-area-inset-bottom))] pt-2">
        <div>

        {(topico?.versiculo || (!topico && mensagem.texto_base)) && (
          <VersiculoBase key={topico?.id ?? 'capa'} referencia={(topico ? topico.versiculo : mensagem.texto_base) ?? ''}
            onAbrir={() => setBiblia((topico ? topico.versiculo : mensagem.texto_base) || '')} />
        )}
        </div>
      </footer>

      {indicador && (
        <div aria-hidden className="pointer-events-none fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-superficie/90 px-5 py-3 font-display text-2xl font-extrabold tabular-nums text-texto shadow-xl">
          {Math.round(escala * 100)}%
        </div>
      )}

      {biblia !== null && (
        <BibliaSobreposta inicial={biblia} onFechar={fecharBiblia}
          podeProjetar={!!codigoTelao}
          projetado={versiculoProjetado?.referencia ?? null}
          onProjetar={(referencia, texto, versos) => {
            setTelaoApagado(false)
            setVersiculoProjetado({ tipo: 'versiculo', referencia, texto, versos })
          }} />
      )}

      {painelTelao && (
        <PainelTelao codigo={codigoTelao} online={telaoOnline} apagado={telaoApagado}
          onConectar={(c) => setCodigoTelao(c)}
          onDesconectar={desconectarTelao}
          onAlternarApagado={() => setTelaoApagado((a) => !a)}
          onFechar={() => setPainelTelao(false)} />
      )}
    </div>
  )
}