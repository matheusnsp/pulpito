import { useCallback, useRef, useState } from 'react'

/*
  Histórico de desfazer/refazer.
  Antes de cada mudança, chame registrar(fotoDoEstadoAtual, chave).
  Mudanças seguidas com a mesma chave (ex.: digitando no mesmo campo)
  viram um passo só, se não houver pausa maior que 1,5 s.
*/
export function useHistorico<T>(limite = 100) {
  const passado = useRef<T[]>([])
  const futuro = useRef<T[]>([])
  const ultimo = useRef<{ chave: string; quando: number } | null>(null)
  const [tamanho, setTamanho] = useState({ passado: 0, futuro: 0 })

  const registrar = useCallback((foto: T, chave?: string) => {
    const agora = Date.now()
    const juntar = !!chave && ultimo.current?.chave === chave && agora - ultimo.current.quando < 1500
    if (!juntar) {
      passado.current.push(foto)
      if (passado.current.length > limite) passado.current.shift()
      futuro.current = []
      setTamanho({ passado: passado.current.length, futuro: 0 })
    }
    ultimo.current = chave ? { chave, quando: agora } : null
  }, [limite])

  const desfazer = useCallback((atual: T): T | null => {
    const foto = passado.current.pop()
    if (foto === undefined) return null
    futuro.current.push(atual)
    ultimo.current = null
    setTamanho({ passado: passado.current.length, futuro: futuro.current.length })
    return foto
  }, [])

  const refazer = useCallback((atual: T): T | null => {
    const foto = futuro.current.pop()
    if (foto === undefined) return null
    passado.current.push(atual)
    ultimo.current = null
    setTamanho({ passado: passado.current.length, futuro: futuro.current.length })
    return foto
  }, [])

  return {
    registrar,
    desfazer,
    refazer,
    podeDesfazer: tamanho.passado > 0,
    podeRefazer: tamanho.futuro > 0,
  }
}