import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, Circle, Ellipsis, FileText, History, LayoutTemplate, LoaderCircle, Trash2 , Users } from 'lucide-react'
import type { Mensagem, Topico } from '../lib/tipos'
import { salvarComoModelo } from '../lib/mensagens'
import { useAuth } from '../lib/auth'
import { nomeDoUsuario } from '../lib/usuario'

/* Menu ⋯ do editor: histórico, PDF do esboço, salvar como modelo e marcar como dada */
export default function MenuMais({ mensagem, topicos, dono, onDada }: {
  mensagem: Mensagem
  topicos: Topico[]
  dono: boolean
  onDada: (dadaEm: string | undefined) => void
}) {
  const { sessao } = useAuth()
  const [aberto, setAberto] = useState(false)
  const [ocupado, setOcupado] = useState<'' | 'pdf' | 'pdf-notas' | 'modelo'>('')
  const [aviso, setAviso] = useState('')
  const caixa = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!aberto) return
    const fora = (e: PointerEvent) => { if (!caixa.current?.contains(e.target as Node)) setAberto(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setAberto(false) }
    document.addEventListener('pointerdown', fora)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('pointerdown', fora); document.removeEventListener('keydown', esc) }
  }, [aberto])

  const dada = !!mensagem.detalhes?.dadaEm
  const estudo = mensagem.tipo === 'estudo'
  const item = 'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-superficie-2 disabled:opacity-50'

  async function pdf(comNotas: boolean) {
    setOcupado(comNotas ? 'pdf-notas' : 'pdf')
    try {
      const { gerarEsbocoPdf } = await import('../lib/esbocoPdf')
      await gerarEsbocoPdf(mensagem, topicos, { comNotas, autor: nomeDoUsuario(sessao?.user) })
      setAberto(false)
    } catch { setAviso('Não foi possível gerar o PDF.') }
    finally { setOcupado('') }
  }

  async function modelo() {
    const nome = prompt('Nome do modelo (aparece em "Criar novo"):', mensagem.titulo || 'Meu modelo')?.trim()
    if (!nome) return
    setOcupado('modelo')
    try {
      await salvarComoModelo(mensagem, nome)
      setAviso(`Modelo "${nome}" salvo. Ele aparece em Criar novo.`)
    } catch { setAviso('Não foi possível salvar o modelo.') }
    finally { setOcupado('') }
  }

  return (
    <div ref={caixa} className="relative">
      <button onClick={() => { setAberto((v) => !v); setAviso('') }} aria-label="Mais opções" aria-expanded={aberto}
        className="flex h-10 w-10 items-center justify-center rounded-xl text-texto-2 hover:bg-superficie-2 hover:text-texto">
        <Ellipsis size={20} />
      </button>
      {aberto && (
        <div className="absolute right-0 top-full z-40 mt-1 w-72 animate-entrar rounded-2xl border border-borda bg-superficie p-1.5 shadow-xl">
          <button onClick={() => onDada(dada ? undefined : new Date().toISOString())} className={item}>
            {dada ? <CheckCircle2 size={18} className="text-sucesso" /> : <Circle size={18} className="text-texto-2" />}
            <span className="flex-1">{dada ? `${estudo ? 'Dada' : 'Feita'} em ${new Date(mensagem.detalhes!.dadaEm!).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}` : `Marcar como ${estudo ? 'dada' : 'feita'}`}</span>
          </button>
          {dono && <Link to={`/mensagem/${mensagem.id}/compartilhar`} className={`${item} sm:hidden`}><Users size={18} className="text-texto-2" /> Convidar pessoas</Link>}
          <Link to={`/mensagem/${mensagem.id}/historico`} className={item}><History size={18} className="text-texto-2" /> Histórico de versões</Link>
          <button onClick={() => pdf(false)} disabled={!!ocupado} className={item}>
            {ocupado === 'pdf' ? <LoaderCircle size={18} className="animate-spin" /> : <FileText size={18} className="text-texto-2" />} Baixar esboço em PDF
          </button>
          <button onClick={() => pdf(true)} disabled={!!ocupado} className={item}>
            {ocupado === 'pdf-notas' ? <LoaderCircle size={18} className="animate-spin" /> : <FileText size={18} className="text-texto-2" />} PDF com minhas notas
          </button>
          {dono && (
            <button onClick={modelo} disabled={!!ocupado} className={item}>
              {ocupado === 'modelo' ? <LoaderCircle size={18} className="animate-spin" /> : <LayoutTemplate size={18} className="text-texto-2" />} Salvar como modelo
            </button>
          )}
          {dono && <Link to="/lixeira" className={item}><Trash2 size={18} className="text-texto-2" /> Lixeira</Link>}
          {aviso && <p className="px-3 pb-2 pt-1 text-xs text-texto-2">{aviso}</p>}
        </div>
      )}
    </div>
  )
}
