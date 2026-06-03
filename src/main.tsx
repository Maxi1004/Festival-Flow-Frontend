import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/theme-overrides.css'
import './i18n'
import App from './App.tsx'
import { AuthProvider } from './context/AuthProvider.tsx'
import { applyFestivalFlowTheme, getStoredTheme } from './theme.ts'

applyFestivalFlowTheme(getStoredTheme())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
