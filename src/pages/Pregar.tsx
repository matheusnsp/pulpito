import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  BookOpen, ChevronLeft, ChevronRight, Minus, MonitorPlay, Plus, RotateCcw, Type, X,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Mensagem, Slide, Topico } from '../lib/tipos'
import {
  parseReferencia, formatarReferencia, lerCapitulo, lerReferencia, nomeDoLivro, type VersaoId,
} from '../lib/biblia'
import { CHAVE_TELAO, codigoValido, useEmissorTelao, type SlideTelao } from '../lib/telao'

type SlideVersiculo = Extract<SlideTelao, { tipo: 'versiculo' }>

const TAMANHOS = [
  { titulo: 'text-3xl', corpo: 'text-lg' },
  { titulo: 'text-4xl', corpo: 'text-xl' },
  { titulo: 'text-[2.6rem]', corpo: 'text-[1.4rem]' },
  { titulo: 'text-5xl', corpo: 'text-2xl' },
  { titulo: 'text-6xl', corpo: 'text-3xl' },
]
const CHAVE_ESCALA = 'pulpito-escala-pregacao'

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
                <h3 className="font-escritura text-2xl font-semibold">{nomeCap}</h3>
                <span className="text-sm text-texto-2">{versao}</span>
                {trecho && (
                  <button onClick={() => onProjetar(trecho.referencia, trecho.texto)}
                    className="botao ml-auto bg-acao/15 px-3 py-1.5 text-sm text-acao">
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
                        ${noTelao ? 'ring-2 ring-[#5DCAA5]' : ''}`}>
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
              <span className={`h-2.5 w-2.5 rounded-full ${online ? 'bg-[#5DCAA5]' : 'bg-amber-400'}`} />
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

function ChipVersiculo({ texto, classe, onAbrir }: { texto: string; classe: string; onAbrir: () => void }) {
  const ref = parseReferencia(texto)
  if (!ref) return <p className={`${classe} text-texto-2`}>{texto}</p>
  return (
    <button onClick={onAbrir}
      className={`${classe} inline-flex items-center gap-2 rounded-full bg-acao/15 px-4 py-2 font-semibold text-acao hover:bg-acao/25`}>
      <BookOpen size={20} /> {formatarReferencia(ref)}
    </button>
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
    const salvo = localStorage.getItem(CHAVE_ESCALA)
    return salvo !== null && TAMANHOS[Number(salvo)] ? Number(salvo) : 2
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
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [biblia, painelTelao, ir])

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
  const corTempo = decorrido === 0 ? 'text-texto'
    : fracao >= 1 ? 'text-perigo' : fracao >= 0.8 ? 'text-[#F07167]' : fracao >= 0.5 ? 'text-amber-300' : 'text-texto'
  const corBarra = fracao >= 0.8 ? 'bg-[#F07167]' : fracao >= 0.5 ? 'bg-amber-400' : 'bg-[#5DCAA5]'
  const tam = TAMANHOS[escala]
  const hora = new Date(agora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const topico = indice > 0 ? topicos[indice - 1] : null
  const noInicio = indice === 0 && sub === 0
  const noFim = indice === topicos.length && sub >= slidesDaPagina.length - 1
  const proximoESlide = sub < slidesDaPagina.length - 1
  const rotuloProximo = noFim ? 'Fim da mensagem' : proximoESlide ? 'Próximo slide' : 'Próximo tópico'

  const secoes = topico ? ([
    ['Observação', topico.observacao],
    ['Aplicação', topico.aplicacao],
    ['Ilustração', topico.ilustracao],
    ['Notas', topico.notas],
  ] as const).filter(([, v]) => v?.trim()) : []

  const corTelao = !telaoOnline ? 'bg-amber-400' : telaoApagado ? 'bg-texto-2' : 'bg-[#5DCAA5]'

  return (
    <div className="escuro flex h-dvh flex-col bg-fundo text-texto">
      {fracao >= 1 && (
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
          <button onClick={() => setPainelTexto((v) => !v)} aria-label="Tamanho do texto" className={iconeBotao}>
            <Type size={20} />
          </button>
          <button onClick={() => setBiblia(topico?.versiculo || mensagem.texto_base || '')}
            aria-label="Abrir Bíblia" className={iconeBotao}>
            <BookOpen size={20} />
          </button>
        </div>

        {painelTexto && (
          <div className="absolute right-3 top-full z-20 mt-2 flex items-center gap-1 rounded-2xl border border-borda bg-superficie p-1.5 shadow-xl">
            <button onClick={() => setEscala((e) => Math.max(0, e - 1))} disabled={escala === 0}
              aria-label="Diminuir texto" className={`${iconeBotao} disabled:opacity-30`}><Minus size={20} /></button>
            <span className="w-12 text-center text-sm tabular-nums text-texto-2">{escala + 1} de {TAMANHOS.length}</span>
            <button onClick={() => setEscala((e) => Math.min(TAMANHOS.length - 1, e + 1))}
              disabled={escala === TAMANHOS.length - 1}
              aria-label="Aumentar texto" className={`${iconeBotao} disabled:opacity-30`}><Plus size={20} /></button>
          </div>
        )}
      </header>

      {/* Cronômetro */}
      <div className="px-5 pt-2 text-center">
        <button onClick={alternarCronometro} className="leading-none"
          aria-label={rodando ? 'Pausar cronômetro' : 'Iniciar cronômetro'}>
          <span className={`block text-6xl font-bold tabular-nums tracking-tight ${corTempo}`}>
            {restante >= 0 ? fmt(restante) : `+${fmt(restante)}`}
          </span>
        </button>
        <p className="mt-2 flex items-center justify-center gap-2 text-sm text-texto-2">
          <span>são {hora}</span>
          <span aria-hidden>·</span>
          <span>{rodando ? 'toque para pausar' : decorrido ? 'pausado' : 'toque para iniciar'}</span>
          {!rodando && decorrido > 0 && (
            <button onClick={zerar} className="ml-1 inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-texto hover:bg-superficie-2">
              <RotateCcw size={14} /> zerar
            </button>
          )}
        </p>
        <div className="mx-auto mt-4 h-1 max-w-md overflow-hidden rounded-full bg-superficie-2">
          <div className={`h-full rounded-full ${corBarra} transition-all`} style={{ width: `${Math.min(fracao, 1) * 100}%` }} />
        </div>
      </div>

      {/* Conteúdo */}
      <main className="flex-1 overflow-y-auto" onClick={() => setPainelTexto(false)}
        onTouchStart={(e) => { toqueX.current = e.touches[0].clientX }}
        onTouchEnd={(e) => {
          if (toqueX.current === null) return
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
              <h1 className={`${tam.titulo} font-escritura font-semibold leading-[1.1]`}>{mensagem.titulo}</h1>
              {mensagem.texto_base && (
                <ChipVersiculo texto={mensagem.texto_base} classe={tam.corpo}
                  onAbrir={() => setBiblia(mensagem.texto_base)} />
              )}
            </div>
          )}

          {topico && (
            <div className="space-y-7">
              <div className="space-y-4">
                <p className="text-texto-2">
                  Tópico {indice} de {topicos.length}
                  {slidesDaPagina.length > 1 && `, slide ${sub + 1} de ${slidesDaPagina.length}`}
                </p>
                <h1 className={`${tam.titulo} font-escritura font-semibold leading-[1.1]`}>
                  {topico.titulo || 'Sem título'}
                </h1>
                {topico.versiculo && (
                  <ChipVersiculo texto={topico.versiculo} classe={tam.corpo}
                    onAbrir={() => setBiblia(topico.versiculo)} />
                )}
              </div>

              {topico.frase_chave?.trim() && (
                <p className={`${tam.corpo} whitespace-pre-wrap rounded-none border-l-[3px] border-ouro py-1 pl-4 font-semibold leading-relaxed text-[#F4E7BF]`}>
                  {topico.frase_chave}
                </p>
              )}

              {secoes.map(([rotulo, valor]) => (
                <section key={rotulo}>
                  <h2 className="mb-1.5 text-sm font-semibold text-texto-2">{rotulo}</h2>
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
      <footer className="grid grid-cols-[auto_1fr] gap-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        <button onClick={() => ir(-1)} disabled={noInicio} aria-label="Voltar"
          className="flex h-16 w-16 items-center justify-center rounded-2xl border border-borda text-texto-2 hover:text-texto disabled:opacity-30">
          <ChevronLeft size={28} />
        </button>
        <button onClick={() => ir(1)} disabled={noFim}
          className="flex h-16 items-center justify-center gap-2 rounded-2xl bg-texto text-lg font-bold text-fundo hover:brightness-95 disabled:opacity-30">
          {rotuloProximo} {!noFim && <ChevronRight size={22} />}
        </button>
      </footer>

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