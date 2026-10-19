import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Check, CircleX, Hourglass, LoaderCircle, Pencil, Send, Trophy, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { CORES_OPCOES, LETRAS, canalAula, type EstadoAula } from '../lib/aoVivo'
import Marca from '../components/Marca'

/*
  Página do aluno (sem login): entra com o código e o nome e responde as perguntas
  que o professor está mostrando. A tela muda sozinha quando o professor passa de bloco.
*/

const CHAVE_NOME = 'pulpito-aluno-nome'
const CHAVE_ID = 'pulpito-aluno-id'
type Minha = { texto?: string; opcao?: number }

function idDoAparelho() {
  try {
    let id = localStorage.getItem(CHAVE_ID)
    if (!id) { id = crypto.randomUUID(); localStorage.setItem(CHAVE_ID, id) }
    return id
  } catch { return crypto.randomUUID() }
}
const lerNome = () => { try { return localStorage.getItem(CHAVE_NOME) ?? '' } catch { return '' } }

/* Resposta aberta de um bloco (o rascunho é de cada pergunta) */
function RespostaAberta({ minha, enviando, onEnviar }: { minha?: Minha; enviando: boolean; onEnviar: (texto: string) => void }) {
  const [rascunho, setRascunho] = useState(minha?.texto ?? '')
  const [editando, setEditando] = useState(false)
  if (minha?.texto && !editando) return (
    <div className="rounded-2xl border border-sucesso/40 bg-sucesso/10 p-4">
      <p className="flex items-center gap-2 text-sm font-bold text-sucesso"><Check size={16} /> Resposta enviada</p>
      <p className="mt-2 whitespace-pre-wrap">{minha.texto}</p>
      <button onClick={() => { setRascunho(minha.texto ?? ''); setEditando(true) }} className="botao-fantasma -ml-2 mt-2 px-2 text-sm"><Pencil size={15} /> Editar</button>
    </div>
  )
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (rascunho.trim()) { onEnviar(rascunho.trim()); setEditando(false) } }} className="space-y-3">
      <textarea value={rascunho} onChange={(e) => setRascunho(e.target.value.slice(0, 1000))} rows={4} autoFocus
        placeholder="Escreva sua resposta" className="campo resize-none text-lg leading-relaxed" />
      <button disabled={!rascunho.trim() || enviando} className="botao-primario w-full py-3.5 text-lg">
        {enviando ? <LoaderCircle size={20} className="animate-spin" /> : <Send size={20} />} Enviar
      </button>
    </form>
  )
}

function Moldura({ children }: { children: ReactNode }) {
  return (
    <div className="escuro min-h-dvh bg-fundo text-texto">
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))]">
        <Marca icone modo="estudo" className="text-xl" />
        <div className="flex flex-1 flex-col">{children}</div>
      </div>
    </div>
  )
}

export default function Responder() {
  const { codigo: codigoUrl } = useParams()
  const navigate = useNavigate()
  const codigo = (codigoUrl ?? '').toUpperCase()
  const [digitado, setDigitado] = useState('')
  const [nome, setNome] = useState(lerNome)
  const [confirmado, setConfirmado] = useState(() => !!lerNome())
  const [estado, setEstado] = useState<EstadoAula | null>(null)
  const [semResposta, setSemResposta] = useState(false)
  const [minhas, setMinhas] = useState<Record<string, Minha>>({})
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [participante] = useState(idDoAparelho)
  const canal = useRef<ReturnType<typeof supabase.channel> | null>(null)

  // Entra no canal da aula e pede o estado até o professor responder
  useEffect(() => {
    if (!codigo || !confirmado || !nome.trim()) return
    const ch = supabase.channel(canalAula(codigo), { config: { broadcast: { self: false } } })
    let insistir: ReturnType<typeof setInterval> | undefined
    let espera: ReturnType<typeof setTimeout> | undefined
    let recebeu = false
    ch.on('broadcast', { event: 'estado' }, ({ payload }) => {
      recebeu = true
      clearInterval(insistir)
      setSemResposta(false)
      setEstado(payload as EstadoAula)
    }).subscribe((status) => {
      if (status !== 'SUBSCRIBED') return
      const entrar = () => ch.send({ type: 'broadcast', event: 'entrou', payload: { participante: participante, nome: nome.trim() } })
      entrar()
      insistir = setInterval(entrar, 3000)
      espera = setTimeout(() => { if (!recebeu) setSemResposta(true) }, 9000)
    })
    canal.current = ch
    return () => { clearInterval(insistir); clearTimeout(espera); canal.current = null; supabase.removeChannel(ch) }
  }, [codigo, confirmado, nome, participante])

  async function enviar(campos: Minha) {
    if (!estado?.bloco) return
    setEnviando(true)
    setErro('')
    const { error } = await supabase.rpc('responder_aula', {
      p_codigo: codigo, p_bloco: estado.bloco.id, p_participante: participante, p_nome: nome.trim(),
      p_texto: campos.texto ?? null, p_opcao: campos.opcao ?? null,
    })
    setEnviando(false)
    if (error) {
      setErro(/fechada/i.test(error.message) ? 'Esta aula já foi encerrada.' : 'Não foi possível enviar. Verifique a internet e tente de novo.')
      return
    }
    setMinhas((m) => ({ ...m, [estado.bloco!.id]: campos }))
    canal.current?.send({ type: 'broadcast', event: 'respondeu', payload: { participante: participante } })
  }

  /* 1. Código */
  if (!codigo) {
    const ir = (e: FormEvent) => { e.preventDefault(); if (digitado.trim().length >= 4) navigate(`/responder/${digitado.trim().toUpperCase()}`) }
    return (
      <Moldura>
        <form onSubmit={ir} className="my-auto space-y-4 py-10">
          <h1 className="font-display text-3xl font-extrabold tracking-tight">Entrar na aula</h1>
          <p className="text-texto-2">Digite o código que aparece na tela do professor.</p>
          <input value={digitado} onChange={(e) => setDigitado(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} maxLength={6}
            autoFocus inputMode="text" autoCapitalize="characters" placeholder="ABC12"
            className="campo text-center font-mono text-4xl tracking-[0.3em]" />
          <button className="botao-primario w-full py-3.5 text-lg" disabled={digitado.length < 4}>Continuar</button>
        </form>
      </Moldura>
    )
  }

  /* 2. Nome */
  if (!confirmado || !nome.trim()) {
    const entrar = (e: FormEvent) => {
      e.preventDefault()
      if (!nome.trim()) return
      try { localStorage.setItem(CHAVE_NOME, nome.trim()) } catch { /* sem armazenamento */ }
      setConfirmado(true)
    }
    return (
      <Moldura>
        <form onSubmit={entrar} className="my-auto space-y-4 py-10">
          <p className="rotulo">Aula · código <span className="font-mono">{codigo}</span></p>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">Qual é o seu nome?</h1>
          <input value={nome} onChange={(e) => setNome(e.target.value.slice(0, 60))} autoFocus autoComplete="given-name"
            placeholder="Seu nome" className="campo py-3.5 text-lg" />
          <button className="botao-primario w-full py-3.5 text-lg" disabled={!nome.trim()}>Entrar</button>
        </form>
      </Moldura>
    )
  }

  /* 3. Esperando o professor */
  if (!estado) {
    return (
      <Moldura>
        <div className="my-auto space-y-3 py-10 text-center">
          <LoaderCircle size={36} className="mx-auto animate-spin text-texto-2" />
          <p className="font-display text-xl font-bold">Entrando na aula {codigo}…</p>
          {semResposta && <p className="text-texto-2">Ainda não achamos esta aula. Confira o código com o professor ou espere ele abrir as respostas.</p>}
          <button onClick={() => setConfirmado(false)} className="botao-fantasma text-sm">Trocar nome ({nome})</button>
        </div>
      </Moldura>
    )
  }

  if (!estado.aberta) {
    return (
      <Moldura>
        <div className="my-auto space-y-3 py-10 text-center">
          <Check size={40} className="mx-auto text-sucesso" />
          <h1 className="font-display text-2xl font-extrabold">A aula terminou</h1>
          <p className="text-texto-2">Obrigado por participar, {nome}!</p>
        </div>
      </Moldura>
    )
  }

  const b = estado.bloco
  const recebe = b && (b.tipo === 'pergunta' || b.tipo === 'atividade')
  const minha = b ? minhas[b.id] : undefined
  const multipla = !!b?.opcoes?.length
  const minhaPosicao = estado.placar.findIndex((p) => p.nome === nome.trim())

  return (
    <Moldura>
      <div className="mt-4 flex items-center justify-between gap-3 text-sm text-texto-2">
        <span className="truncate">{estado.titulo}</span>
        <span className="flex shrink-0 items-center gap-1"><Users size={14} /> {estado.participantes}</span>
      </div>

      {!recebe ? (
        <div className="my-auto space-y-3 py-10 text-center">
          <Hourglass size={36} className="mx-auto text-texto-2" />
          <h1 className="font-display text-2xl font-extrabold">Preste atenção na aula</h1>
          <p className="text-texto-2">Quando chegar uma pergunta, ela aparece aqui.</p>
          {b?.titulo && <p className="rounded-xl bg-superficie px-4 py-3 text-sm">Agora: <b>{b.titulo}</b></p>}
        </div>
      ) : (
        <div key={b!.id} className="mt-6 flex animate-entrar flex-col gap-5">
          <p className="rotulo" style={{ color: b!.tipo === 'pergunta' ? '#38BDF8' : '#14B8A6' }}>
            {b!.tipo === 'pergunta' ? (multipla ? 'Escolha uma resposta' : 'Pergunta') : 'Atividade'}
            {b!.minutos ? ` · ${b!.minutos} min` : ''}
          </p>
          <h1 className="font-display text-[1.7rem] font-extrabold leading-tight tracking-tight">{b!.titulo}</h1>

          {/* Múltipla escolha */}
          {multipla && (
            <div className="grid gap-2.5">
              {b!.opcoes!.map((op, i) => {
                const escolhida = minha?.opcao === i
                const certa = estado.revelada && b!.correta === i
                const apagada = (minha?.opcao !== undefined && !escolhida && !certa) || (estado.revelada && !certa && !escolhida)
                return (
                  <button key={i} disabled={minha?.opcao !== undefined || enviando || estado.revelada}
                    onClick={() => enviar({ opcao: i })}
                    className={`flex min-h-16 items-center gap-3 rounded-2xl p-3 text-left text-lg font-bold text-white transition ${apagada ? 'opacity-35' : ''} ${escolhida ? 'ring-4 ring-white' : ''}`}
                    style={{ background: CORES_OPCOES[i] }}>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-black/20 font-extrabold">{LETRAS[i]}</span>
                    <span className="flex-1">{op}</span>
                    {certa && <Check size={24} />}
                  </button>
                )
              })}
              {minha?.opcao !== undefined && !estado.revelada && (
                <p className="text-center text-texto-2">Resposta enviada! Aguarde o resultado.</p>
              )}
              {estado.revelada && minha?.opcao !== undefined && (
                <p className={`flex items-center justify-center gap-2 rounded-2xl p-3 font-display text-xl font-extrabold ${minha.opcao === b!.correta ? 'bg-sucesso/20 text-sucesso' : 'bg-perigo/20 text-perigo'}`}>
                  {minha.opcao === b!.correta ? <><Check size={24} /> Acertou!</> : <><CircleX size={24} /> Não foi dessa vez</>}
                </p>
              )}
              {estado.revelada && estado.placar.length > 0 && (
                <div className="rounded-2xl bg-superficie p-3">
                  <p className="rotulo flex items-center gap-1.5"><Trophy size={14} className="text-tinta" /> Placar</p>
                  <ol className="mt-2 space-y-1">
                    {estado.placar.slice(0, 5).map((p, i) => (
                      <li key={p.nome + i} className={`flex items-center gap-3 rounded-lg px-2 py-1 ${i === minhaPosicao ? 'bg-acao/15' : ''}`}>
                        <b className="w-5 text-center">{i + 1}</b><span className="min-w-0 flex-1 truncate">{p.nome}</span><span className="font-mono">{p.pontos}</span>
                      </li>
                    ))}
                  </ol>
                  {minhaPosicao >= 5 && <p className="mt-2 text-center text-sm text-texto-2">Você está em {minhaPosicao + 1}º lugar</p>}
                </div>
              )}
            </div>
          )}

          {/* Resposta aberta */}
          {!multipla && <RespostaAberta key={b!.id} minha={minha} enviando={enviando} onEnviar={(texto) => enviar({ texto })} />}

          {erro && <p role="alert" className="text-center text-perigo">{erro}</p>}

          {/* Respostas da turma, quando o professor libera */}
          {!multipla && estado.mostrar && estado.respostas.length > 0 && (
            <div>
              <p className="rotulo">Respostas da turma</p>
              <div className="mt-2 space-y-2">
                {[...estado.respostas].sort((x, y) => Number(!!y.destaque) - Number(!!x.destaque)).map((r) => (
                  <div key={r.participante} className={`rounded-xl border p-3 ${r.destaque ? 'border-acao bg-ouro-suave' : 'border-borda bg-superficie'}`}>
                    <b className="text-sm">{r.participante === participante ? 'Você' : r.nome}</b>
                    <p className="mt-0.5 whitespace-pre-wrap break-words">{r.texto}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Moldura>
  )
}
