import { useEffect, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { papelProjeto, type PapelProjeto } from '../lib/compartilhamento'
import { ContextoPapel } from '../lib/papel'
import LeituraProjeto from '../pages/LeituraProjeto'

/* Um leitor nunca monta o editor: impede controles mutantes e autosave.
   RLS no Supabase é a barreira real, inclusive contra chamadas diretas. */
export default function ProjetoGate({ children }: { children: ReactNode }) {
  const { id = '' } = useParams()
  // Trocar de projeto recria o portão, que volta a "carregando" sozinho
  return <Portao key={id} id={id}>{children}</Portao>
}

function Portao({ id, children }: { id: string; children: ReactNode }) {
  const [papel, setPapel] = useState<PapelProjeto | 'carregando'>('carregando')
  const [erro, setErro] = useState('')

  useEffect(() => {
    let ativo = true
    const verificar = () => {
      void papelProjeto(id).then((p) => { if (ativo) { setPapel(p); setErro('') } })
        .catch(() => { if (ativo) { setPapel(null); setErro('Não foi possível verificar suas permissões. Confira a migração do Supabase.') } })
    }
    verificar()
    const quandoVisivel = () => { if (document.visibilityState === 'visible') verificar() }
    window.addEventListener('focus', verificar)
    document.addEventListener('visibilitychange', quandoVisivel)
    return () => { ativo = false; window.removeEventListener('focus', verificar); document.removeEventListener('visibilitychange', quandoVisivel) }
  }, [id])

  if (papel === 'carregando') return <p className="p-8 text-texto-2">Conferindo o acesso ao projeto…</p>
  if (!papel) return <div className="mx-auto max-w-lg space-y-3 p-8">
    <h1 className="font-display text-xl font-extrabold">Acesso indisponível</h1>
    <p className="text-sm text-texto-2">{erro || 'Projeto não encontrado ou permissão revogada.'}</p>
    <Link to="/entrar-projeto" className="botao-secundario">Tenho um convite</Link>
  </div>
  if (papel === 'leitor') return <LeituraProjeto />
  return <ContextoPapel.Provider value={papel}>{children}</ContextoPapel.Provider>
}
