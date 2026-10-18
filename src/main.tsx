import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@fontsource/atkinson-hyperlegible-next/400.css'
import '@fontsource/atkinson-hyperlegible-next/700.css'
import '@fontsource-variable/literata'
import '@fontsource-variable/plus-jakarta-sans'
import { AuthProvider } from './lib/auth'
import { iniciarTema } from './lib/tema'
import App from './App'
import AvisoAtualizacao from './components/AvisoAtualizacao'
import AvisoOffline from './components/AvisoOffline'
import './index.css'

iniciarTema()

/* Tira o ?v= deixado pelo botão "Carregar última versão" */
if (new URLSearchParams(window.location.search).has('v')) {
  const url = new URL(window.location.href)
  url.searchParams.delete('v')
  window.history.replaceState(window.history.state, '', url.toString())
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <AvisoAtualizacao />
        <AvisoOffline />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
)