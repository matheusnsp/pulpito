// Agenda no calendário do celular: feed .ics por token (ver CartaoCalendario.tsx).
// Deploy: supabase functions deploy agenda-ics --no-verify-jwt
import { createClient } from 'npm:@supabase/supabase-js@2';
const APP = Deno.env.get('APP_URL') ?? 'https://pulpito-rscp.vercel.app';
// Regras do formato de calendário (.ics)
const escapar = (s)=>s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const dataUTC = (d)=>d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
function dobrar(linha) {
  const letras = Array.from(linha);
  if (letras.length <= 60) return linha;
  const partes = [];
  for(let i = 0; i < letras.length; i += 60)partes.push((i ? ' ' : '') + letras.slice(i, i + 60).join(''));
  return partes.join('\r\n');
}
Deno.serve(async (req)=>{
  const token = new URL(req.url).searchParams.get('token') ?? '';
  if (!/^[a-f0-9]{32,}$/.test(token)) return new Response('Link inválido', {
    status: 404
  });
  const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
  const { data: dono } = await supabase.from('agenda_tokens').select('user_id').eq('token', token).maybeSingle();
  if (!dono) return new Response('Link inválido', {
    status: 404
  });
  // Compromissos dos últimos 60 dias em diante
  const desde = new Date(Date.now() - 60 * 86_400_000).toISOString();
  const { data: eventos, error } = await supabase.from('eventos').select('id, titulo, local, inicio, mensagem_id, lembretes, mensagens(titulo)').eq('user_id', dono.user_id).gte('inicio', desde).order('inicio');
  if (error) return new Response('Erro ao carregar a agenda', {
    status: 500
  });
  const agora = dataUTC(new Date());
  const linhas = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Pulpito//Agenda//PT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Pulpito',
    'X-WR-TIMEZONE:America/Sao_Paulo',
    'REFRESH-INTERVAL;VALUE=DURATION:PT15M',
    'X-PUBLISHED-TTL:PT15M'
  ];
  for (const ev of eventos ?? []){
    const inicio = new Date(ev.inicio);
    const fim = new Date(inicio.getTime() + 60 * 60_000);
    const titulo = ev.mensagens?.titulo;
    const url = ev.mensagem_id ? `${APP}/mensagem/${ev.mensagem_id}` : `${APP}/agenda`;
    linhas.push('BEGIN:VEVENT', `UID:${ev.id}@pulpito`, `DTSTAMP:${agora}`, `DTSTART:${dataUTC(inicio)}`, `DTEND:${dataUTC(fim)}`, `SUMMARY:${escapar(ev.titulo)}`);
    if (ev.local) linhas.push(`LOCATION:${escapar(ev.local)}`);
    linhas.push(`DESCRIPTION:${escapar((titulo ? `Mensagem: ${titulo}\n` : '') + `Abrir no Pulpito: ${url}`)}`, `URL:${url}`);
    for (const min of ev.lembretes ?? []){
      linhas.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escapar(ev.titulo)}`, `TRIGGER:-PT${min}M`, 'END:VALARM');
    }
    linhas.push('END:VEVENT');
  }
  linhas.push('END:VCALENDAR');
  return new Response(linhas.map(dobrar).join('\r\n') + '\r\n', {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Cache-Control': 'no-cache'
    }
  });
});
