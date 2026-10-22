import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { sincronizarVersao } from './preferencias'

type Auth = { sessao: Session | null; carregando: boolean }

const AuthContext = createContext<Auth>({ sessao: null, carregando: true })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<Auth>({ sessao: null, carregando: true })

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((evento, sessao) => {
      setEstado({ sessao, carregando: false })
      // Traz a versão da Bíblia salva na conta (fora do callback, como pede o Supabase)
      if (sessao && (evento === 'SIGNED_IN' || evento === 'INITIAL_SESSION')) setTimeout(sincronizarVersao, 0)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  return <AuthContext.Provider value={estado}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- o hook mora junto do provedor de propósito
export const useAuth = () => useContext(AuthContext)