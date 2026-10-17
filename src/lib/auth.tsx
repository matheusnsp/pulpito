import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

type Auth = { sessao: Session | null; carregando: boolean }

const AuthContext = createContext<Auth>({ sessao: null, carregando: true })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<Auth>({ sessao: null, carregando: true })

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_evento, sessao) => {
      setEstado({ sessao, carregando: false })
    })
    return () => data.subscription.unsubscribe()
  }, [])

  return <AuthContext.Provider value={estado}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)