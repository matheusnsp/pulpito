import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@fontsource/atkinson-hyperlegible-next/400.css'
import '@fontsource/atkinson-hyperlegible-next/700.css'
import '@fontsource-variable/literata'
import { AuthProvider } from './lib/auth'
import { iniciarTema } from './lib/tema'
import App from './App'
import AvisoAtualizacao from './components/AvisoAtualizacao'
import './index.css'

iniciarTema()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <AvisoAtualizacao />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
)