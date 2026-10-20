import { QRCodeSVG } from 'qrcode.react'
import { Check, Copy, Eye, EyeOff, Radio, Star, Trophy, Users, X } from 'lucide-react'
import { useState } from 'react'
import { CORES_OPCOES, LETRAS, ehMultipla, linkResponder, useAulaAoVivo } from '../lib/aoVivo'
import type { Topico } from '../lib/tipos'

export type AoVivo = ReturnType<typeof useAulaAoVivo>


/* Painel para abrir, acompanhar e encerrar as respostas ao vivo */
export function PainelAoVivo({ ao, onFechar }: { ao: AoVivo; onFechar: () => void }) {
  const [copiado, setCopiado] = useState(false)
  const [abrindo, setAbrindo] = useState(false)
  const [anonima, setAnonima] = useState(true)
  const aula = ao.aula
  const link = aula ? linkResponder(aula.codigo) : ''

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-6" onClick={onFechar}
      role="dialog" aria-modal="true" aria-labelledby="ao-vivo-titulo">
      <div onClick={(e) => e.stopPropagation()}
        className="max-h-[100dvh] w-full max-w-md animate-subir overflow-y-auto rounded-t-[1.75rem] border border-borda bg-superficie p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-[1.75rem]">
        <div className="flex items-start justify-between gap-3">
          <h2 id="ao-vivo-titulo" className="flex items-center gap-2 font-display text-xl font-extrabold">
            <Radio size={20} className={aula ? 'text-perigo' : 'text-texto-2'} /> Respostas ao vivo
          </h2>
          <button onClick={onFechar} aria-label="Fechar" className="flex h-9 w-9 items-center justify-center rounded-xl text-texto-2 hover:bg-superficie-2"><X size={18} /></button>
        </div>

        {!aula ? (
          <>
            <p className="mt-2 text-texto-2">
              A turma entra pelo celular com um código e responde as perguntas e atividades.
              As respostas chegam aqui na hora e ficam guardadas no estudo.
            </p>
            <ul className="mt-4 space-y-2 text-sm">
              <li className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-sucesso" /> Pergunta aberta vira um mural de respostas.</li>
              <li className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-sucesso" /> Pergunta com opções vira quiz, com gráfico e placar.</li>
              <li className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-sucesso" /> Ninguém precisa instalar nada nem criar conta.</li>
            </ul>
            <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-borda p-3">
              <input type="checkbox" checked={anonima} onChange={(e) => setAnonima(e.target.checked)} className="mt-1 h-5 w-5 accent-[var(--acao)]" />
              <span>
                <b className="block">Respostas anônimas (sigilo)</b>
                <span className="text-sm text-texto-2">
                  {anonima
                    ? 'Não pergunta o nome. Ninguém vê quem respondeu, nem você, e nada é guardado com o nome.'
                    : 'Pede o nome de cada pessoa e mostra quem respondeu.'}
                </span>
              </span>
            </label>
            {ao.erro && <p role="alert" className="mt-4 rounded-xl bg-aviso/15 p-3 text-sm">{ao.erro}</p>}
            <button onClick={async () => { setAbrindo(true); await ao.abrir(anonima); setAbrindo(false) }} disabled={abrindo}
              className="botao-primario mt-5 w-full"><Radio size={18} /> {abrindo ? 'Abrindo…' : 'Abrir respostas ao vivo'}</button>
          </>
        ) : (
          <>
            <div className="mt-4 flex items-center gap-4">
              <div className="rounded-2xl bg-white p-2.5"><QRCodeSVG value={link} size={112} /></div>
              <div className="min-w-0">
                <p className="rotulo">Código</p>
                <p className="font-mono text-4xl font-bold tracking-[0.15em]">{aula.codigo}</p>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-texto-2"><Users size={15} /> {ao.participantes} {ao.participantes === 1 ? 'pessoa' : 'pessoas'}</p>
              </div>
            </div>
            <button onClick={async () => { try { await navigator.clipboard.writeText(link); setCopiado(true); setTimeout(() => setCopiado(false), 1800) } catch { /* sem permissão */ } }}
              className="mt-3 flex w-full items-center gap-2 rounded-xl border border-borda bg-fundo px-3 py-2.5 text-left text-sm">
              <span className="min-w-0 flex-1 truncate text-texto-2">{link.replace(/^https?:\/\//, '')}</span>
              {copiado ? <Check size={16} className="shrink-0 text-sucesso" /> : <Copy size={16} className="shrink-0 text-texto-2" />}
            </button>
            <p className="mt-2 text-xs text-texto-2">Peça para abrirem a câmera no QR, ou entrarem no endereço e digitarem o código.</p>

            <p className="mt-3 text-xs font-bold text-texto-2">{ao.anonimo ? 'Modo anônimo: o nome não é pedido.' : 'A turma informa o nome ao entrar.'}</p>

            <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-borda p-3">
              <input type="checkbox" checked={ao.muralNoTelao} onChange={(e) => ao.setMuralNoTelao(e.target.checked)} className="mt-1 h-5 w-5 accent-[var(--acao)]" />
              <span>
                <b className="block">Mostrar o mural no telão</b>
                <span className="text-sm text-texto-2">
                  {ao.muralNoTelao ? 'Nas perguntas abertas e atividades, o telão mostra a pergunta junto com o QR Code, o código e as respostas chegando.' : 'O telão continua mostrando só o slide normal.'}
                </span>
              </span>
            </label>

            <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-2xl border border-borda p-3">
              <input type="checkbox" checked={aula.mostrar_respostas} onChange={ao.alternarMostrar} className="mt-1 h-5 w-5 accent-[var(--acao)]" />
              <span>
                <b className="block">Alunos veem as respostas dos outros</b>
                <span className="text-sm text-texto-2">
                  {aula.mostrar_respostas ? 'Cada um vê o mural da turma no celular.' : 'Cada um vê só a própria resposta. Na múltipla escolha, o resultado aparece quando você revelar.'}
                </span>
              </span>
            </label>

            <button onClick={async () => { await ao.encerrar(); onFechar() }} className="botao-secundario mt-4 w-full hover:text-perigo">
              Encerrar respostas
            </button>
            <p className="mt-2 text-center text-xs text-texto-2">As respostas continuam guardadas no estudo, em Respostas.</p>
          </>
        )}
      </div>
    </div>
  )
}

/* Faixa curta no topo da aula com o código, para a turma ver */
export function FaixaAoVivo({ ao, onAbrir }: { ao: AoVivo; onAbrir: () => void }) {
  if (!ao.aula) return null
  return (
    <button onClick={onAbrir} className="mx-auto mt-2 flex max-w-3xl items-center gap-2 rounded-full border border-perigo/40 bg-perigo/10 px-3 py-1 text-xs font-bold">
      <span className="h-2 w-2 animate-pulse rounded-full bg-perigo" /> AO VIVO · código <span className="font-mono tracking-wider">{ao.aula.codigo}</span>
      <span className="text-texto-2">· {ao.participantes} {ao.participantes === 1 ? 'pessoa' : 'pessoas'}</span>
    </button>
  )
}

/* Respostas do bloco atual: mural (pergunta aberta/atividade) ou gráfico + placar (múltipla escolha) */
export function RespostasAoVivo({ ao, bloco }: { ao: AoVivo; bloco: Topico }) {
  const rs = ao.respostasDoBloco
  const multipla = ehMultipla(bloco)

  if (multipla) {
    const opcoes = bloco.extra!.opcoes!.filter((o) => o.trim())
    const total = rs.filter((r) => r.opcao !== null).length || 1
    return (
      <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <p className="rotulo flex items-center gap-1.5"><span className="h-2 w-2 animate-pulse rounded-full bg-perigo" /> {rs.length} {rs.length === 1 ? 'resposta' : 'respostas'}</p>
          <button onClick={ao.alternarRevelar} className={ao.revelada ? 'botao-secundario py-1.5 text-sm' : 'botao-primario py-1.5 text-sm'}>
            {ao.revelada ? 'Esconder resultado' : 'Revelar resposta certa'}
          </button>
        </div>
        {opcoes.map((op, i) => {
          const n = rs.filter((r) => r.opcao === i).length
          const certa = bloco.extra?.correta === i
          return (
            <div key={i} className={`relative overflow-hidden rounded-xl border p-3 ${ao.revelada && certa ? 'border-sucesso' : 'border-borda'} ${ao.revelada && !certa ? 'opacity-50' : ''}`}>
              <div className="absolute inset-y-0 left-0 transition-[width] duration-500" style={{ width: `${(n / total) * 100}%`, background: `${CORES_OPCOES[i]}33` }} />
              <div className="relative flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-extrabold text-white" style={{ background: CORES_OPCOES[i] }}>{LETRAS[i]}</span>
                <span className="min-w-0 flex-1 font-semibold">{op}</span>
                {ao.revelada && certa && <Check size={20} className="text-sucesso" />}
                <span className="font-mono text-lg font-bold tabular-nums">{n}</span>
              </div>
            </div>
          )
        })}
        {ao.revelada && !ao.anonimo && ao.placar.length > 0 && (
          <div className="rounded-2xl bg-superficie p-3">
            <p className="rotulo flex items-center gap-1.5"><Trophy size={14} className="text-tinta" /> Placar</p>
            <ol className="mt-2 space-y-1.5">
              {ao.placar.slice(0, 5).map((p, i) => (
                <li key={p.nome + i} className="flex items-center gap-3">
                  <span className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-extrabold ${i === 0 ? 'bg-acao text-acao-texto' : 'bg-superficie-2'}`}>{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate font-semibold">{p.nome}</span>
                  <span className="font-mono font-bold tabular-nums">{p.pontos}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
      <p className="rotulo flex items-center gap-1.5"><span className="h-2 w-2 animate-pulse rounded-full bg-perigo" /> {rs.length} {rs.length === 1 ? 'resposta' : 'respostas'}</p>
      {rs.length === 0 && <p className="rounded-xl border border-dashed border-borda p-4 text-center text-texto-2">As respostas da turma aparecem aqui.</p>}
      <div className="grid gap-2 sm:grid-cols-2">
        {[...rs].sort((a, b) => Number(b.destaque) - Number(a.destaque)).map((r) => (
          <div key={r.id} className={`rounded-xl border p-3 ${r.destaque ? 'border-acao bg-ouro-suave' : 'border-borda bg-superficie'} ${r.oculta ? 'opacity-40' : ''}`}>
            <div className="flex items-center gap-2">
              <b className="min-w-0 flex-1 truncate text-sm">{ao.anonimo ? '' : r.nome}</b>
              <button onClick={() => ao.marcar(r, { destaque: !r.destaque })} aria-label={r.destaque ? 'Tirar destaque' : 'Destacar'} title="Destacar"
                className={`rounded-lg p-1 ${r.destaque ? 'text-tinta' : 'text-texto-2'}`}><Star size={15} fill={r.destaque ? 'currentColor' : 'none'} /></button>
              <button onClick={() => ao.marcar(r, { oculta: !r.oculta })} aria-label={r.oculta ? 'Mostrar' : 'Esconder da turma'} title="Esconder da turma"
                className="rounded-lg p-1 text-texto-2">{r.oculta ? <EyeOff size={15} /> : <Eye size={15} />}</button>
            </div>
            <p className="mt-1 whitespace-pre-wrap break-words">{r.texto}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
