import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, ChevronLeft, MessageCircle, Sparkles } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { usePlano } from '../lib/plano'
import { nomeDoUsuario } from '../lib/usuario'
import { AUTOR } from '../lib/autor'
import { GRATUITO_INCLUI, PRECOS, RECURSOS_PREMIUM, diasRestantes, emTeste, formatarPreco, linkAssinar } from '../lib/planoInfo'

export default function Assinatura() {
  const { sessao } = useAuth()
  const { plano } = usePlano()
  const [periodo, setPeriodo] = useState<'mensal' | 'anual'>('anual')
  const dias = diasRestantes(plano.valida_ate)
  const link = linkAssinar(periodo, nomeDoUsuario(sessao?.user), sessao?.user.email ?? null)

  const situacao = !plano.premium
    ? { titulo: 'Você está no Gratuito', texto: `${plano.mensagens_ativas} de ${plano.limite} mensagens em uso.` }
    : emTeste(plano)
      ? { titulo: 'Você está no período de teste', texto: dias > 1 ? `Faltam ${dias} dias de Premium.` : 'Seu teste termina hoje.' }
      : { titulo: 'Você é Premium', texto: plano.valida_ate ? `Válido até ${new Date(plano.valida_ate).toLocaleDateString('pt-BR')}.` : 'Sem data de vencimento. Obrigado!' }

  return (
    <div className="mx-auto max-w-2xl px-3 pb-16 pt-2 sm:px-4 md:px-8 md:pt-10">
      <Link to="/ajustes" className="botao-fantasma -ml-2 px-2"><ChevronLeft size={20} /> Ajustes</Link>

      <section className="escuro relative mt-4 overflow-hidden rounded-3xl border border-borda p-5 text-texto shadow-cartao sm:p-7" style={{ background: 'var(--hero)' }}>
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-acao/20 blur-3xl" />
        <div className="relative">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-tinta"><Sparkles size={13} /> Pulpito Premium</p>
          <h1 className="mt-3 font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">{situacao.titulo}</h1>
          <p className="mt-2 text-texto-2">{situacao.texto}</p>
        </div>
      </section>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <section className="cartao p-5">
          <h2 className="font-display text-lg font-bold">Gratuito</h2>
          <p className="mt-1 text-2xl font-extrabold">R$ 0</p>
          <ul className="mt-4 space-y-2 text-sm">
            {GRATUITO_INCLUI.map((t) => <li key={t} className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-texto-2" /> {t}</li>)}
          </ul>
        </section>

        <section className="cartao border-acao p-5 ring-4 ring-acao/15">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-lg font-bold">Premium</h2>
            <div role="radiogroup" aria-label="Período" className="flex rounded-xl bg-superficie-2 p-0.5 text-xs font-bold">
              {(['mensal', 'anual'] as const).map((p) => (
                <button key={p} role="radio" aria-checked={periodo === p} onClick={() => setPeriodo(p)}
                  className={`rounded-lg px-2.5 py-1 ${periodo === p ? 'bg-acao text-acao-texto' : 'text-texto-2'}`}>{p === 'mensal' ? 'Mensal' : 'Anual'}</button>
              ))}
            </div>
          </div>
          <p className="mt-1 text-2xl font-extrabold">
            {formatarPreco(PRECOS[periodo])}<span className="text-sm font-semibold text-texto-2">/{periodo === 'mensal' ? 'mês' : 'ano'}</span>
          </p>
          {periodo === 'anual' && <p className="text-xs font-semibold text-tinta">Equivale a {formatarPreco(PRECOS.anual / 12)} por mês</p>}
          <ul className="mt-4 space-y-2 text-sm">
            <li className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-tinta" /> Tudo do Gratuito</li>
            {RECURSOS_PREMIUM.map((r) => <li key={r.id} className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-tinta" /> {r.nome}</li>)}
          </ul>
          {!plano.premium || emTeste(plano) ? (
            link ? (
              <a href={link} target="_blank" rel="noopener" className="botao-primario mt-5 w-full"><MessageCircle size={18} /> Assinar pelo WhatsApp</a>
            ) : (
              <a href={AUTOR.site} target="_blank" rel="noopener" className="botao-primario mt-5 w-full">Falar com o autor para assinar</a>
            )
          ) : (
            <p className="mt-5 flex items-center gap-2 text-sm font-semibold text-tinta"><Check size={16} /> Plano ativo</p>
          )}
          <p className="mt-3 text-xs text-texto-2">Pagamento por Pix. A ativação é feita em até um dia útil, e você recebe a confirmação por e-mail.</p>
        </section>
      </div>

      <p className="mt-6 text-center text-sm text-texto-2">
        Suas mensagens são suas. Se o Premium acabar, você continua lendo tudo e pode <Link to="/ajustes" className="font-semibold text-tinta underline-offset-4 hover:underline">baixar seus dados</Link> quando quiser.
      </p>
    </div>
  )
}
