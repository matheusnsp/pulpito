import { RefreshCw } from 'lucide-react'
import { useRegisterSW } from 'virtual:pwa-register/react'

export default function AvisoAtualizacao() {
  const { needRefresh: [precisa, setPrecisa], updateServiceWorker } = useRegisterSW()
  if (!precisa) return null

  return (
    <div role="status"
      className="fixed inset-x-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-borda bg-superficie p-3 pl-4 shadow-xl md:bottom-6">
      <RefreshCw size={18} className="shrink-0 text-acao" />
      <span className="flex-1 text-sm font-semibold">Nova versão disponível</span>
      <button onClick={() => setPrecisa(false)} className="botao-fantasma px-3 py-1.5 text-sm">Depois</button>
      <button onClick={() => updateServiceWorker(true)} className="botao-primario px-3 py-1.5 text-sm">Atualizar</button>
    </div>
  )
}