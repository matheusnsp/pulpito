import { useState } from 'react'
import { LogOut } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { sairDaConta } from '../lib/conta'
import { lerTema, salvarTema, type Tema } from '../lib/tema'
import { VERSOES, type VersaoId } from '../lib/biblia'
import { emailParaUsuario, nomeDeExibicao } from '../lib/usuario'

const TEMAS: { valor: Tema; rotulo: string }[] = [
  { valor: 'sistema', rotulo: 'Automático' },
  { valor: 'claro', rotulo: 'Claro' },
  { valor: 'escuro', rotulo: 'Escuro' },
]

export default function Ajustes() {
  const { sessao } = useAuth()
  const usuario = emailParaUsuario(sessao?.user.email)
  const nome = nomeDeExibicao(usuario)
  const iniciais = nome.split(' ').map((p) => p[0]).slice(0, 2).join('')
  const [tema, setTema] = useState<Tema>(lerTema)
  const [versao, setVersao] = useState<VersaoId>(
    () => (localStorage.getItem('pulpito-versao') as VersaoId) || 'ARA'
  )
  const [saindo, setSaindo] = useState(false)

  function mudarTema(t: Tema) {
    setTema(t)
    salvarTema(t)
  }

  function mudarVersao(v: VersaoId) {
    setVersao(v)
    localStorage.setItem('pulpito-versao', v)
  }

  async function sair() {
    setSaindo(true)
    await sairDaConta()
  }

  return (
    <div className="mx-auto max-w-xl space-y-10 px-4 py-6 md:py-10">
      <h1 className="font-escritura text-3xl font-semibold">Ajustes</h1>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Conta</h2>
        <div className="flex items-center gap-4 rounded-2xl border border-borda bg-superficie p-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-acao font-semibold text-acao-texto">
            {iniciais}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{nome}</p>
            <p className="truncate text-sm text-texto-2">{usuario}</p>
          </div>
          <button onClick={sair} disabled={saindo} className="botao-fantasma">
            <LogOut size={18} />
            {saindo ? 'Saindo…' : 'Sair'}
          </button>
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Aparência</h2>
          <p className="text-sm text-texto-2">O modo pregação e o telão são sempre escuros.</p>
        </div>
        <div role="radiogroup" aria-label="Tema" className="inline-flex rounded-xl border border-borda bg-superficie p-1">
          {TEMAS.map((t) => (
            <button key={t.valor} role="radio" aria-checked={tema === t.valor} onClick={() => mudarTema(t.valor)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${tema === t.valor
                ? 'bg-acao text-acao-texto'
                : 'text-texto-2 hover:text-texto'}`}>
              {t.rotulo}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Bíblia</h2>
          <p className="text-sm text-texto-2">Versão usada no editor, no modo pregação e no telão.</p>
        </div>
        <select value={versao} onChange={(e) => mudarVersao(e.target.value as VersaoId)} className="campo">
          {VERSOES.map((v) => <option key={v.id} value={v.id}>{v.id} · {v.nome}</option>)}
        </select>
      </section>
    </div>
  )
}