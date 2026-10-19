import { supabase } from './supabase'

/* Envia uma imagem para o armazenamento do usuário e devolve o endereço público */
export async function enviarImagem(usuarioId: string, file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Escolha um arquivo de imagem.')
  if (file.size > 5 * 1024 * 1024) throw new Error('Imagem muito grande. O máximo é 5 MB.')
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const caminho = `${usuarioId}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from('fundos')
    .upload(caminho, file, { cacheControl: '31536000', contentType: file.type })
  if (error) throw new Error('Não foi possível enviar a imagem.')
  return supabase.storage.from('fundos').getPublicUrl(caminho).data.publicUrl
}
