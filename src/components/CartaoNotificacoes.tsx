import { useEffect, useState } from 'react'
import { Bell, BellOff, BellRing } from 'lucide-react'
import {
  ativarNotificacoes, desativarNotificacoes, inscricaoAtual, notificacaoDeTeste, suportaNotificacoes,
} from '../lib/notificacoes'

type Estado = 'carregando' | 'sem-suporte' | 'negado' | 'desativado' | 'ativado'

const ua = navigator.userAgent
const ehIOS = /iPhone|iPad|iPod/.test(ua) || (ua.includes('Mac') && navigator.maxTouchPoints > 1)

const TEXTOS: Record<Exclude<Estado, 'carregando'>, { titulo: string; texto: string }> = {
  ativado: {
    titulo: 'Notificações ativadas',
    texto: 'Este aparelho recebe os lembretes mesmo com o app fechado.',
  },
  desativado: {
    titulo: 'Notificações do app',
    texto: 'Receba os lembretes mesmo com o app fechado. Funciona melhor no Android e no computador.',
  },
  negado: {
    titulo: 'Notificações bloqueadas',
    texto: 'Libere as notificações do Pulpito nas configurações do navegador ou do celular.',
  },
  'sem-suporte': {
    titulo: 'Notificações do app',
    texto: ehIOS
      ? 'No iPhone, use o calendário do celular acima, que é mais confiável.'
      : 'Este navegador não permite notificações.',
  },
}

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

  const { titulo, texto } = TEXTOS[estado]
  const Icone = estado === 'ativado' ? BellRing : estado === 'negado' ? BellOff : Bell

  return (
    <section className="rounded-2xl border border-borda bg-superficie p-4">
      <div className="flex items-start gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${estado === 'ativado' ? 'bg-ouro-suave text-ouro' : 'bg-acao/12 text-acao'}`}>
          <Icone size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{titulo}</p>
          <p className="text-sm text-texto-2">{texto}</p>
        </div>
      </div>

      {estado === 'desativado' && (
        <button onClick={ativar} disabled={ocupado} className="botao-secundario mt-4">
          {ocupado ? 'Ativando…' : 'Ativar notificações'}
        </button>
      )}
      {estado === 'ativado' && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={() => notificacaoDeTeste()} className="botao-secundario text-sm">Enviar um teste</button>
          <button onClick={desativar} disabled={ocupado} className="botao-fantasma text-sm">Desativar</button>
        </div>
      )}
      {aviso && <p className="mt-3 text-sm text-perigo">{aviso}</p>}
    </section>
  )
}