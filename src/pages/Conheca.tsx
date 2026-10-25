import { Link, Navigate } from 'react-router-dom'
import { BookOpen, Check, GraduationCap, MessagesSquare, MonitorPlay, NotebookPen, PenLine, Sparkles, Timer } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { AUTOR } from '../lib/autor'
import { DIAS_TESTE, GRATUITO_INCLUI, PRECOS, RECURSOS_PREMIUM, formatarPreco } from '../lib/planoInfo'
import Marca from '../components/Marca'
import Creditos from '../components/Creditos'

/* Página pública: o que o Pulpito é, para quem, como funciona e quanto custa. Quem já está logado vai para o app. */
export default function Conheca() {
  const { sessao, carregando } = useAuth()
  if (!carregando && sessao) return <Navigate to="/" replace />

  const passos = [
    { n: 1, t: 'Escreva o que vai dizer', d: 'Na pregação, o texto base e os tópicos, com o versículo aparecendo por extenso. Na aula, os blocos: explicação, pergunta, atividade, lista.' },
    { n: 2, t: 'Deixe o app montar o resto', d: 'Slides em um toque, esboço para compartilhar, folha impressa para a turma e perguntas prontas para o celular dos alunos.' },
    { n: 3, t: 'Toque em Pregar ou Dar aula', d: 'Cronômetro que avisa quando o tempo aperta, próximo passo à vista e telão sincronizado pelo celular.' },
  ]
  const recursos = [
    { Icone: NotebookPen, t: 'Pregação em tópicos', d: 'Texto base, pontos da mensagem e versículos ligados ao texto. Célula, EBD, devocional e discipulado também.' },
    { Icone: PenLine, t: 'Ou do seu jeito, no formato Livre', d: 'Um texto corrido, do zero. Uma linha com # vira uma parte; na pregação, [Jo 3:16] traz o versículo.' },
    { Icone: GraduationCap, t: 'Aulas sobre qualquer assunto', d: 'Curso, palestra ou treinamento montados em blocos: explicação, definição, lista, pergunta, atividade, imagem e link.' },
    { Icone: Timer, t: 'Modo pregação e modo aula', d: 'Letra grande, cronômetro, tempo por item, próximo passo à vista e tela sempre acesa.' },
    { Icone: MonitorPlay, t: 'Slides e telão', d: 'Slides gerados em um toque, importação de PowerPoint e projeção na TV controlada pelo celular.' },
    { Icone: MessagesSquare, t: 'Respostas ao vivo', d: 'A turma entra com um código e responde pelo celular: mural, quiz com placar e tudo guardado em planilha.' },
    { Icone: BookOpen, t: 'Bíblia offline', d: 'ARA, ARC e NAA no aparelho, com busca. Funciona sem internet.' },
  ]
  const perguntas = [
    { p: 'Funciona sem internet?', r: 'A Bíblia fica no aparelho e o app abre offline. As mensagens sincronizam quando a conexão volta.' },
    { p: 'Preciso instalar alguma coisa?', r: 'Não. Abre no navegador e, se quiser, você adiciona à tela inicial do celular como um app.' },
    { p: 'Serve para aula fora da igreja?', r: 'Sim. O lado Estudos monta aulas de curso, palestras e treinamentos sobre qualquer assunto, com perguntas e atividades para a turma responder pelo celular.' },
    { p: 'E se eu parar de pagar?', r: 'Nada é apagado. Você continua lendo tudo e pode baixar seus dados a qualquer hora.' },
  ]

  return (
    <div className="min-h-full bg-fundo text-texto">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <Marca icone />
        <nav className="flex items-center gap-2">
          <Link to="/login" className="botao-fantasma px-3 text-sm">Entrar</Link>
          <Link to="/criar-conta" className="botao-primario px-3 py-2 text-sm">Criar conta grátis</Link>
        </nav>
      </header>

      <main>
        <section className="mx-auto max-w-5xl px-5 pb-12 pt-6 sm:pt-12">
          <div className="escuro relative overflow-hidden rounded-[2rem] border border-borda p-6 text-texto shadow-cartao sm:p-12" style={{ background: 'var(--hero)' }}>
            <div aria-hidden className="pointer-events-none absolute -right-20 -top-28 h-80 w-80 rounded-full bg-acao/20 blur-3xl" />
            <div className="relative max-w-2xl">
              <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-tinta"><Sparkles size={13} /> Para quem prega e para quem ensina</p>
              <h1 className="mt-4 font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
                Prepare, apresente e projete <span className="text-acao">sem perder o fio.</span>
              </h1>
              <p className="mt-5 text-lg text-texto-2 sm:text-xl">
                Uma pregação de domingo ou uma aula de curso: o Pulpito organiza o que você vai dizer, monta os slides, cronometra e manda para o telão. A turma responde pelo celular. Tudo no seu.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link to="/criar-conta" className="botao-primario">Criar conta grátis</Link>
                <Link to="/login" className="botao-secundario">Já tenho conta</Link>
              </div>
              <p className="mt-4 text-sm text-texto-2">{DIAS_TESTE} dias de Premium para experimentar tudo. Sem cartão.</p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-5 py-10">
          <h2 className="font-display text-2xl font-extrabold sm:text-3xl">Três toques até pregar</h2>
          <ol className="mt-6 grid gap-4 sm:grid-cols-3">
            {passos.map((p) => (
              <li key={p.n} className="cartao p-5">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-acao font-display font-extrabold text-acao-texto">{p.n}</span>
                <b className="mt-3 block font-display text-lg">{p.t}</b>
                <p className="mt-1 text-sm text-texto-2">{p.d}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mx-auto max-w-5xl px-5 py-10">
          <h2 className="font-display text-2xl font-extrabold sm:text-3xl">O que vem junto</h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {recursos.map(({ Icone, t, d }) => (
              <li key={t} className="cartao flex gap-4 p-5">
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${Icone === GraduationCap ? 'bg-[#14B8A6]/15 text-[#14B8A6]' : 'bg-ouro-suave text-tinta'}`}><Icone size={22} /></span>
                <span><b className="block font-display">{t}</b><span className="text-sm text-texto-2">{d}</span></span>
              </li>
            ))}
          </ul>
        </section>

        <section id="planos" className="mx-auto max-w-5xl px-5 py-10">
          <h2 className="font-display text-2xl font-extrabold sm:text-3xl">Planos</h2>
          <p className="mt-1 text-texto-2">Comece de graça. Pague só se o Pulpito virar parte da sua semana.</p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="cartao p-6">
              <h3 className="font-display text-lg font-bold">Gratuito</h3>
              <p className="mt-1 text-3xl font-extrabold">R$ 0</p>
              <ul className="mt-4 space-y-2 text-sm">
                {GRATUITO_INCLUI.map((t) => <li key={t} className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-texto-2" /> {t}</li>)}
              </ul>
            </div>
            <div className="cartao border-acao p-6 ring-4 ring-acao/15">
              <h3 className="font-display text-lg font-bold">Premium</h3>
              <p className="mt-1 text-3xl font-extrabold">{formatarPreco(PRECOS.mensal)}<span className="text-sm font-semibold text-texto-2">/mês</span></p>
              <p className="text-sm font-semibold text-tinta">ou {formatarPreco(PRECOS.anual)} por ano</p>
              <ul className="mt-4 space-y-2 text-sm">
                <li className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-tinta" /> Tudo do Gratuito</li>
                {RECURSOS_PREMIUM.map((r) => <li key={r.id} className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-tinta" /> {r.nome}</li>)}
              </ul>
              <Link to="/criar-conta" className="botao-primario mt-6 w-full">Experimentar {DIAS_TESTE} dias grátis</Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-5 py-10">
          <h2 className="font-display text-2xl font-extrabold sm:text-3xl">Perguntas comuns</h2>
          <dl className="mt-6 divide-y divide-borda">
            {perguntas.map((q) => (
              <div key={q.p} className="py-4">
                <dt className="font-display font-bold">{q.p}</dt>
                <dd className="mt-1 text-sm text-texto-2">{q.r}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mx-auto max-w-5xl px-5 pb-16 pt-6 text-center">
          <h2 className="font-display text-2xl font-extrabold sm:text-3xl">Sua próxima mensagem, ou aula, começa aqui</h2>
          <Link to="/criar-conta" className="botao-primario mt-6">Criar conta grátis</Link>
        </section>
      </main>

      <footer className="border-t border-borda">
        <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-3 px-5 py-6 text-sm text-texto-2 sm:flex-row sm:items-center">
          <Creditos />
          <p>© {new Date().getFullYear()} {AUTOR.nome}. <a href={AUTOR.site} target="_blank" rel="noopener" className="underline-offset-4 hover:underline">{AUTOR.site.replace('https://www.', '')}</a></p>
        </div>
      </footer>
    </div>
  )
}
