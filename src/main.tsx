import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@fontsource-variable/manrope'
import '@fontsource-variable/bricolage-grotesque/standard.css'
import './styles/global.css'
import App from './App'
import { loadContent } from './content/store'

// obsah z administrace se načte na pozadí; do té doby web ukazuje výchozí obsah
if (!location.pathname.startsWith('/admin')) loadContent()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
