import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { testSupabaseConnection } from './lib/testConnection'

// Expor função de teste globalmente
declare global {
  interface Window {
    testSupabaseConnection: typeof testSupabaseConnection
  }
}

if (typeof window !== 'undefined') {
  window.testSupabaseConnection = testSupabaseConnection
  console.log('🧪 Para testar a conexão com Supabase, execute: testSupabaseConnection()')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
