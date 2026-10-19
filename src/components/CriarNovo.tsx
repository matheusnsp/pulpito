import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, GraduationCap, LoaderCircle, Mic, X } from 'lucide-react'
import { aoPedirCriar, salvarModo, type PedidoCriar } from '../lib/criar'
import { criarMensagem, FALTA_SQL_ESTUDOS } from '../lib/mensagens'
import { MODELOS_ESTUDO } from '../lib/blocos'
import type { TipoProjeto } from '../lib/tipos'

/* Folha "O que você vai preparar?": pregação, estudo em branco ou estudo a partir de um modelo */
export default function CriarNovo() {
  const navigate = useNavigate()
  const [pedido, setPedido] = useState<PedidoCriar | null>(null)
  const [criando, setCriando] = useState<string | null>(null)
  const [erro, setErro] = useState<'' | 'sql' | 'rede'>('')

  useEffect(() => aoPedirCriar((p) => { setPedido(p); setErro('') }), [])

  useEffect(() => {
    if (!pedido) return
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') setPedido(null) }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [pedido])

  async function criar(tipo: TipoProjeto, modelo?: string) {
    setCriando(modelo ?? tipo)
    setErro('')
    try {
      const id = await criarMensagem(pedido?.pastaId ?? null, { tipo, modelo })
      salvarModo(tipo)
      setPedido(null)
      navigate(`/mensagem/${id}`)
    } catch (e) {
      setErro(e instanceof Error && e.message === FALTA_SQL_ESTUDOS ? 'sql' : 'rede')
    } finally {
      setCriando(null)
    }
  }

  if (!pedido) return null

  const opcao = (tipo: TipoProjeto, Icone: typeof Mic, titulo: string, texto: string, cor: string) => (
    <button onClick={() => criar(tipo)} disabled={!!criando}
      className={`flex w-full items-start gap-4 rounded-2xl border bg-superficie p-4 text-left transition hover:border-acao ${pedido.tipo === tipo ? 'border-acao ring-4 ring-acao/15' : 'border-borda'}`}>
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" style={{ background: `${cor}24`, color: cor }}>
        {criando === tipo ? <LoaderCircle size={22} className="animate-spin" /> : <Icone size={24} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-lg font-extrabold">{titulo}</span>
        <span className="mt-0.5 block text-sm leading-snug text-texto-2">{texto}</span>
      </span>
      <ArrowRight size={18} className="mt-1 shrink-0 text-texto-2" />
    </button>
  )

  return (
    <div className="fixed inset-0 z-[65] flex items-end justify-center bg-black/55 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={() => setPedido(null)} role="dialog" aria-modal="true" aria-labelledby="criar-titulo">
      <div onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md animate-subir rounded-t-[1.75rem] border border-borda bg-fundo p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:animate-entrar sm:rounded-[1.75rem] sm:p-5">
        <span aria-hidden className="mx-auto mb-3 block h-1.5 w-10 rounded-full bg-borda sm:hidden" />
        <div className="mb-3 flex items-center justify-between">
          <h2 id="criar-titulo" className="font-display text-xl font-extrabold">O que você vai preparar?</h2>
          <button onClick={() => setPedido(null)} aria-label="Fechar"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-texto-2 hover:bg-superficie-2"><X size={18} /></button>
        </div>
        <div className="space-y-2.5">
          {opcao('pregacao', Mic, 'Pregação', 'Mensagem para pregar: texto base, tópicos, cronômetro e telão.', '#EAB308')}
          {opcao('estudo', GraduationCap, 'Estudo', 'Aula, célula, curso ou palestra sobre qualquer assunto: blocos, perguntas, atividades e folha do aluno.', '#14B8A6')}
        </div>
        <p className="rotulo mt-5">Ou comece um estudo de um modelo</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {MODELOS_ESTUDO.map((m) => (
            <button key={m.id} onClick={() => criar('estudo', m.id)} disabled={!!criando}
              className="flex items-center gap-1.5 rounded-full border border-borda px-3.5 py-2 text-sm font-bold text-texto-2 hover:border-acao hover:text-texto">
              {criando === m.id && <LoaderCircle size={14} className="animate-spin" />} {m.nome}
            </button>
          ))}
        </div>
        {erro === 'sql' && (
          <div role="alert" className="mt-4 rounded-xl bg-aviso/15 p-3 text-sm">
            <b>Falta preparar o banco para os estudos.</b> No Supabase, abra o SQL Editor, cole o conteúdo do
            arquivo <code className="rounded bg-superficie-2 px-1">supabase/estudos.sql</code> e toque em Run. Depois é só tentar de novo.
          </div>
        )}
        {erro === 'rede' && <p role="alert" className="mt-4 text-sm text-perigo">Não foi possível criar. Verifique a internet.</p>}
      </div>
    </div>
  )
}
