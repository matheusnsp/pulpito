import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CHAVE_TELAO, codigoValido } from '../lib/telao'

export default function Conectar() {
  const { codigo = '' } = useParams()
  const valido = codigoValido(codigo)

  useEffect(() => {
    if (valido) localStorage.setItem(CHAVE_TELAO, codigo)
  }, [codigo, valido])

  return (
    <div className="mx-auto max-w-md space-y-4 p-6 text-center">
      {valido ? (
        <>
          <p className="text-2xl font-semibold">Telão {codigo} conectado ✓</p>
          <p className="text-neutral-400">
            Abra uma mensagem e toque em <b>Pregar</b>. O telão vai acompanhar seus tópicos.
          </p>
        </>
      ) : (
        <p className="text-xl">Código de telão inválido.</p>
      )}
      <Link to="/" className="inline-block rounded-lg bg-neutral-100 px-4 py-2 font-medium text-neutral-900">
        Ir para minhas mensagens
      </Link>
    </div>
  )
}