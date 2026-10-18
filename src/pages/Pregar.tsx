import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  BookOpen, ChevronDown, ChevronLeft, ChevronRight, Maximize, Minus, MonitorPlay, Pause, Play, Plus, RotateCcw, Type, X,
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
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

const versaoAtual = () => (localStorage.getItem('pulpito-versao') as VersaoId) || 'ARA'

const iconeBotao = 'flex h-10 w-10 items-center justify-center rounded-xl text-texto-2 hover:bg-superficie-2 hover:text-texto'

/* ── Bíblia por cima da tela ── */
function BibliaSobreposta({ inicial, podeProjetar, projetado, onProjetar, onFechar }: {
  inicial: string
  podeProjetar: boolean
  projetado: string | null
  onProjetar: (referencia: string, texto: string) => void
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
    ? { referencia: `${nomeCap}:${inicio}-${fim}`, texto: versos.slice(inicio - 1, fim).join(' ') }
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
                  <button onClick={() => onProjetar(trecho.referencia, trecho.texto)}
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
                      onClick={() => podeProjetar && onProjetar(rotulo, texto)}
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

/* ── Versículo base fixo embaixo, com o texto (recolhível) ── */
const CHAVE_VERSICULO_ABERTO = 'pulpito-pregar-versiculo-aberto'

function VersiculoBase({ referencia, onAbrir }: { referencia: string; onAbrir: () => void }) {
  const ref = parseReferencia(referencia)
  const chave = ref ? `${versaoAtual()}:${formatarReferencia(ref)}` : ''
  const [res, setRes] = useState<{ chave: string; texto: string } | null>(null)
  const [aberto, setAberto] = useState(() => localStorage.getItem(CHAVE_VERSICULO_ABERTO) !== 'nao')

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
    <p className="col-span-2 truncate rounded-2xl border border-borda bg-superficie px-4 py-2.5 text-texto-2">
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
    <div className="col-span-2 rounded-2xl border border-borda bg-superficie">
      <div className="flex items-center gap-2 px-4 pt-2.5">
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
      <p className={`px-4 pb-3 font-escritura text-[15px] leading-relaxed text-texto/85 ${aberto ? 'max-h-[20vh] overflow-y-auto' : 'truncate'}`}>
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
  const restante = total - decorrido
  const fracao = decorrido / total
  const corBarra = fracao >= 0.8 ? 'bg-perigo' : fracao >= 0.5 ? 'bg-aviso' : 'bg-sucesso'
  const fase = decorrido === 0 ? 'parado' : fracao >= 1 ? 'estourou' : fracao >= 0.8 ? 'final' : fracao >= 0.5 ? 'metade' : 'normal'
  const pilulaTempo = {
    parado: 'bg-superficie-2 text-texto',
    normal: 'bg-superficie-2 text-sucesso',
    metade: 'bg-aviso text-[#1A1200]',
    final: 'bg-perigo text-white',
    estourou: 'bg-perigo text-white animate-pulse',
  }[fase]
  const hora = new Date(agora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const topico = indice > 0 ? topicos[indice - 1] : null
  const noInicio = indice === 0 && sub === 0
  const noFim = indice === topicos.length && sub >= slidesDaPagina.length - 1
  const proximoESlide = sub < slidesDaPagina.length - 1
  const rotuloProximo = noFim ? 'Fim da mensagem' : proximoESlide ? 'Próximo slide' : 'Próximo tópico'
  const proximoTopico = !proximoESlide && indice < topicos.length ? topicos[indice] : null

  function irParaTopico(n: number) {
    setIndice(n)
    setSubEstado({ pagina: n, sub: 0 })
  }

  const secoes = topico ? ([
    ['Observação', topico.observacao],
    ['Aplicação', topico.aplicacao],
    ['Ilustração', topico.ilustracao],
    ['Notas', topico.notas],
  ] as const).filter(([, v]) => v?.trim()) : []

  const corTelao = !telaoOnline ? 'bg-aviso' : telaoApagado ? 'bg-texto-2' : 'bg-sucesso'

  return (
    <div className="escuro flex h-dvh flex-col bg-fundo text-texto">
      {/* Tela avermelha perto do fim e pisca quando o tempo estoura */}
      {(fase === 'final' || fase === 'estourou') && (
        <div aria-hidden className={`pointer-events-none fixed inset-0 z-0 transition-opacity duration-700 ${fase === 'estourou' ? 'opacity-100' : 'opacity-60'}`}
          style={{ background: 'radial-gradient(120% 70% at 50% 100%, rgb(255 60 50 / 0.28), transparent 70%)' }} />
      )}
      {fase === 'estourou' && (
        <div className="pointer-events-none fixed inset-0 z-30 animate-pulse border-[6px] border-perigo" />
      )}

      {/* Topo */}
      <header className="relative flex items-center justify-between px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <Link to={`/mensagem/${mensagem.id}`} aria-label="Sair do modo pregação" className={iconeBotao}>
          <X size={22} />
        </Link>

        <button onClick={() => setPainelTelao(true)}
          className="flex items-center gap-2 rounded-full border border-borda px-3.5 py-1.5 text-sm font-semibold text-texto-2 hover:text-texto">
          {codigoTelao ? <span className={`h-2 w-2 rounded-full ${corTelao}`} /> : <MonitorPlay size={16} />}
          Telão
        </button>

        <div className="flex">
          <button onClick={alternarTelaCheia} aria-label="Tela cheia" title="Tela cheia (F)" className={`${iconeBotao} max-md:hidden`}>
            <Maximize size={20} />
          </button>
          <button onClick={() => setPainelTexto((v) => !v)} aria-label="Tamanho do texto" title="Tamanho do texto (+ e −, ou pinça)" className={iconeBotao}>
            <Type size={20} />
          </button>
          <button onClick={() => setBiblia(topico?.versiculo || mensagem.texto_base || '')}
            aria-label="Abrir Bíblia" title="Bíblia (B)" className={iconeBotao}>
            <BookOpen size={20} />
          </button>
        </div>

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

      {/* Cronômetro: hora atual + tempo de mensagem (toque para iniciar/pausar) */}
      <div className="relative px-4 pt-2">
        <div className="mx-auto flex max-w-md items-stretch gap-2">
          <div className="flex flex-1 flex-col items-center justify-center rounded-2xl bg-superficie-2 px-3 py-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-texto-2">Hora atual</span>
            <span className="font-display text-2xl font-extrabold tabular-nums">{hora}</span>
          </div>
          <button onClick={alternarCronometro} aria-label={rodando ? 'Pausar cronômetro' : 'Iniciar cronômetro'}
            className={`flex flex-[1.3] flex-col items-center justify-center rounded-2xl px-3 py-2 transition-colors ${pilulaTempo}`}>
            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.12em] opacity-80">
              {rodando ? <Pause size={10} fill="currentColor" /> : <Play size={10} fill="currentColor" />}
              {fase === 'estourou' ? 'Tempo estourado' : 'Tempo de mensagem'}
            </span>
            <span className="font-display text-2xl font-extrabold tabular-nums">
              {restante >= 0 ? fmt(restante) : `+${fmt(restante)}`}
            </span>
          </button>
          {!rodando && decorrido > 0 && (
            <button onClick={zerar} aria-label="Zerar cronômetro" title="Zerar"
              className="flex w-11 items-center justify-center rounded-2xl bg-superficie-2 text-texto-2 hover:text-texto">
              <RotateCcw size={18} />
            </button>
          )}
        </div>
        <div className="mx-auto mt-3 h-1 max-w-md overflow-hidden rounded-full bg-superficie-2">
          <div className={`h-full rounded-full ${corBarra} transition-all`} style={{ width: `${Math.min(fracao, 1) * 100}%` }} />
        </div>

        {/* Mapa dos tópicos: toque para pular */}
        {topicos.length > 0 && (
          <nav aria-label="Tópicos" className="sem-barra mx-auto mt-4 flex max-w-md gap-1.5 overflow-x-auto">
            {[null, ...topicos].map((t, n) => (
              <button key={t?.id ?? 'capa'} onClick={() => irParaTopico(n)}
                aria-label={t ? `Tópico ${n}: ${t.titulo || 'Sem título'}` : 'Capa'}
                aria-current={indice === n ? 'step' : undefined}
                title={t ? t.titulo || 'Sem título' : mensagem.titulo}
                className={`h-7 min-w-7 flex-1 rounded-lg text-xs font-bold tabular-nums transition-colors ${indice === n
                  ? 'bg-acao text-acao-texto'
                  : n < indice ? 'bg-superficie-2 text-texto-2' : 'border border-borda text-texto-2 hover:text-texto'}`}>
                {n === 0 ? '•' : n}
              </button>
            ))}
          </nav>
        )}
      </div>

      {/* Conteúdo */}
      <main ref={areaTexto} className="flex-1 touch-pan-y overflow-y-auto" onClick={() => setPainelTexto(false)}
        style={{ '--fs-titulo': `${2.6 * escala}rem`, '--fs-corpo': `${1.4 * escala}rem` } as CSSProperties}
        onTouchStart={(e) => {
          if (e.touches.length > 1) multitoque.current = true
          else { multitoque.current = false; toqueX.current = e.touches[0].clientX }
        }}
        onTouchEnd={(e) => {
          if (toqueX.current === null || multitoque.current || e.touches.length > 0) { if (!e.touches.length) toqueX.current = null; return }
          const dx = e.changedTouches[0].clientX - toqueX.current
          toqueX.current = null
          if (Math.abs(dx) > 70) ir(dx < 0 ? 1 : -1)
        }}>
        <div className="mx-auto max-w-3xl px-6 pb-8 pt-8">
          {!topico && (
            <div className="space-y-5">
              <p className="text-texto-2">
                {topicos.length} {topicos.length === 1 ? 'tópico' : 'tópicos'}, {mensagem.tempo_minutos} min
                {slidesDaPagina.length > 1 && `, slide ${sub + 1} de ${slidesDaPagina.length}`}
              </p>
              <h1 className={`${tam.titulo} font-display font-bold leading-[1.1]`}>{mensagem.titulo}</h1>
            </div>
          )}

          {topico && (
            <div className="space-y-7">
              <div className="space-y-4">
                <p className="text-texto-2">
                  Tópico {indice} de {topicos.length}
                  {slidesDaPagina.length > 1 && `, slide ${sub + 1} de ${slidesDaPagina.length}`}
                </p>
                <h1 className={`${tam.titulo} font-display font-bold leading-[1.1]`}>
                  {topico.titulo || 'Sem título'}
                </h1>
              </div>

              {topico.frase_chave?.trim() && (
                <p className={`${tam.corpo} whitespace-pre-wrap rounded-r-2xl border-l-4 border-acao bg-ouro-suave py-3 pl-4 pr-3 font-bold leading-relaxed text-texto`}>
                  {topico.frase_chave}
                </p>
              )}

              {secoes.map(([rotulo, valor]) => (
                <section key={rotulo}>
                  <h2 className="rotulo mb-1.5">{rotulo}</h2>
                  <p className={`${tam.corpo} whitespace-pre-wrap leading-relaxed ${rotulo === 'Notas' ? 'text-texto-2' : 'text-texto/90'}`}>
                    {valor}
                  </p>
                </section>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Navegação */}
      <footer className="mx-auto grid w-full max-w-3xl grid-cols-[auto_1fr] gap-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        {(topico?.versiculo || (!topico && mensagem.texto_base)) && (
          <VersiculoBase key={topico?.id ?? 'capa'} referencia={(topico ? topico.versiculo : mensagem.texto_base) ?? ''}
            onAbrir={() => setBiblia((topico ? topico.versiculo : mensagem.texto_base) || '')} />
        )}
        {proximoTopico && (
          <p className="col-span-2 truncate text-center text-sm text-texto-2">
            A seguir: <b className="text-texto">{proximoTopico.titulo || 'Sem título'}</b>
          </p>
        )}
        <button onClick={() => ir(-1)} disabled={noInicio} aria-label="Voltar"
          className="flex h-16 w-16 items-center justify-center rounded-2xl border border-borda text-texto-2 hover:text-texto disabled:opacity-30">
          <ChevronLeft size={28} />
        </button>
        <button onClick={() => ir(1)} disabled={noFim}
          className="flex h-16 items-center justify-center gap-2 rounded-2xl bg-acao font-display text-lg font-extrabold text-acao-texto shadow-[0_10px_30px_-10px_var(--acao)] active:scale-[0.99] disabled:opacity-30 disabled:shadow-none">
          {rotuloProximo} {!noFim && <ChevronRight size={22} />}
        </button>
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
          onProjetar={(referencia, texto) => {
            setTelaoApagado(false)
            setVersiculoProjetado({ tipo: 'versiculo', referencia, texto })
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