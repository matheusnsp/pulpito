import { RefreshCw } from 'lucide-react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import AvisoDeslizante from './AvisoDeslizante'

export default function AvisoAtualizacao() {
  const { needRefresh: [precisa, setPrecisa], updateServiceWorker } = useRegisterSW()
  if (!precisa) return null

  return (
    <AvisoDeslizante onDispensar={() => setPrecisa(false)}
      posicao="fixed inset-x-4 bottom-[calc(6.25rem+env(safe-area-inset-bottom))] z-50 mx-auto max-w-md md:bottom-6"
      className="flex items-center gap-3 rounded-2xl border border-borda bg-superficie p-3 pl-4 shadow-xl">
      <RefreshCw size={18} className="shrink-0 text-tinta" />
      <span className="flex-1 text-sm font-semibold">Nova versão disponível</span>
      <button onClick={() => setPrecisa(false)} className="botao-fantasma px-3 py-1.5 text-sm">Depois</button>
      <button onClick={() => updateServiceWorker(true)} className="botao-primario px-3 py-1.5 text-sm">Atualizar</button>
    </AvisoDeslizante>
  )
}