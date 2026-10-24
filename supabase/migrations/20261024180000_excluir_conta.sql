-- Excluir a própria conta. Apaga o usuário em auth.users; as tabelas do app têm chave
-- estrangeira em cascata, então mensagens, tópicos, slides, pastas, agenda, aulas, respostas,
-- versões e participações em projetos de outros somem junto. Convites não têm cascata pelo
-- criador, então saem antes. As fotos do bucket o app apaga pela Storage API antes de chamar aqui.
create or replace function public.excluir_minha_conta()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario uuid := auth.uid();
begin
  if v_usuario is null then
    raise exception 'É necessário entrar na conta';
  end if;
  delete from public.projeto_convites where criado_por = v_usuario;
  delete from auth.users where id = v_usuario;
end
$$;

revoke all on function public.excluir_minha_conta() from public, anon;
grant execute on function public.excluir_minha_conta() to authenticated;

notify pgrst, 'reload schema';
