import type { ReactNode } from 'react'
import { RotateCcw, Share, SquarePlus, X } from 'lucide-react'
import { appInstalado } from '../lib/telaCheia'

/* Aparece no iPhone, que não deixa sites entrarem em tela cheia: explica o caminho que funciona */
export default function AjudaTelaCheia({ onFechar }: { onFechar: () => void }) {
  const instalado = appInstalado()
  const passo = (n: number, texto: ReactNode) => (
    <li className="flex items-start gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-acao text-sm font-extrabold text-acao-texto">{n}</span>
      <span className="pt-0.5">{texto}</span>
    </li>
  )
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-6" onClick={onFechar}
      role="dialog" aria-modal="true" aria-labelledby="ajuda-tela-cheia">
      <div onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md animate-subir rounded-t-[1.75rem] border border-borda bg-superficie p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-texto shadow-2xl sm:rounded-[1.75rem]">
        <div className="flex items-start justify-between gap-3">
          <h2 id="ajuda-tela-cheia" className="font-display text-xl font-extrabold">Tela cheia no iPhone</h2>
          <button onClick={onFechar} aria-label="Fechar" className="flex h-9 w-9 items-center justify-center rounded-xl text-texto-2 hover:bg-superficie-2"><X size={18} /></button>
        </div>
        <p className="mt-1 text-texto-2">
          O iPhone não deixa nenhum site usar o botão de tela cheia. O jeito é usar o Pulpito instalado, que já abre sem as barras do Safari.
        </p>
        <ol className="mt-4 space-y-3">
          {instalado ? (
            <>
              {passo(1, <>Você já está no app instalado: as barras do Safari não aparecem.</>)}
              {passo(2, <><b>Deite o celular</b> <RotateCcw size={15} className="inline" />: a barra da hora some e o texto ocupa a tela toda.</>)}
              {passo(3, <>Confira se a <b>trava de rotação</b> está desligada na Central de Controle.</>)}
            </>
          ) : (
            <>
              {passo(1, <>No Safari, toque em <b>Compartilhar</b> <Share size={15} className="inline" />.</>)}
              {passo(2, <>Escolha <b>Adicionar à Tela de Início</b> <SquarePlus size={15} className="inline" /> e deixe <b>Abrir como app web</b> ligado.</>)}
              {passo(3, <>Abra o Pulpito pelo ícone e <b>deite o celular</b> para ocupar a tela toda.</>)}
            </>
          )}
        </ol>
        <button onClick={onFechar} className="botao-primario mt-5 w-full">Entendi</button>
      </div>
    </div>
  )
}
