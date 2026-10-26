import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Check, ChevronDown, ChevronLeft, Download, Radio, Trash2, Trophy, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { CORES_OPCOES, LETRAS, aceitaResposta, calcularPlacar, ehMultipla, type Aula, type Resposta } from '../lib/aoVivo'
import { defBloco } from '../lib/blocos'
import type { Mensagem, Topico } from '../lib/tipos'

/*
  Respostas guardadas de cada aula ao vivo de um estudo:
  por aula (data), por bloco, com quem respondeu o quê, placar e exportação em planilha (CSV).
*/

const quando = (iso: string) => new Date(iso).toLocaleString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

export default function RespostasEstudo() {
  const { id } = useParams()
  const [mensagem, setMensagem] = useState<Mensagem | null>(null)
  const [blocos, setBlocos] = useState<Topico[]>([])
  const [aulas, setAulas] = useState<Aula[] | null>(null)
  const [respostas, setRespostas] = useState<Resposta[]>([])
  const [aberta, setAberta] = useState<string | null>(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    let ativo = true
    Promise.all([
      supabase.from('mensagens').select('*').eq('id', id!).maybeSingle(),
      supabase.from('topicos').select('*').eq('mensagem_id', id!).order('ordem'),
      supabase.from('aulas_ao_vivo').select('*').eq('mensagem_id', id!).order('criado_em', { ascending: false }),
    ]).then(async ([m, t, a]) => {
      if (!ativo) return
      setMensagem((m.data as Mensagem) ?? null)
      setBlocos((t.data as Topico[]) ?? [])
      if (a.error) { setErro('Não foi possível carregar. Se ainda não rodou o arquivo supabase/aula-ao-vivo.sql no Supabase, rode e tente de novo.'); setAulas([]); return }
      const lista = (a.data as Aula[]) ?? []
      setAulas(lista)
      setAberta(lista[0]?.id ?? null)
      if (lista.length) {
        const r = await supabase.from('respostas').select('*').in('aula_id', lista.map((x) => x.id)).order('criado_em')
        if (ativo) setRespostas((r.data as Resposta[]) ?? [])
      }
    })
    return () => { ativo = false }
  }, [id])

  async function excluirAula(a: Aula) {
    if (!confirm(`Apagar as respostas da aula de ${quando(a.criado_em)}?`)) return
    const { error } = await supabase.from('aulas_ao_vivo').delete().eq('id', a.id)
    if (error) { setErro('Não foi possível apagar.'); return }
    setAulas((l) => l?.filter((x) => x.id !== a.id) ?? null)
    setRespostas((l) => l.filter((r) => r.aula_id !== a.id))
  }

  function exportar(a: Aula) {
    const rs = respostas.filter((r) => r.aula_id === a.id)
    const q = (v: string) => `"${v.replace(/"/g, '""')}"`
    const linhas = [['Nome', 'Bloco', 'Pergunta', 'Resposta', 'Acertou', 'Horário'].map(q).join(';')]
    for (const r of rs) {
      const b = blocos.find((x) => x.id === r.bloco_id)
      const n = b ? blocos.indexOf(b) + 1 : 0
      const multipla = b && ehMultipla(b)
      const resposta = multipla && r.opcao !== null ? `${LETRAS[r.opcao]}) ${b!.extra!.opcoes![r.opcao] ?? ''}` : r.texto ?? ''
      const acertou = multipla ? (r.opcao === b!.extra?.correta ? 'sim' : 'não') : ''
      linhas.push([r.nome, String(n), b?.titulo ?? '', resposta, acertou, new Date(r.criado_em).toLocaleTimeString('pt-BR')].map(q).join(';'))
    }
    // BOM para o Excel abrir os acentos certinho
    const blob = new Blob(['﻿' + linhas.join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const el = document.createElement('a')
    el.href = url
    el.download = `respostas-${(mensagem?.titulo || 'estudo').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w]+/g, '-').toLowerCase()}-${a.criado_em.slice(0, 10)}.csv`
    el.click()
    URL.revokeObjectURL(url)
  }

  const comResposta = blocos.filter(aceitaResposta)

  return (
    <div className="mx-auto max-w-3xl px-3 @tsm:px-4 pb-16 @tmd:px-8">
      <div className="sticky top-0 z-20 -mx-4 flex items-center gap-1 bg-fundo/90 px-4 py-2 backdrop-blur @tmd:-mx-8 @tmd:px-8 @tmd:py-4">
        <Link to={`/mensagem/${id}`} className="botao-fantasma -ml-2 px-2"><ChevronLeft size={20} /> Voltar</Link>
      </div>
      <h1 className="titulo-pagina mt-2">Respostas</h1>
      <p className="mt-1 truncate text-texto-2">{mensagem?.titulo}</p>

      {erro && <p role="alert" className="mt-4 rounded-xl bg-aviso/15 p-3 text-sm">{erro}</p>}

      {aulas === null && <div className="cartao mt-6 h-28 animate-pulse bg-superficie-2/60" />}

      {aulas?.length === 0 && !erro && (
        <div className="cartao mt-6 px-6 py-10 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-perigo/10 text-perigo"><Radio size={24} /></span>
          <h2 className="mt-4 font-display text-xl font-extrabold">Nenhuma aula ao vivo ainda</h2>
          <p className="mx-auto mt-2 max-w-sm text-texto-2">
            Em <b>Dar aula</b>, toque no botão <Radio size={14} className="inline" /> para abrir as respostas. Tudo o que a turma responder fica guardado aqui.
          </p>
          <Link to={`/pregar/${id}`} className="botao-primario mt-6">Dar aula</Link>
        </div>
      )}

      <ul className="mt-6 space-y-3">
        {aulas?.map((a) => {
          const rs = respostas.filter((r) => r.aula_id === a.id)
          const pessoas = new Set(rs.map((r) => r.participante)).size
          const placar = calcularPlacar(rs, blocos)
          const estaAberta = aberta === a.id
          return (
            <li key={a.id} className="cartao overflow-hidden">
              <button onClick={() => setAberta(estaAberta ? null : a.id)} className="flex w-full items-center gap-3 p-4 text-left">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${a.aberta ? 'bg-perigo/15 text-perigo' : 'bg-superficie-2 text-texto-2'}`}><Radio size={19} /></span>
                <span className="min-w-0 flex-1">
                  <b className="block font-display">{quando(a.criado_em)}{a.aberta && <span className="ml-2 text-xs font-bold text-perigo">AO VIVO</span>}</b>
                  <span className="flex items-center gap-1 text-sm text-texto-2"><Users size={13} /> {pessoas} {pessoas === 1 ? 'pessoa' : 'pessoas'} · {rs.length} {rs.length === 1 ? 'resposta' : 'respostas'} · código {a.codigo}</span>
                </span>
                <ChevronDown size={18} className={`shrink-0 text-texto-2 transition-transform ${estaAberta ? 'rotate-180' : ''}`} />
              </button>

              {estaAberta && (
                <div className="space-y-5 border-t border-borda p-4">
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => exportar(a)} disabled={!rs.length} className="botao-secundario py-1.5 text-sm"><Download size={16} /> Planilha (CSV)</button>
                    <button onClick={() => excluirAula(a)} className="botao-fantasma py-1.5 text-sm hover:text-perigo"><Trash2 size={16} /> Apagar</button>
                  </div>

                  {placar.length > 0 && (
                    <div className="rounded-2xl bg-superficie-2 p-3">
                      <p className="rotulo flex items-center gap-1.5"><Trophy size={14} className="text-tinta" /> Placar do quiz</p>
                      <ol className="mt-2 space-y-1">
                        {placar.map((p, i) => (
                          <li key={p.nome + i} className="flex items-center gap-3 text-sm">
                            <b className="w-5 text-center">{i + 1}</b><span className="min-w-0 flex-1 truncate">{p.nome}</span><span className="font-mono">{p.pontos}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {comResposta.map((b) => {
                    const def = defBloco(b)
                    const doBloco = rs.filter((r) => r.bloco_id === b.id)
                    const multipla = ehMultipla(b)
                    return (
                      <section key={b.id}>
                        <p className="text-[11px] font-extrabold uppercase tracking-wider" style={{ color: def.cor }}>{blocos.indexOf(b) + 1} · {def.nome}</p>
                        <h3 className="font-display text-lg font-bold leading-snug">{b.titulo || 'Sem título'}</h3>
                        {doBloco.length === 0 ? (
                          <p className="mt-1 text-sm text-texto-2">Ninguém respondeu.</p>
                        ) : multipla ? (
                          <div className="mt-2 space-y-1.5">
                            {b.extra!.opcoes!.filter((o) => o.trim()).map((op, i) => {
                              const quem = doBloco.filter((r) => r.opcao === i)
                              return (
                                <div key={i} className="rounded-xl border border-borda p-2.5">
                                  <div className="flex items-center gap-2">
                                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm font-extrabold text-white" style={{ background: CORES_OPCOES[i] }}>{LETRAS[i]}</span>
                                    <span className="min-w-0 flex-1 font-semibold">{op}</span>
                                    {b.extra?.correta === i && <Check size={18} className="text-sucesso" />}
                                    <b className="font-mono">{quem.length}</b>
                                  </div>
                                  {quem.length > 0 && <p className="mt-1 pl-9 text-sm text-texto-2">{quem.map((r) => r.nome).join(', ')}</p>}
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <ul className="mt-2 space-y-1.5">
                            {doBloco.map((r) => (
                              <li key={r.id} className={`rounded-xl border p-2.5 ${r.destaque ? 'border-acao bg-ouro-suave' : 'border-borda'}`}>
                                <b className="text-sm">{r.nome}</b>{r.oculta && <span className="ml-2 text-xs text-texto-2">(escondida da turma)</span>}
                                <p className="whitespace-pre-wrap break-words">{r.texto}</p>
                              </li>
                            ))}
                          </ul>
                        )}
                      </section>
                    )
                  })}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
