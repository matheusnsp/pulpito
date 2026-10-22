import { createContext, useContext } from 'react'
import type { PapelProjeto } from './compartilhamento'

/* Papel de quem abriu o projeto (dono, editor). Leitores nem chegam ao editor. */
export const ContextoPapel = createContext<PapelProjeto>(null)
export const usePapelAtual = () => useContext(ContextoPapel)
