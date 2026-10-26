import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ChevronDown, ChevronLeft, History, LoaderCircle, RotateCcw, Save } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { listarVersoes, restaurarVersao, salvarVersao, type Versao } from '../lib/versoes'
import { ehBloco } from '../lib/blocos'

const quando = (iso: string) => new Date(iso).toLocaleString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const MOTIVO: Record<Versao['motivo'], string> = { edicao: 'Ao começar a editar', 'antes-de-restaurar': 'Antes de restaurar', manual: 'Salva por você' }

/* Histórico de versões do projeto, com prévia e restaurar */
export default function Historico() {
  const { id = '' } = useParams()
  const { sessao } = useAuth()
  const navigate = useNavigate()
  const [versoes, setVersoes] = useState<Versao[] | null | undefined>(undefined) // null = banco sem histórico
  const [aberta, setAberta] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [erro, setErro] = useState('')
  const [recarga, setRecarga] = useState(0)

  useEffect(() => {
    let ativo = true
    listarVersoes(id).then((v) => { if (ativo) setVersoes(v) })
    return () => { ativo = false }
  }, [id, recarga])

  async function salvarAgora() {
    setOcupado('agora')
    setErro('')
    if (!(await salvarVersao(id, 'manual'))) setErro('Não foi possível salvar a versão.')
    setOcupado(null)
    setRecarga((n) => n + 1)
  }

  async function restaurar(v: Versao) {
    if (!confirm(`Voltar o projeto para como estava em ${quando(v.criado_em)}? O estado de agora fica guardado no histórico.`)) return
    setOcupado(v.id)
    setErro('')
    try {
      await restaurarVersao(v)
      navigate(`/mensagem/${id}`)
    } catch {
      setErro('Não foi possível restaurar. Verifique a internet e tente de novo.')
      setOcupado(null)
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-3 @tsm:px-4 pb-16 @tmd:px-8">
      <div className="sticky top-0 z-20 -mx-4 flex items-center bg-fundo/90 px-4 py-2 backdrop-blur @tmd:-mx-8 @tmd:px-8 @tmd:py-4">
        <Link to={`/mensagem/${id}`} className="botao-fantasma -ml-2 px-2"><ChevronLeft size={20} /> Voltar</Link>
        {versoes && (
          <button onClick={salvarAgora} disabled={!!ocupado} className="botao-secundario ml-auto px-3 py-1.5 text-sm">
            {ocupado === 'agora' ? <LoaderCircle size={16} className="animate-spin" /> : <Save size={16} />} Salvar versão agora
          </button>
        )}
      </div>
      <h1 className="titulo-pagina mt-2 flex items-center gap-3"><History size={28} className="text-texto-2" /> Histórico</h1>
      <p className="mt-1 text-texto-2">Uma cópia é guardada sempre que alguém começa a editar. Dá para voltar a qualquer uma.</p>

      {erro && <p role="alert" className="mt-4 text-sm text-perigo">{erro}</p>}
      {versoes === undefined && <div className="cartao mt-6 h-24 animate-pulse bg-superficie-2/60" />}
      {versoes === null && (
        <p className="mt-6 rounded-xl bg-aviso/15 p-4 text-sm">
          O histórico ainda não está ligado. No Supabase, rode o arquivo <code className="rounded bg-superficie-2 px-1">supabase/migrations/20261022130000_lixeira_historico_aulas.sql</code>.
        </p>
      )}
      {versoes?.length === 0 && <div className="cartao mt-6 px-6 py-12 text-center text-texto-2">Nenhuma versão guardada ainda. A primeira é criada na próxima vez que o editor for aberto.</div>}

      <ol className="relative mt-6 space-y-3 border-l-2 border-borda pl-5">
        {versoes?.map((v, i) => {
          const d = v.dados
          const estaAberta = aberta === v.id
          const blocos = d.topicos.filter((t) => ehBloco(t.tipo)).length
          return (
            <li key={v.id} className="relative">
              <span className={`absolute -left-[1.72rem] top-5 h-3 w-3 rounded-full ring-4 ring-fundo ${i === 0 ? 'bg-acao' : 'bg-borda'}`} />
              <div className="cartao overflow-hidden">
                <button onClick={() => setAberta(estaAberta ? null : v.id)} className="flex w-full items-center gap-3 p-4 text-left">
                  <span className="min-w-0 flex-1">
                    <b className="block font-display">{quando(v.criado_em)}</b>
                    <span className="text-sm text-texto-2">
                      {MOTIVO[v.motivo]} · {v.criado_por === sessao?.user.id ? 'você' : 'colaborador'} · {d.topicos.length - blocos} tópicos{blocos ? `, ${blocos} blocos` : ''} · {d.slides.length} slides
                    </span>
                  </span>
                  <ChevronDown size={18} className={`shrink-0 text-texto-2 transition-transform ${estaAberta ? 'rotate-180' : ''}`} />
                </button>
                {estaAberta && (
                  <div className="space-y-3 border-t border-borda p-4">
                    <p className="font-display text-lg font-bold leading-snug">{d.mensagem.titulo || 'Sem título'}</p>
                    {d.mensagem.texto_base && <p className="text-sm font-semibold text-tinta">{d.mensagem.texto_base}</p>}
                    <ol className="space-y-1 text-sm">
                      {d.topicos.map((t, k) => <li key={t.id} className="truncate"><span className="text-texto-2">{k + 1}.</span> {t.titulo || 'Sem título'}</li>)}
                    </ol>
                    <button onClick={() => restaurar(v)} disabled={!!ocupado} className="botao-primario w-full @tsm:w-auto">
                      {ocupado === v.id ? <LoaderCircle size={18} className="animate-spin" /> : <RotateCcw size={18} />} Restaurar esta versão
                    </button>
                  </div>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
