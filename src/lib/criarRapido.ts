import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { abrirCriar } from './criar'
import { criarMensagem } from './mensagens'
import { usePlano } from './plano'
import { podeCriarMensagem } from './planoInfo'

/*
  "Nova mensagem" em um toque: cria uma pregação e abre o editor, sem perguntar formato.
  Célula, EBD, devocional e estudos continuam na folha "Outros formatos" (abrirCriar).
  No limite do Gratuito, abre a folha, que já explica e leva para a assinatura.
*/
export function useCriarRapido() {
  const navigate = useNavigate()
  const { plano, recarregar } = usePlano()
  const [criando, setCriando] = useState(false)

  const criar = useCallback(async (pastaId: string | null = null) => {
    if (!podeCriarMensagem(plano)) { abrirCriar({ pastaId, tipo: 'pregacao' }); return }
    setCriando(true)
    try {
      const id = await criarMensagem(pastaId, { tipo: 'pregacao' })
      void recarregar()
      navigate(`/mensagem/${id}`)
    } catch {
      // Falhou (rede ou regra do banco): a folha mostra o motivo e oferece as alternativas
      abrirCriar({ pastaId, tipo: 'pregacao' })
    } finally { setCriando(false) }
  }, [plano, recarregar, navigate])

  return { criar, criando }
}
