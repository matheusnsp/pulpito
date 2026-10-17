import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../lib/supabase'
import { canalTelao, codigoValido, gerarCodigo, type SlideTelao } from '../lib/telao'

const CHAVE_CODIGO = 'pulpito-codigo-telao'

const porTamanho = (t: string, grande: string, medio: string, pequeno: string) =>
  t.length > 300 ? pequeno : t.length > 150 ? medio : grande

function Slide({ slide }: { slide: SlideTelao }) {
  if (slide.tipo === 'vazio') return null

  if (slide.tipo === 'versiculo') return (
    <div className="flex h-full flex-col items-center justify-center gap-[4vh] px-[8vw] text-center">
      <p className={`${porTamanho(slide.texto, 'text-[4.4vw]', 'text-[3.6vw]', 'text-[2.9vw]')} leading-snug`}>
        {slide.texto}
      </p>
      <p className="text-[2.4vw] font-semibold text-sky-300">{slide.referencia}</p>
    </div>
  )

  const texto = slide.textoVersiculo
  return (
    <div className="flex h-full flex-col items-center justify-center gap-[3vh] px-[8vw] text-center">
      {slide.tipo === 'topico' && (
        <p className="text-[1.5vw] uppercase tracking-[0.3em] text-neutral-500">
          {slide.numero} / {slide.total}
        </p>
      )}
      <h1 className={`${slide.tipo === 'capa' ? 'text-[6vw]' : 'text-[5vw]'} font-semibold leading-tight`}>
        {slide.titulo}
      </h1>
      {slide.tipo === 'topico' && slide.frase && (
        <p className="text-[2.8vw] leading-snug text-amber-300">{slide.frase}</p>
      )}
      {texto && (
        <p className={`${porTamanho(texto, 'text-[2.8vw]', 'text-[2.3vw]', 'text-[1.9vw]')} max-w-[80vw] leading-snug text-neutral-300`}>
          “{texto}”
        </p>
      )}
      {slide.referencia && <p className="text-[2vw] font-medium text-sky-300">{slide.referencia}</p>}
    </div>
  )
}

export default function Projetar() {
  const [codigo] = useState(() => {
    const salvo = sessionStorage.getItem(CHAVE_CODIGO)
    return salvo && codigoValido(salvo) ? salvo : gerarCodigo()
  })
  const [slide, setSlide] = useState<SlideTelao | null>(null)
  const [online, setOnline] = useState(false)
  const [telaCheia, setTelaCheia] = useState(false)

  // Mantém o mesmo código se a página for recarregada
  useEffect(() => { sessionStorage.setItem(CHAVE_CODIGO, codigo) }, [codigo])

  useEffect(() => {
    const aoMudar = () => setTelaCheia(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', aoMudar)
    return () => document.removeEventListener('fullscreenchange', aoMudar)
  }, [])

  useEffect(() => {
    const ch = supabase.channel(canalTelao(codigo), { config: { broadcast: { self: false } } })
    let pulso: ReturnType<typeof setInterval> | undefined

    ch.on('broadcast', { event: 'slide' }, ({ payload }) => setSlide(payload as SlideTelao))
      .on('broadcast', { event: 'tchau' }, () => setSlide(null))
      .on('broadcast', { event: 'ola' }, () =>
        ch.send({ type: 'broadcast', event: 'presente', payload: {} }))
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setOnline(true)
          ch.send({ type: 'broadcast', event: 'pedir-estado', payload: {} })
          clearInterval(pulso)
          pulso = setInterval(() => ch.send({ type: 'broadcast', event: 'presente', payload: {} }), 10_000)
        } else {
          setOnline(false)
        }
      })

    return () => { clearInterval(pulso); supabase.removeChannel(ch) }
  }, [codigo])

  function alternarTelaCheia() {
    if (document.fullscreenElement) document.exitFullscreen()
    else document.documentElement.requestFullscreen().catch(() => {})
  }

  const link = `${window.location.origin}/conectar/${codigo}`

  return (
    <div onDoubleClick={alternarTelaCheia}
      className={`relative h-dvh select-none bg-black text-white ${slide ? 'cursor-none' : ''}`}>
      {slide ? <Slide slide={slide} /> : (
        <div className="flex h-full flex-col items-center justify-center gap-8 p-8 text-center">
          <p className="max-w-2xl text-xl text-neutral-400">
            No celular, abra a mensagem, toque em <b className="text-neutral-200">Pregar</b> e
            depois em <b className="text-neutral-200">Telão</b>. Digite o código:
          </p>
          <p className="font-mono text-[12vw] font-semibold leading-none tracking-[0.15em]">
            {codigo.slice(0, 3)} {codigo.slice(3)}
          </p>
          <div className="rounded-2xl bg-white p-4">
            <QRCodeSVG value={link} size={200} />
          </div>
          <p className="text-neutral-500">ou aponte a câmera do celular para o QR Code</p>
          <p className={`text-sm ${online ? 'text-emerald-400' : 'text-amber-400'}`}>
            ● {online ? 'Pronto, aguardando o celular' : 'Conectando ao servidor…'}
          </p>
        </div>
      )}

      {!telaCheia && (
        <button onClick={alternarTelaCheia}
          className="absolute bottom-4 right-4 cursor-pointer rounded-lg bg-neutral-900 px-3 py-2 text-sm text-neutral-300 ring-1 ring-neutral-700">
          Tela cheia (ou dois cliques)
        </button>
      )}
    </div>
  )
}