import { useEffect, useState } from 'react'
import { CalendarDays, Check, Copy } from 'lucide-react'
import { supabase } from '../lib/supabase'

const BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agenda-ics?token=`
const ua = navigator.userAgent
const ehIOS = /iPhone|iPad|iPod/.test(ua) || (ua.includes('Mac') && navigator.maxTouchPoints > 1)

export default function CartaoCalendario() {
  const [token, setToken] = useState<string | null | undefined>(undefined)
  const [ocupado, setOcupado] = useState(false)
  const [copiado, setCopiado] = useState(false)
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
    if (error || !data) { setAviso('Não foi possível criar o link. Verifique a internet.'); return }
    setToken(data.token)
  }

  async function renovar() {
    if (!confirm('Gerar um link novo? O antigo para de funcionar e você precisa assinar de novo no celular.')) return
    setOcupado(true)
    await supabase.from('agenda_tokens').delete().not('token', 'is', null)
    setOcupado(false)
    await criar()
  }

  async function copiar(link: string) {
    try {
      await navigator.clipboard.writeText(link)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2500)
    } catch {
      setAviso('Não foi possível copiar. Segure no link abaixo para copiar manualmente.')
    }
  }

  if (token === undefined) return null

  const https = token ? BASE + token : ''
  const google = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(https.replace(/^https:/, 'webcal:'))}`

  return (
    <section className="rounded-2xl border border-borda bg-superficie p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-acao/12 text-tinta">
          <CalendarDays size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Calendário do celular</p>
          <p className="text-sm text-texto-2">
            Seus compromissos aparecem no calendário do aparelho, com um alerta para cada lembrete.
            As edições são feitas aqui no Pulpito.
          </p>
        </div>
      </div>

      {!token ? (
        <button onClick={criar} disabled={ocupado} className="botao-primario mt-4">
          {ocupado ? 'Criando…' : 'Criar meu link de agenda'}
        </button>
      ) : (
        <div className="mt-4 space-y-3">
          <button onClick={() => copiar(https)} className="botao-primario w-full @tsm:w-auto">
            {copiado ? <><Check size={18} /> Link copiado</> : <><Copy size={18} /> Copiar link da agenda</>}
          </button>

          <details open={ehIOS} className="rounded-xl bg-superficie-2 px-4 py-3">
            <summary className="cursor-pointer font-semibold">No iPhone</summary>
            <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-texto-2">
              <li>Toque em <b className="text-texto">Copiar link da agenda</b>.</li>
              <li>Abra <b className="text-texto">Ajustes</b>, depois <b className="text-texto">Calendário</b>, <b className="text-texto">Contas</b>, <b className="text-texto">Adicionar Conta</b> e <b className="text-texto">Outra</b>.</li>
              <li>Toque em <b className="text-texto">Adicionar Calendário Assinado</b> e cole o link.</li>
              <li>Deixe <b className="text-texto">Remover Alertas</b> desligado e salve.</li>
            </ol>
          </details>

          <details open={!ehIOS} className="rounded-xl bg-superficie-2 px-4 py-3">
            <summary className="cursor-pointer font-semibold">No Android (Google Agenda)</summary>
            <p className="mt-2 text-sm text-texto-2">
              O Google atualiza agendas assinadas poucas vezes por dia e usa os próprios alertas.
              No Android, as notificações do app costumam funcionar melhor.
            </p>
            <a href={google} target="_blank" rel="noreferrer" className="botao-secundario mt-3 text-sm">
              Adicionar ao Google Agenda
            </a>
          </details>

          <button onClick={renovar} disabled={ocupado} className="botao-fantasma px-2 text-sm">
            Gerar um link novo
          </button>
        </div>
      )}
      {aviso && <p className="mt-3 text-sm text-perigo">{aviso}</p>}
    </section>
  )
}