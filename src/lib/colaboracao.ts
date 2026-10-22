import { useEffect, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from './supabase'

/*
  Edição ao vivo entre colaboradores.
  - Presença: quem está com o projeto aberto agora.
  - Mudanças: depois de gravar, cada um avisa "mudei a mensagem" ou "mudei o tópico X".
    O aviso não leva o conteúdo; quem recebe busca de novo no banco, onde as permissões valem.
*/

export type Mudanca = { tabela: 'mensagens' } | { tabela: 'topico'; id: string } | { tabela: 'lista' }
export type Pessoa = { usuario: string; nome: string }

export function useColaboracao(mensagemId: string | undefined, eu: Pessoa | null, aoMudar: (m: Mudanca) => void) {
  const [pessoas, setPessoas] = useState<Pessoa[]>([])
  const canal = useRef<RealtimeChannel | null>(null)
  const aoMudarRef = useRef(aoMudar)
  useEffect(() => { aoMudarRef.current = aoMudar })
  const usuario = eu?.usuario
  const nome = eu?.nome

  useEffect(() => {
    if (!mensagemId || !usuario) return
    const ch = supabase.channel(`projeto:${mensagemId}`, { config: { presence: { key: usuario }, broadcast: { self: false } } })
    ch.on('presence', { event: 'sync' }, () => {
      const estado = ch.presenceState<Pessoa>()
      const lista = Object.values(estado).map((v) => v[0]).filter((p): p is Pessoa & { presence_ref: string } => !!p && p.usuario !== usuario)
      setPessoas(lista.map((p) => ({ usuario: p.usuario, nome: p.nome })))
    })
    ch.on('broadcast', { event: 'mudou' }, ({ payload }) => aoMudarRef.current(payload as Mudanca))
    ch.subscribe((status) => {
      if (status === 'SUBSCRIBED') void ch.track({ usuario, nome: nome ?? 'Alguém' })
    })
    canal.current = ch
    return () => { canal.current = null; void supabase.removeChannel(ch) }
  }, [mensagemId, usuario, nome])

  const avisar = (m: Mudanca) => { void canal.current?.send({ type: 'broadcast', event: 'mudou', payload: m }) }
  return { pessoas, avisar }
}
