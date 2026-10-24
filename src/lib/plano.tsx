import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from './supabase'
import { useAuth } from './auth'
import { PLANO_PADRAO, type EstadoPlano } from './planoInfo'

/*
  Plano da pessoa logada, lido do banco (plano_atual) ao entrar e ao voltar para a aba.
  A interface usa para mostrar e orientar; quem garante de verdade são as políticas no banco.
*/
type Contexto = { plano: EstadoPlano; carregado: boolean; recarregar: () => Promise<void> }
const ContextoPlano = createContext<Contexto>({ plano: PLANO_PADRAO, carregado: false, recarregar: async () => {} })

export function PlanoProvider({ children }: { children: ReactNode }) {
  const { sessao } = useAuth()
  const [lido, setLido] = useState<{ usuario: string; plano: EstadoPlano } | null>(null)

  const recarregar = useCallback(async () => {
    if (!sessao) return
    const usuario = sessao.user.id
    const { data, error } = await supabase.rpc('plano_atual')
    // Banco sem a migração de planos ainda: ninguém fica bloqueado por isso
    if (error) { setLido({ usuario, plano: { ...PLANO_PADRAO, premium: true, plano: 'premium' } }); return }
    setLido({ usuario, plano: { ...PLANO_PADRAO, ...(data as Partial<EstadoPlano>) } })
  }, [sessao])

  useEffect(() => {
    // Fora do corpo do efeito, como o AuthProvider faz com a versão da Bíblia
    const inicial = setTimeout(() => { void recarregar() }, 0)
    const quandoVisivel = () => { if (document.visibilityState === 'visible') void recarregar() }
    document.addEventListener('visibilitychange', quandoVisivel)
    return () => { clearTimeout(inicial); document.removeEventListener('visibilitychange', quandoVisivel) }
  }, [recarregar])

  // Sem sessão, ou sessão de outra pessoa que a lida: volta ao padrão sem precisar de setState no efeito
  const atual = sessao && lido?.usuario === sessao.user.id ? lido.plano : PLANO_PADRAO
  const carregado = !!sessao && lido?.usuario === sessao.user.id
  return <ContextoPlano.Provider value={{ plano: atual, carregado, recarregar }}>{children}</ContextoPlano.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- o hook mora junto do provedor de propósito
export const usePlano = () => useContext(ContextoPlano)
