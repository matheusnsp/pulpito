self.addEventListener('push', (event) => {
  let dados = {}
  try {
    dados = event.data ? event.data.json() : {}
  } catch {
    dados = { corpo: event.data ? event.data.text() : '' }
  }
  event.waitUntil(
    self.registration.showNotification(dados.titulo || 'Pulpito', {
      body: dados.corpo || '',
      icon: '/pwa-192x192.png',
      badge: '/pwa-64x64.png',
      tag: dados.tag,
      data: { url: dados.url || '/' },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL((event.notification.data && event.notification.data.url) || '/', self.location.origin).href
  event.waitUntil((async () => {
    const janelas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const janela of janelas) {
      if ('focus' in janela) {
        await janela.focus()
        if ('navigate' in janela) await janela.navigate(url)
        return
      }
    }
    await self.clients.openWindow(url)
  })())
})