import { useState, type ReactNode, type RefObject } from 'react'
import {
  AlignCenter, AlignLeft, AlignRight, ArrowDown, ArrowDownToLine, ArrowUp, ArrowUpToLine, Bold, ClipboardPaste,
  Copy, Eye, EyeOff, ImagePlus, Italic, Lock, LockOpen, Maximize, Paintbrush, RotateCcw, Trash2, Underline,
  AlignStartVertical, AlignCenterVertical, AlignEndVertical, AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal,
} from 'lucide-react'
import type { Elemento } from '../lib/tipos'
import type { AcaoElemento, AlinharNoSlide } from '../lib/elementos'
import { FONTES } from '../lib/fontes'
import { ICONES } from '../lib/icones'


const CORES = ['#FFFFFF', '#000000', '#FFC107', '#F59E0B', '#F44336', '#EC4899', '#8B5CF6', '#3B82F6', '#7DD3FC', '#2DD4BF', '#22C55E', '#A3A3A3']

function Rotulo({ children }: { children: ReactNode }) {
  return <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.06em] text-texto-2">{children}</span>
}

/* Linha de cores: prontas, personalizada e (se puder) "nenhuma" */
function Cores({ valor, onChange, nenhuma }: { valor?: string; onChange: (c: string | undefined) => void; nenhuma?: string }) {
  return (
    <div className="sem-barra -mx-1 flex items-center gap-1.5 overflow-x-auto px-1 py-1">
      {nenhuma && (
        <button onClick={() => onChange(undefined)} aria-pressed={!valor}
          className={`h-8 shrink-0 rounded-full border px-2.5 text-xs font-bold ${!valor ? 'border-acao bg-acao/15 text-texto' : 'border-borda text-texto-2'}`}>
          {nenhuma}
        </button>
      )}
      {CORES.map((c) => (
        <button key={c} onClick={() => onChange(c)} aria-label={`Cor ${c}`} style={{ background: c }}
          className={`h-8 w-8 shrink-0 rounded-full ${valor?.toUpperCase() === c ? 'ring-2 ring-acao ring-offset-2 ring-offset-superficie' : 'ring-1 ring-borda'}`} />
      ))}
      <label className="relative h-8 w-8 shrink-0 cursor-pointer overflow-hidden rounded-full ring-1 ring-borda"
        style={{ background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)' }} aria-label="Outra cor">
        <input type="color" value={valor && valor.startsWith('#') ? valor : '#ffffff'} onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0" />
      </label>
    </div>
  )
}

function Deslizante({ rotulo, valor, min, max, passo, onChange, formato }: {
  rotulo: string; valor: number; min: number; max: number; passo: number; onChange: (n: number) => void; formato?: (n: number) => string
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center justify-between text-xs font-bold uppercase tracking-[0.06em] text-texto-2">
        {rotulo} <span className="font-mono normal-case tracking-normal text-texto">{formato ? formato(valor) : valor}</span>
      </span>
      <input type="range" min={min} max={max} step={passo} value={valor} onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--acao)]" />
    </label>
  )
}

function Alternar({ ativo, onClick, children, rotulo }: { ativo: boolean; onClick: () => void; children: ReactNode; rotulo: string }) {
  return (
    <button onClick={onClick} aria-pressed={ativo} aria-label={rotulo} title={rotulo}
      className={`flex h-10 min-w-10 items-center justify-center gap-1.5 rounded-xl border px-2.5 text-sm font-semibold transition-colors ${ativo
        ? 'border-acao bg-acao text-acao-texto' : 'border-borda bg-superficie text-texto hover:bg-superficie-2'}`}>
      {children}
    </button>
  )
}

const botaoAcao = 'botao-secundario flex-col gap-0.5 px-1 py-2 text-[11px] @tsm:flex-row @tsm:gap-1.5 @tsm:px-3 @tsm:py-1.5 @tsm:text-sm'

export default function PainelElemento({ el, onMudar, onAcao, onAlinhar, temEstiloCopiado, campoTexto }: {
  el: Elemento
  onMudar: (campos: Partial<Elemento>) => void
  onAcao: (a: AcaoElemento) => void
  onAlinhar: (a: AlinharNoSlide) => void
  temEstiloCopiado: boolean
  campoTexto?: RefObject<HTMLTextAreaElement | null>
}) {
  const texto = el.tipo === 'texto'
  const foto = el.tipo === 'foto'
  const abas = texto ? ['Texto', 'Estilo', 'Organizar'] : foto ? ['Foto', 'Organizar'] : ['Estilo', 'Organizar']
  const [aba, setAba] = useState(abas[0])
  const abaAtual = abas.includes(aba) ? aba : abas[0]
  const formaComContorno = ['circulo', 'retangulo', 'triangulo', 'losango', 'estrela', 'balao'].includes(el.tipo)

  return (
    <div className="space-y-4">
      <div className="flex rounded-xl bg-superficie-2 p-1" role="tablist">
        {abas.map((a) => (
          <button key={a} role="tab" aria-selected={abaAtual === a} onClick={() => setAba(a)}
            className={`flex-1 rounded-lg py-2 text-sm font-bold transition-colors ${abaAtual === a ? 'bg-superficie text-texto shadow' : 'text-texto-2'}`}>
            {a}
          </button>
        ))}
      </div>

      {/* ── Texto: conteúdo, fonte, tamanho e formatação ── */}
      {abaAtual === 'Texto' && (
        <div className="space-y-4">
          <div>
            <textarea ref={campoTexto} rows={3} value={el.texto ?? ''} onChange={(e) => onMudar({ texto: e.target.value })}
              placeholder="Escreva aqui" className="campo resize-y leading-relaxed" />
            <p className="mt-1 text-xs text-texto-2">Dica: coloque uma palavra entre *asteriscos* para pintar com a cor de destaque.</p>
          </div>
          <div>
            <Rotulo>Fonte</Rotulo>
            <div className="grid grid-cols-3 gap-1.5">
              {FONTES.map((f) => (
                <button key={f.id} onClick={() => onMudar({ fonte: f.id })} aria-pressed={(el.fonte ?? 'moderna') === f.id}
                  className={`truncate rounded-xl border px-2 py-2 text-[15px] ${(el.fonte ?? 'moderna') === f.id ? 'border-acao bg-acao/15' : 'border-borda hover:bg-superficie-2'}`}
                  style={{ fontFamily: f.css, fontWeight: f.peso ?? 700 }}>
                  {f.nome}
                </button>
              ))}
            </div>
          </div>
          <Deslizante rotulo="Tamanho" valor={el.tam ?? 4} min={1} max={18} passo={0.2} onChange={(n) => onMudar({ tam: n })}
            formato={(n) => `${Math.round(n * 10)}`} />
          <div className="flex flex-wrap gap-1.5">
            <Alternar rotulo="Negrito" ativo={(el.peso ?? 800) >= 700} onClick={() => onMudar({ peso: (el.peso ?? 800) >= 700 ? 400 : 800 })}><Bold size={17} /></Alternar>
            <Alternar rotulo="Itálico" ativo={!!el.italico} onClick={() => onMudar({ italico: !el.italico })}><Italic size={17} /></Alternar>
            <Alternar rotulo="Sublinhado" ativo={!!el.sublinhado} onClick={() => onMudar({ sublinhado: !el.sublinhado })}><Underline size={17} /></Alternar>
            <Alternar rotulo="Caixa alta" ativo={!!el.caixaAlta} onClick={() => onMudar({ caixaAlta: !el.caixaAlta })}><span className="text-xs font-extrabold">AA</span></Alternar>
            <span className="mx-1 w-px self-stretch bg-borda" />
            {(['left', 'center', 'right'] as const).map((a) => {
              const I = { left: AlignLeft, center: AlignCenter, right: AlignRight }[a]
              return <Alternar key={a} rotulo={`Alinhar ${a}`} ativo={(el.alinh ?? 'center') === a} onClick={() => onMudar({ alinh: a })}><I size={17} /></Alternar>
            })}
          </div>
          <div>
            <Rotulo>Peso da letra</Rotulo>
            <div className="grid grid-cols-4 gap-1.5">
              {[[300, 'Fina'], [500, 'Normal'], [700, 'Forte'], [900, 'Pesada']].map(([p, n]) => (
                <button key={p} onClick={() => onMudar({ peso: p as number })} style={{ fontWeight: p as number }}
                  className={`rounded-xl border py-2 text-sm ${(el.peso ?? 800) === p ? 'border-acao bg-acao/15' : 'border-borda'}`}>{n}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Estilo do texto ── */}
      {abaAtual === 'Estilo' && texto && (
        <div className="space-y-4">
          <div><Rotulo>Cor do texto</Rotulo><Cores valor={el.cor} onChange={(c) => onMudar({ cor: c ?? '#FFFFFF' })} /></div>
          <div><Rotulo>Cor das *palavras marcadas*</Rotulo><Cores valor={el.destaque ?? '#FFC107'} onChange={(c) => onMudar({ destaque: c })} /></div>
          <div><Rotulo>Faixa atrás do texto</Rotulo><Cores valor={el.faixa} nenhuma="Sem faixa" onChange={(c) => onMudar({ faixa: c })} /></div>
          <div><Rotulo>Contorno das letras</Rotulo><Cores valor={el.contorno} nenhuma="Sem contorno" onChange={(c) => onMudar({ contorno: c })} /></div>
          <div className="grid gap-4 @tsm:grid-cols-2">
            <Deslizante rotulo="Espaço entre linhas" valor={el.entrelinha ?? 1.15} min={0.8} max={2.2} passo={0.05} onChange={(n) => onMudar({ entrelinha: n })} formato={(n) => n.toFixed(2)} />
            <Deslizante rotulo="Espaço entre letras" valor={el.espaco ?? 0} min={-0.08} max={0.4} passo={0.01} onChange={(n) => onMudar({ espaco: n })} formato={(n) => n.toFixed(2)} />
            <Deslizante rotulo="Transparência" valor={Math.round((1 - (el.opac ?? 1)) * 100)} min={0} max={90} passo={5} onChange={(n) => onMudar({ opac: 1 - n / 100 })} formato={(n) => `${n}%`} />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Alternar rotulo="Sombra" ativo={!!el.sombra} onClick={() => onMudar({ sombra: !el.sombra })}>Sombra</Alternar>
            <span className="mx-1 w-px self-stretch bg-borda" />
            {(['top', 'center', 'bottom'] as const).map((a) => {
              const I = { top: AlignStartHorizontal, center: AlignCenterHorizontal, bottom: AlignEndHorizontal }[a]
              return <Alternar key={a} rotulo={`Texto no ${a === 'top' ? 'topo' : a === 'center' ? 'meio' : 'pé'} da caixa`} ativo={(el.alinhV ?? 'center') === a} onClick={() => onMudar({ alinhV: a })}><I size={17} /></Alternar>
            })}
          </div>
        </div>
      )}

      {/* ── Estilo de formas e ícones ── */}
      {abaAtual === 'Estilo' && !texto && (
        <div className="space-y-4">
          {el.tipo === 'icone' && (
            <div>
              <Rotulo>Ícone</Rotulo>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(ICONES).map(([chave, { Icone, nome }]) => (
                  <button key={chave} onClick={() => onMudar({ icone: chave })} title={nome} aria-label={nome}
                    className={`flex h-10 w-10 items-center justify-center rounded-xl border ${el.icone === chave ? 'border-acao bg-acao/15' : 'border-borda hover:bg-superficie-2'}`}>
                    <Icone size={19} />
                  </button>
                ))}
              </div>
            </div>
          )}
          <div><Rotulo>Cor</Rotulo><Cores valor={el.cor} onChange={(c) => onMudar({ cor: c ?? '#FFC107' })} /></div>
          {el.tipo !== 'icone' && (
            <div><Rotulo>Segunda cor (degradê)</Rotulo><Cores valor={el.cor2} nenhuma="Sem degradê" onChange={(c) => onMudar({ cor2: c })} /></div>
          )}
          {(formaComContorno || el.tipo === 'icone') && (
            <div className="flex rounded-xl border border-borda p-1">
              {[['contorno', 'Só contorno'], ['cheio', 'Preenchido']].map(([v, n]) => (
                <button key={v} onClick={() => onMudar({ preenchido: v === 'cheio' })}
                  className={`flex-1 rounded-lg py-1.5 text-sm font-semibold ${!!el.preenchido === (v === 'cheio') ? 'bg-acao text-acao-texto' : 'text-texto-2'}`}>{n}</button>
              ))}
            </div>
          )}
          {formaComContorno && el.preenchido && (
            <div><Rotulo>Borda</Rotulo><Cores valor={el.corBorda} nenhuma="Sem borda" onChange={(c) => onMudar({ corBorda: c })} /></div>
          )}
          <div className="grid gap-4 @tsm:grid-cols-2">
            {el.tipo !== 'icone' && (
              <Deslizante rotulo={el.tipo === 'linha' ? 'Espessura' : 'Espessura da borda'} valor={el.borda ?? 0.45} min={0.1} max={3} passo={0.05} onChange={(n) => onMudar({ borda: n })} formato={(n) => n.toFixed(2)} />
            )}
            {el.tipo === 'retangulo' && (
              <Deslizante rotulo="Cantos arredondados" valor={el.raio ?? 1.2} min={0} max={20} passo={0.2} onChange={(n) => onMudar({ raio: n })} formato={(n) => n.toFixed(1)} />
            )}
            <Deslizante rotulo="Transparência" valor={Math.round((1 - (el.opac ?? 1)) * 100)} min={0} max={90} passo={5} onChange={(n) => onMudar({ opac: 1 - n / 100 })} formato={(n) => `${n}%`} />
          </div>
          <Alternar rotulo="Sombra" ativo={!!el.sombra} onClick={() => onMudar({ sombra: !el.sombra })}>Sombra</Alternar>
        </div>
      )}

      {/* ── Foto: formato, enquadramento e ajustes ── */}
      {abaAtual === 'Foto' && (
        <div className="space-y-4">
          <button onClick={() => onAcao('trocarFoto')} className="botao-secundario w-full"><ImagePlus size={18} /> Trocar foto</button>
          <div className="grid grid-cols-2 gap-1.5">
            {[['ret', 'Retângulo'], ['circulo', 'Círculo']].map(([v, n]) => (
              <button key={v} onClick={() => onMudar({ forma: v as 'ret' | 'circulo' })}
                className={`rounded-xl border py-2 text-sm font-semibold ${(el.forma ?? 'ret') === v ? 'border-acao bg-acao/15' : 'border-borda'}`}>{n}</button>
            ))}
            {[['cobrir', 'Preencher a caixa'], ['conter', 'Foto inteira']].map(([v, n]) => (
              <button key={v} onClick={() => onMudar({ ajuste: v as 'cobrir' | 'conter' })}
                className={`rounded-xl border py-2 text-sm font-semibold ${(el.ajuste ?? 'cobrir') === v ? 'border-acao bg-acao/15' : 'border-borda'}`}>{n}</button>
            ))}
          </div>
          <div className="grid gap-4 @tsm:grid-cols-2">
            {(el.forma ?? 'ret') === 'ret' && (
              <Deslizante rotulo="Cantos arredondados" valor={el.raio ?? 1} min={0} max={20} passo={0.2} onChange={(n) => onMudar({ raio: n })} formato={(n) => n.toFixed(1)} />
            )}
            <Deslizante rotulo="Parte que aparece" valor={el.focoY ?? 50} min={0} max={100} passo={5} onChange={(n) => onMudar({ focoY: n })} formato={(n) => (n < 34 ? 'cima' : n > 66 ? 'baixo' : 'meio')} />
            <Deslizante rotulo="Brilho" valor={el.brilho ?? 1} min={0.4} max={1.6} passo={0.05} onChange={(n) => onMudar({ brilho: n })} formato={(n) => `${Math.round(n * 100)}%`} />
            <Deslizante rotulo="Contraste" valor={el.contraste ?? 1} min={0.5} max={1.6} passo={0.05} onChange={(n) => onMudar({ contraste: n })} formato={(n) => `${Math.round(n * 100)}%`} />
            <Deslizante rotulo="Desfoque" valor={el.desfoque ?? 0} min={0} max={10} passo={0.5} onChange={(n) => onMudar({ desfoque: n })} />
            <Deslizante rotulo="Transparência" valor={Math.round((1 - (el.opac ?? 1)) * 100)} min={0} max={90} passo={5} onChange={(n) => onMudar({ opac: 1 - n / 100 })} formato={(n) => `${n}%`} />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Alternar rotulo="Preto e branco" ativo={!!el.pb} onClick={() => onMudar({ pb: !el.pb })}>Preto e branco</Alternar>
            <Alternar rotulo="Sombra" ativo={el.sombra !== false} onClick={() => onMudar({ sombra: el.sombra === false })}>Sombra</Alternar>
          </div>
          <div><Rotulo>Moldura</Rotulo><Cores valor={el.borda ? el.corBorda ?? '#FFFFFF' : undefined} nenhuma="Sem moldura"
            onChange={(c) => onMudar(c ? { corBorda: c, borda: el.borda || 0.6 } : { borda: 0 })} /></div>
        </div>
      )}

      {/* ── Organizar: posição, camadas, travar ── */}
      {abaAtual === 'Organizar' && (
        <div className="space-y-4">
          <div>
            <Rotulo>Posição no slide</Rotulo>
            <div className="grid grid-cols-7 gap-1.5">
              {([['esq', AlignStartVertical, 'Encostar à esquerda'], ['centroH', AlignCenterVertical, 'Centralizar na horizontal'], ['dir', AlignEndVertical, 'Encostar à direita'],
                ['topo', AlignStartHorizontal, 'Encostar no topo'], ['meio', AlignCenterHorizontal, 'Centralizar na vertical'], ['base', AlignEndHorizontal, 'Encostar embaixo'],
                ['inteiro', Maximize, 'Ocupar o slide inteiro']] as const).map(([a, I, n]) => (
                <button key={a} onClick={() => onAlinhar(a)} title={n} aria-label={n}
                  className="flex h-10 items-center justify-center rounded-xl border border-borda hover:bg-superficie-2"><I size={17} /></button>
              ))}
            </div>
          </div>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Deslizante rotulo="Girar" valor={el.rot ?? 0} min={-180} max={180} passo={1} onChange={(n) => onMudar({ rot: n })} formato={(n) => `${n}°`} />
            </div>
            <button onClick={() => onMudar({ rot: 0 })} aria-label="Endireitar" title="Endireitar" className="flex h-10 w-10 items-center justify-center rounded-xl border border-borda"><RotateCcw size={16} /></button>
          </div>
          <div>
            <Rotulo>Camadas</Rotulo>
            <div className="grid grid-cols-4 gap-1.5">
              <button onClick={() => onAcao('topo')} className={botaoAcao}><ArrowUpToLine size={15} /> Topo</button>
              <button onClick={() => onAcao('frente')} className={botaoAcao}><ArrowUp size={15} /> Subir</button>
              <button onClick={() => onAcao('tras')} className={botaoAcao}><ArrowDown size={15} /> Descer</button>
              <button onClick={() => onAcao('fundo')} className={botaoAcao}><ArrowDownToLine size={15} /> Fundo</button>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            <button onClick={() => onMudar({ travado: !el.travado })} className={botaoAcao}>{el.travado ? <><LockOpen size={15} /> Destravar</> : <><Lock size={15} /> Travar</>}</button>
            <button onClick={() => onMudar({ oculto: !el.oculto })} className={botaoAcao}>{el.oculto ? <><Eye size={15} /> Mostrar</> : <><EyeOff size={15} /> Ocultar</>}</button>
            <button onClick={() => onAcao('copiarEstilo')} className={botaoAcao}><Paintbrush size={15} /> Copiar estilo</button>
            <button onClick={() => onAcao('colarEstilo')} disabled={!temEstiloCopiado} className={botaoAcao}><ClipboardPaste size={15} /> Colar estilo</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-1.5 border-t border-borda pt-3">
        <button onClick={() => onAcao('duplicar')} className="botao-secundario py-2 text-sm"><Copy size={16} /> Duplicar</button>
        <button onClick={() => onAcao('excluir')} className="botao-secundario py-2 text-sm hover:text-perigo"><Trash2 size={16} /> Excluir</button>
      </div>
    </div>
  )
}
