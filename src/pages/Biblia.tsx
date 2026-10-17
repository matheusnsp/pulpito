import { useEffect, useState, type FormEvent } from 'react'
import {
  LIVROS, VERSOES, type VersaoId, lerCapitulo, totalCapitulos,
  parseReferencia, nomeDoLivro,
} from '../lib/biblia'

const CHAVE_VERSAO = 'pulpito-versao'
const CHAVE_MARCADOS = 'pulpito-marcados'

type Resultado = { chave: string; versos: string[]; total: number; erro: boolean }
type Destaque = { inicio: number; fim: number } | null

function lerMarcados(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(CHAVE_MARCADOS) || '[]')) }
  catch { return new Set() }
}

const campo = 'rounded-lg bg-neutral-900 px-3 py-2 ring-1 ring-neutral-800 outline-none focus:ring-neutral-600'
const botao = 'rounded-lg px-3 py-2 ring-1 ring-neutral-800 hover:bg-neutral-900 disabled:opacity-30'

export default function Biblia() {
  const [versao, setVersao] = useState<VersaoId>(
    () => (localStorage.getItem(CHAVE_VERSAO) as VersaoId) || 'ARA'
  )
  const [livro, setLivro] = useState('JHN')
  const [capitulo, setCapitulo] = useState(1)
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const [destaque, setDestaque] = useState<Destaque>(null)
  const [busca, setBusca] = useState('')
  const [erroBusca, setErroBusca] = useState('')
  const [marcados, setMarcados] = useState<Set<string>>(lerMarcados)

  const chaveAtual = `${versao}.${livro}.${capitulo}`
  const carregando = resultado?.chave !== chaveAtual

  useEffect(() => { localStorage.setItem(CHAVE_VERSAO, versao) }, [versao])
  useEffect(() => {
    localStorage.setItem(CHAVE_MARCADOS, JSON.stringify([...marcados]))
  }, [marcados])

  useEffect(() => {
    let ativo = true
    Promise.all([lerCapitulo(versao, livro, capitulo), totalCapitulos(versao, livro)])
      .then(([versos, total]) => {
        if (ativo) setResultado({ chave: chaveAtual, versos, total, erro: false })
      })
      .catch(() => {
        if (ativo) setResultado({ chave: chaveAtual, versos: [], total: 0, erro: true })
      })
    return () => { ativo = false }
  }, [versao, livro, capitulo, chaveAtual])

  // Rola até o versículo buscado quando o capítulo termina de carregar
  useEffect(() => {
    if (!carregando && destaque)
      document.getElementById(`v-${destaque.inicio}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [carregando, destaque])

  function irPara(e: FormEvent) {
    e.preventDefault()
    const ref = parseReferencia(busca)
    if (!ref) { setErroBusca('Não entendi. Tente "Jo 3:16", "1 Co 13" ou "Salmos 23".'); return }
    setErroBusca('')
    setLivro(ref.livro)
    setCapitulo(ref.capitulo)
    setDestaque(ref.inicio ? { inicio: ref.inicio, fim: ref.fim ?? ref.inicio } : null)
  }

  function trocarLivro(usfm: string) {
    setLivro(usfm); setCapitulo(1); setDestaque(null)
  }

  async function anterior() {
    setDestaque(null)
    if (capitulo > 1) return setCapitulo(capitulo - 1)
    const i = LIVROS.findIndex((l) => l.usfm === livro)
    if (i <= 0) return
    const prev = LIVROS[i - 1].usfm
    const total = await totalCapitulos(versao, prev)
    setLivro(prev); setCapitulo(Math.max(total, 1))
  }

  function proximo() {
    setDestaque(null)
    if (resultado && capitulo < resultado.total) return setCapitulo(capitulo + 1)
    const i = LIVROS.findIndex((l) => l.usfm === livro)
    if (i < LIVROS.length - 1) { setLivro(LIVROS[i + 1].usfm); setCapitulo(1) }
  }

  function alternarMarcado(id: string) {
    setMarcados((atual) => {
      const novo = new Set(atual)
      if (novo.has(id)) novo.delete(id)
      else novo.add(id)
      return novo
    })
  }

  const total = carregando ? 0 : resultado?.total ?? 0
  const versos = carregando ? [] : resultado?.versos ?? []

  return (
    <div className="mx-auto max-w-2xl p-4">
      <form onSubmit={irPara} className="mb-2 flex gap-2">
        <input value={busca} onChange={(e) => setBusca(e.target.value)}
          placeholder='Ir para… ex: "Jo 3:16"' className={`${campo} flex-1`} />
        <button className="rounded-lg bg-neutral-100 px-4 py-2 font-medium text-neutral-900">Ir</button>
      </form>
      {erroBusca && <p className="mb-2 text-sm text-red-400">{erroBusca}</p>}

      <div className="mb-4 flex flex-wrap gap-2">
        <select value={versao} onChange={(e) => setVersao(e.target.value as VersaoId)} className={campo}>
          {VERSOES.map((v) => <option key={v.id} value={v.id}>{v.id}</option>)}
        </select>
        <select value={livro} onChange={(e) => trocarLivro(e.target.value)} className={`${campo} flex-1`}>
          {LIVROS.map((l) => <option key={l.usfm} value={l.usfm}>{l.nome}</option>)}
        </select>
        <select value={capitulo} onChange={(e) => { setCapitulo(Number(e.target.value)); setDestaque(null) }}
          className={campo} disabled={!total}>
          {Array.from({ length: total || capitulo }, (_, i) => (
            <option key={i + 1} value={i + 1}>Cap. {i + 1}</option>
          ))}
        </select>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <button onClick={anterior} className={botao} disabled={livro === 'GEN' && capitulo === 1}>←</button>
        <h2 className="text-xl font-semibold">{nomeDoLivro(livro)} {capitulo}</h2>
        <button onClick={proximo} className={botao}
          disabled={livro === 'REV' && !!resultado && capitulo >= resultado.total}>→</button>
      </div>

      {carregando && <p className="text-neutral-500">Carregando…</p>}
      {!carregando && resultado?.erro && (
        <p className="text-red-400">Não foi possível carregar a versão {versao}. Verifique a conexão.</p>
      )}
      {!carregando && !resultado?.erro && versos.length === 0 && (
        <p className="text-neutral-500">Capítulo não encontrado.</p>
      )}

      <div className="space-y-1">
        {versos.map((texto, i) => {
          const n = i + 1
          const id = `${livro}.${capitulo}.${n}`
          const emDestaque = !!destaque && n >= destaque.inicio && n <= destaque.fim
          const marcado = marcados.has(id)
          return (
            <p key={id} id={`v-${n}`} onClick={() => alternarMarcado(id)}
              className={`cursor-pointer rounded-md px-2 py-1 text-lg leading-relaxed transition-colors
                ${marcado ? 'bg-amber-400/20' : 'hover:bg-neutral-900'}
                ${emDestaque ? 'ring-1 ring-sky-500/70' : ''}`}>
              <sup className="mr-1 text-xs text-neutral-500">{n}</sup>{texto}
            </p>
          )
        })}
      </div>
    </div>
  )
}