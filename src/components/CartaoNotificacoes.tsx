import { useEffect, useState } from 'react'
import {
  ativarNotificacoes, desativarNotificacoes, inscricaoAtual, notificacaoDeTeste, suportaNotificacoes,
} from '../lib/notificacoes'

type Estado = 'carregando' | 'sem-suporte' | 'negado' | 'desativado' | 'ativado'

const ehIOS = /iPhone|iPad|iPod/.test(navigator.userAgent)

export default function CartaoNotificacoes() {
  const [estado, setEstado] = useState<Estado>('carregando')
  const [ocupado, setOcupado] = useState(false)
  const [aviso, setAviso] = useState('')

  useEffect(() => {
    let ativo = true
    ;(async () => {
      let e: Estado
      if (!suportaNotificacoes()) e = 'sem-suporte'
      else if (Notification.permission === 'denied') e = 'negado'
      else e = (await inscricaoAtual()) ? 'ativado' : 'desativado'
      if (ativo) setEstado(e)
    })()
    return () => { ativo = false }
  }, [])

  async function ativar() {
    setOcupado(true)
    setAviso('')
    const r = await ativarNotificacoes()
    setOcupado(false)
    if (r === 'ok') setEstado('ativado')
    else if (r === 'negado') setEstado('negado')
    else if (r === 'sem-suporte') setEstado('sem-suporte')
    else setAviso('Não foi possível ativar. Verifique a internet e tente de novo.')
  }

  async function desativar() {
    setOcupado(true)
    await desativarNotificacoes().catch(() => {})
    setOcupado(false)
    setEstado('desativado')
  }

  if (estado === 'carregando') return null

  return (
    <section className="flex flex-wrap items-center gap-3 rounded-2xl p-4 ring-1 ring-neutral-800">
      <span className="text-2xl">🔔</span>
      <div className="min-w-0 flex-1">
        <p className="font-medium">Lembretes no aparelho</p>
        <p className="text-sm text-neutral-400">
          {estado === 'ativado' && 'Ativados neste aparelho.'}
          {estado === 'desativado' && 'Receba os lembretes dos compromissos mesmo com o app fechado.'}
          {estado === 'negado' && 'As notificações estão bloqueadas. Libere nas configurações do navegador ou do celular.'}
          {estado === 'sem-suporte' && (ehIOS
            ? 'No iPhone, adicione o Pulpito à Tela de Início pelo Safari e abra por lá para ativar.'
            : 'Este navegador não permite notificações.')}
        </p>
        {aviso && <p className="mt-1 text-sm text-red-400">{aviso}</p>}
      </div>
      {estado === 'desativado' && (
        <button onClick={ativar} disabled={ocupado}
          className="rounded-lg bg-neutral-100 px-4 py-2 font-medium text-neutral-900 disabled:opacity-50">
          {ocupado ? 'Ativando…' : 'Ativar'}
        </button>
      )}
      {estado === 'ativado' && (
        <div className="flex gap-2">
          <button onClick={() => notificacaoDeTeste()} className="rounded-lg px-3 py-2 text-sm ring-1 ring-neutral-700">
            Testar
          </button>
          <button onClick={desativar} disabled={ocupado}
            className="rounded-lg px-3 py-2 text-sm text-neutral-400 ring-1 ring-neutral-800">
            Desativar
          </button>
        </div>
      )}
    </section>
  )
}