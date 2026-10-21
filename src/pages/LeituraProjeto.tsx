import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { BookOpen, Eye, Presentation } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { type Mensagem, type Slide, type Topico, CAMPOS_TOPICO } from '../lib/tipos'
import SlideVisual from '../components/SlideVisual'

export default function LeituraProjeto() {
  const { id = '' } = useParams()
  const [mensagem, setMensagem] = useState<Mensagem | null | undefined>(undefined)
  const [topicos, setTopicos] = useState<Topico[]>([])
  const [slides, setSlides] = useState<Slide[]>([])
  const [erro, setErro] = useState('')

  useEffect(() => {
    let ativo = true
    Promise.all([
      supabase.from('mensagens').select('*').eq('id', id).maybeSingle(),
      supabase.from('topicos').select('*').eq('mensagem_id', id).order('ordem'),
      supabase.from('slides').select('*').eq('mensagem_id', id).order('ordem'),
    ]).then(([m, t, s]) => {
      if (!ativo) return
      if (m.error || t.error || s.error) setErro('Não foi possível carregar. O acesso pode ter sido removido.')
      setMensagem((m.data as Mensagem) ?? null)
      setTopicos((t.data as Topico[]) ?? [])
      setSlides((s.data as Slide[]) ?? [])
    }).catch(() => { if (ativo) setErro('Falha de conexão.') })
    return () => { ativo = false }
  }, [id])

  if (mensagem === undefined) return <p className="p-8">Carregando projeto…</p>
  if (!mensagem) return <div className="p-8"><p>Projeto indisponível.</p><Link to="/" className="botao-secundario mt-3">Voltar</Link></div>

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 pb-28 pt-8 md:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/" className="text-sm font-bold text-tinta hover:underline">← Início</Link>
        <span className="inline-flex items-center gap-2 rounded-full bg-ouro-suave px-3 py-1.5 text-xs font-bold text-tinta"><Eye size={15} /> Somente leitura</span>
      </div>
      <div>
        <p className="rotulo">Compartilhado com você</p>
        <h1 className="mt-2 font-display text-3xl font-extrabold">{mensagem.titulo || 'Projeto sem título'}</h1>
        {mensagem.texto_base && <p className="mt-2 flex items-center gap-2 text-texto-2"><BookOpen size={17} /> {mensagem.texto_base}</p>}
        <p className="mt-1 text-sm text-texto-2">{mensagem.tempo_minutos} minutos · {mensagem.tipo === 'estudo' ? 'Estudo' : 'Palavra'}</p>
        {mensagem.detalhes?.objetivo && <p className="mt-3 text-sm">{mensagem.detalhes.objetivo}</p>}
      </div>
      {erro && <p role="alert" className="text-perigo">{erro}</p>}
      <section>
        <h2 className="mb-3 font-display text-xl font-extrabold">Tópicos e blocos</h2>
        {!topicos.length && <p className="text-sm text-texto-2">Ainda não há tópicos.</p>}
        <ol className="space-y-3">
          {topicos.map((t, i) => (
            <li className="cartao p-4 sm:p-5" key={t.id}>
              <p className="text-xs font-extrabold uppercase text-tinta">{t.tipo && t.tipo !== 'topico' ? t.tipo : `Tópico ${i + 1}`}</p>
              <h3 className="mt-1 font-display text-lg font-extrabold">{t.titulo || 'Sem título'}</h3>
              {t.versiculo && <p className="mt-1 text-sm font-bold text-tinta">{t.versiculo}</p>}
              {CAMPOS_TOPICO.map((campo) => {
                const conteudo = t[campo.chave]
                return conteudo ? <div className="mt-3" key={campo.chave}><b className="text-xs text-texto-2">{campo.rotulo}</b><p className="whitespace-pre-wrap text-sm">{conteudo}</p></div> : null
              })}
              {t.extra?.url && <p className="mt-3 break-all text-sm"><a className="text-tinta underline" href={t.extra.url} target="_blank" rel="noopener noreferrer">Material relacionado</a></p>}
            </li>
          ))}
        </ol>
      </section>
      {slides.length > 0 && <section>
        <h2 className="mb-3 flex items-center gap-2 font-display text-xl font-extrabold"><Presentation size={20} /> Slides</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {slides.map((s) => <div className="cartao overflow-hidden p-2" key={s.id}>
            <SlideVisual slide={s} className="w-full overflow-hidden rounded-xl" />
          </div>)}
        </div>
      </section>}
    </div>
  )
}
