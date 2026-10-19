import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type { Mensagem, Topico } from './tipos'

/*
  Respostas ao vivo (modo aula). O professor abre uma "aula ao vivo" com um código;
  os alunos entram em /responder com o código e o nome, sem login.
  A pergunta atual vai do professor para os alunos por um canal em tempo real;
  as respostas ficam gravadas no banco (função responder_aula) e o aluno avisa pelo canal.
*/

/* Cores das opções, como nos quizzes (com letra para não depender só da cor) */
export const CORES_OPCOES = ['#E11D48', '#2563EB', '#D97706', '#16A34A', '#9333EA', '#0891B2']
export const LETRAS = 'ABCDEF'

export const canalAula = (codigo: string) => `aula:${codigo.toUpperCase()}`
export const linkResponder = (codigo: string) => `${window.location.origin}/responder/${codigo}`

export type BlocoPublico = {
  id: string; tipo: string; titulo: string; minutos?: number
  opcoes?: string[]; correta?: number // "correta" só vai depois que o professor revela
}
export type RespostaPublica = { participante: string; nome: string; texto?: string | null; opcao?: number | null; destaque?: boolean }
export type EstadoAula = {
  titulo: string
  espera?: { titulo?: string; texto?: string } // mensagem de espera escolhida no estudo
  aberta: boolean
  mostrar: boolean // alunos veem as respostas dos outros
  bloco: BlocoPublico | null
  revelada: boolean
  respostas: RespostaPublica[] // só as visíveis, e só quando "mostrar" está ligado (ou já revelada)
  placar: { nome: string; pontos: number }[]
  participantes: number
}

export type Resposta = {
  id: string; aula_id: string; bloco_id: string; participante: string; nome: string
  texto: string | null; opcao: number | null; oculta: boolean; destaque: boolean; criado_em: string
}
export type Aula = { id: string; codigo: string; mensagem_id: string; mostrar_respostas: boolean; aberta: boolean; criado_em: string; encerrada_em: string | null }

/* Blocos que recebem respostas */
export const aceitaResposta = (t?: Pick<Topico, 'tipo'> | null) => t?.tipo === 'pergunta' || t?.tipo === 'atividade'
export const ehMultipla = (t?: Pick<Topico, 'tipo' | 'extra'> | null) =>
  t?.tipo === 'pergunta' && (t.extra?.opcoes?.filter((o) => o.trim()).length ?? 0) >= 2

const gerarCodigo = () => {
  const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // sem 0/O e 1/I para não confundir
  return Array.from({ length: 5 }, () => letras[Math.floor(Math.random() * letras.length)]).join('')
}

/* Pontos estilo quiz: acertou = 500 a 1000; quem respondeu primeiro ganha 1000 e cada segundo depois tira 15 */
export function calcularPlacar(respostas: Resposta[], blocos: Topico[]) {
  const pontos = new Map<string, { nome: string; pontos: number }>()
  const primeira: Record<string, number> = {}
  for (const r of respostas) {
    const t = new Date(r.criado_em).getTime()
    if (r.opcao !== null && (!primeira[r.bloco_id] || t < primeira[r.bloco_id])) primeira[r.bloco_id] = t
  }
  for (const r of respostas) {
    const b = blocos.find((x) => x.id === r.bloco_id)
    if (!b || !ehMultipla(b) || r.opcao === null) continue
    const atual = pontos.get(r.participante) ?? { nome: r.nome, pontos: 0 }
    atual.nome = r.nome
    if (r.opcao === b.extra?.correta) {
      const seg = Math.max(0, (new Date(r.criado_em).getTime() - primeira[b.id]) / 1000)
      atual.pontos += Math.max(500, Math.round(1000 - seg * 15))
    }
    pontos.set(r.participante, atual)
  }
  return [...pontos.values()].sort((a, b) => b.pontos - a.pontos)
}

const CHAVE_AULA = (mensagemId: string) => `pulpito-aula-ao-vivo-${mensagemId}`

/* Lado do professor: abre, sincroniza o bloco atual e acompanha as respostas */
export function useAulaAoVivo(mensagem: Mensagem | null | undefined, blocos: Topico[], blocoAtual: Topico | null) {
  const [aula, setAula] = useState<Aula | null>(null)
  const [respostas, setRespostas] = useState<Resposta[]>([])
  const [participantes, setParticipantes] = useState<Record<string, string>>({})
  const [revelados, setRevelados] = useState<Set<string>>(new Set())
  const [erro, setErro] = useState('')
  const canal = useRef<RealtimeChannel | null>(null)
  const estadoRef = useRef<EstadoAula | null>(null)
  const recarregarRef = useRef<() => void>(() => {})

  // Retoma uma aula aberta depois de recarregar a página
  useEffect(() => {
    if (!mensagem) return
    const codigo = sessionStorage.getItem(CHAVE_AULA(mensagem.id))
    if (!codigo) return
    supabase.from('aulas_ao_vivo').select('*').eq('codigo', codigo).eq('aberta', true).maybeSingle()
      .then(({ data }) => {
        if (!data) { sessionStorage.removeItem(CHAVE_AULA(mensagem.id)); return }
        setAula(data as Aula)
      })
  }, [mensagem])

  const recarregar = useCallback(async () => {
    if (!aula) return
    const { data } = await supabase.from('respostas').select('*').eq('aula_id', aula.id).order('criado_em')
    if (data) {
      setRespostas(data as Resposta[])
      setParticipantes((p) => {
        const novo = { ...p }
        for (const r of data as Resposta[]) novo[r.participante] = r.nome
        return novo
      })
    }
  }, [aula])
  useEffect(() => { recarregarRef.current = recarregar }, [recarregar])

  // Canal em tempo real
  useEffect(() => {
    if (!aula?.aberta) return
    const ch = supabase.channel(canalAula(aula.codigo), { config: { broadcast: { self: false } } })
    let tempo: ReturnType<typeof setTimeout> | undefined
    const enviarEstado = () => { if (estadoRef.current) ch.send({ type: 'broadcast', event: 'estado', payload: estadoRef.current }) }
    ch.on('broadcast', { event: 'entrou' }, ({ payload }) => {
      const p = payload as { participante: string; nome: string }
      if (p?.participante) setParticipantes((x) => ({ ...x, [p.participante]: String(p.nome ?? '').slice(0, 60) }))
      enviarEstado()
    })
      .on('broadcast', { event: 'pedir-estado' }, enviarEstado)
      .on('broadcast', { event: 'respondeu' }, () => {
        clearTimeout(tempo)
        tempo = setTimeout(() => recarregarRef.current(), 250)
      })
      .subscribe((status) => { if (status === 'SUBSCRIBED') enviarEstado() })
    canal.current = ch
    recarregarRef.current()
    const reserva = setInterval(() => recarregarRef.current(), 6000) // se algum aviso se perder
    return () => { clearTimeout(tempo); clearInterval(reserva); canal.current = null; supabase.removeChannel(ch) }
  }, [aula?.aberta, aula?.codigo])

  const respostasDoBloco = useMemo(
    () => respostas.filter((r) => r.bloco_id === blocoAtual?.id),
    [respostas, blocoAtual?.id],
  )
  const placar = useMemo(() => calcularPlacar(respostas, blocos), [respostas, blocos])
  const revelada = !!blocoAtual && revelados.has(blocoAtual.id)

  // Estado enviado aos alunos sempre que algo muda
  useEffect(() => {
    if (!aula || !mensagem) return
    const b = blocoAtual
    const multipla = ehMultipla(b)
    const estado: EstadoAula = {
      titulo: mensagem.titulo,
      espera: { titulo: mensagem.detalhes?.esperaTitulo, texto: mensagem.detalhes?.esperaTexto },
      aberta: aula.aberta,
      mostrar: aula.mostrar_respostas,
      bloco: b ? {
        id: b.id, tipo: b.tipo ?? 'explicacao', titulo: b.titulo, minutos: b.extra?.minutos,
        opcoes: multipla ? b.extra!.opcoes!.filter((o) => o.trim()) : undefined,
        correta: multipla && revelada ? b.extra?.correta : undefined,
      } : null,
      revelada,
      respostas: (aula.mostrar_respostas || revelada)
        ? respostasDoBloco.filter((r) => !r.oculta).map((r) => ({ participante: r.participante, nome: r.nome, texto: r.texto, opcao: r.opcao, destaque: r.destaque }))
        : [],
      placar: revelada && multipla ? placar.slice(0, 10) : [],
      participantes: Object.keys(participantes).length,
    }
    estadoRef.current = estado
    canal.current?.send({ type: 'broadcast', event: 'estado', payload: estado })
  }, [aula, mensagem, blocoAtual, respostasDoBloco, revelada, placar, participantes])

  async function abrir() {
    if (!mensagem) return
    setErro('')
    for (let tentativa = 0; tentativa < 3; tentativa++) {
      const codigo = gerarCodigo()
      const { data, error } = await supabase.from('aulas_ao_vivo').insert({ codigo, mensagem_id: mensagem.id }).select().single()
      if (data) {
        sessionStorage.setItem(CHAVE_AULA(mensagem.id), codigo)
        setRespostas([]); setParticipantes({}); setRevelados(new Set())
        setAula(data as Aula)
        return
      }
      if (error && error.code !== '23505') { // 23505 = código repetido: tenta outro
        setErro(/relation|does not exist|schema cache/i.test(error.message)
          ? 'Falta preparar o banco: rode o arquivo supabase/aula-ao-vivo.sql no Supabase.'
          : 'Não foi possível abrir as respostas. Verifique a internet.')
        return
      }
    }
  }

  async function encerrar() {
    if (!aula || !mensagem) return
    await supabase.from('aulas_ao_vivo').update({ aberta: false, encerrada_em: new Date().toISOString() }).eq('id', aula.id)
    if (estadoRef.current) canal.current?.send({ type: 'broadcast', event: 'estado', payload: { ...estadoRef.current, aberta: false } })
    sessionStorage.removeItem(CHAVE_AULA(mensagem.id))
    setAula(null)
  }

  async function alternarMostrar() {
    if (!aula) return
    const mostrar_respostas = !aula.mostrar_respostas
    setAula({ ...aula, mostrar_respostas })
    await supabase.from('aulas_ao_vivo').update({ mostrar_respostas }).eq('id', aula.id)
  }

  async function marcar(r: Resposta, campos: Partial<Pick<Resposta, 'oculta' | 'destaque'>>) {
    setRespostas((lista) => lista.map((x) => (x.id === r.id ? { ...x, ...campos } : x)))
    await supabase.from('respostas').update(campos).eq('id', r.id)
  }

  function alternarRevelar() {
    if (!blocoAtual) return
    setRevelados((s) => {
      const n = new Set(s)
      if (n.has(blocoAtual.id)) n.delete(blocoAtual.id); else n.add(blocoAtual.id)
      return n
    })
  }

  return {
    aula, erro, respostasDoBloco, placar, revelada, participantes: Object.keys(participantes).length,
    abrir, encerrar, alternarMostrar, marcar, alternarRevelar,
  }
}
