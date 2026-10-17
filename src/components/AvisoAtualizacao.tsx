import { useRegisterSW } from 'virtual:pwa-register/react'

export default function AvisoAtualizacao() {
  const { needRefresh: [precisa, setPrecisa], updateServiceWorker } = useRegisterSW()
  if (!precisa) return null

  return (
    <div className="fixed bottom-24 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-xl bg-neutral-900 px-4 py-3 shadow-lg ring-1 ring-neutral-700">
      <span className="text-sm">Nova versão disponível</span>
      <button onClick={() => updateServiceWorker(true)}
        className="rounded-lg bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-900">
        Atualizar
      </button>
      <button onClick={() => setPrecisa(false)} className="text-sm text-neutral-500">Depois</button>
    </div>
  )
}