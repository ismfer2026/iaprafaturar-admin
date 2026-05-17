import React from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--background)' }}>
      <a href="#main-content" className="skip-link">
        Pular para conteúdo principal
      </a>
      <Sidebar />
      <div style={{ marginLeft: 256, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Header />
        <main
          id="main-content"
          aria-label="Conteúdo principal"
          style={{ marginTop: 64, padding: 24, flex: 1 }}
        >
          {children}
        </main>
      </div>
    </div>
  )
}