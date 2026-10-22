import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, GraduationCap, LoaderCircle, Mic, RotateCcw, Trash2 } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { DIAS_LIXEIRA, apagarDeVez, carregarLixeira, diasRestantes, restaurar } from '../lib/lixeira'
import type { Mensagem } from '../lib/tipos'

/* Lixeira: o que foi excluído fica 30 dias aqui, com restaurar e apagar de vez */
export default function Lixeira() {
  const { sessao } = useAuth()
  const [itens, setItens] = useState<Mensagem[] | null | undefined>(undefined) // null = banco sem lixeira
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (!sessao) return
    let ativo = true
    carregarLixeira(sessao.user.id).then((l) => { if (ativo) setItens(l) })
    return () => { ativo = false }
  }, [sessao])

  async function agir(m: Mensagem, acao: 'restaurar' | 'apagar') {
    if (acao === 'apagar' && !confirm(`Apagar "${m.titulo || 'Sem título'}" para sempre? Não dá para desfazer.`)) return
    setOcupado(m.id)
    setErro('')
    try {
      if (acao === 'restaurar') await restaurar(m.id)
      else await apagarDeVez(m.id)
      setItens((l) => l?.filter((x) => x.id !== m.id) ?? l)
    } catch { setErro('Não foi possível concluir. Verifique a internet.') }
    finally { setOcupado(null) }
  }

  return (
    <div className="mx-auto max-w-3xl px-3 sm:px-4 pb-16 md:px-8">
      <div className="sticky top-0 z-20 -mx-4 flex items-center bg-fundo/90 px-4 py-2 backdrop-blur md:-mx-8 md:px-8 md:py-4">
        <Link to="/" className="botao-fantasma -ml-2 px-2"><ChevronLeft size={20} /> Início</Link>
      </div>
      <h1 className="titulo-pagina mt-2 flex items-center gap-3"><Trash2 size={28} className="text-texto-2" /> Lixeira</h1>
      <p className="mt-1 text-texto-2">O que você exclui fica aqui por {DIAS_LIXEIRA} dias. Depois disso é apagado de vez.</p>

      {erro && <p role="alert" className="mt-4 text-sm text-perigo">{erro}</p>}
      {itens === undefined && <div className="cartao mt-6 h-24 animate-pulse bg-superficie-2/60" />}
      {itens === null && (
        <p className="mt-6 rounded-xl bg-aviso/15 p-4 text-sm">
          A lixeira ainda não está ligada. No Supabase, rode o arquivo <code className="rounded bg-superficie-2 px-1">supabase/migrations/20261022130000_lixeira_historico_aulas.sql</code>.
          Até lá, o que for excluído é apagado na hora.
        </p>
      )}
      {itens?.length === 0 && (
        <div className="cartao mt-6 px-6 py-12 text-center text-texto-2">A lixeira está vazia.</div>
      )}

      <ul className="mt-6 space-y-3">
        {itens?.map((m) => {
          const dias = diasRestantes(m.excluida_em!)
          const Icone = m.tipo === 'estudo' ? GraduationCap : Mic
          return (
            <li key={m.id} className="cartao flex items-center gap-3 p-3 pl-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-superficie-2 text-texto-2"><Icone size={19} /></span>
              <span className="min-w-0 flex-1">
                <b className="block truncate font-display">{m.titulo || 'Sem título'}</b>
                <span className="text-sm text-texto-2">
                  Excluída em {new Date(m.excluida_em!).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })} · {dias <= 1 ? 'some amanhã' : `some em ${dias} dias`}
                </span>
              </span>
              {ocupado === m.id ? <LoaderCircle size={20} className="mx-3 animate-spin text-texto-2" /> : (
                <>
                  <button onClick={() => agir(m, 'restaurar')} className="botao-secundario px-3 py-1.5 text-sm"><RotateCcw size={16} /> <span className="max-sm:hidden">Restaurar</span></button>
                  <button onClick={() => agir(m, 'apagar')} aria-label="Apagar de vez" title="Apagar de vez" className="rounded-xl p-2 text-texto-2 hover:bg-perigo/10 hover:text-perigo"><Trash2 size={18} /></button>
                </>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
