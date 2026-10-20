import { alternarTelaCheia as trocarTelaCheia, aoMudarTelaCheia, emTelaCheia } from '../lib/telaCheia'
import AjudaTelaCheia from '../components/AjudaTelaCheia'
import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { BookOpen, Maximize } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { canalTelao, codigoValido, gerarCodigo, type SlideTelao } from '../lib/telao'
import SlideVisual from '../components/SlideVisual'
import Marca from '../components/Marca'

const CHAVE_CODIGO = 'pulpito-codigo-telao'

const porTamanho = (t: string, grande: string, medio: string, pequeno: string) =>
  t.length > 300 ? pequeno : t.length > 150 ? medio : grande

/* Mural ao vivo: a pergunta, como entrar e as respostas chegando (sem nomes quando a aula é anônima) */
function SlideMural({ slide }: { slide: Extract<SlideTelao, { tipo: 'mural' }> }) {
  const colunas = slide.respostas.length > 4 ? 'grid-cols-3' : 'grid-cols-2'
  const tamanho = (t: string) => (t.length > 120 ? 'text-[1.6vw]' : t.length > 60 ? 'text-[2vw]' : 'text-[2.5vw]')
  return (
    <div className="flex h-full flex-col gap-[2.5vh] px-[5vw] py-[4vh]">
      <div className="flex items-start gap-[3vw]">
        <div className="min-w-0 flex-1">
          <p className="text-[1.5vw] font-extrabold uppercase tracking-[0.12em] text-tinta">Responda pelo celular</p>
          <h1 className="mt-[1vh] font-display text-[3.8vw] font-bold leading-[1.1]">{slide.titulo}</h1>
        </div>
        <div className="flex shrink-0 items-center gap-[1.4vw] rounded-[1.4vw] bg-white/5 p-[1vw]">
          <div className="w-[8vw] rounded-[0.8vw] bg-white p-[0.6vw]">
            <QRCodeSVG value={slide.link} style={{ width: '100%', height: 'auto', display: 'block' }} />
          </div>
          <div>
            <p className="text-[1.2vw] text-white/60">Código</p>
            <p className="font-mono text-[3.4vw] font-bold leading-none tracking-[0.12em]">{slide.codigo}</p>
            <p className="mt-[0.6vh] text-[1.1vw] text-white/50">{slide.link.replace(/^https?:\/\//, '').replace(/\/responder\/.*$/, '/responder')}</p>
          </div>
        </div>
      </div>

      <p className="flex items-center gap-[0.8vw] text-[1.6vw] text-white/60">
        <span className="h-[0.9vw] w-[0.9vw] animate-pulse rounded-full bg-perigo" />
        {slide.total} {slide.total === 1 ? 'resposta' : 'respostas'}
      </p>

      {slide.respostas.length === 0 ? (
        <p className="m-auto text-[2.2vw] text-white/40">As respostas aparecem aqui</p>
      ) : (
        <div className={`grid min-h-0 flex-1 content-start gap-[1.4vw] overflow-hidden ${colunas}`}>
          {slide.respostas.map((r, i) => (
            <div key={i} className={`rounded-[1.2vw] border p-[1.4vw] ${r.destaque ? 'border-acao bg-acao/15' : 'border-white/15 bg-white/5'}`}>
              {r.nome && <b className="mb-[0.4vh] block text-[1.4vw] text-tinta">{r.nome}</b>}
              <p className={`${tamanho(r.texto)} whitespace-pre-wrap break-words leading-snug`}>{r.texto}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Slide({ slide }: { slide: SlideTelao }) {
  if (slide.tipo === 'vazio') return null

  if (slide.tipo === 'mural') return <SlideMural slide={slide} />

  if (slide.tipo === 'personalizado') return <SlideVisual slide={slide} preencher />

  if (slide.tipo === 'versiculo') {
    const versos = slide.versos?.length ? slide.versos : null
    const tamanho = porTamanho(slide.texto, 'text-[4.2vw]', 'text-[3.4vw]', 'text-[2.7vw]')
    return (
      <div className="flex h-full flex-col items-center justify-center gap-[4vh] px-[8vw] text-center">
        <p className="flex items-center gap-[1vw] text-[2.4vw] font-extrabold text-tinta">
          <BookOpen className="h-[2.6vw] w-[2.6vw]" /> {slide.referencia}
        </p>
        <p className={`${tamanho} font-escritura leading-snug`}>
          {versos
            ? versos.map((v) => (
                <span key={v.n}>
                  {versos.length > 1 && <sup className="mr-[0.3vw] font-sans text-[0.5em] font-bold text-tinta">{v.n}</sup>}
                  {v.t}{' '}
                </span>
              ))
            : slide.texto}
        </p>
      </div>
    )
  }

  const texto = slide.textoVersiculo
  return (
    <div className="flex h-full flex-col items-center justify-center gap-[3vh] px-[8vw] text-center">
      {slide.tipo === 'topico' && (
        <p className="text-[1.6vw] text-white/50">{slide.numero} de {slide.total}</p>
      )}
      <h1 className={`${slide.tipo === 'capa' ? 'text-[6vw]' : 'text-[5vw]'} font-display font-bold leading-[1.1]`}>
        {slide.titulo}
      </h1>
      {slide.tipo === 'topico' && slide.frase && (
        <p className="text-[2.8vw] font-bold leading-snug text-acao">{slide.frase}</p>
      )}
      {texto && (
        <p className={`${porTamanho(texto, 'text-[2.8vw]', 'text-[2.3vw]', 'text-[1.9vw]')} max-w-[80vw] font-escritura leading-snug text-white/85`}>
          “{texto}”
        </p>
      )}
      {slide.referencia && <p className="text-[2vw] font-bold text-tinta">{slide.referencia}</p>}
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

  useEffect(() => { sessionStorage.setItem(CHAVE_CODIGO, codigo) }, [codigo])

  const [ajudaTelaCheia, setAjudaTelaCheia] = useState(false)
  useEffect(() => aoMudarTelaCheia(() => setTelaCheia(emTelaCheia())), [])

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
    if (!trocarTelaCheia()) setAjudaTelaCheia(true)
  }

  const link = `${window.location.origin}/conectar/${codigo}`

  return (
    <div onDoubleClick={alternarTelaCheia}
      className={`escuro relative h-dvh select-none text-white ${slide ? 'cursor-none bg-black' : 'bg-fundo'}`}>
      {slide ? <Slide slide={slide} /> : (
        <div className="flex h-full flex-col items-center justify-center gap-10 p-8 text-center">
          <Marca icone className="text-5xl" />
          <div className="flex flex-col items-center gap-10 md:flex-row md:gap-16">
            <div>
              <p className="text-lg text-texto-2">Código do telão</p>
              <p className="mt-2 text-[10vw] font-bold leading-none tracking-[0.12em] tabular-nums md:text-[7vw]">
                {codigo.slice(0, 3)} {codigo.slice(3)}
              </p>
            </div>
            <div className="rounded-3xl bg-white p-5">
              <QRCodeSVG value={link} size={200} />
            </div>
          </div>
          <p className="max-w-xl text-lg text-texto-2">
            No celular, abra a mensagem, toque em <b className="text-texto">Pregar</b> e depois em{' '}
            <b className="text-texto">Telão</b> para digitar o código. Ou aponte a câmera para o QR Code.
          </p>
          <p className="flex items-center gap-2 text-sm text-texto-2">
            <span className={`h-2 w-2 rounded-full ${online ? 'bg-sucesso' : 'bg-aviso'}`} />
            {online ? 'Pronto, aguardando o celular' : 'Conectando ao servidor…'}
          </p>
        </div>
      )}

      {!telaCheia && (
        <button onClick={alternarTelaCheia}
          className="absolute bottom-5 right-5 flex cursor-pointer items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white/80 hover:bg-white/10">
          <Maximize size={16} /> Tela cheia
        </button>
      )}
      {ajudaTelaCheia && <AjudaTelaCheia onFechar={() => setAjudaTelaCheia(false)} />}
    </div>
  )
}