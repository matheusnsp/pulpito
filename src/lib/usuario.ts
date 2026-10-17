// Domínio interno: nunca recebe e-mail, só serve para o Supabase aceitar o login
export const DOMINIO_INTERNO = 'pulpito.local'

export function normalizarUsuario(texto: string) {
  return texto.trim().toLowerCase()
}

export function usuarioValido(usuario: string) {
  return /^[a-z0-9._-]{3,40}$/.test(usuario)
}

export function usuarioParaEmail(usuario: string) {
  return `${normalizarUsuario(usuario)}@${DOMINIO_INTERNO}`
}

export function emailParaUsuario(email?: string | null) {
  return email?.split('@')[0] ?? ''
}