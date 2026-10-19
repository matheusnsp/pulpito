import { useEffect, useState } from 'react'
import { LoaderCircle, Sparkles } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useRegisterSW } from 'virtual:pwa-register/react'
import AvisoDeslizante from './AvisoDeslizante'
import { buscarServiceWorkerNovo, carregarUltimaVersao, verificarVersao } from '../lib/atualizar'

/*
  Aviso de versão nova. Aparece quando o service worker novo já baixou,
  ou quando /versao.json diz que existe versão mais nova (o iPhone às vezes demora a notar).
  Verifica de novo sempre que o app volta para a frente da tela.
*/
export default function AvisoAtualizacao() {
  const { needRefresh: [precisa, setPrecisa], updateServiceWorker } = useRegisterSW()
  const [temNova, setTemNova] = useState(false)
  const [dispensado, setDispensado] = useState(false)
  const [atualizando, setAtualizando] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => {
    const checar = async () => {
      if (document.visibilityState !== 'visible') return
      const r = await verificarVersao()
      if (r?.nova) { setTemNova(true); buscarServiceWorkerNovo() }
    }
    checar()
    document.addEventListener('visibilitychange', checar)
    const t = setInterval(checar, 30 * 60 * 1000)
    return () => { document.removeEventListener('visibilitychange', checar); clearInterval(t) }
  }, [])

  // Em Ajustes o cartão "Atualizar o app" já mostra tudo
  if (dispensado || !(precisa || temNova) || pathname === '/ajustes') return null

  function atualizar() {
    setAtualizando(true)
    if (precisa) updateServiceWorker(true)
    else carregarUltimaVersao()
  }
  const depois = () => { setPrecisa(false); setDispensado(true) }

  return (
    <AvisoDeslizante onDispensar={depois}
      posicao="fixed inset-x-4 bottom-[calc(6.25rem+env(safe-area-inset-bottom))] z-50 mx-auto max-w-md md:bottom-6"
      className="overflow-hidden rounded-2xl border border-acao/50 bg-superficie shadow-2xl">
      <div className="flex items-center gap-3 p-3 pl-3.5">
        <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-acao text-acao-texto">
          {atualizando ? <LoaderCircle size={20} className="animate-spin" /> : <Sparkles size={20} />}
        </span>
        <span className="min-w-0 flex-1">
          <b className="block font-display leading-tight">{atualizando ? 'Atualizando…' : 'Nova versão do Pulpito'}</b>
          <span className="block text-xs leading-snug text-texto-2">{atualizando ? 'O app vai reabrir sozinho.' : 'Leva segundos. Nada se perde.'}</span>
        </span>
        {!atualizando && <>
          <button onClick={depois} className="botao-fantasma px-2.5 py-1.5 text-sm">Depois</button>
          <button onClick={atualizar} className="botao-primario px-3 py-1.5 text-sm">Atualizar</button>
        </>}
      </div>
      <span aria-hidden className="block h-1 bg-gradient-to-r from-acao/0 via-acao to-acao/0" />
    </AvisoDeslizante>
  )
}
