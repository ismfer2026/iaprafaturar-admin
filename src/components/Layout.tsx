import React from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen" style={{ backgroundColor: '#F8FAFC' }}>
      <Sidebar />
      <div className="flex-1 ml-64 pt-16 overflow-auto">
        <Header />
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
