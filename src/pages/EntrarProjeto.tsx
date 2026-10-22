import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CheckCircle2, KeyRound, Link2, Users } from 'lucide-react'
import { aceitarConvite, preverConvite, type PreviaConvite } from '../lib/compartilhamento'

export default function EntrarProjeto() {
  const { codigo: codigoUrl } = useParams()
  // Outro código no endereço recria a tela do zero
  return <Entrar key={codigoUrl ?? ''} codigoUrl={codigoUrl} />
}

function Entrar({ codigoUrl }: { codigoUrl?: string }) {
  const navigate = useNavigate()
  const [codigo, setCodigo] = useState(codigoUrl ?? '')
  const [previa, setPrevia] = useState<PreviaConvite | null>(null)
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(!!codigoUrl)
  const [entrando, setEntrando] = useState(false)

  useEffect(() => {
    if (!codigoUrl) return
    let ativo = true
    preverConvite(codigoUrl).then((p) => {
      if (!ativo) return
      setPrevia(p)
      setErro(p ? '' : 'O convite é inválido, expirou ou já foi usado.')
    }).catch(() => { if (ativo) setErro('Não foi possível verificar o convite. Confira se o banco foi atualizado.') })
      .finally(() => { if (ativo) setCarregando(false) })
    return () => { ativo = false }
  }, [codigoUrl])

  async function verificar(e: FormEvent) {
    e.preventDefault()
    setErro('')
    setPrevia(null)
    setCarregando(true)
    try {
      const p = await preverConvite(codigo)
      setPrevia(p)
      if (!p) setErro('Convite inválido, expirado ou sem vagas.')
    } catch { setErro('Não foi possível conferir o código.') }
    finally { setCarregando(false) }
  }

  async function entrar() {
    setEntrando(true)
    setErro('')
    try {
      const id = await aceitarConvite(codigo)
      navigate(`/mensagem/${id}`, { replace: true })
    } catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível entrar no projeto.') }
    finally { setEntrando(false) }
  }

  return (
    <div className="mx-auto max-w-xl px-3 sm:px-4 pb-24 pt-8 md:pt-14">
      <Link to="/" className="text-sm font-bold text-tinta hover:underline">← Voltar</Link>
      <div className="cartao mt-5 p-6 md:p-8">
        <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-ouro-suave text-tinta"><Users size={24} /></span>
        <h1 className="font-display text-2xl font-extrabold">Entrar em projeto compartilhado</h1>
        <p className="mt-2 text-sm text-texto-2">Recebeu um link ou código? Digite abaixo. Você usará sua própria conta do Púlpito.</p>
        <form onSubmit={verificar} className="mt-6 space-y-3">
          <label className="block text-sm font-bold" htmlFor="codigo-projeto">Código de convite</label>
          <div className="relative">
            <KeyRound size={19} className="absolute left-3 top-1/2 -translate-y-1/2 text-texto-2" />
            <input id="codigo-projeto" className="campo pl-11 uppercase tracking-wider" value={codigo}
              onChange={(e) => { setCodigo(e.target.value); setPrevia(null); setErro('') }}
              placeholder="ABCD-1234-EF56-7890" autoCapitalize="characters" autoCorrect="off" spellCheck={false} required />
          </div>
          <button disabled={carregando} className="botao-secundario w-full"><Link2 size={17} /> {carregando ? 'Conferindo…' : 'Verificar convite'}</button>
        </form>
        {previa && (
          <div className="mt-5 rounded-2xl border border-borda bg-superficie-2 p-4">
            <p className="flex items-center gap-2 text-sm font-bold text-tinta"><CheckCircle2 size={18} /> Convite encontrado</p>
            <p className="mt-2 font-display text-lg font-extrabold">{previa.titulo || 'Projeto sem título'}</p>
            <p className="mt-1 text-sm text-texto-2">Acesso: {previa.permissao === 'editor' ? 'Pode editar' : 'Somente visualizar'}</p>
            <button onClick={entrar} disabled={entrando} className="botao-primario mt-4 w-full">
              {entrando ? 'Entrando…' : 'Aceitar convite e abrir projeto'}
            </button>
          </div>
        )}
        {erro && <p role="alert" className="mt-4 rounded-xl bg-perigo/10 p-3 text-sm text-perigo">{erro}</p>}
      </div>
    </div>
  )
}
