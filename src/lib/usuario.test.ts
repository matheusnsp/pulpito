import { describe, expect, it } from 'vitest'
import {
  ehContaInterna, emailValido, identificadorDoUsuario, identificadorParaEmail, nomeDoUsuario,
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

describe('contas com e-mail de verdade', () => {
  it('reconhece a conta antiga pelo domínio interno', () => {
    expect(ehContaInterna(`maria.souza@${DOMINIO_INTERNO}`)).toBe(true)
    expect(ehContaInterna('maria@gmail.com')).toBe(false)
    expect(ehContaInterna(null)).toBe(false)
  })
  it('valida e-mail de forma simples', () => {
    expect(emailValido('maria@gmail.com')).toBe(true)
    expect(emailValido(' maria@igreja.org.br ')).toBe(true)
    expect(emailValido('maria.souza')).toBe(false)
    expect(emailValido('maria@')).toBe(false)
  })
  it('converte o que foi digitado no login em e-mail', () => {
    expect(identificadorParaEmail('Maria@Gmail.com')).toBe('maria@gmail.com')
    expect(identificadorParaEmail('Maria Souza')).toBe(`maria.souza@${DOMINIO_INTERNO}`)
  })
  it('nome vem dos dados da conta, do Google ou do usuário', () => {
    expect(nomeDoUsuario({ email: 'x@gmail.com', user_metadata: { nome: ' Pr. João ' } })).toBe('Pr. João')
    expect(nomeDoUsuario({ email: 'x@gmail.com', user_metadata: { full_name: 'João Silva' } })).toBe('João Silva')
    expect(nomeDoUsuario({ email: `maria.souza@${DOMINIO_INTERNO}` })).toBe('Maria Souza')
    expect(nomeDoUsuario({ email: 'pedro.lima@gmail.com', user_metadata: {} })).toBe('Pedro Lima')
    expect(nomeDoUsuario(null)).toBe('')
  })
  it('identificador mostra usuário antigo ou e-mail real', () => {
    expect(identificadorDoUsuario({ email: `maria.souza@${DOMINIO_INTERNO}` })).toBe('maria.souza')
    expect(identificadorDoUsuario({ email: 'maria@gmail.com' })).toBe('maria@gmail.com')
  })
})
