import { useCallback, useEffect, useRef, useState } from 'react'

type Salvar = () => PromiseLike<{ error: unknown }>
type Pendente = { timer: ReturnType<typeof setTimeout>; salvar: Salvar }
export type StatusSalvamento = 'salvo' | 'salvando' | 'erro'

/* Salva sozinho depois que a pessoa para de mexer; ao sair da tela, salva o que ficou pendente */
export function useSalvamento(espera = 700, aoSalvar?: (chave: string) => void) {
  // Avisado depois de cada gravação que deu certo (a edição ao vivo usa para avisar os outros)
  const aoSalvarRef = useRef(aoSalvar)
  useEffect(() => { aoSalvarRef.current = aoSalvar })
  const pendentes = useRef(new Map<string, Pendente>())
  const [status, setStatus] = useState<StatusSalvamento>('salvo')

  const agendar = useCallback((chave: string, salvar: Salvar) => {
    const atual = pendentes.current.get(chave)
    if (atual) clearTimeout(atual.timer)
    setStatus('salvando')
    const timer = setTimeout(async () => {
      pendentes.current.delete(chave)
      const { error } = await salvar()
      if (error) setStatus('erro')
      else {
        aoSalvarRef.current?.(chave)
        if (pendentes.current.size === 0) setStatus('salvo')
      }
    }, espera)
    pendentes.current.set(chave, { timer, salvar })
  }, [espera])

  const cancelar = useCallback((prefixo: string) => {
    pendentes.current.forEach((p, k) => {
      if (k.startsWith(prefixo)) { clearTimeout(p.timer); pendentes.current.delete(k) }
    })
    if (pendentes.current.size === 0) setStatus((s) => (s === 'salvando' ? 'salvo' : s))
  }, [])

  useEffect(() => {
    const mapa = pendentes.current
    const aviso = (e: BeforeUnloadEvent) => { if (mapa.size) e.preventDefault() }
    window.addEventListener('beforeunload', aviso)
    return () => {
      window.removeEventListener('beforeunload', aviso)
      mapa.forEach((p) => { clearTimeout(p.timer); void Promise.resolve(p.salvar()) })
      mapa.clear()
    }
  }, [])

  return { status, agendar, cancelar }
}