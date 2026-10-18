/* Ícones disponíveis para colocar nos slides */
import {
  BookOpen, Check, Church, CircleHelp, Cross, Flame, Hand, Heart, Lightbulb, MessageCircle, Sparkles, Star,
  Sun, TriangleAlert, X, type LucideIcon,
} from 'lucide-react'

export const ICONES: Record<string, { Icone: LucideIcon; nome: string }> = {
  cruz: { Icone: Cross, nome: 'Cruz' },
  coracao: { Icone: Heart, nome: 'Coração' },
  estrela: { Icone: Star, nome: 'Estrela' },
  livro: { Icone: BookOpen, nome: 'Bíblia' },
  igreja: { Icone: Church, nome: 'Igreja' },
  chama: { Icone: Flame, nome: 'Chama' },
  sol: { Icone: Sun, nome: 'Sol' },
  luz: { Icone: Lightbulb, nome: 'Ideia' },
  brilho: { Icone: Sparkles, nome: 'Brilho' },
  mao: { Icone: Hand, nome: 'Mão' },
  fala: { Icone: MessageCircle, nome: 'Fala' },
  pergunta: { Icone: CircleHelp, nome: 'Pergunta' },
  alerta: { Icone: TriangleAlert, nome: 'Alerta' },
  certo: { Icone: Check, nome: 'Certo' },
  errado: { Icone: X, nome: 'Errado' },
}
