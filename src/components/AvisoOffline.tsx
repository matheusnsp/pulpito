import { useEffect, useState } from 'react'
import { WifiOff } from 'lucide-react'

/* Pílula no topo quando o aparelho fica sem internet */
export default function AvisoOffline() {
  const [offline, setOffline] = useState(() => !navigator.onLine)

  useEffect(() => {
    const on = () => setOffline(false)
    const off = () => setOffline(true)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  if (!offline) return null
  return (
    <div role="status"
      className="pointer-events-none fixed inset-x-0 top-[max(0.5rem,env(safe-area-inset-top))] z-[60] flex justify-center px-4">
      <p className="flex animate-entrar items-center gap-2 rounded-full bg-texto px-4 py-2 text-sm font-bold text-fundo shadow-xl">
        <WifiOff size={16} /> Sem internet — o que já foi aberto continua disponível
      </p>
    </div>
  )
}
