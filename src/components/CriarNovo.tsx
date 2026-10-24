import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, BookOpen, Briefcase, GraduationCap, LoaderCircle, Mic, NotebookPen, Presentation, Users, X, LayoutTemplate, Trash2 } from 'lucide-react'
import { aoPedirCriar, salvarModo, type PedidoCriar } from '../lib/criar'
import { criarMensagem, FALTA_SQL_ESTUDOS, usarModelo } from '../lib/mensagens'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { usePlano } from '../lib/plano'
import { podeCriarMensagem } from '../lib/planoInfo'
import { FORMATOS_PALAVRA, ICONE_FORMATO, MODELOS, nomeFormato } from '../lib/blocos'
import type { Mensagem, TipoProjeto } from '../lib/tipos'

/* Folha "O que você vai preparar?": lado Palavra (pregação e formatos) ou lado Estudos (em branco ou modelo) */
export default function CriarNovo() {
  const navigate = useNavigate()
  const [pedido, setPedido] = useState<PedidoCriar | null>(null)
  const [criando, setCriando] = useState<string | null>(null)
  const [erro, setErro] = useState<'' | 'sql' | 'rede' | 'limite'>('')
  const { plano, recarregar } = usePlano()

  const [modelos, setModelos] = useState<Mensagem[]>([])
  const { sessao } = useAuth()
  useEffect(() => aoPedirCriar((p) => {
    setPedido(p); setErro('')
    // Modelos próprios: cópias marcadas como modelo, só as minhas
    supabase.from('mensagens').select('*').then(({ data }) => setModelos(((data ?? []) as Mensagem[])
      .filter((m) => m.detalhes?.ehModelo && !m.excluida_em && (!m.proprietario_compartilhamento || m.proprietario_compartilhamento === sessao?.user.id))))
  }), [sessao])

  async function criarDoModelo(m: Mensagem) {
    if (!podeCriarMensagem(plano)) { setErro('limite'); return }
    setCriando(m.id)
    setErro('')
    try {
      const nova = await usarModelo(m, pedido?.pastaId ?? null)
      void recarregar()
      salvarModo(m.tipo === 'estudo' ? 'estudo' : 'pregacao')
      setPedido(null)
      navigate(`/mensagem/${nova.id}`)
    } catch { setErro('rede') }
    finally { setCriando(null) }
  }

  async function apagarModelo(m: Mensagem) {
    if (!confirm(`Apagar o modelo "${m.titulo}"? As mensagens criadas a partir dele continuam.`)) return
    await supabase.from('mensagens').delete().eq('id', m.id)
    setModelos((l) => l.filter((x) => x.id !== m.id))
  }

  useEffect(() => {
    if (!pedido) return
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') setPedido(null) }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [pedido])

  async function criar(tipo: TipoProjeto, modelo?: string) {
    if (!podeCriarMensagem(plano)) { setErro('limite'); return }
    setCriando(modelo ?? tipo)
    setErro('')
    try {
      const id = await criarMensagem(pedido?.pastaId ?? null, { tipo, modelo })
      void recarregar()
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

  const cartao = (chave: string, tipo: TipoProjeto, modelo: string | undefined, Icone: typeof Mic, titulo: string, texto: string, cor: string, destaque = false) => (
    <button key={chave} onClick={() => criar(tipo, modelo)} disabled={!!criando}
      className={`flex w-full items-center gap-3 rounded-2xl border bg-superficie p-3 text-left transition hover:border-acao ${destaque ? 'border-acao/70' : 'border-borda'}`}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: `${cor}24`, color: cor }}>
        {criando === chave ? <LoaderCircle size={20} className="animate-spin" /> : <Icone size={20} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display font-extrabold leading-tight">{titulo}</span>
        <span className="block truncate text-xs text-texto-2">{texto}</span>
      </span>
      <ArrowRight size={16} className="shrink-0 text-texto-2" />
    </button>
  )
  const ICONES_ESTUDO: Record<string, typeof Mic> = { aula: NotebookPen, palestra: Presentation, treinamento: Briefcase }
  const estudos = MODELOS.filter((m) => m.lado === 'estudo')
  const secao = (tipo: TipoProjeto, Icone: typeof Mic, nome: string, texto: string, cor: string) => (
    <div className={`mb-2 mt-1 flex items-center gap-2 ${pedido.tipo === tipo ? '' : 'opacity-90'}`}>
      <Icone size={16} style={{ color: cor }} />
      <b className="font-display">{nome}</b>
      <span className="truncate text-xs text-texto-2">{texto}</span>
    </div>
  )

  return (
    <div className="fixed inset-0 z-[65] flex items-end justify-center bg-black/55 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={() => setPedido(null)} role="dialog" aria-modal="true" aria-labelledby="criar-titulo">
      <div onClick={(e) => e.stopPropagation()}
        className="max-h-[100dvh] w-full max-w-2xl animate-subir overflow-y-auto rounded-t-[1.75rem] border border-borda bg-fundo p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:animate-entrar sm:rounded-[1.75rem] sm:p-5">
        <span aria-hidden className="mx-auto mb-3 block h-1.5 w-10 rounded-full bg-borda sm:hidden" />
        <div className="mb-3 flex items-center justify-between">
          <h2 id="criar-titulo" className="font-display text-xl font-extrabold">O que você vai preparar?</h2>
          <button onClick={() => setPedido(null)} aria-label="Fechar"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-texto-2 hover:bg-superficie-2"><X size={18} /></button>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-5 sm:grid-cols-2">
          <div>
            {secao('pregacao', BookOpen, 'Palavra', 'Centrado na Bíblia', '#EAB308')}
            <div className="space-y-2">
              {FORMATOS_PALAVRA.map((f) => cartao(f.id, 'pregacao', f.id === 'pregacao' ? undefined : f.id, ICONE_FORMATO[f.id], f.nome, f.resumo, '#EAB308', f.id === 'pregacao' && pedido.tipo !== 'estudo'))}
            </div>
          </div>
          <div>
            {secao('estudo', GraduationCap, 'Estudos', 'Qualquer assunto', '#14B8A6')}
            <div className="space-y-2">
              {cartao('estudo', 'estudo', undefined, GraduationCap, 'Em branco', 'Monte com blocos do seu jeito', '#14B8A6', pedido.tipo === 'estudo')}
              {estudos.map((m) => cartao(m.id, 'estudo', m.id, ICONES_ESTUDO[m.id] ?? GraduationCap, m.nome, m.blocos.map((b) => b.titulo).slice(0, 3).join(' · '), '#14B8A6'))}
            </div>
          </div>
        </div>
        {modelos.length > 0 && (
          <div className="mt-5">
            <div className="mb-2 flex items-center gap-2"><LayoutTemplate size={16} className="text-tinta" /><b className="font-display">Seus modelos</b></div>
            <div className="grid gap-2 sm:grid-cols-2">
              {modelos.map((m) => (
                <div key={m.id} className="flex items-center gap-1 rounded-2xl border border-borda bg-superficie pr-1">
                  <button onClick={() => criarDoModelo(m)} disabled={!!criando} className="flex min-w-0 flex-1 items-center gap-3 p-3 text-left">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ouro-suave text-tinta">
                      {criando === m.id ? <LoaderCircle size={20} className="animate-spin" /> : <LayoutTemplate size={19} />}
                    </span>
                    <span className="min-w-0">
                      <b className="block truncate font-display leading-tight">{m.titulo || 'Sem título'}</b>
                      <span className="block truncate text-xs text-texto-2">{m.tipo === 'estudo' ? 'Estudo' : nomeFormato(m.detalhes?.formato)}</span>
                    </span>
                  </button>
                  <button onClick={() => apagarModelo(m)} aria-label="Apagar modelo" title="Apagar modelo" className="rounded-lg p-2 text-texto-2 hover:text-perigo"><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
          </div>
        )}
        <button onClick={() => { setPedido(null); navigate('/entrar-projeto') }}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-2 text-sm font-bold text-texto-2 hover:text-texto">
          <Users size={16} /> Recebeu um convite? Entrar com o código
        </button>
        {erro === 'sql' && (
          <div role="alert" className="mt-4 rounded-xl bg-aviso/15 p-3 text-sm">
            <b>Falta preparar o banco para os estudos.</b> No Supabase, abra o SQL Editor, cole o conteúdo do
            arquivo <code className="rounded bg-superficie-2 px-1">supabase/estudos.sql</code> e toque em Run. Depois é só tentar de novo.
          </div>
        )}
        {erro === 'rede' && <p role="alert" className="mt-4 text-sm text-perigo">Não foi possível criar. Verifique a internet.</p>}
        {erro === 'limite' && (
          <div role="alert" className="mt-4 rounded-2xl border border-acao bg-ouro-suave p-4 text-sm">
            <b className="block font-display">Você chegou às {plano.limite} mensagens do Gratuito</b>
            <p className="mt-1 text-texto-2">Para criar mais, mova uma para a lixeira ou passe para o Premium, que libera mensagens ilimitadas, slides, telão e respostas ao vivo.</p>
            <Link to="/assinatura" onClick={() => setPedido(null)} className="botao-primario mt-3 py-2 text-sm">Conhecer o Premium</Link>
          </div>
        )}
      </div>
    </div>
  )
}
