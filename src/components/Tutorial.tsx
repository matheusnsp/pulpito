import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  ArrowLeft, ArrowRight, BookOpen, Hourglass, CalendarDays, ChartNoAxesColumn, Check, ChevronRight, Clock, Copy, Download, Eye, FileDown,
  FolderInput, GraduationCap, GripVertical, Hand, Highlighter, ImagePlus, Layers, LayoutTemplate, ListChecks, Lock, Maximize,
  MessagesSquare, MonitorPlay, MoveRight, NotebookPen, Palette, Plus, Presentation, QrCode, RefreshCw, RotateCw,
  Radio, Search, Settings, Share2, Sparkles, Target, Timer, Trophy, Type as TypeIcon, Upload, Users, WifiOff, X,
} from 'lucide-react'
import { abrirCriar } from '../lib/criar'
import { aoPedirTutorial, marcarTutorialVisto } from '../lib/tutorial'
import Marca from './Marca'

/*
  Tutorial completo, em capítulos. Abre sozinho uma vez no índice; dá para ver um capítulo
  ou tudo em sequência. Cada passo tem uma miniatura da tela (desenhada aqui, sem imagens)
  e dicas curtas. Passa arrastando para o lado, pelas setas ou pelo teclado.
*/

type Dica = { Icone: typeof Plus; texto: ReactNode }
type Passo = { titulo: string; texto: string; tela: ReactNode; dicas: Dica[] }
type Capitulo = { id: string; nome: string; resumo: string; Icone: typeof Plus; cor: string; passos: Passo[] }

const AMARELO = '#EAB308'
const VERDE = '#14B8A6'
const AZUL = '#38BDF8'
const ROXO = '#A78BFA'
const ROSA = '#EC4899'
const LARANJA = '#F97316'

/* Moldura para as miniaturas */
function Tela({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto h-44 w-full max-w-[17rem] overflow-hidden rounded-2xl border border-borda bg-fundo p-3 shadow-cartao">
      {children}
    </div>
  )
}
const linha = (w: string, cor = 'bg-texto/15') => <span className={`block h-1.5 rounded-full ${cor}`} style={{ width: w }} />
const Tag = ({ cor, children }: { cor: string; children: ReactNode }) => (
  <span className="rounded-full px-1.5 py-0.5 text-[8.5px] font-extrabold uppercase tracking-wider" style={{ color: cor, background: `${cor}22` }}>{children}</span>
)
const Bolinha = ({ cor, children }: { cor: string; children: ReactNode }) => (
  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg" style={{ background: `${cor}26`, color: cor }}>{children}</span>
)
/* Miniatura de slide 16:9 */
const Slide = ({ children, fundo = 'radial-gradient(ellipse at bottom,#3a2a05,#0A0A0A 70%)' }: { children: ReactNode; fundo?: string }) => (
  <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-lg" style={{ background: fundo }}>{children}</div>
)
/* Linha com ícone + nome (listas de opções nas miniaturas) */
const Opcao = ({ Icone, nome, cor, extra }: { Icone: typeof Plus; nome: string; cor: string; extra?: ReactNode }) => (
  <div className="flex items-center gap-2 rounded-lg border border-borda bg-superficie p-1.5">
    <Bolinha cor={cor}><Icone size={12} /></Bolinha>
    <span className="min-w-0"><b className="block text-[11px]">{nome}</b>{extra}</span>
  </div>
)

const CAPITULOS: Capitulo[] = [
  /* ───────────── 1. Primeiros passos ───────────── */
  {
    id: 'inicio', nome: 'Primeiros passos', resumo: 'Tela inicial, criar, pastas e busca', Icone: Sparkles, cor: AMARELO,
    passos: [
      {
        titulo: 'Bem-vindo ao Pulpito',
        texto: 'Prepare, apresente e projete: Palavra e estudos no mesmo lugar, do celular ao telão.',
        tela: (
          <Tela>
            <div className="flex h-full flex-col items-center justify-center gap-4">
              <Marca icone className="text-3xl" />
              <div className="flex flex-wrap justify-center gap-1.5">
                {['Preparar', 'Pregar', 'Ensinar', 'Projetar'].map((t) => (
                  <span key={t} className="rounded-full bg-ouro-suave px-2.5 py-1 text-[11px] font-bold text-tinta">{t}</span>
                ))}
              </div>
            </div>
          </Tela>
        ),
        dicas: [
          { Icone: Hand, texto: <>Arraste para o lado (ou use as setas) para passar as dicas.</> },
          { Icone: BookOpen, texto: <>Você pode ver um capítulo só ou <b>tudo em sequência</b>.</> },
          { Icone: Settings, texto: <>Este tutorial fica em <b>Ajustes → Tutorial</b> para rever quando quiser.</> },
        ],
      },
      {
        titulo: 'Palavra e Estudos',
        texto: 'A chave no topo da tela inicial separa os dois lados do app. Cada lado mostra só os seus itens.',
        tela: (
          <Tela>
            <div className="flex gap-1 rounded-xl border border-borda bg-superficie p-1">
              <span className="flex flex-1 items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-bold text-texto-2"><BookOpen size={11} /> Palavra</span>
              <span className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-acao py-1.5 text-[11px] font-bold text-acao-texto"><GraduationCap size={11} /> Estudos</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-borda p-2 text-center">
                <Marca icone className="text-[13px]" />
                <p className="mt-1 text-[9px] font-bold uppercase tracking-wider" style={{ color: AMARELO }}>Palavra</p>
              </div>
              <div className="rounded-xl border border-borda p-2 text-center">
                <Marca icone modo="estudo" className="text-[13px]" />
                <p className="mt-1 text-[9px] font-bold uppercase tracking-wider" style={{ color: VERDE }}>Estudos</p>
              </div>
            </div>
            <p className="mt-2 text-center text-[10px] text-texto-2">A logo e o menu mudam com a chave</p>
          </Tela>
        ),
        dicas: [
          { Icone: BookOpen, texto: <><b>Palavra</b>: tudo centrado na Bíblia. Pregação, célula, estudo bíblico (EBD), devocional e discipulado.</> },
          { Icone: GraduationCap, texto: <><b>Estudos</b>: aula de curso, palestra ou treinamento sobre qualquer assunto.</> },
          { Icone: MessagesSquare, texto: <>Nos estudos, o menu de baixo troca a Bíblia pelo <b>Banco de perguntas</b>.</> },
        ],
      },
      {
        titulo: 'Criar algo novo',
        texto: 'O botão + abre a pergunta "O que você vai preparar?". De um lado os formatos da Palavra, do outro os estudos.',
        tela: (
          <Tela>
            <p className="font-display text-[13px] font-extrabold">O que você vai preparar?</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <p className="flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-wider" style={{ color: AMARELO }}><BookOpen size={10} /> Palavra</p>
                {['Pregação', 'Célula', 'Estudo bíblico', 'Devocional', 'Discipulado'].map((m) => (
                  <span key={m} className="block truncate rounded-md border border-borda bg-superficie px-1.5 py-1 text-[9.5px] font-bold">{m}</span>
                ))}
              </div>
              <div className="space-y-1">
                <p className="flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-wider" style={{ color: VERDE }}><GraduationCap size={10} /> Estudos</p>
                {['Em branco', 'Aula de curso', 'Palestra', 'Treinamento'].map((m) => (
                  <span key={m} className="block truncate rounded-md border border-borda bg-superficie px-1.5 py-1 text-[9.5px] font-bold">{m}</span>
                ))}
              </div>
            </div>
          </Tela>
        ),
        dicas: [
          { Icone: Plus, texto: <>No celular, o <b>+</b> fica embaixo à direita; no computador, em <b>Criar novo</b>.</> },
          { Icone: LayoutTemplate, texto: <>Célula, estudo bíblico, devocional, discipulado e os estudos já vêm <b>montados</b>: é só preencher.</> },
          { Icone: Copy, texto: <>No menu <b>⋯</b> de cada item dá para duplicar e reaproveitar.</> },
        ],
      },
      {
        titulo: 'Organizar e encontrar',
        texto: 'Use pastas, busca e o atalho "Continue de onde parou" para achar tudo rápido.',
        tela: (
          <Tela>
            <div className="flex items-center gap-1.5 rounded-lg border border-borda bg-superficie px-2 py-1.5 text-[10px] text-texto-2"><Search size={11} /> Buscar</div>
            <div className="mt-2 flex gap-1">
              <span className="rounded-full bg-texto px-2 py-0.5 text-[9px] font-bold text-fundo">Todas</span>
              <span className="rounded-full border border-acao bg-acao/20 px-2 py-0.5 text-[9px] font-bold">Célula</span>
              <span className="rounded-full border border-dashed border-borda px-2 py-0.5 text-[9px] font-bold text-texto-2">+ Pasta</span>
            </div>
            <div className="mt-2 flex rotate-2 items-center gap-2 rounded-lg border border-acao bg-superficie p-2 shadow-xl">
              <GripVertical size={12} className="text-texto-2" /><b className="text-[10px]">Fé que age</b><span className="ml-auto text-[9px] text-texto-2">solte na pasta</span>
            </div>
            <div className="mt-2 flex items-center justify-between rounded-lg bg-texto px-2 py-1.5 text-[10px] text-fundo">
              <span><b>Fé que age</b> foi excluída</span><b className="text-acao">Desfazer</b>
            </div>
          </Tela>
        ),
        dicas: [
          { Icone: FolderInput, texto: <>Segure a alça <b>⋮⋮</b> e arraste até uma pasta para guardar.</> },
          { Icone: Search, texto: <>No computador, a tecla <b>/</b> vai direto para a busca.</> },
          { Icone: Hand, texto: <>Excluiu sem querer? Toque em <b>Desfazer</b>. Para sumir com o aviso, arraste-o para o lado.</> },
        ],
      },
    ],
  },

  /* ───────────── 2. Palavra ───────────── */
  {
    id: 'pregacoes', nome: 'Palavra', resumo: 'Pregação, célula, EBD, devocional e discipulado', Icone: BookOpen, cor: AMARELO,
    passos: [
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
          { Icone: NotebookPen, texto: <>Observação, aplicação, ilustração, frase-chave e notas são <b>só para você</b>.</> },
          { Icone: Clock, texto: <>Defina o tempo da pregação; o app divide entre os tópicos.</> },
          { Icone: BookOpen, texto: <>Um tópico pode ter <b>vários versículos</b>: toque em <b>Adicionar versículo</b>. Cada um vira um slide.</> },
          { Icone: BookOpen, texto: <>Para citar um versículo <b>no meio do texto</b> (observação, ilustração, aplicação), toque em <b>Versículo</b> acima do campo. No slide, o texto se divide: antes, o versículo e depois.</> },
        ],
      },
      {
        titulo: 'Na hora de pregar',
        texto: 'O modo pregação mostra um tópico por vez, em letra grande, com o versículo embaixo e o cronômetro no topo.',
        tela: (
          <Tela>
            <div className="flex items-center justify-center gap-1.5">
              <span className="rounded-lg bg-superficie px-2 py-1 text-center"><span className="block text-[7px] font-bold uppercase text-texto-2">Hora</span><b className="font-mono text-xs">19:42</b></span>
              <span className="rounded-lg bg-superficie px-2 py-1 text-center"><span className="block text-[7px] font-bold uppercase text-texto-2">Restante</span><b className="font-mono text-xs text-sucesso">24:10</b></span>
            </div>
            <p className="mt-2 text-[9px] font-bold uppercase tracking-wider text-texto-2">Tópico 2 de 6 · Próximo: Moldado por quem?</p>
            <b className="mt-1 block font-display text-base leading-tight text-tinta">O PERIGO DE NORMALIZAR</b>
            <div className="mt-2 space-y-1.5">{linha('90%')}{linha('75%')}</div>
            <div className="mt-2 rounded-lg border border-borda bg-superficie px-2 py-1 text-[9px] text-tinta"><BookOpen size={9} className="inline" /> Rm 12:2</div>
          </Tela>
        ),
        dicas: [
          { Icone: Hand, texto: <><b>Arraste para o lado</b> para mudar de tópico. Toque em "Próximo" para pular para qualquer um.</> },
          { Icone: Search, texto: <><b>Pinça</b> (ou + e −) muda o tamanho da letra.</> },
          { Icone: ListChecks, texto: <>No computador, o <b>roteiro</b> fica ao lado: clique em qualquer tópico para pular até ele.</> },
          { Icone: Timer, texto: <>Com o cronômetro ligado, aparece o <b>tempo do tópico atual</b> ao lado do previsto (fica vermelho se passar).</> },
          { Icone: Maximize, texto: <><b>Tela cheia</b>: no iPad e no Android, pelo botão; no iPhone, abra pelo app instalado e deite o celular.</> },
        ],
      },
      {
        titulo: 'O cronômetro avisa',
        texto: 'Toque no tempo para começar. Ele conta para trás e muda de cor conforme o tempo passa.',
        tela: (
          <Tela>
            <div className="grid h-full grid-cols-3 gap-1.5">
              {[['Começo', 'bg-superficie-2', 'text-sucesso', '30:00'], ['Metade', 'bg-aviso', 'text-[#1A1200]', '14:20'], ['Fim', 'bg-perigo', 'text-white', '+02:15']].map(([n, bg, cor, t]) => (
                <div key={n} className="flex flex-col items-center justify-center gap-1">
                  <span className={`w-full rounded-lg px-1 py-2 text-center ${bg}`}><b className={`font-mono text-[13px] ${cor}`}>{t}</b></span>
                  <span className="text-[9px] font-bold text-texto-2">{n}</span>
                </div>
              ))}
            </div>
          </Tela>
        ),
        dicas: [
          { Icone: Timer, texto: <>Fica <b>amarelo</b> na metade e <b>vermelho</b> perto do fim; ao estourar, a tela pisca e mostra quanto passou.</> },
          { Icone: BookOpen, texto: <>Toque no versículo embaixo para abrir a Bíblia e até projetar no telão.</> },
          { Icone: Clock, texto: <>No computador: <b>espaço</b> começa ou pausa, <b>F</b> tela cheia, <b>B</b> Bíblia, <b>T</b> telão.</> },
        ],
      },
      {
        titulo: 'Ensaie antes',
        texto: 'Pregue para ninguém e veja quanto tempo gastou em cada tópico, comparando com o ensaio anterior.',
        tela: (
          <Tela>
            <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-texto-2"><ChartNoAxesColumn size={11} /> Resumo do ensaio</p>
            <div className="mt-2 space-y-1.5">
              {([['Capa', 20, '1:10'], ['1. Quando o erro…', 70, '6:40'], ['2. O perigo…', 55, '5:05'], ['3. Moldado…', 90, '8:30']] as const).map(([n, w, t]) => (
                <div key={n} className="flex items-center gap-2 text-[10px]">
                  <span className="w-20 truncate">{n}</span>
                  <span className="h-2 flex-1 rounded-full bg-superficie-2"><span className="block h-2 rounded-full bg-acao" style={{ width: `${w}%` }} /></span>
                  <span className="w-8 text-right font-mono">{t}</span>
                </div>
              ))}
            </div>
          </Tela>
        ),
        dicas: [
          { Icone: Settings, texto: <>No modo pregação, toque na <b>engrenagem</b> e depois em <b>Ensaio</b>.</> },
          { Icone: ChartNoAxesColumn, texto: <>O resumo também abre sozinho quando você chega ao fim.</> },
          { Icone: Share2, texto: <>No editor, <b>Esboço</b> copia ou compartilha a mensagem em texto (bom para o WhatsApp).</> },
        ],
      },
      {
        titulo: 'Célula, EBD e mais',
        texto: 'Na Palavra cabem vários formatos. Misture tópicos com blocos: uma pergunta para a célula, uma atividade, uma lista.',
        tela: (
          <Tela>
            <span className="inline-flex items-center gap-1 rounded-full bg-ouro-suave px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-tinta"><Users size={10} /> Palavra · Célula</span>
            <div className="mt-2 space-y-1">
              <div className="flex items-center gap-2 rounded-lg border border-borda bg-superficie px-1.5 py-1">
                <Bolinha cor={VERDE}><Users size={12} /></Bolinha><span className="truncate text-[10.5px] font-bold">Quebra-gelo</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-borda bg-superficie px-1.5 py-1">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ouro-suave text-[10px] font-extrabold text-tinta">2</span><span className="truncate text-[10.5px] font-bold">O amor que não desiste</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-borda bg-superficie px-1.5 py-1">
                <Bolinha cor={AZUL}><MessagesSquare size={12} /></Bolinha><span className="truncate text-[10.5px] font-bold">O que falou com você?</span>
              </div>
            </div>
            <div className="mt-2 flex gap-1 overflow-hidden">
              {['Pergunta', 'Atividade', 'Lista', 'Citação'].map((m) => (
                <span key={m} className="shrink-0 rounded-full border border-borda px-1.5 py-0.5 text-[9px] font-bold text-texto-2">{m}</span>
              ))}
            </div>
          </Tela>
        ),
        dicas: [
          { Icone: Plus, texto: <>Embaixo de <b>Adicionar tópico</b>, a fileira <b>Inserir</b> põe blocos no meio da mensagem.</> },
          { Icone: BookOpen, texto: <>Toque na etiqueta <b>Palavra · Formato</b>, no topo do editor, para trocar o formato.</> },
          { Icone: Radio, texto: <>Tem pergunta ou atividade? As <b>respostas ao vivo</b> e a <b>folha impressa</b> também funcionam aqui.</> },
        ],
      },
    ],
  },

  /* ───────────── 3. Estudos ───────────── */
  {
    id: 'estudos', nome: 'Estudos', resumo: 'Blocos, modo aula, respostas ao vivo e quiz', Icone: GraduationCap, cor: VERDE,
    passos: [
      {
        titulo: 'Monte o estudo em blocos',
        texto: 'Comece pelo objetivo, público e duração. Depois empilhe blocos, cada um com sua cor.',
        tela: (
          <Tela>
            <div className="rounded-lg border border-borda bg-superficie px-2 py-1.5 text-[10px]"><Target size={10} className="inline text-texto-2" /> Montar um orçamento simples</div>
            <div className="mt-2 space-y-1">
              {([[NotebookPen, 'Explicação', '#94A3B8'], [MessagesSquare, 'Pergunta', AZUL], [ListChecks, 'Lista', AMARELO], [Users, 'Atividade', VERDE]] as const).map(([Ic, n, c]) => (
                <div key={n} className="flex items-center gap-2 rounded-lg border border-borda bg-superficie px-1.5 py-1">
                  <Bolinha cor={c}><Ic size={12} /></Bolinha><Tag cor={c}>{n}</Tag>{linha('35%')}
                </div>
              ))}
            </div>
          </Tela>
        ),
        dicas: [
          { Icone: Plus, texto: <>9 tipos: <b>explicação, pergunta, atividade, lista, citação, definição, referência, imagem e link</b>.</> },
          { Icone: Timer, texto: <>Pergunta e atividade têm <b>tempo</b>; a pergunta pode ser <b>aberta ou de múltipla escolha</b>.</> },
          { Icone: Lock, texto: <>O campo <b>"Só para você"</b> nunca aparece para a turma.</> },
        ],
      },
      {
        titulo: 'Dar aula',
        texto: 'Mostra um bloco por vez. Perguntas e atividades ganham um cronômetro próprio.',
        tela: (
          <Tela>
            <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: AZUL }}><MessagesSquare size={10} className="inline" /> 2. Pergunta</p>
            <b className="mt-1 block font-display text-[15px] leading-tight">Qual compra você mais se arrependeu?</b>
            <div className="mt-2 rounded-lg border p-2" style={{ borderColor: `${AZUL}66` }}>
              <div className="flex items-center justify-between">
                <b className="font-mono text-xl">04:12</b>
                <span className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] text-black" style={{ background: AZUL }}>▶</span>
              </div>
              <span className="mt-1 block h-1 rounded-full bg-superficie-2"><span className="block h-1 w-1/4 rounded-full" style={{ background: AZUL }} /></span>
            </div>
            <p className="mt-1.5 rounded-md bg-superficie-2 px-2 py-1 text-[9px] text-texto-2">Só você vê: conte a história do tênis</p>
          </Tela>
        ),
        dicas: [
          { Icone: Hand, texto: <>Arraste para o lado para ir ao próximo bloco, igual ao modo pregação.</> },
          { Icone: Timer, texto: <>Toque no ▶ para começar a discussão; <b>+1 min</b> dá mais tempo.</> },
        ],
      },
      {
        titulo: 'Respostas ao vivo',
        texto: 'A turma responde pelo celular durante a aula, e as respostas aparecem na sua tela na hora.',
        tela: (
          <Tela>
            <div className="flex items-center gap-2">
              <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-white text-black"><QrCode size={30} /></span>
              <span><span className="block text-[8px] font-bold uppercase tracking-wider text-texto-2">Código</span><b className="font-mono text-lg tracking-widest">K7P2X</b></span>
              <span className="ml-auto flex items-center gap-1 rounded-full bg-perigo/15 px-2 py-0.5 text-[9px] font-bold text-perigo"><span className="h-1.5 w-1.5 rounded-full bg-perigo" /> AO VIVO</span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {[['Ana', 'Um tênis caro'], ['Lucas', 'Delivery todo dia'], ['Bia', 'Um curso que larguei'], ['João', 'Celular novo']].map(([n, t], i) => (
                <div key={n} className={`rounded-lg border p-1.5 ${i === 0 ? 'border-acao bg-ouro-suave' : 'border-borda bg-superficie'}`}>
                  <b className="block text-[9px]">{n}</b><span className="block truncate text-[9px] text-texto-2">{t}</span>
                </div>
              ))}
            </div>
          </Tela>
        ),
        dicas: [
          { Icone: Radio, texto: <>Em <b>Dar aula</b>, toque no botão <b>ao vivo</b>: aparece um código e um QR (dá para mostrar no telão).</> },
          { Icone: Users, texto: <>Cada um abre a câmera ou entra em <b>/responder</b> e responde. Sem instalar nada.</> },
          { Icone: Lock, texto: <><b>Modo anônimo</b> (já vem ligado): ninguém digita o nome e as respostas aparecem sem autor.</> },
          { Icone: Eye, texto: <>Você escolhe se <b>os alunos veem as respostas dos outros</b>; dá para destacar ★ ou esconder uma resposta.</> },
          { Icone: Hourglass, texto: <>Enquanto não tem pergunta, a turma vê uma <b>mensagem de espera</b>. Personalize no editor do estudo.</> },
        ],
      },
      {
        titulo: 'Mural no telão',
        texto: 'Numa pergunta aberta, o telão mostra a pergunta, o QR para entrar e as respostas chegando, como um mural.',
        tela: (
          <Tela>
            <Slide fundo="radial-gradient(ellipse at top,#0b2a3a,#0A0A0A 70%)">
              <div className="absolute inset-0 flex flex-col p-2">
                <div className="flex items-start gap-2">
                  <b className="flex-1 text-[10px] leading-tight text-white">O que mais falou com você hoje?</b>
                  <span className="flex h-7 w-7 items-center justify-center rounded bg-white text-black"><QrCode size={18} /></span>
                </div>
                <div className="mt-1.5 grid flex-1 grid-cols-3 gap-1">
                  {['Perdoar primeiro', 'Servir em casa', 'Orar mais', 'Paciência', 'Ouvir', 'Gratidão'].map((t, i) => (
                    <span key={t} className={`truncate rounded px-1 py-0.5 text-[7.5px] ${i === 0 ? 'bg-[#EAB308] text-black' : 'bg-white/10 text-white'}`}>{t}</span>
                  ))}
                </div>
              </div>
            </Slide>
          </Tela>
        ),
        dicas: [
          { Icone: MonitorPlay, texto: <>Sem slide próprio, o mural <b>é</b> o slide da pergunta. Se a pergunta tem slides, o mural vem logo depois: avance como um slide.</> },
          { Icone: Sparkles, texto: <>A resposta que você <b>destacar ★</b> aparece em evidência no telão; as escondidas não aparecem.</> },
          { Icone: Settings, texto: <>No painel ao vivo, <b>Mostrar o mural no telão</b> liga e desliga. Vale para perguntas abertas e atividades.</> },
        ],
      },
      {
        titulo: 'Quiz com placar',
        texto: 'Numa pergunta de múltipla escolha, a turma toca na opção e o gráfico sobe ao vivo.',
        tela: (
          <Tela>
            <div className="space-y-1">
              {([['Gastar', 2, '#E11D48'], ['Guardar', 7, '#2563EB'], ['Doar', 1, '#D97706']] as const).map(([o, n, c], i) => (
                <div key={o} className={`relative overflow-hidden rounded-md border px-2 py-1 ${i === 1 ? 'border-sucesso' : 'border-borda opacity-60'}`}>
                  <span className="absolute inset-y-0 left-0" style={{ width: `${n * 10}%`, background: `${c}40` }} />
                  <span className="relative flex items-center gap-1.5 text-[10px] font-bold"><span className="flex h-4 w-4 items-center justify-center rounded text-[8px] text-white" style={{ background: c }}>{'ABC'[i]}</span>{o}<span className="ml-auto font-mono">{n}</span></span>
                </div>
              ))}
            </div>
            <div className="mt-2 rounded-lg bg-superficie p-1.5 text-[9px]">
              <b className="flex items-center gap-1 text-tinta"><Trophy size={10} /> Placar</b>
              <span className="mt-0.5 flex justify-between"><span>1. Bia</span><span className="font-mono">1000</span></span>
              <span className="flex justify-between"><span>2. Lucas</span><span className="font-mono">940</span></span>
            </div>
          </Tela>
        ),
        dicas: [
          { Icone: ListChecks, texto: <>No bloco Pergunta, escolha <b>Múltipla escolha</b>, escreva as opções e toque na letra da certa.</> },
          { Icone: Check, texto: <>Na aula, toque em <b>Revelar resposta certa</b>: cada aluno vê se acertou.</> },
          { Icone: Trophy, texto: <>Acertou mais rápido, ganha mais pontos. O placar aparece no seu celular e no deles.</> },
        ],
      },
      {
        titulo: 'Tudo fica guardado',
        texto: 'Depois da aula, veja o que cada pessoa respondeu, por data, e baixe em planilha.',
        tela: (
          <Tela>
            <div className="rounded-lg border border-borda bg-superficie p-2">
              <b className="block text-[11px]">ter, 21 out · 19:30</b>
              <span className="text-[9px] text-texto-2">12 pessoas · 34 respostas</span>
            </div>
            <div className="mt-1.5 flex gap-1">
              <span className="rounded-md border border-borda px-1.5 py-0.5 text-[9px]"><Download size={9} className="inline" /> Planilha</span>
              <span className="rounded-md border border-borda px-1.5 py-0.5 text-[9px]"><FileDown size={9} className="inline" /> Folha do aluno</span>
            </div>
            <div className="mt-1.5 rounded-lg border border-borda p-1.5 text-[9px]"><b>Ana:</b> Um tênis caro que nunca usei</div>
          </Tela>
        ),
        dicas: [
          { Icone: MessagesSquare, texto: <>No editor do estudo, toque em <b>Respostas das aulas</b>.</> },
          { Icone: Download, texto: <><b>Planilha (CSV)</b> abre no Excel e no Google Planilhas.</> },
          { Icone: FileDown, texto: <>Sem celular na turma? A <b>Folha do aluno</b> em PDF continua lá, com espaço para responder.</> },
        ],
      },
      {
        titulo: 'Banco de perguntas',
        texto: 'Todas as perguntas e atividades dos seus estudos num lugar só, para reusar em outra aula.',
        tela: (
          <Tela>
            <div className="space-y-1.5">
              {['Qual compra você mais se arrependeu?', 'Que tipo de solo você tem sido?'].map((t) => (
                <div key={t} className="rounded-lg border border-borda bg-superficie p-2">
                  <Tag cor={AZUL}>Pergunta</Tag>
                  <b className="mt-1 block truncate text-[11px]">{t}</b>
                  <div className="mt-1 flex gap-1">
                    <span className="rounded-md border border-borda px-1.5 py-0.5 text-[9px]">Copiar</span>
                    <span className="rounded-md bg-acao px-1.5 py-0.5 text-[9px] font-bold text-acao-texto">+ Usar em estudo</span>
                  </div>
                </div>
              ))}
            </div>
          </Tela>
        ),
        dicas: [
          { Icone: MessagesSquare, texto: <>Fica no menu de baixo quando você está em <b>Estudos</b>.</> },
          { Icone: Plus, texto: <><b>Usar em estudo</b> coloca a pergunta no fim do estudo que você escolher.</> },
        ],
      },
    ],
  },

  /* ───────────── 4. Slides ───────────── */
  {
    id: 'slides', nome: 'Slides', resumo: 'Gerar, editar livremente, fontes, fotos e exportar', Icone: Presentation, cor: ROXO,
    passos: [
      {
        titulo: 'Slides prontos em um toque',
        texto: 'Em Slides, toque em "Gerar a partir dos tópicos" (ou dos blocos). Sai capa, versículos e um slide para cada parte.',
        tela: (
          <Tela>
            <div className="grid grid-cols-2 gap-1.5">
              <Slide><b className="px-2 text-center font-display text-[9px] text-white">MOLDADO POR DEUS</b></Slide>
              <Slide><span className="px-2 text-center font-escritura text-[7px] text-white">Acaso não entendem…</span></Slide>
              <Slide><span className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-black text-black" style={{ background: '#FFC107' }}>?</span></Slide>
              <Slide><span className="space-y-1 px-3">{[0, 1, 2].map((i) => <span key={i} className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-[#FFC107]" />{linha('2.5rem', 'bg-white/70')}</span>)}</span></Slide>
            </div>
          </Tela>
        ),
        dicas: [
          { Icone: LayoutTemplate, texto: <>14 <b>modelos editáveis</b>: título, lista, duas colunas, pergunta, linha do tempo, citação, número…</> },
          { Icone: Sparkles, texto: <>A prévia de cada modelo já usa o texto do seu slide.</> },
          { Icone: Hand, texto: <><b>Editar livremente</b> transforma o texto de qualquer slide em caixas soltas.</> },
        ],
      },
      {
        titulo: 'Edite tudo no slide',
        texto: 'Toque num elemento para selecionar. Arraste para mover, puxe as bolinhas para o tamanho e a de cima para girar.',
        tela: (
          <Tela>
            <Slide>
              <div className="relative rounded-sm border-2 border-[#FFC107] px-3 py-2">
                <b className="font-display text-[11px] text-white">SEU TÍTULO</b>
                {['-left-1 -top-1', '-right-1 -top-1', '-left-1 -bottom-1', '-right-1 -bottom-1'].map((p) => <span key={p} className={`absolute h-2 w-2 rounded-full bg-[#FFC107] ${p}`} />)}
                <span className="absolute -top-4 left-1/2 flex h-3 w-3 -translate-x-1/2 items-center justify-center rounded-full bg-[#FFC107] text-black"><RotateCw size={7} /></span>
              </div>
              <span className="absolute bottom-0 left-1/2 top-0 w-px bg-[#FF3EA5]" />
            </Slide>
            <div className="mt-2 flex gap-1 overflow-hidden">
              {[TypeIcon, ImagePlus, MoveRight, Layers].map((I, i) => <span key={i} className="flex flex-1 items-center justify-center rounded-md border border-borda py-1 text-texto-2"><I size={12} /></span>)}
            </div>
          </Tela>
        ),
        dicas: [
          { Icone: Plus, texto: <><b>Adicionar</b>: título, texto, foto, retângulo, círculo, triângulo, estrela, balão, seta, linha e ícones.</> },
          { Icone: Layers, texto: <>As <b>linhas rosa</b> ajudam a centralizar. Em <b>Organizar</b>: camadas, travar, ocultar, copiar estilo.</> },
          { Icone: Clock, texto: <>No computador: setas movem, <b>Delete</b> apaga, <b>Ctrl+D</b> duplica, <b>Ctrl+C/V</b> copia entre slides.</> },
        ],
      },
      {
        titulo: 'Texto do seu jeito',
        texto: 'Na aba Texto e na aba Estilo você muda fonte, tamanho, cores, faixa, contorno, sombra e espaçamento.',
        tela: (
          <Tela>
            <Slide>
              <span className="px-2 text-center">
                <span className="font-display text-[12px] font-extrabold uppercase text-white">Uma frase com </span>
                <span className="rounded-sm px-1 font-display text-[12px] font-extrabold uppercase text-black" style={{ background: '#FFC107' }}>força</span>
              </span>
            </Slide>
            <div className="mt-2 grid grid-cols-3 gap-1 text-[10px]">
              {[['Moderna', '"Plus Jakarta Sans Variable"'], ['Elegante', '"Playfair Display Variable"'], ['Manuscrita', '"Caveat Variable"']].map(([n, f]) => (
                <span key={n} className="truncate rounded-md border border-borda py-1 text-center" style={{ fontFamily: f }}>{n}</span>
              ))}
            </div>
          </Tela>
        ),
        dicas: [
          { Icone: Highlighter, texto: <>Escreva <b>*palavra*</b> entre asteriscos para pintar só ela com a cor de destaque.</> },
          { Icone: TypeIcon, texto: <>9 fontes, negrito, itálico, sublinhado, caixa alta e alinhamento.</> },
          { Icone: Palette, texto: <><b>Faixa</b> pinta atrás do texto; <b>contorno</b> e <b>sombra</b> ajudam em fundos claros.</> },
        ],
      },
      {
        titulo: 'Fotos e fundo',
        texto: 'Coloque fotos ao lado do texto, de fundo ou soltas no slide. O fundo pode ser cor, degradê ou foto.',
        tela: (
          <Tela>
            <div className="grid grid-cols-2 gap-1.5">
              <Slide fundo="#0A0A0A"><span className="h-full w-1/2 bg-[linear-gradient(170deg,#2B4A6F,#C27A3A_60%,#2a1a0c)]" /><span className="w-1/2 space-y-1 px-2">{linha('80%', 'bg-white/70')}{linha('50%', 'bg-[#FFC107]')}</span></Slide>
              <Slide fundo="linear-gradient(135deg,#1e1b4b,#db2777)"><b className="font-display text-[9px] text-white">DEGRADÊ</b></Slide>
              <Slide fundo="#0A0A0A"><span className="h-10 w-10 rounded-full bg-[linear-gradient(170deg,#2B4A6F,#C27A3A_60%,#2a1a0c)] ring-2 ring-white" /></Slide>
              <Slide fundo="#0A0A0A"><span className="h-10 w-14 rounded-sm bg-[linear-gradient(170deg,#777,#ccc_60%,#333)]" /></Slide>
            </div>
          </Tela>
        ),
        dicas: [
          { Icone: ImagePlus, texto: <><b>Disposição do slide</b>: foto à esquerda, à direita, em cima, de fundo ou só a foto.</> },
          { Icone: Palette, texto: <>Em Fundo, toque em <b>Degradê</b> e escolha as duas cores e a direção.</> },
          { Icone: Eye, texto: <>Fotos soltas: formato círculo, moldura, brilho, contraste, preto e branco e desfoque.</> },
        ],
      },
      {
        titulo: 'Exportar e importar',
        texto: 'Leve os slides para outro lugar, ou traga uma apresentação que você já tem.',
        tela: (
          <Tela>
            <div className="space-y-1.5">
              <Opcao Icone={Download} nome="PowerPoint (.pptx)" cor={ROXO} extra={<span className="text-[9px] text-texto-2">Com suas anotações nas notas</span>} />
              <Opcao Icone={FileDown} nome="PDF" cor={ROXO} extra={<span className="text-[9px] text-texto-2">Bom para mandar no WhatsApp</span>} />
              <Opcao Icone={Upload} nome="Importar" cor={ROXO} extra={<span className="text-[9px] text-texto-2">PDF, imagens ou .pptx</span>} />
            </div>
          </Tela>
        ),
        dicas: [
          { Icone: Download, texto: <><b>Exportar</b> fica no topo da tela de Slides.</> },
          { Icone: Check, texto: <><b>Aplicar a todos</b> copia o fundo e o estilo de um slide para a apresentação inteira.</> },
          { Icone: RefreshCw, texto: <>Errou? A seta <b>↶</b> no topo desfaz (Ctrl+Z no computador).</> },
        ],
      },
    ],
  },

  /* ───────────── 5. Telão ───────────── */
  {
    id: 'telao', nome: 'Telão', resumo: 'Projetar na TV e controlar pelo celular', Icone: MonitorPlay, cor: AZUL,
    passos: [
      {
        titulo: 'Telão pelo celular',
        texto: 'Abra o telão no computador ou na TV da igreja e controle tudo pelo celular enquanto prega ou dá aula.',
        tela: (
          <Tela>
            <div className="flex h-full items-center gap-3">
              <div className="flex-1">
                <div className="flex aspect-video flex-col items-center justify-center rounded-lg border-4 border-texto/20 bg-black">
                  <span className="text-[8px] font-bold uppercase tracking-wider text-white/60">Código</span>
                  <b className="font-mono text-base tracking-[0.2em] text-[#FFC107]">4 8 2 7</b>
                  <QrCode size={16} className="mt-1 text-white/70" />
                </div>
                <span className="mx-auto mt-1 block h-2 w-8 rounded-b bg-texto/20" />
              </div>
              <span className="flex h-20 w-11 flex-col items-center justify-center gap-1 rounded-xl border-2 border-texto/20 bg-superficie">
                <MonitorPlay size={16} className="text-tinta" />{linha('60%')}
              </span>
            </div>
          </Tela>
        ),
        dicas: [
          { Icone: MonitorPlay, texto: <>No computador da TV, abra o Pulpito e toque em <b>Telão</b> (fica no Acesso rápido).</> },
          { Icone: QrCode, texto: <>No modo pregação ou aula, toque no botão de <b>transmitir</b> e digite o código ou leia o QR.</> },
          { Icone: Hand, texto: <>Os slides mudam no telão quando você passa os tópicos. Dá para <b>apagar o telão</b> por um momento.</> },
        ],
      },
    ],
  },

  /* ───────────── 6. Bíblia e agenda ───────────── */
  {
    id: 'biblia', nome: 'Bíblia e agenda', resumo: 'Busca, versões, sem internet e lembretes', Icone: BookOpen, cor: LARANJA,
    passos: [
      {
        titulo: 'Bíblia sempre à mão',
        texto: 'ARA, ARC e NAA funcionando sem internet. Busque por referência ou por palavra.',
        tela: (
          <Tela>
            <div className="flex items-center gap-1.5 rounded-lg border border-borda bg-superficie px-2 py-1.5 text-[10px] text-texto-2"><Search size={11} /> “graça” ou Ef 2:8</div>
            <p className="mt-2 text-[11px] leading-relaxed">
              <sup className="font-bold text-tinta">8</sup> Porque pela <mark className="rounded bg-acao/30 px-0.5 text-texto">graça</mark> sois salvos, por meio da fé…
            </p>
            <div className="mt-2 flex items-center gap-1 rounded-lg bg-texto px-2 py-1 text-[9px] font-bold text-fundo">
              <Copy size={10} /> Copiar <span className="mx-1 opacity-40">|</span> <Highlighter size={10} /> Marcar <span className="mx-1 opacity-40">|</span> <Share2 size={10} />
            </div>
          </Tela>
        ),
        dicas: [
          { Icone: Hand, texto: <>Arraste para o lado para mudar de capítulo; <b>pinça</b> aumenta a letra.</> },
          { Icone: Highlighter, texto: <>Toque nos versículos para <b>selecionar</b>, copiar, compartilhar ou marcar.</> },
          { Icone: WifiOff, texto: <>Depois de abrir uma vez, a versão fica no aparelho e funciona sem internet.</> },
        ],
      },
      {
        titulo: 'Agenda com lembretes',
        texto: 'Marque onde e quando vai pregar ou dar aula, e ligue o compromisso à mensagem ou ao estudo.',
        tela: (
          <Tela>
            <div className="grid grid-cols-7 gap-1 text-center text-[9px]">
              {Array.from({ length: 14 }, (_, i) => (
                <span key={i} className={`rounded-md py-1 ${i === 9 ? 'bg-acao font-bold text-acao-texto' : 'text-texto-2'}`}>{i + 12}</span>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2 rounded-lg border border-borda bg-superficie p-2">
              <CalendarDays size={14} className="text-tinta" />
              <span><b className="block text-[10px]">Culto de jovens · sáb 19h</b><span className="text-[9px] text-texto-2">Moldado por Deus</span></span>
            </div>
            <p className="mt-1.5 text-[9px] text-texto-2">Lembrete 1 dia antes e 1 hora antes</p>
          </Tela>
        ),
        dicas: [
          { Icone: CalendarDays, texto: <>No editor, <b>Marcar na agenda</b> já cria o compromisso ligado.</> },
          { Icone: Clock, texto: <>O próximo compromisso aparece em destaque na tela inicial, com o botão de começar.</> },
          { Icone: RefreshCw, texto: <><b>Criar meu link de agenda</b> põe tudo no calendário do celular, com alertas.</> },
        ],
      },
    ],
  },

  /* ───────────── Organizar e trabalhar junto ───────────── */
  {
    id: 'juntos', nome: 'Organizar e trabalhar junto', resumo: 'Séries, modelos, histórico, lixeira e edição ao vivo', Icone: Users, cor: AZUL,
    passos: [
      {
        titulo: 'Séries e modelos',
        texto: 'Agrupe mensagens numa série (Aula 1, 2, 3…) e acompanhe o progresso. Transforme uma mensagem que deu certo em modelo.',
        tela: (
          <Tela>
            <div className="flex gap-1.5">
              {[['Fruto do Espírito', 3, 9], ['Romanos', 6, 12]].map(([n, d, t]) => (
                <div key={n as string} className="flex-1 rounded-lg border border-borda bg-superficie p-1.5">
                  <p className="text-[8px] font-extrabold uppercase tracking-wider text-texto-2">Série</p>
                  <b className="block truncate text-[10.5px]">{n}</b>
                  <span className="mt-1 block h-1 overflow-hidden rounded-full bg-superficie-2"><span className="block h-full rounded-full bg-acao" style={{ width: `${(Number(d) / Number(t)) * 100}%` }} /></span>
                  <span className="text-[8.5px] text-texto-2">{d} de {t} feitas</span>
                </div>
              ))}
            </div>
            <p className="mt-2 flex items-center gap-1 text-[9px] font-bold text-tinta"><LayoutTemplate size={10} /> Seus modelos</p>
            <div className="mt-1 space-y-1">
              {['Célula da minha igreja', 'Culto de jovens'].map((m) => <span key={m} className="block rounded-md border border-borda bg-superficie px-1.5 py-1 text-[9.5px] font-bold">{m}</span>)}
            </div>
          </Tela>
        ),
        dicas: [
          { Icone: Layers, texto: <>No editor, preencha <b>Série</b> e o número. Na tela inicial aparecem os cartões com o progresso.</> },
          { Icone: Check, texto: <>No último item do modo pregação, <b>Concluir</b> marca como feita. Também dá pelo menu <b>⋯</b> do editor.</> },
          { Icone: LayoutTemplate, texto: <>No menu <b>⋯</b>, <b>Salvar como modelo</b>. Ele aparece em <b>Criar novo › Seus modelos</b>.</> },
        ],
      },
      {
        titulo: 'Nada se perde',
        texto: 'Cada vez que alguém começa a editar, o app guarda uma cópia. E o que você exclui vai para a lixeira por 30 dias.',
        tela: (
          <Tela>
            <div className="space-y-1.5 border-l-2 border-borda pl-2.5">
              {['Hoje, 20:14 · você', 'Ontem, 09:02 · colaborador', 'Seg, 21:40 · você'].map((v, i) => (
                <div key={v} className="relative rounded-lg border border-borda bg-superficie px-2 py-1.5">
                  <span className={`absolute -left-[0.95rem] top-2.5 h-2 w-2 rounded-full ${i ? 'bg-borda' : 'bg-acao'}`} />
                  <b className="block text-[10px]">{v}</b>
                  <span className="text-[9px] text-texto-2">4 tópicos · 9 slides</span>
                </div>
              ))}
            </div>
            <span className="mt-2 inline-flex items-center gap-1 rounded-md bg-acao px-1.5 py-1 text-[9px] font-bold text-acao-texto"><RotateCw size={10} /> Restaurar esta versão</span>
          </Tela>
        ),
        dicas: [
          { Icone: Clock, texto: <>No editor, <b>⋯ › Histórico de versões</b>. Restaurar guarda antes o estado de agora.</> },
          { Icone: X, texto: <>Excluiu sem querer? Abra a <b>Lixeira</b> (no fim da lista ou em Ajustes) e toque em <b>Restaurar</b>.</> },
          { Icone: FileDown, texto: <>No mesmo menu <b>⋯</b>: <b>Baixar esboço em PDF</b>, com ou sem suas notas.</> },
        ],
      },
      {
        titulo: 'Editar junto',
        texto: 'Convide alguém para o projeto. Quando os dois estão com ele aberto, um vê o outro no topo e as mudanças chegam na hora.',
        tela: (
          <Tela>
            <div className="flex items-center gap-1.5 rounded-lg border border-borda bg-superficie px-2 py-1.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#38BDF8] text-[8px] font-extrabold text-[#062033]">AN</span>
              <span className="text-[10px] font-semibold text-texto-2">Ana está aqui</span>
              <span className="ml-auto text-[9px] text-texto-2">✓ Salvo</span>
            </div>
            <div className="mt-2 space-y-1.5">
              {['O amor que não desiste', 'Amar na prática'].map((t, i) => (
                <div key={t} className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 ${i ? 'border-[#38BDF8]' : 'border-borda'} bg-superficie`}>
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ouro-suave text-[10px] font-extrabold text-tinta">{i + 1}</span>
                  <span className="truncate text-[11px] font-bold">{t}</span>
                </div>
              ))}
            </div>
          </Tela>
        ),
        dicas: [
          { Icone: Share2, texto: <>No editor, <b>Convidar</b> cria um link ou código: para editar ou só para ver.</> },
          { Icone: Users, texto: <>Recebeu um convite? <b>Ajustes › Entrar com um convite</b>, ou pelo link.</> },
          { Icone: Eye, texto: <>Se os dois mexerem no <b>mesmo campo</b> ao mesmo tempo, vale o último. Combine quem edita o quê.</> },
        ],
      },
    ],
  },

  /* ───────────── 7. Ajustes ───────────── */
  {
    id: 'ajustes', nome: 'Ajustes', resumo: 'Cores, versão da Bíblia e atualizar o app', Icone: Settings, cor: ROSA,
    passos: [
      {
        titulo: 'Do seu jeito',
        texto: 'Em Ajustes você escolhe as cores, a versão da Bíblia e mantém o app atualizado.',
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
          { Icone: Palette, texto: <><b>4 temas</b> de cores; o modo pregação e o telão acompanham.</> },
          { Icone: BookOpen, texto: <>A <b>versão da Bíblia</b> fica salva na sua conta, em qualquer aparelho.</> },
          { Icone: RefreshCw, texto: <>Em <b>Atualizar o app</b> você vê se tem versão nova e o que mudou.</> },
        ],
      },
      {
        titulo: 'Sempre na versão mais nova',
        texto: 'Quando sai uma versão nova, um aviso aparece sozinho embaixo da tela. Toque em Atualizar: leva segundos e nada se perde.',
        tela: (
          <Tela>
            <div className="flex h-full flex-col gap-2">
              <div className="flex items-center gap-2 rounded-xl border border-acao/60 bg-superficie p-2 shadow-lg">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-acao text-acao-texto"><Sparkles size={14} /></span>
                <span className="min-w-0 flex-1"><b className="block text-[11px] leading-tight">Pulpito 2.0.0 chegou</b><span className="block text-[9px] text-texto-2">Leva segundos. Nada se perde.</span></span>
                <span className="rounded-md bg-acao px-1.5 py-1 text-[9px] font-bold text-acao-texto">Atualizar</span>
              </div>
              <div className="flex-1 rounded-xl border border-borda bg-superficie p-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: '#2E7D3226', color: '#2E7D32' }}><Check size={15} /></span>
                  <b className="text-[11px] leading-tight">Você está na versão mais nova</b>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-1 text-[9px]">
                  <span className="rounded-md bg-superficie-2 p-1"><span className="block text-texto-2">Neste aparelho</span><b>Versão 2.0.0</b></span>
                  <span className="rounded-md bg-superficie-2 p-1"><span className="block text-texto-2">Mais nova</span><b>Versão 2.0.0</b></span>
                </div>
                <div className="mt-2 space-y-1">{linha('85%')}{linha('60%')}</div>
              </div>
            </div>
          </Tela>
        ),
        dicas: [
          { Icone: Sparkles, texto: <>O aviso aparece sozinho. Tocou em <b>Depois</b>? Ele volta na próxima vez que abrir o app.</> },
          { Icone: Settings, texto: <>Em <b>Ajustes › Atualizar o app</b>: <b>Verificar de novo</b> e a lista de <b>Novidades</b>.</> },
          { Icone: RotateCw, texto: <>Algo estranho? Use <b>Fazer atualização completa</b>. No iPhone, se nada mudar, feche o app e abra de novo.</> },
        ],
      },
    ],
  },
]

const TOTAL = CAPITULOS.reduce((s, c) => s + c.passos.length, 0)

/* Onde estamos: no índice (cap = -1) ou num passo de um capítulo. "tudo" encadeia os capítulos. */
type Posicao = { cap: number; passo: number; tudo: boolean }
const INDICE: Posicao = { cap: -1, passo: 0, tudo: false }

export default function Tutorial() {
  // Não abre sozinho no primeiro acesso: o Início guia em 3 passos; o tutorial fica em Ajustes
  const [aberto, setAberto] = useState(false)
  const [pos, setPos] = useState<Posicao>(INDICE)
  const toque = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => aoPedirTutorial((capitulo) => {
    const c = CAPITULOS.findIndex((x) => x.id === capitulo)
    setPos(c >= 0 ? { cap: c, passo: 0, tudo: false } : INDICE)
    setAberto(true)
  }), [])

  const cap = pos.cap >= 0 ? CAPITULOS[pos.cap] : null
  const ultimoDoCap = !!cap && pos.passo === cap.passos.length - 1
  const ultimoDeTudo = ultimoDoCap && pos.cap === CAPITULOS.length - 1

  function avancar() {
    if (!cap) return
    if (!ultimoDoCap) setPos({ ...pos, passo: pos.passo + 1 })
    else if (pos.tudo && !ultimoDeTudo) setPos({ cap: pos.cap + 1, passo: 0, tudo: true })
  }
  function voltar() {
    if (!cap) return
    if (pos.passo > 0) setPos({ ...pos, passo: pos.passo - 1 })
    else if (pos.tudo && pos.cap > 0) setPos({ cap: pos.cap - 1, passo: CAPITULOS[pos.cap - 1].passos.length - 1, tudo: true })
    else setPos(INDICE)
  }
  function fechar() {
    marcarTutorialVisto()
    setAberto(false)
  }
  function comecar() {
    fechar()
    abrirCriar({})
  }

  useEffect(() => {
    if (!aberto) return
    function tecla(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') avancar()
      if (e.key === 'ArrowLeft') voltar()
      if (e.key === 'Escape') fechar()
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  })

  if (!aberto) return null
  const p = cap?.passos[pos.passo]
  // Número do passo contando todos os capítulos (para o "ver tudo")
  const passoGeral = cap ? CAPITULOS.slice(0, pos.cap).reduce((s, c) => s + c.passos.length, 0) + pos.passo + 1 : 0

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog" aria-modal="true" aria-labelledby="tutorial-titulo">
      <div className="flex max-h-[100dvh] min-h-[min(100dvh,42rem)] w-full max-w-md animate-subir flex-col overflow-hidden rounded-t-[1.75rem] border border-borda bg-superficie shadow-2xl sm:min-h-0 sm:animate-entrar sm:rounded-[1.75rem]"
        onTouchStart={(e) => { toque.current = { x: e.touches[0].clientX, y: e.touches[0].clientY } }}
        onTouchEnd={(e) => {
          const t = toque.current
          toque.current = null
          if (!t || !cap) return
          const dx = e.changedTouches[0].clientX - t.x
          const dy = e.changedTouches[0].clientY - t.y
          if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.4) return
          if (dx < 0) avancar(); else voltar()
        }}>

        {/* Topo: progresso do capítulo e fechar */}
        <div className="flex items-center gap-3 px-5 pt-4">
          {cap ? (
            <div className="flex flex-1 gap-1">
              {cap.passos.map((_, n) => (
                <button key={n} onClick={() => setPos({ ...pos, passo: n })} aria-label={`Passo ${n + 1}`}
                  className="h-1.5 flex-1 rounded-full transition-colors" style={{ background: n <= pos.passo ? cap.cor : 'var(--borda)' }} />
              ))}
            </div>
          ) : (
            <p className="rotulo flex-1">Tutorial · {CAPITULOS.length} capítulos</p>
          )}
          <button onClick={fechar} aria-label="Fechar tutorial"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-texto-2 hover:bg-superficie-2 hover:text-texto">
            <X size={18} />
          </button>
        </div>

        {/* Índice */}
        {!cap && (
          <div className="min-h-0 flex-1 animate-entrar overflow-y-auto px-5 pb-2 pt-3">
            <Marca icone className="text-2xl" />
            <h2 id="tutorial-titulo" className="mt-3 font-display text-2xl font-extrabold tracking-tight">Como usar o Pulpito</h2>
            <p className="mt-1 text-texto-2">Escolha um assunto ou veja tudo em sequência ({TOTAL} dicas, uns 3 minutos).</p>
            <ul className="mt-4 space-y-2">
              {CAPITULOS.map((c, n) => (
                <li key={c.id}>
                  <button onClick={() => setPos({ cap: n, passo: 0, tudo: false })}
                    className="flex w-full items-center gap-3 rounded-2xl border border-borda bg-fundo p-3 text-left transition-colors hover:border-acao">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: `${c.cor}24`, color: c.cor }}><c.Icone size={19} /></span>
                    <span className="min-w-0 flex-1">
                      <b className="block font-display">{n + 1}. {c.nome}</b>
                      <span className="block truncate text-sm text-texto-2">{c.resumo}</span>
                    </span>
                    <span className="shrink-0 text-xs font-bold text-texto-2">{c.passos.length}</span>
                    <ChevronRight size={18} className="shrink-0 text-texto-2" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Passo */}
        {cap && p && (
          <div key={`${pos.cap}-${pos.passo}`} className="min-h-0 flex-1 animate-entrar overflow-y-auto px-5 pb-2 pt-4">
            <div className="rounded-3xl p-4" style={{ background: 'var(--hero)' }}>{p.tela}</div>
            <p className="mt-5 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em]" style={{ color: cap.cor }}>
              <cap.Icone size={14} /> {cap.nome} · {pos.passo + 1} de {cap.passos.length}
              {pos.tudo && <span className="ml-auto font-semibold normal-case tracking-normal text-texto-2">{passoGeral}/{TOTAL}</span>}
            </p>
            <h2 id="tutorial-titulo" className="mt-1 font-display text-2xl font-extrabold tracking-tight">{p.titulo}</h2>
            <p className="mt-1.5 text-texto-2">{p.texto}</p>
            <ul className="mt-4 space-y-2.5">
              {p.dicas.map(({ Icone, texto }, n) => (
                <li key={n} className="flex items-start gap-3 text-sm">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ background: `${cap.cor}24`, color: cap.cor }}><Icone size={15} /></span>
                  <span className="pt-1">{texto}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Botões ao alcance do polegar */}
        <div className="flex gap-2 border-t border-borda px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
          {!cap ? (
            <>
              <button onClick={fechar} className="botao-fantasma px-3">Agora não</button>
              <button onClick={() => setPos({ cap: 0, passo: 0, tudo: true })} className="botao-primario flex-1">
                Ver tudo <ArrowRight size={18} />
              </button>
            </>
          ) : (
            <>
              <button onClick={voltar} aria-label="Voltar" className="botao-secundario px-3"><ArrowLeft size={18} /></button>
              {ultimoDoCap && (!pos.tudo || ultimoDeTudo) ? (
                <>
                  <button onClick={() => setPos(INDICE)} className="botao-secundario flex-1 px-3">Capítulos</button>
                  <button onClick={ultimoDeTudo ? comecar : fechar} className="botao-primario flex-[1.2] px-3">
                    {ultimoDeTudo ? <><Plus size={18} strokeWidth={2.5} /> Começar</> : <><Check size={18} /> Entendi</>}
                  </button>
                </>
              ) : (
                <button onClick={avancar} className="botao-primario min-w-0 flex-1">
                  <span className="truncate">{ultimoDoCap ? `Próximo: ${CAPITULOS[pos.cap + 1].nome}` : 'Próximo'}</span> <ArrowRight size={18} className="shrink-0" />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
