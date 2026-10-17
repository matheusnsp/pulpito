import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Mensagem, Topico } from '../lib/tipos'
import {
  parseReferencia, formatarReferencia, lerCapitulo, lerReferencia, nomeDoLivro, type VersaoId,
} from '../lib/biblia'
import { CHAVE_TELAO, codigoValido, useEmissorTelao, type SlideTelao } from '../lib/telao'

type SlideVersiculo = Extract<SlideTelao, { tipo: 'versiculo' }>

const TAMANHOS = [
  { titulo: 'text-2xl', corpo: 'text-base' },
  { titulo: 'text-3xl', corpo: 'text-lg' },
  { titulo: 'text-4xl', corpo: 'text-xl' },
  { titulo: 'text-5xl', corpo: 'text-2xl' },
  { titulo: 'text-6xl', corpo: 'text-3xl' },
]
const CHAVE_ESCALA = 'pulpito-escala-pregacao'

function fmt(ms: number) {
  const s = Math.floor(Math.abs(ms) / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

const versaoAtual = () => (localStorage.getItem('pulpito-versao') as VersaoId) || 'ARA'

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
    if (!parseReferencia(consulta)) { setErro('Referência não reconhecida. Ex: Sl 23 ou Jo 3:16'); return }
    setErro('')
    setAtual(consulta)
  }

  const trecho = podeProjetar && carregado && inicio && fim && fim > inicio
    ? { referencia: `${nomeCap}:${inicio}-${fim}`, texto: versos.slice(inicio - 1, fim).join(' ') }
    : null

  return (
    <div className="fixed inset-0 z-40 bg-black/60" onClick={onFechar}>
      <div onClick={(e) => e.stopPropagation()}
        className="absolute inset-x-0 bottom-0 flex max-h-[85dvh] flex-col rounded-t-2xl bg-neutral-950 ring-1 ring-neutral-800">
        <form onSubmit={buscar} className="flex gap-2 border-b border-neutral-800 p-3">
          <input value={consulta} onChange={(e) => setConsulta(e.target.value)} placeholder='ex: "Sl 23"'
            className="min-w-0 flex-1 rounded-lg bg-neutral-900 px-3 py-2 ring-1 ring-neutral-800 outline-none" />
          <button className="rounded-lg px-3 py-2 ring-1 ring-neutral-700">Ir</button>
          <button type="button" onClick={onFechar}
            className="rounded-lg bg-neutral-100 px-3 py-2 font-medium text-neutral-900">Fechar</button>
        </form>
        <div className="overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {erro && <p className="mb-2 text-sm text-red-400">{erro}</p>}
          {!ref && <p className="text-neutral-500">Digite uma referência para abrir.</p>}
          {ref && !carregado && <p className="text-neutral-500">Carregando…</p>}
          {ref && carregado && (
            <>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-semibold">
                  {nomeCap} <span className="text-sm font-normal text-neutral-500">{versao}</span>
                </h3>
                {trecho && (
                  <button onClick={() => onProjetar(trecho.referencia, trecho.texto)}
                    className="ml-auto rounded-lg bg-sky-500/20 px-3 py-1.5 text-sm text-sky-300 ring-1 ring-sky-500/40">
                    Projetar {inicio}-{fim}
                  </button>
                )}
              </div>
              {podeProjetar && (
                <p className="mb-3 text-xs text-neutral-500">
                  Toque num versículo para mostrar no telão. Feche a Bíblia para voltar ao slide.
                </p>
              )}
              {versos.length === 0 && <p className="text-neutral-500">Capítulo não encontrado.</p>}
              {versos.map((texto, i) => {
                const n = i + 1
                const destaque = !!inicio && n >= inicio && n <= (fim ?? inicio)
                const rotulo = `${nomeCap}:${n}`
                const noTelao = projetado === rotulo
                return (
                  <p key={n} id={`sv-${n}`}
                    onClick={() => podeProjetar && onProjetar(rotulo, texto)}
                    className={`rounded-md px-2 py-1 text-lg leading-relaxed
                      ${podeProjetar ? 'cursor-pointer hover:bg-neutral-900' : ''}
                      ${destaque ? 'bg-sky-500/15 text-neutral-50' : 'text-neutral-400'}
                      ${noTelao ? 'ring-2 ring-emerald-400' : ''}`}>
                    <sup className="mr-1 text-xs text-neutral-500">{n}</sup>{texto}
                  </p>
                )
              })}
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
        className="w-full max-w-sm space-y-4 rounded-t-2xl bg-neutral-950 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] ring-1 ring-neutral-800 sm:rounded-2xl">
        <h2 className="text-lg font-semibold">Telão</h2>

        {!codigo ? (
          <form className="space-y-3"
            onSubmit={(e) => { e.preventDefault(); if (codigoValido(digitado)) onConectar(digitado) }}>
            <p className="text-sm text-neutral-400">
              No computador do projetor, abra <b className="text-neutral-200">{window.location.host}/projetar</b> e
              digite o código que aparecer na tela.
            </p>
            <input inputMode="numeric" maxLength={6} autoFocus value={digitado} placeholder="000000"
              onChange={(e) => setDigitado(e.target.value.replace(/\D/g, ''))}
              className="w-full rounded-lg bg-neutral-900 px-3 py-3 text-center font-mono text-3xl tracking-[0.3em] ring-1 ring-neutral-800 outline-none" />
            <button disabled={!codigoValido(digitado)}
              className="w-full rounded-lg bg-neutral-100 py-2.5 font-medium text-neutral-900 disabled:opacity-40">
              Conectar
            </button>
          </form>
        ) : (
          <div className="space-y-3">
            <p className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${online ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              {online ? 'Telão conectado' : 'Procurando o telão…'}
              <span className="ml-auto font-mono text-neutral-500">{codigo}</span>
            </p>
            {!online && (
              <p className="text-sm text-neutral-500">
                Confira se a página /projetar está aberta com esse código. Se o código mudou,
                desconecte e digite o novo.
              </p>
            )}
            <button onClick={onAlternarApagado} className="w-full rounded-lg py-2.5 ring-1 ring-neutral-700">
              {apagado ? 'Mostrar slides no telão' : 'Apagar telão (tela preta)'}
            </button>
            <button onClick={onDesconectar} className="w-full rounded-lg py-2.5 text-red-400 ring-1 ring-neutral-800">
              Desconectar
            </button>
          </div>
        )}

        <button onClick={onFechar} className="w-full py-2 text-sm text-neutral-500">Fechar</button>
      </div>
    </div>
  )
}

function ChipVersiculo({ texto, classe, onAbrir }: { texto: string; classe: string; onAbrir: () => void }) {
  const ref = parseReferencia(texto)
  if (!ref) return <p className={`${classe} text-neutral-400`}>{texto}</p>
  return (
    <button onClick={onAbrir}
      className={`${classe} inline-flex items-center gap-2 rounded-full bg-sky-500/15 px-4 py-2 text-sky-300 ring-1 ring-sky-500/30`}>
      📖 {formatarReferencia(ref)}
    </button>
  )
}

/* ── Tela principal ── */
export default function Pregar() {
  const { id } = useParams()
  const [mensagem, setMensagem] = useState<Mensagem | null | undefined>(undefined)
  const [topicos, setTopicos] = useState<Topico[]>([])
  const [indice, setIndice] = useState(0)
  const [biblia, setBiblia] = useState<string | null>(null)
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
    ]).then(([m, t]) => {
      if (!ativo) return
      setMensagem((m.data as Mensagem) ?? null)
      setTopicos((t.data as Topico[]) ?? [])
    })
    return () => { ativo = false }
  }, [id])

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
  }, [mensagem, topicos, indice, codigoTelao, telaoApagado, versiculoProjetado, enviar])

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
      if (['ArrowRight', 'PageDown'].includes(e.key)) setIndice((i) => Math.min(i + 1, topicos.length))
      if (['ArrowLeft', 'PageUp'].includes(e.key)) setIndice((i) => Math.max(i - 1, 0))
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [biblia, painelTelao, topicos.length])

  function ir(dir: -1 | 1) {
    setIndice((i) => Math.min(Math.max(i + dir, 0), topicos.length))
  }

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

  if (mensagem === undefined) return <p className="p-6 text-neutral-500">Carregando…</p>
  if (mensagem === null) return (
    <div className="p-6">
      <p className="mb-2">Mensagem não encontrada.</p>
      <Link to="/" className="text-sky-400">Voltar</Link>
    </div>
  )

  const total = mensagem.tempo_minutos * 60_000
  const decorrido = acumulado + (rodando && iniciadoEm !== null ? agora - iniciadoEm : 0)
  const restante = total - decorrido
  const fracao = decorrido / total
  const cor = decorrido === 0 ? 'text-neutral-100'
    : fracao >= 0.8 ? 'text-red-500' : fracao >= 0.5 ? 'text-amber-400' : 'text-emerald-400'
  const barra = fracao >= 0.8 ? 'bg-red-500' : fracao >= 0.5 ? 'bg-amber-400' : 'bg-emerald-500'
  const tam = TAMANHOS[escala]
  const hora = new Date(agora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const topico = indice > 0 ? topicos[indice - 1] : null

  const secoes = topico ? ([
    ['Observação', topico.observacao],
    ['Aplicação', topico.aplicacao],
    ['Ilustração', topico.ilustracao],
    ['Notas', topico.notas],
  ] as const).filter(([, v]) => v?.trim()) : []

  const botaoTopo = 'rounded-lg px-2.5 py-1.5 text-sm ring-1 ring-neutral-800 hover:bg-neutral-900 disabled:opacity-30'
  const corTelao = !telaoOnline ? 'bg-amber-400' : telaoApagado ? 'bg-neutral-500' : 'bg-emerald-400'

  return (
    <div className="flex h-dvh flex-col bg-neutral-950">
      {fracao >= 1 && (
        <div className="pointer-events-none fixed inset-0 z-30 animate-pulse border-8 border-red-600" />
      )}

      <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-neutral-800 px-3 py-2">
        <div className="flex items-center gap-1">
          <Link to={`/mensagem/${mensagem.id}`} className="px-2 py-1 text-xl text-neutral-400" title="Sair">✕</Link>
          <button onClick={() => setPainelTelao(true)} className={`${botaoTopo} flex items-center gap-1.5`}>
            {codigoTelao && <span className={`h-2 w-2 rounded-full ${corTelao}`} />}
            Telão
          </button>
          {!rodando && decorrido > 0 && <button onClick={zerar} className={botaoTopo}>Zerar</button>}
        </div>

        <button onClick={alternarCronometro} className="flex flex-col items-center leading-none">
          <span className={`font-mono text-4xl font-semibold tabular-nums ${cor}`}>
            {restante >= 0 ? fmt(restante) : `+${fmt(restante)}`}
          </span>
          <span className="mt-1.5 flex items-center gap-2 text-xs text-neutral-500">
            <span className="font-mono text-sm tabular-nums text-neutral-300">{hora}</span>
            <span>·</span>
            <span>{rodando ? 'pausar' : decorrido ? 'pausado' : 'iniciar'}</span>
          </span>
        </button>

        <div className="flex items-center justify-end gap-1">
          <button onClick={() => setEscala((e) => e - 1)} disabled={escala === 0} className={botaoTopo}>A−</button>
          <button onClick={() => setEscala((e) => e + 1)} disabled={escala === TAMANHOS.length - 1} className={botaoTopo}>A+</button>
          <button onClick={() => setBiblia(topico?.versiculo || mensagem.texto_base || '')} className={botaoTopo}>Bíblia</button>
        </div>
      </header>

      <div className="h-1 bg-neutral-900">
        <div className={`h-full ${barra} transition-all`} style={{ width: `${Math.min(fracao, 1) * 100}%` }} />
      </div>

      <main className="flex-1 overflow-y-auto"
        onTouchStart={(e) => { toqueX.current = e.touches[0].clientX }}
        onTouchEnd={(e) => {
          if (toqueX.current === null) return
          const dx = e.changedTouches[0].clientX - toqueX.current
          toqueX.current = null
          if (Math.abs(dx) > 70) ir(dx < 0 ? 1 : -1)
        }}>
        <div className="mx-auto max-w-3xl space-y-6 p-5">
          {!topico && (
            <div className="space-y-4 pt-8">
              <h1 className={`${tam.titulo} font-semibold leading-tight`}>{mensagem.titulo}</h1>
              {mensagem.texto_base && (
                <ChipVersiculo texto={mensagem.texto_base} classe={tam.corpo}
                  onAbrir={() => setBiblia(mensagem.texto_base)} />
              )}
              <p className="text-neutral-500">
                {topicos.length} {topicos.length === 1 ? 'tópico' : 'tópicos'} · {mensagem.tempo_minutos} min
              </p>
            </div>
          )}

          {topico && (
            <>
              <div className="space-y-3">
                <p className="text-sm uppercase tracking-widest text-neutral-500">
                  Tópico {indice} de {topicos.length}
                </p>
                <h1 className={`${tam.titulo} font-semibold leading-tight`}>
                  {topico.titulo || 'Sem título'}
                </h1>
                {topico.versiculo && (
                  <ChipVersiculo texto={topico.versiculo} classe={tam.corpo}
                    onAbrir={() => setBiblia(topico.versiculo)} />
                )}
              </div>

              {topico.frase_chave?.trim() && (
                <p className={`${tam.corpo} whitespace-pre-wrap rounded-xl border-l-4 border-amber-400 bg-amber-400/10 p-4 font-medium leading-relaxed`}>
                  {topico.frase_chave}
                </p>
              )}

              {secoes.map(([rotulo, valor]) => (
                <section key={rotulo}>
                  <h2 className="mb-1 text-xs uppercase tracking-widest text-neutral-500">{rotulo}</h2>
                  <p className={`${tam.corpo} whitespace-pre-wrap leading-relaxed ${rotulo === 'Notas' ? 'text-neutral-400' : ''}`}>
                    {valor}
                  </p>
                </section>
              ))}
            </>
          )}
        </div>
      </main>

      <footer className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-t border-neutral-800 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <button onClick={() => ir(-1)} disabled={indice === 0}
          className="rounded-xl py-4 text-lg ring-1 ring-neutral-800 disabled:opacity-30">← Anterior</button>
        <span className="px-3 tabular-nums text-neutral-500">
          {indice === 0 ? 'Início' : `${indice} / ${topicos.length}`}
        </span>
        <button onClick={() => ir(1)} disabled={indice === topicos.length}
          className="rounded-xl bg-neutral-100 py-4 text-lg font-medium text-neutral-900 disabled:opacity-30">Próximo →</button>
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