-- Colaboração: políticas que a migração original deveria ter criado e não chegaram ao banco.
-- Sem elas, quem aceita um convite não consegue abrir o projeto (RLS barra mensagens, tópicos e slides).
-- O dono continua passando por tudo: pulpito_papel_projeto devolve 'dono' para ele.

-- Dono imutável e pasta só pelo dono (função já existe; o trigger não estava ligado)
drop trigger if exists pulpito_proteger_dono on public.mensagens;
create trigger pulpito_proteger_dono before insert or update on public.mensagens
  for each row execute function public.pulpito_proteger_dono();

-- Mensagens: ler quem participa; editar dono e editor; excluir só o dono
drop policy if exists pulpito_msg_read on public.mensagens;
create policy pulpito_msg_read on public.mensagens for select to authenticated
  using (public.pulpito_papel_projeto(id) is not null);
drop policy if exists pulpito_msg_insert on public.mensagens;
create policy pulpito_msg_insert on public.mensagens for insert to authenticated
  with check (proprietario_compartilhamento = auth.uid());
drop policy if exists pulpito_msg_update on public.mensagens;
create policy pulpito_msg_update on public.mensagens for update to authenticated
  using (public.pulpito_papel_projeto(id) in ('dono', 'editor'))
  with check (public.pulpito_papel_projeto(id) in ('dono', 'editor'));
drop policy if exists pulpito_msg_delete_limit on public.mensagens;
create policy pulpito_msg_delete_limit on public.mensagens as restrictive for delete to authenticated
  using (proprietario_compartilhamento = auth.uid());

-- Tópicos e slides: leitores leem; dono e editor mexem
drop policy if exists pulpito_top_read on public.topicos;
create policy pulpito_top_read on public.topicos for select to authenticated
  using (public.pulpito_papel_projeto(mensagem_id) is not null);
drop policy if exists pulpito_top_insert on public.topicos;
create policy pulpito_top_insert on public.topicos for insert to authenticated
  with check (public.pulpito_papel_projeto(mensagem_id) in ('dono', 'editor'));
drop policy if exists pulpito_top_update on public.topicos;
create policy pulpito_top_update on public.topicos for update to authenticated
  using (public.pulpito_papel_projeto(mensagem_id) in ('dono', 'editor'))
  with check (public.pulpito_papel_projeto(mensagem_id) in ('dono', 'editor'));
drop policy if exists pulpito_top_delete on public.topicos;
create policy pulpito_top_delete on public.topicos for delete to authenticated
  using (public.pulpito_papel_projeto(mensagem_id) in ('dono', 'editor'));

drop policy if exists pulpito_slide_read on public.slides;
create policy pulpito_slide_read on public.slides for select to authenticated
  using (public.pulpito_papel_projeto(mensagem_id) is not null);
drop policy if exists pulpito_slide_insert on public.slides;
create policy pulpito_slide_insert on public.slides for insert to authenticated
  with check (public.pulpito_papel_projeto(mensagem_id) in ('dono', 'editor'));
drop policy if exists pulpito_slide_update on public.slides;
create policy pulpito_slide_update on public.slides for update to authenticated
  using (public.pulpito_papel_projeto(mensagem_id) in ('dono', 'editor'))
  with check (public.pulpito_papel_projeto(mensagem_id) in ('dono', 'editor'));
drop policy if exists pulpito_slide_delete on public.slides;
create policy pulpito_slide_delete on public.slides for delete to authenticated
  using (public.pulpito_papel_projeto(mensagem_id) in ('dono', 'editor'));

-- Políticas RESTRITIVAS: a antiga política de dono (user_id = quem está logado) aceitaria
-- um tópico ou slide inserido por um leitor, ou deixaria um colaborador bloqueado continuar
-- mexendo no que ele mesmo criou. As restritivas valem junto com as permissivas e fecham isso.
drop policy if exists pulpito_msg_read_limit on public.mensagens;
create policy pulpito_msg_read_limit on public.mensagens as restrictive for select to authenticated
  using (public.pulpito_papel_projeto(id) is not null);
drop policy if exists pulpito_msg_update_limit on public.mensagens;
create policy pulpito_msg_update_limit on public.mensagens as restrictive for update to authenticated
  using (public.pulpito_papel_projeto(id) in ('dono', 'editor'))
  with check (public.pulpito_papel_projeto(id) in ('dono', 'editor'));

drop policy if exists pulpito_top_read_limit on public.topicos;
create policy pulpito_top_read_limit on public.topicos as restrictive for select to authenticated
  using (public.pulpito_papel_projeto(mensagem_id) is not null);
drop policy if exists pulpito_top_insert_limit on public.topicos;
create policy pulpito_top_insert_limit on public.topicos as restrictive for insert to authenticated
  with check (public.pulpito_papel_projeto(mensagem_id) in ('dono', 'editor'));
drop policy if exists pulpito_top_update_limit on public.topicos;
create policy pulpito_top_update_limit on public.topicos as restrictive for update to authenticated
  using (public.pulpito_papel_projeto(mensagem_id) in ('dono', 'editor'))
  with check (public.pulpito_papel_projeto(mensagem_id) in ('dono', 'editor'));
drop policy if exists pulpito_top_delete_limit on public.topicos;
create policy pulpito_top_delete_limit on public.topicos as restrictive for delete to authenticated
  using (public.pulpito_papel_projeto(mensagem_id) in ('dono', 'editor'));

drop policy if exists pulpito_slide_read_limit on public.slides;
create policy pulpito_slide_read_limit on public.slides as restrictive for select to authenticated
  using (public.pulpito_papel_projeto(mensagem_id) is not null);
drop policy if exists pulpito_slide_insert_limit on public.slides;
create policy pulpito_slide_insert_limit on public.slides as restrictive for insert to authenticated
  with check (public.pulpito_papel_projeto(mensagem_id) in ('dono', 'editor'));
drop policy if exists pulpito_slide_update_limit on public.slides;
create policy pulpito_slide_update_limit on public.slides as restrictive for update to authenticated
  using (public.pulpito_papel_projeto(mensagem_id) in ('dono', 'editor'))
  with check (public.pulpito_papel_projeto(mensagem_id) in ('dono', 'editor'));
drop policy if exists pulpito_slide_delete_limit on public.slides;
create policy pulpito_slide_delete_limit on public.slides as restrictive for delete to authenticated
  using (public.pulpito_papel_projeto(mensagem_id) in ('dono', 'editor'));

-- Funções de colaboração só para quem está logado
revoke all on function public.pulpito_papel_projeto(uuid) from public, anon;
revoke all on function public.pulpito_criar_convite(uuid, text, integer, integer) from public, anon;
revoke all on function public.pulpito_aceitar_convite(text) from public, anon;
revoke all on function public.pulpito_listar_colaboradores(uuid) from public, anon;
revoke all on function public.pulpito_listar_convites(uuid) from public, anon;
revoke all on function public.pulpito_alterar_colaborador(uuid, uuid, text, boolean) from public, anon;
revoke all on function public.pulpito_revogar_convite(uuid, uuid) from public, anon;

notify pgrst, 'reload schema';
