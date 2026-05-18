import React from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { useI18n } from '../i18n'

export function Layout({ children }: { children: React.ReactNode }) {
  const { t } = useI18n()

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--background)' }}>
      <a href="#main-content" className="skip-link">
        {t('shell.skip_to_content')}
      </a>
      <Sidebar />
      <div style={{ marginLeft: 256, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Header />
        <main
          id="main-content"
          aria-label={t('shell.main_content')}
          style={{ marginTop: 64, padding: 24, flex: 1 }}
        >
          {children}
        </main>
      </div>
    </div>
  )
}