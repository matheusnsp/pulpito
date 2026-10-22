import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Check, ClipboardCopy, Link2, Shield, ShieldCheck, Trash2, UserPlus, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import {
  alterarColaborador, criarConvite, linkConvite, listarColaboradores, listarConvites, papelProjeto,
  revogarConvite, type Colaborador, type Convite, type PermissaoConvite,
} from '../lib/compartilhamento'

export default function CompartilharProjeto() {
  const { id = '' } = useParams()
  const [titulo, setTitulo] = useState('')
  const [autorizado, setAutorizado] = useState<boolean | null>(null)
  const [membros, setMembros] = useState<Colaborador[]>([])
  const [convites, setConvites] = useState<Convite[]>([])
  const [permissao, setPermissao] = useState<PermissaoConvite>('editor')
  const [usos, setUsos] = useState(1)
  const [gerado, setGerado] = useState<{ codigo: string; link: string } | null>(null)
  const [copiado, setCopiado] = useState<'link' | 'codigo' | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [agora] = useState(() => Date.now())
  const [erro, setErro] = useState('')

  const atualizar = useCallback(async () => {
    const [p, m, c] = await Promise.all([papelProjeto(id), listarColaboradores(id), listarConvites(id)])
    setAutorizado(p === 'dono')
    if (p === 'dono') { setMembros(m); setConvites(c) }
  }, [id])

  useEffect(() => {
    let ativo = true
    Promise.all([papelProjeto(id), supabase.from('mensagens').select('titulo').eq('id', id).maybeSingle()]).then(async ([p, r]) => {
      if (!ativo) return
      setAutorizado(p === 'dono')
      setTitulo(r.data?.titulo ?? '')
      if (p === 'dono') await atualizar()
    }).catch(() => { if (ativo) { setAutorizado(false); setErro('Não foi possível consultar o acesso.') } })
    return () => { ativo = false }
  }, [id, atualizar])

  async function executar(fn: () => Promise<void>) {
    setOcupado(true)
    setErro('')
    try { await fn(); await atualizar() }
    catch (e) { setErro(e instanceof Error ? e.message : 'A operação não pôde ser concluída.') }
    finally { setOcupado(false) }
  }

  function gerar() {
    void executar(async () => {
      const r = await criarConvite(id, permissao, usos)
      setGerado({ codigo: r.codigo, link: linkConvite(r.codigo) })
    })
  }

  async function copiar(valor: string, tipo: 'link' | 'codigo') {
    try { await navigator.clipboard.writeText(valor); setCopiado(tipo) }
    catch { setErro('Não foi possível copiar. Selecione e copie o texto manualmente.') }
  }

  if (autorizado === null) return <div className="p-8 text-texto-2">Verificando acesso…</div>
  if (!autorizado) return <div className="mx-auto max-w-xl p-8"><p>Somente o dono pode gerenciar o compartilhamento.</p><Link to={`/mensagem/${id}`} className="botao-secundario mt-4">Voltar</Link></div>

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-3 sm:px-4 pb-24 pt-8 md:px-8">
      <Link to={`/mensagem/${id}`} className="text-sm font-bold text-tinta hover:underline">← Voltar para o projeto</Link>
      <div>
        <h1 className="font-display text-2xl font-extrabold md:text-3xl">Compartilhar projeto</h1>
        <p className="mt-1 text-sm text-texto-2">{titulo || 'Projeto sem título'} · Você controla quem pode visualizar ou editar.</p>
      </div>
      <section className="cartao p-4 sm:p-5 md:p-6">
        <h2 className="flex items-center gap-2 font-display text-lg font-extrabold"><UserPlus size={20} className="text-tinta" /> Convidar alguém</h2>
        <p className="mt-1 text-sm text-texto-2">Gere um link e um código equivalentes. A pessoa precisa entrar com a conta dela e aceitar o convite.</p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-sm font-bold">Permissão
            <select className="campo mt-1" value={permissao} onChange={(e) => setPermissao(e.target.value as PermissaoConvite)}>
              <option value="editor">Pode editar</option><option value="leitor">Somente visualizar</option>
            </select>
          </label>
          <label className="text-sm font-bold">Quantidade de pessoas
            <select className="campo mt-1" value={usos} onChange={(e) => setUsos(Number(e.target.value))}>
              <option value={1}>1 pessoa (mais seguro)</option><option value={5}>Até 5 pessoas</option><option value={20}>Até 20 pessoas</option>
            </select>
          </label>
        </div>
        <button onClick={gerar} disabled={ocupado} className="botao-primario mt-4"><Link2 size={18} /> {ocupado ? 'Gerando…' : 'Gerar link e código'}</button>
        <p className="mt-2 text-xs text-texto-2">Cada convite dura 7 dias. Você pode revogá-lo antes disso.</p>
        {gerado && (
          <div className="mt-5 space-y-3 rounded-2xl border border-borda bg-superficie-2 p-4">
            <p className="font-bold text-tinta">Convite pronto! Guarde e envie agora: o código só é mostrado nesta tela.</p>
            <label className="block text-xs font-bold text-texto-2">Link de convite
              <input readOnly value={gerado.link} onFocus={(e) => e.target.select()} className="campo mt-1 text-sm" />
            </label>
            <button className="botao-secundario w-full" onClick={() => copiar(gerado.link, 'link')}>
              {copiado === 'link' ? <Check size={17} /> : <ClipboardCopy size={17} />} {copiado === 'link' ? 'Link copiado' : 'Copiar link'}
            </button>
            <label className="block text-xs font-bold text-texto-2">Código para entrar direto no Púlpito
              <input readOnly value={gerado.codigo} onFocus={(e) => e.target.select()} className="campo mt-1 text-center font-mono text-lg font-bold tracking-widest" />
            </label>
            <button className="botao-secundario w-full" onClick={() => copiar(gerado.codigo, 'codigo')}>
              {copiado === 'codigo' ? <Check size={17} /> : <ClipboardCopy size={17} />} {copiado === 'codigo' ? 'Código copiado' : 'Copiar código'}
            </button>
          </div>
        )}
      </section>

      <section className="cartao p-4 sm:p-5 md:p-6">
        <h2 className="flex items-center gap-2 font-display text-lg font-extrabold"><Users size={20} className="text-tinta" /> Pessoas com acesso</h2>
        {membros.filter((m) => !m.bloqueado).length === 0 ? <p className="mt-3 text-sm text-texto-2">Ninguém aceitou um convite ainda.</p> : (
          <ul className="mt-4 divide-y divide-borda">
            {membros.filter((m) => !m.bloqueado).map((m) => (
              <li key={m.usuario_id} className="flex flex-wrap items-center gap-2 py-3">
                <div className="min-w-0 flex-1"><b className="block truncate">{m.usuario}</b><span className="text-xs text-texto-2">Entrou em {new Date(m.adicionado_em).toLocaleDateString('pt-BR')}</span></div>
                <select aria-label={`Permissão de ${m.usuario}`} className="campo w-auto text-sm" disabled={ocupado} value={m.permissao}
                  onChange={(e) => void executar(() => alterarColaborador(id, m.usuario_id, e.target.value as PermissaoConvite, false))}>
                  <option value="editor">Editar</option><option value="leitor">Visualizar</option>
                </select>
                <button disabled={ocupado} title="Remover acesso" aria-label={`Revogar acesso de ${m.usuario}`} className="botao-fantasma text-perigo"
                  onClick={() => { if (window.confirm(`Remover o acesso de ${m.usuario}?`)) void executar(() => alterarColaborador(id, m.usuario_id, m.permissao, true)) }}><Trash2 size={18} /></button>
              </li>
            ))}
          </ul>
        )}
        {membros.some((m) => m.bloqueado) && (
          <details className="mt-3"><summary className="cursor-pointer text-sm text-texto-2">Acessos removidos</summary>
            {membros.filter((m) => m.bloqueado).map((m) => <div key={m.usuario_id} className="flex items-center justify-between gap-2 py-2 text-sm">
              <span>{m.usuario}</span><button disabled={ocupado} className="botao-secundario text-xs" onClick={() => void executar(() => alterarColaborador(id, m.usuario_id, m.permissao, false))}>Reativar</button>
            </div>)}
          </details>
        )}
      </section>

      <section className="cartao p-4 sm:p-5 md:p-6">
        <h2 className="flex items-center gap-2 font-display text-lg font-extrabold"><ShieldCheck size={20} className="text-tinta" /> Convites criados</h2>
        <p className="mt-1 text-xs text-texto-2">Revogar o link impede novas entradas. Para remover quem já aceitou, use “Pessoas com acesso”.</p>
        <ul className="mt-3 divide-y divide-borda">
          {convites.map((c) => {
            const ativo = !c.revogado_em && new Date(c.expira_em).getTime() > agora && c.usos < c.max_usos
            return <li key={c.id} className="flex items-center gap-2 py-3 text-sm">
              <Shield size={17} className="shrink-0 text-texto-2" />
              <span className="min-w-0 flex-1">{c.permissao === 'editor' ? 'Editar' : 'Visualizar'} · {c.usos}/{c.max_usos} usos<br /><span className="text-xs text-texto-2">{ativo ? `Expira em ${new Date(c.expira_em).toLocaleDateString('pt-BR')}` : 'Expirado, utilizado ou revogado'}</span></span>
              {ativo && <button disabled={ocupado} className="botao-fantasma text-xs text-perigo" onClick={() => void executar(() => revogarConvite(id, c.id))}>Revogar</button>}
            </li>
          })}
        </ul>
      </section>
      {erro && <p role="alert" className="rounded-xl bg-perigo/10 p-3 text-sm text-perigo">{erro}</p>}
    </div>
  )
}
