import { describe, expect, it } from 'vitest'
import {
  DOMINIO_INTERNO, emailParaUsuario, nomeDeExibicao, normalizarUsuario,
  usuarioNovoValido, usuarioParaEmail, usuarioValido,
} from './usuario'

describe('normalizarUsuario', () => {
  it('vira minúsculo, sem acento, com ponto no lugar do espaço', () => {
    expect(normalizarUsuario('Maria Souza')).toBe('maria.souza')
    expect(normalizarUsuario('  María.Souza ')).toBe('maria.souza')
  })
})

describe('usuarioValido', () => {
  it('aceita usuários antigos simples', () => {
    expect(usuarioValido('maria')).toBe(true)
    expect(usuarioValido('maria.souza')).toBe(true)
  })
  it('recusa curto demais, maiúsculas e símbolos', () => {
    expect(usuarioValido('ab')).toBe(false)
    expect(usuarioValido('Maria')).toBe(false)
    expect(usuarioValido('maria souza')).toBe(false)
  })
})

describe('usuarioNovoValido', () => {
  it('exige nome.sobrenome', () => {
    expect(usuarioNovoValido('maria')).toBe(false)
    expect(usuarioNovoValido('maria.souza')).toBe(true)
    expect(usuarioNovoValido('maria.souza2')).toBe(true)
    expect(usuarioNovoValido('maria..souza')).toBe(false)
  })
})

describe('conversão usuário e e-mail interno', () => {
  it('monta e desmonta o e-mail do domínio interno', () => {
    expect(usuarioParaEmail('Maria Souza')).toBe(`maria.souza@${DOMINIO_INTERNO}`)
    expect(emailParaUsuario(`maria.souza@${DOMINIO_INTERNO}`)).toBe('maria.souza')
    expect(emailParaUsuario(null)).toBe('')
  })
})

describe('nomeDeExibicao', () => {
  it('capitaliza cada parte', () => {
    expect(nomeDeExibicao('maria.souza')).toBe('Maria Souza')
    expect(nomeDeExibicao('joao')).toBe('Joao')
  })
})
