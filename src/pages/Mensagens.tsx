import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Mensagem } from '../lib/tipos'

const normalizar = (s: string | null) =>
  (s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

export default function Mensagens() {
  const navigate = useNavigate()
  const [mensagens, setMensagens] = useState<Mensagem[] | null>(null)
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')
  const [criando, setCriando] = useState(false)

  useEffect(() => {
    let ativo = true
    supabase.from('mensagens').select('*').order('atualizado_em', { ascending: false })
      .then(({ data, error }) => {
        if (!ativo) return
        if (error) setErro('Não foi possível carregar suas mensagens.')
        else setMensagens(data as Mensagem[])
      })
    return () => { ativo = false }
  }, [])

  async function criar() {
    setCriando(true)
    const { data, error } = await supabase.from('mensagens').insert({}).select().single()
    setCriando(false)
    if (error || !data) { setErro('Não foi possível criar a mensagem.'); return }
    navigate(`/mensagem/${data.id}`)
  }

  async function excluir(m: Mensagem) {
    if (!confirm(`Excluir "${m.titulo}"? Isso não pode ser desfeito.`)) return
    const { error } = await supabase.from('mensagens').delete().eq('id', m.id)
    if (error) { setErro('Não foi possível excluir.'); return }
    setMensagens((lista) => lista?.filter((x) => x.id !== m.id) ?? null)
  }

  const termo = normalizar(busca.trim())
  const filtradas = (mensagens ?? []).filter((m) =>
    !termo || normalizar(m.titulo).includes(termo) || normalizar(m.texto_base).includes(termo)
  )

  return (
    <div className="mx-auto max-w-3xl p-4">
      <div className="mb-4 flex gap-2">
        <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar mensagem…"
          className="flex-1 rounded-lg bg-neutral-900 px-3 py-2 ring-1 ring-neutral-800 outline-none focus:ring-neutral-600" />
        <button onClick={criar} disabled={criando}
          className="rounded-lg bg-neutral-100 px-4 py-2 font-medium text-neutral-900 disabled:opacity-50">
          {criando ? 'Criando…' : '+ Nova'}
        </button>
      </div>

      {erro && <p className="mb-3 text-sm text-red-400">{erro}</p>}
      {mensagens === null && !erro && <p className="text-neutral-500">Carregando…</p>}

      {mensagens?.length === 0 && (
        <div className="rounded-xl p-8 text-center ring-1 ring-neutral-800">
          <p className="mb-1 text-lg">Nenhuma mensagem ainda.</p>
          <p className="text-neutral-500">Toque em "+ Nova" para começar a primeira.</p>
        </div>
      )}

      <ul className="space-y-2">
        {filtradas.map((m) => (
          <li key={m.id} className="flex items-center gap-2 rounded-xl p-3 ring-1 ring-neutral-800 hover:bg-neutral-900">
            <Link to={`/mensagem/${m.id}`} className="min-w-0 flex-1">
              <p className="truncate font-medium">{m.titulo}</p>
              <p className="truncate text-sm text-neutral-500">
                {m.texto_base ? `${m.texto_base} · ` : ''}
                {m.tempo_minutos} min · editada em{' '}
                {new Date(m.atualizado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
              </p>
            </Link>
            <Link to={`/pregar/${m.id}`}
              className="rounded-lg px-3 py-1.5 text-sm ring-1 ring-neutral-700 hover:bg-neutral-800">
              Pregar
            </Link>
            <button onClick={() => excluir(m)}
              className="rounded-lg px-2 py-1.5 text-sm text-neutral-500 hover:text-red-400">
              Excluir
            </button>
          </li>
        ))}
      </ul>

      {mensagens && mensagens.length > 0 && filtradas.length === 0 && (
        <p className="text-neutral-500">Nenhuma mensagem encontrada para "{busca}".</p>
      )}
    </div>
  )
}