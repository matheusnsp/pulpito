import { useEffect, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { usePlano } from '../lib/plano'
import { RECURSOS_PREMIUM, type RecursoPremium } from '../lib/planoInfo'

/*
  Portão das telas Premium. Sem plano, mostra o que o recurso faz e leva para a assinatura.
  Em projeto compartilhado, vale o plano do dono do projeto (projeto_premium), não o de quem abriu.
*/
export default function SoPremium({ recurso, doProjeto = false, children }: { recurso: RecursoPremium; doProjeto?: boolean; children: ReactNode }) {
  const { plano, carregado } = usePlano()
  const { id } = useParams()
  const [doDono, setDoDono] = useState<boolean | null>(null)

  useEffect(() => {
    // Quem é Premium entra direto; só quem não é precisa saber o plano do dono do projeto
    if (!doProjeto || !id || plano.premium) return
    let ativo = true
    supabase.rpc('projeto_premium', { p_mensagem_id: id }).then(({ data, error }) => {
      if (ativo) setDoDono(error ? true : !!data)
    })
    return () => { ativo = false }
  }, [doProjeto, id, plano.premium])

  if (!carregado) return <p className="p-8 text-texto-2">Conferindo seu plano…</p>
  if (plano.premium) return <>{children}</>
  const liberado = doProjeto ? doDono : false
  if (doProjeto && doDono === null) return <p className="p-8 text-texto-2">Conferindo seu plano…</p>
  if (liberado) return <>{children}</>
  return <TelaPremium recurso={recurso} />
}

export function TelaPremium({ recurso }: { recurso: RecursoPremium }) {
  const atual = RECURSOS_PREMIUM.find((r) => r.id === recurso)
  return (
    <div className="mx-auto max-w-lg px-4 py-12 text-center">
      <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-acao text-acao-texto"><Sparkles size={30} /></span>
      <p className="mt-6 text-xs font-extrabold uppercase tracking-[0.14em] text-tinta">Recurso Premium</p>
      <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight">{atual?.nome ?? 'Premium'}</h1>
      <p className="mt-2 text-texto-2">{atual?.texto}</p>
      <p className="mt-6 text-sm text-texto-2">O Premium libera isto e mais {RECURSOS_PREMIUM.length - 1} recursos. O que você já criou continua seu, sempre.</p>
      <Link to="/assinatura" className="botao-primario mt-6 w-full">Conhecer o Premium</Link>
      <Link to="/" className="botao-fantasma mt-2 w-full">Voltar</Link>
    </div>
  )
}
