/*
  O que a tela inicial mostra conforme o tamanho da biblioteca. Com poucas mensagens, a lista
  é a tela; busca, pastas e atalhos entram quando passam a ajudar de verdade.
*/
export const MINIMO_PARA_BUSCA = 6
export const MINIMO_PARA_CONTINUAR = 4

export const mostrarBusca = (total: number, buscando: boolean) => buscando || total >= MINIMO_PARA_BUSCA
export const mostrarPastas = (total: number, qtdPastas: number, filtroAtivo: boolean) =>
  qtdPastas > 0 || filtroAtivo || total >= MINIMO_PARA_BUSCA
export const mostrarContinuar = (total: number) => total >= MINIMO_PARA_CONTINUAR
