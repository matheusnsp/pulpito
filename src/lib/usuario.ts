// Domínio interno: nunca recebe e-mail, só serve para o Supabase aceitar o login
export const DOMINIO_INTERNO = 'pulpito.local'

/* "Maria Souza" ou "maría.souza" → "maria.souza" */
export function normalizarUsuario(texto: string) {
  return texto.trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '.')
}

/* Para entrar: aceita os usuários antigos criados à mão */
export function usuarioValido(usuario: string) {
  return /^[a-z0-9._-]{3,40}$/.test(usuario)
}

/* Para criar conta: exige nome.sobrenome (números permitidos, ex: maria.souza2) */
export function usuarioNovoValido(usuario: string) {
  return usuario.length <= 40 && /^[a-z0-9]+(\.[a-z0-9]+)+$/.test(usuario)
}

export function usuarioParaEmail(usuario: string) {
  return `${normalizarUsuario(usuario)}@${DOMINIO_INTERNO}`
}

export function emailParaUsuario(email?: string | null) {
  return email?.split('@')[0] ?? ''
}

/* "maria.souza" → "Maria Souza" */
export function nomeDeExibicao(usuario: string) {
  return usuario.split('.').filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ')
}
/* ── Contas com e-mail de verdade ── */

type UsuarioAuth = { email?: string | null; user_metadata?: Record<string, unknown> } | null | undefined

/* Conta antiga, criada só com usuário: o e-mail interno não recebe mensagens */
export function ehContaInterna(email?: string | null) {
  return !!email && email.toLowerCase().endsWith(`@${DOMINIO_INTERNO}`)
}

export function emailValido(texto: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(texto.trim())
}

/* O que a pessoa digita para entrar: e-mail (tem @) ou usuário antigo */
export function identificadorParaEmail(texto: string) {
  const t = texto.trim()
  return t.includes('@') ? t.toLowerCase() : usuarioParaEmail(t)
}

/* Nome mostrado no app: o que a pessoa escolheu, o que o Google mandou, ou derivado do usuário/e-mail */
export function nomeDoUsuario(usuario: UsuarioAuth) {
  const meta = usuario?.user_metadata ?? {}
  for (const chave of ['nome', 'full_name', 'name']) {
    const v = meta[chave]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return nomeDeExibicao(normalizarUsuario(emailParaUsuario(usuario?.email)))
}

/* Linha abaixo do nome em Ajustes: o usuário antigo ou o e-mail real */
export function identificadorDoUsuario(usuario: UsuarioAuth) {
  const email = usuario?.email ?? ''
  return ehContaInterna(email) ? emailParaUsuario(email) : email
}
