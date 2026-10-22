#!/usr/bin/env python3
"""Hotfix reversível para o acesso a projetos do Púlpito.
Não se conecta ao Supabase e não altera dados do banco.
Execute na raiz do repositório: python3 corrigir_pulpito.py
"""
from pathlib import Path
from datetime import datetime
import shutil
import sys

ROOT = Path.cwd()
ARCHIVE = ROOT / '.pulpito-backup' / ('hotfix-criacao-' + datetime.now().strftime('%Y%m%d-%H%M%S'))
LIB = ROOT / 'src/lib/compartilhamento.ts'
PAGE = ROOT / 'src/components/ProjetoGate.tsx'

OLD = '''export async function papelProjeto(id: string): Promise<PapelProjeto> {
  const { data, error } = await supabase.rpc('pulpito_papel_projeto', { p_mensagem_id: id })
  if (error) throw error
  return (data ?? null) as PapelProjeto
}'''
NEW = '''/**
 * Mantém o controle de acesso do Supabase.
 * Se a RPC de colaboração ainda não estiver disponível ou falhar,
 * o proprietário ainda pode abrir SEUS projetos legados. Apenas o
 * próprio proprietário (user_id == auth.uid()) recebe esse fallback.
 * O SELECT também permanece sujeito à RLS original do banco.
 */
export async function papelProjeto(id: string): Promise<PapelProjeto> {
  const { data, error } = await supabase.rpc('pulpito_papel_projeto', { p_mensagem_id: id })
  if (!error && data) return data as PapelProjeto

  // Não concede permissão a convidados nem a projetos de terceiros.
  // Suporta instalações onde o SQL de colaboração ainda não foi aplicado.
  const { data: autenticacao, error: erroAuth } = await supabase.auth.getUser()
  if (!erroAuth && autenticacao.user) {
    const { data: projeto, error: erroProjeto } = await supabase.from('mensagens')
      .select('user_id').eq('id', id).maybeSingle()
    if (!erroProjeto && projeto?.user_id === autenticacao.user.id) return 'dono'
  }

  if (error) throw error
  return null
}'''

OLD2 = """  if (papel === 'carregando') return <p className=\"p-8 text-texto-2\">Conferindo o acesso ao projeto…</p>"""
NEW2 = """  if (papel === 'carregando') return <p className=\"p-8 text-texto-2\">Conferindo o acesso ao projeto…</p>"""

def main():
    if not (ROOT / 'package.json').is_file() or not LIB.is_file() or not PAGE.is_file():
        sys.exit('ERRO: entre na pasta raiz do repositório pulpito (com package.json) e tente novamente.')
    contents = LIB.read_text(encoding='utf-8')
    if NEW in contents:
        print('Hotfix já aplicado. Nenhuma alteração necessária.')
        return
    if contents.count(OLD) != 1:
        sys.exit('ERRO: arquivo src/lib/compartilhamento.ts diferente do esperado. Não alterei nada.')
    # Teste extra de integridade: garante que a rota protegida segue usando o papel.
    gate = PAGE.read_text(encoding='utf-8')
    if "papelProjeto(id)" not in gate:
        sys.exit('ERRO: estrutura de ProjetoGate não encontrada. Nenhum arquivo alterado.')
    ARCHIVE.mkdir(parents=True, exist_ok=False)
    backup = ARCHIVE / 'compartilhamento.ts'
    shutil.copy2(LIB, backup)
    LIB.write_text(contents.replace(OLD, NEW), encoding='utf-8')
    print('HOTFIX APLICADO: proprietário pode abrir seus projetos com RLS legada.')
    print('BACKUP:', backup)
    print('Agora execute: npm run build')
    print('Depois: git add src/lib/compartilhamento.ts && git commit -m "fix: restaurar acesso do dono aos projetos" && git push origin main')
    print('IMPORTANTE: não execute novamente a migração SQL antiga. Convites exigem a migração corrigida.')

if __name__ == '__main__':
    main()
