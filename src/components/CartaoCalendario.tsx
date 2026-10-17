import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agenda-ics?token=`
const ehIOS = /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent)

export default function CartaoCalendario() {
  const [token, setToken] = useState<string | null | undefined>(undefined)
  const [ocupado, setOcupado] = useState(false)
  const [aviso, setAviso] = useState('')

  useEffect(() => {
    let ativo = true
    supabase.from('agenda_tokens').select('token').maybeSingle()
      .then(({ data }) => { if (ativo) setToken(data?.token ?? null) })
    return () => { ativo = false }
  }, [])

  async function criar() {
    setOcupado(true)
    setAviso('')
    const { data, error } = await supabase.from('agenda_tokens').insert({}).select('token').single()
    setOcupado(false)
    if (error || !data) { setAviso('Não foi possível criar o link.'); return }
    setToken(data.token)
  }

  async function renovar() {
    if (!confirm('Gerar um link novo? O link antigo para de funcionar e você precisará assinar de novo no celular.')) return
    setOcupado(true)
    await supabase.from('agenda_tokens').delete().not('token', 'is', null)
    setOcupado(false)
    await criar()
  }

  async function copiar(link: string) {
    await navigator.clipboard.writeText(link)
    setAviso('Link copiado.')
  }

  if (token === undefined) return null

  const https = token ? BASE + token : ''
  const webcal = https.replace(/^https:/, 'webcal:')
  const google = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`
  const botao = 'rounded-lg px-3 py-2 text-sm ring-1 ring-neutral-700 hover:bg-neutral-900'

  return (
    <section className="space-y-3 rounded-2xl p-4 ring-1 ring-neutral-800">
      <div className="flex items-center gap-3">
        <span className="text-2xl">📅</span>
        <div className="min-w-0 flex-1">
          <p className="font-medium">Agenda no calendário do celular</p>
          <p className="text-sm text-neutral-400">
            Seus compromissos e lembretes aparecem no calendário do aparelho e se atualizam sozinhos.
          </p>
        </div>
      </div>

      {!token ? (
        <button onClick={criar} disabled={ocupado}
          className="rounded-lg bg-neutral-100 px-4 py-2 font-medium text-neutral-900 disabled:opacity-50">
          {ocupado ? 'Criando…' : 'Criar meu link de agenda'}
        </button>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <a href={webcal}
              className={`rounded-lg px-4 py-2 text-sm font-medium ${ehIOS ? 'bg-neutral-100 text-neutral-900' : 'ring-1 ring-neutral-700'}`}>
              Assinar no Calendário (iPhone/Mac)
            </a>
            <a href={google} target="_blank" rel="noreferrer"
              className={`rounded-lg px-4 py-2 text-sm font-medium ${!ehIOS ? 'bg-neutral-100 text-neutral-900' : 'ring-1 ring-neutral-700'}`}>
              Adicionar ao Google Agenda
            </a>
            <button onClick={() => copiar(https)} className={botao}>Copiar link</button>
            <button onClick={renovar} disabled={ocupado} className={`${botao} text-neutral-500`}>Gerar novo link</button>
          </div>
          <p className="text-xs text-neutral-500">
            No iPhone, ao assinar, deixe <b>Remover Alertas</b> desligado para receber os lembretes.
            O Google Agenda atualiza agendas assinadas só algumas vezes por dia; no Android, prefira os
            lembretes no aparelho (cartão acima).
          </p>
        </>
      )}
      {aviso && <p className="text-sm text-neutral-400">{aviso}</p>}
    </section>
  )
}