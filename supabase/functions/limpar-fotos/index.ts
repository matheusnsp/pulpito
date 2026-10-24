// Apaga do bucket 'fundos' as fotos que não aparecem em nenhum slide há mais de um dia.
// Chamada por cron com o cabeçalho x-cron-secret. Deploy: supabase functions deploy limpar-fotos --no-verify-jwt
import { createClient } from 'npm:@supabase/supabase-js@2';
const BALDE = 'fundos';
const UM_DIA = 86_400_000;
Deno.serve(async (req)=>{
  if (req.headers.get('x-cron-secret') !== Deno.env.get('CRON_SECRET')) {
    return new Response('proibido', {
      status: 401
    });
  }
  const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
  // 1) Fotos que ainda estão em algum slide: no fundo, na foto do layout (estilo.foto)
  //    ou nos elementos soltos (estilo.elementos[].url). Esquecer um desses apaga foto em uso.
  const usadas = new Set<string>();
  const marcador = `/object/public/${BALDE}/`;
  const marcar = (url: unknown) => {
    if (typeof url !== 'string') return;
    const i = url.indexOf(marcador);
    if (i >= 0) usadas.add(decodeURIComponent(url.slice(i + marcador.length)));
  };
  for(let de = 0;; de += 1000){
    const { data, error } = await supabase.from('slides').select('fundo, estilo').range(de, de + 999);
    if (error) return new Response(error.message, {
      status: 500
    });
    for (const s of data ?? []){
      marcar(s.fundo);
      marcar(s.estilo?.foto);
      for (const el of s.estilo?.elementos ?? []) marcar(el?.url);
    }
    if (!data || data.length < 1000) break;
  }
  // 2) Todas as fotos guardadas (uma pasta por usuário)
  const apagar: string[] = [];
  const { data: pastas, error: erroPastas } = await supabase.storage.from(BALDE).list('', {
    limit: 1000
  });
  if (erroPastas) return new Response(erroPastas.message, {
    status: 500
  });
  for (const pasta of pastas ?? []){
    if (pasta.id) continue; // arquivo solto na raiz, não é pasta de usuário
    for(let de = 0;; de += 1000){
      const { data: arquivos, error } = await supabase.storage.from(BALDE).list(pasta.name, {
        limit: 1000,
        offset: de
      });
      if (error) break;
      for (const a of arquivos ?? []){
        const caminho = `${pasta.name}/${a.name}`;
        const idade = Date.now() - new Date(a.created_at).getTime();
        if (!usadas.has(caminho) && idade > UM_DIA) apagar.push(caminho);
      }
      if (!arquivos || arquivos.length < 1000) break;
    }
  }
  // 3) Apaga em lotes
  let apagadas = 0;
  for(let i = 0; i < apagar.length; i += 500){
    const lote = apagar.slice(i, i + 500);
    const { error } = await supabase.storage.from(BALDE).remove(lote);
    if (!error) apagadas += lote.length;
  }
  return Response.json({
    ok: true,
    emUso: usadas.size,
    apagadas
  });
});
