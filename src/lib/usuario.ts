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