-- Correção urgente: "insert … returning" em mensagens falhava com
-- "new row violates row-level security policy pulpito_msg_read_limit".
-- O Postgres aplica a política de SELECT à linha devolvida pelo RETURNING, e
-- pulpito_papel_projeto ainda não enxerga a linha recém-inserida na mesma instrução.
-- O dono passa a ser reconhecido direto pela coluna, sem depender da função.
drop policy if exists pulpito_msg_read_limit on public.mensagens;
create policy pulpito_msg_read_limit on public.mensagens as restrictive for select to authenticated
  using (proprietario_compartilhamento = auth.uid() or public.pulpito_papel_projeto(id) is not null);

notify pgrst, 'reload schema';
