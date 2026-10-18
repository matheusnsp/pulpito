import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CircleAlert, MonitorCheck } from 'lucide-react'
import { CHAVE_TELAO, codigoValido } from '../lib/telao'

export default function Conectar() {
  const { codigo = '' } = useParams()
  const valido = codigoValido(codigo)

  useEffect(() => {
    if (valido) localStorage.setItem(CHAVE_TELAO, codigo)
  }, [codigo, valido])

  return (
    <div className="flex min-h-full items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm text-center">
        <span className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl ${valido ? 'bg-acao/12 text-tinta' : 'bg-perigo/10 text-perigo'}`}>
          {valido ? <MonitorCheck size={32} /> : <CircleAlert size={32} />}
        </span>
        {valido ? (
          <>
            <h1 className="mt-5 font-display text-3xl font-bold">Telão conectado</h1>
            <p className="mt-2 text-texto-2">
              Abra uma mensagem e toque em <b className="text-texto">Pregar</b>. O telão {codigo} vai acompanhar seus tópicos.
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-5 font-display text-3xl font-bold">Código inválido</h1>
            <p className="mt-2 text-texto-2">Escaneie de novo o QR Code que aparece no telão.</p>
          </>
        )}
        <Link to="/" className="botao-primario mt-8 w-full">Ir para minhas mensagens</Link>
      </div>
    </div>
  )
}