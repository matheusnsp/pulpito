import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, ArrowRight, BookOpen, CalendarDays, Check, Clock, GripVertical, Hand, ImagePlus,
  MonitorPlay, MoveRight, NotebookPen, Palette, Plus, Presentation, RefreshCw, Search, Timer, X,
} from 'lucide-react'
import { criarMensagem } from '../lib/mensagens'
import { aoPedirTutorial, marcarTutorialVisto, tutorialJaVisto } from '../lib/tutorial'
import Marca from './Marca'

/*
  Tutorial de primeiro uso. Cada passo tem uma miniatura da tela (desenhada aqui, sem imagens)
  e três dicas curtas. Passa arrastando para o lado, pelas setas ou pelo teclado.
*/

type Passo = { titulo: string; texto: string; tela: ReactNode; dicas: { Icone: typeof Plus; texto: ReactNode }[] }

/* Moldura de celular para as miniaturas */
function Tela({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto h-44 w-full max-w-[17rem] overflow-hidden rounded-2xl border border-borda bg-fundo p-3 shadow-cartao">
      {children}
    </div>
  )
}

const linha = (w: string, cor = 'bg-texto/15') => <span className={`block h-1.5 rounded-full ${cor}`} style={{ width: w }} />

const PASSOS: Passo[] = [
  {
    titulo: 'Bem-vindo ao Pulpito',
    texto: 'Prepare a mensagem, pregue com cronômetro e projete no telão, tudo no mesmo lugar. Leva 1 minuto para conhecer.',
    tela: (
      <Tela>
        <div className="flex h-full flex-col items-center justify-center gap-4">
          <Marca icone className="text-3xl" />
          <div className="flex gap-1.5">
            {['Preparar', 'Pregar', 'Projetar'].map((t) => (
              <span key={t} className="rounded-full bg-ouro-suave px-2.5 py-1 text-[11px] font-bold text-tinta">{t}</span>
            ))}
          </div>
        </div>
      </Tela>
    ),
    dicas: [
      { Icone: Hand, texto: <>Arraste para o lado para passar as dicas.</> },
      { Icone: RefreshCw, texto: <>Para ver este tutorial de novo, vá em <b>Ajustes</b>.</> },
    ],
  },
  {
    titulo: 'Suas mensagens',
    texto: 'A tela inicial reúne suas mensagens, os próximos compromissos e um atalho para continuar de onde parou.',
    tela: (
      <Tela>
        <div className="space-y-2">
          {['Moldado por Deus', 'O bom pastor', 'Fé que age'].map((t, i) => (
            <div key={t} className="flex items-center gap-2 rounded-xl border border-borda bg-superficie p-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-ouro-suave text-tinta"><NotebookPen size={13} /></span>
              <span className="min-w-0 flex-1">
                <b className="block truncate text-[11px]">{t}</b>
                {linha(i === 0 ? '40%' : '55%', 'bg-acao/50')}
              </span>
            </div>
          ))}
        </div>
        <span className="float-right -mt-1 flex h-8 w-8 items-center justify-center rounded-xl bg-acao text-acao-texto shadow-lg"><Plus size={16} strokeWidth={3} /></span>
      </Tela>
    ),
    dicas: [
      { Icone: Plus, texto: <>Toque em <b>+</b> para criar uma mensagem nova.</> },
      { Icone: GripVertical, texto: <>Arraste uma mensagem até uma <b>pasta</b> para organizar.</> },
      { Icone: Search, texto: <>Busque pelo título ou pelo texto base.</> },
    ],
  },
  {
    titulo: 'Monte o esboço',
    texto: 'Coloque o texto base e divida a mensagem em tópicos. O versículo aparece na hora, sem abrir a Bíblia.',
    tela: (
      <Tela>
        <b className="block font-display text-sm">Moldado por Deus</b>
        <div className="mt-1.5 rounded-lg border-l-2 border-acao bg-ouro-suave px-2 py-1.5 text-[10px] text-tinta">Sl 14:4 · Acaso não entendem…</div>
        <div className="mt-2 space-y-1.5">
          {['Quando o erro vira rotina', 'O perigo de normalizar', 'Moldado por quem?'].map((t, i) => (
            <div key={t} className="flex items-center gap-2 rounded-lg border border-borda bg-superficie px-2 py-1.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ouro-suave text-[10px] font-extrabold text-tinta">{i + 1}</span>
              <span className="truncate text-[11px] font-bold">{t}</span>
            </div>
          ))}
        </div>
      </Tela>
    ),
    dicas: [
      { Icone: GripVertical, texto: <>Segure o número do tópico e arraste para mudar a ordem.</> },
      { Icone: NotebookPen, texto: <>Observação, aplicação, ilustração e notas são <b>só para você</b>: o público não vê.</> },
      { Icone: Clock, texto: <>Defina o tempo da pregação; o app divide entre os tópicos.</> },
    ],
  },
  {
    titulo: 'Slides prontos',
    texto: 'Gere os slides a partir dos tópicos com um toque e depois personalize do seu jeito.',
    tela: (
      <Tela>
        <div className="relative flex h-[6.75rem] items-center overflow-hidden rounded-xl bg-[radial-gradient(ellipse_at_bottom,#3a2a05,#0A0A0A_70%)]">
          <span className="h-full w-2/5 bg-[linear-gradient(170deg,#2B4A6F,#C27A3A_60%,#2a1a0c)]" />
          <span className="flex-1 space-y-1.5 px-3">
            <b className="block font-display text-[11px] leading-tight text-white">QUANDO O ERRO VIRA ROTINA</b>
            {linha('50%', 'bg-[#FFC107]')}
          </span>
          <MoveRight size={22} className="absolute bottom-2 right-3 text-[#FFC107]" />
        </div>
        <div className="mt-2 flex gap-1.5">
          {[ImagePlus, MoveRight, Presentation].map((I, i) => (
            <span key={i} className="flex flex-1 items-center justify-center rounded-lg border border-borda bg-superficie py-1.5 text-texto-2"><I size={14} /></span>
          ))}
        </div>
      </Tela>
    ),
    dicas: [
      { Icone: ImagePlus, texto: <>Coloque <b>fotos</b> ao lado do texto ou de fundo.</> },
      { Icone: MoveRight, texto: <>Adicione <b>setas, círculos, ícones</b> e textos soltos, e arraste no slide.</> },
      { Icone: Presentation, texto: <>Exporte em <b>PowerPoint</b> ou <b>PDF</b> para compartilhar.</> },
    ],
  },
  {
    titulo: 'Na hora de pregar',
    texto: 'O modo pregação mostra um tópico por vez, em letra grande, com o cronômetro sempre à vista.',
    tela: (
      <Tela>
        <div className="flex items-center justify-center gap-2">
          <span className="rounded-lg bg-superficie px-2 py-1 text-center">
            <span className="block text-[8px] font-bold uppercase tracking-wider text-texto-2">Tempo restante</span>
            <b className="font-mono text-sm text-sucesso">24:10</b>
          </span>
        </div>
        <p className="mt-2 text-[9px] font-bold uppercase tracking-wider text-texto-2">Tópico 2 de 6</p>
        <b className="mt-1 block font-display text-base leading-tight text-tinta">O PERIGO DE NORMALIZAR</b>
        <div className="mt-2 space-y-1.5">{linha('90%')}{linha('75%')}{linha('60%')}</div>
      </Tela>
    ),
    dicas: [
      { Icone: Hand, texto: <><b>Arraste para o lado</b> para ir ao próximo tópico. Pinça muda o tamanho da letra.</> },
      { Icone: Timer, texto: <>O tempo conta para trás: fica amarelo, depois vermelho, e mostra quanto passou.</> },
      { Icone: Clock, texto: <>Use o <b>modo ensaio</b> (na engrenagem) para ver quanto gastou em cada tópico.</> },
    ],
  },
  {
    titulo: 'Telão pelo celular',
    texto: 'Abra o telão no computador ou na TV da igreja e controle tudo pelo celular enquanto prega.',
    tela: (
      <Tela>
        <div className="flex h-full items-center gap-3">
          <div className="flex-1">
            <div className="flex aspect-video flex-col items-center justify-center rounded-lg border-4 border-texto/20 bg-black">
              <span className="text-[8px] font-bold uppercase tracking-wider text-white/60">Código</span>
              <b className="font-mono text-base tracking-[0.2em] text-[#FFC107]">4 8 2 7</b>
            </div>
            <span className="mx-auto mt-1 block h-2 w-8 rounded-b bg-texto/20" />
          </div>
          <span className="flex h-20 w-11 flex-col items-center justify-center gap-1 rounded-xl border-2 border-texto/20 bg-superficie">
            <MonitorPlay size={16} className="text-tinta" />
            {linha('60%')}
          </span>
        </div>
      </Tela>
    ),
    dicas: [
      { Icone: MonitorPlay, texto: <>No computador, abra o Pulpito e escolha <b>Telão</b>.</> },
      { Icone: Hand, texto: <>No modo pregação, toque no botão de <b>transmitir</b> e digite o código (ou leia o QR).</> },
      { Icone: Presentation, texto: <>Os slides mudam no telão quando você passa os tópicos.</> },
    ],
  },
  {
    titulo: 'Bíblia e agenda',
    texto: 'A Bíblia funciona sem internet, e a agenda avisa dos seus compromissos no calendário do celular.',
    tela: (
      <Tela>
        <div className="flex items-center gap-1.5 rounded-lg border border-borda bg-superficie px-2 py-1.5 text-[10px] text-texto-2"><Search size={11} /> “graça”</div>
        <p className="mt-2 text-[11px] leading-relaxed">
          <sup className="font-bold text-tinta">8</sup> Porque pela <mark className="rounded bg-acao/30 px-0.5 text-texto">graça</mark> sois salvos, por meio da fé…
        </p>
        <div className="mt-2 flex items-center gap-2 rounded-lg border border-borda bg-superficie p-2">
          <CalendarDays size={14} className="text-tinta" />
          <span className="text-[10px] font-bold">Culto de jovens · sáb 19h</span>
        </div>
      </Tela>
    ),
    dicas: [
      { Icone: Search, texto: <>Busque por <b>referência</b> (Jo 3:16) ou por <b>palavra</b>.</> },
      { Icone: BookOpen, texto: <>Troque ARA, ARC e NAA; pinça aumenta a letra.</> },
      { Icone: CalendarDays, texto: <>Na agenda, ligue um compromisso à mensagem que você vai pregar.</> },
    ],
  },
  {
    titulo: 'Do seu jeito',
    texto: 'Em Ajustes você escolhe as cores do app e mantém tudo atualizado. Pronto para começar?',
    tela: (
      <Tela>
        <div className="grid h-full grid-cols-2 gap-2">
          {[['#0A0A0A', '#FFC107'], ['#0B1220', '#E8B44A'], ['#0F1113', '#2DD4BF'], ['#FAFAFA', '#111111']].map(([f, a]) => (
            <span key={f} className="flex flex-col justify-end gap-1 rounded-xl border border-borda p-2" style={{ background: f }}>
              <span className="h-2 rounded-full" style={{ background: a }} />
              <span className="h-1.5 w-1/2 rounded-full" style={{ background: a, opacity: 0.4 }} />
            </span>
          ))}
        </div>
      </Tela>
    ),
    dicas: [
      { Icone: Palette, texto: <>Quatro temas de cores; o modo pregação acompanha o tema.</> },
      { Icone: RefreshCw, texto: <><b>Carregar última versão</b> traz as novidades na hora.</> },
    ],
  },
]

export default function Tutorial() {
  const navigate = useNavigate()
  const [aberto, setAberto] = useState(() => !tutorialJaVisto())
  const [i, setI] = useState(0)
  const [criando, setCriando] = useState(false)
  const toque = useRef<{ x: number; y: number } | null>(null)
  const ultimo = i === PASSOS.length - 1

  useEffect(() => aoPedirTutorial(() => { setI(0); setAberto(true) }), [])

  useEffect(() => {
    if (!aberto) return
    function tecla(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') setI((n) => Math.min(PASSOS.length - 1, n + 1))
      if (e.key === 'ArrowLeft') setI((n) => Math.max(0, n - 1))
      if (e.key === 'Escape') fechar()
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [aberto])

  function fechar() {
    marcarTutorialVisto()
    setAberto(false)
  }

  async function comecar() {
    setCriando(true)
    try {
      const id = await criarMensagem()
      fechar()
      navigate(`/mensagem/${id}`)
    } catch {
      fechar()
    } finally {
      setCriando(false)
    }
  }

  if (!aberto) return null
  const p = PASSOS[i]

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog" aria-modal="true" aria-labelledby="tutorial-titulo">
      <div className="flex max-h-[100dvh] min-h-[min(100dvh,42rem)] w-full max-w-md animate-subir flex-col sm:min-h-0 overflow-hidden rounded-t-[1.75rem] border border-borda bg-superficie shadow-2xl sm:animate-entrar sm:rounded-[1.75rem]"
        onTouchStart={(e) => { toque.current = { x: e.touches[0].clientX, y: e.touches[0].clientY } }}
        onTouchEnd={(e) => {
          const t = toque.current
          toque.current = null
          if (!t) return
          const dx = e.changedTouches[0].clientX - t.x
          const dy = e.changedTouches[0].clientY - t.y
          if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.4) return
          setI((n) => Math.max(0, Math.min(PASSOS.length - 1, n + (dx < 0 ? 1 : -1))))
        }}>
        {/* Progresso e pular */}
        <div className="flex items-center gap-3 px-5 pt-4">
          <div className="flex flex-1 gap-1">
            {PASSOS.map((_, n) => (
              <button key={n} onClick={() => setI(n)} aria-label={`Passo ${n + 1}`}
                className={`h-1.5 flex-1 rounded-full transition-colors ${n <= i ? 'bg-acao' : 'bg-borda'}`} />
            ))}
          </div>
          <button onClick={fechar} aria-label="Fechar tutorial"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-texto-2 hover:bg-superficie-2 hover:text-texto">
            <X size={18} />
          </button>
        </div>

        <div key={i} className="min-h-0 flex-1 animate-entrar overflow-y-auto px-5 pb-2 pt-4">
          <div className="rounded-3xl p-4" style={{ background: 'var(--hero)' }}>{p.tela}</div>
          <p className="rotulo mt-5">{i + 1} de {PASSOS.length}</p>
          <h2 id="tutorial-titulo" className="mt-1 font-display text-2xl font-extrabold tracking-tight">{p.titulo}</h2>
          <p className="mt-1.5 text-texto-2">{p.texto}</p>
          <ul className="mt-4 space-y-2.5">
            {p.dicas.map(({ Icone, texto }, n) => (
              <li key={n} className="flex items-start gap-3 text-sm">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-ouro-suave text-tinta"><Icone size={15} /></span>
                <span className="pt-1">{texto}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Botões ao alcance do polegar */}
        <div className="flex gap-2 border-t border-borda px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
          {i > 0 ? (
            <button onClick={() => setI(i - 1)} aria-label="Voltar" className="botao-secundario px-3"><ArrowLeft size={18} /></button>
          ) : (
            <button onClick={fechar} className="botao-fantasma px-3">Pular</button>
          )}
          {ultimo ? (
            <>
              <button onClick={fechar} className="botao-secundario flex-1 px-3"><Check size={18} /> Explorar</button>
              <button onClick={comecar} disabled={criando} className="botao-primario flex-[1.3] px-3">
                <Plus size={18} strokeWidth={2.5} /> {criando ? 'Criando…' : 'Começar'}
              </button>
            </>
          ) : (
            <button onClick={() => setI(i + 1)} className="botao-primario flex-1">
              Próximo <ArrowRight size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
