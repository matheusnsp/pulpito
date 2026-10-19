/* Fontes dos slides. Só são baixadas quando algum slide usa. */
import '@fontsource-variable/montserrat'
import '@fontsource-variable/playfair-display'
import '@fontsource/bebas-neue'
import '@fontsource-variable/oswald'
import '@fontsource-variable/caveat'
import '@fontsource-variable/lora'

export type FonteId = 'moderna' | 'legivel' | 'classica' | 'geometrica' | 'elegante' | 'impacto' | 'condensada' | 'manuscrita' | 'livro'

export const FONTES: { id: FonteId; nome: string; css: string; peso?: number }[] = [
  { id: 'moderna', nome: 'Moderna', css: '"Plus Jakarta Sans Variable", system-ui, sans-serif' },
  { id: 'geometrica', nome: 'Geométrica', css: '"Montserrat Variable", system-ui, sans-serif' },
  { id: 'impacto', nome: 'Impacto', css: '"Bebas Neue", "Oswald Variable", sans-serif', peso: 400 },
  { id: 'condensada', nome: 'Condensada', css: '"Oswald Variable", sans-serif' },
  { id: 'legivel', nome: 'Legível', css: '"Atkinson Hyperlegible Next", system-ui, sans-serif' },
  { id: 'elegante', nome: 'Elegante', css: '"Playfair Display Variable", Georgia, serif' },
  { id: 'classica', nome: 'Clássica', css: '"Literata Variable", Georgia, serif' },
  { id: 'livro', nome: 'Livro', css: '"Lora Variable", Georgia, serif' },
  { id: 'manuscrita', nome: 'Manuscrita', css: '"Caveat Variable", cursive' },
]

export const fonteCss = (id?: string) => (FONTES.find((f) => f.id === id) ?? FONTES[0]).css
/* Fontes que só têm um peso (não ficam mais grossas) */
export const pesoFixo = (id?: string) => FONTES.find((f) => f.id === id)?.peso
