import React from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <Header />

      {/* espaço para sidebar + header fixos */}
      <div className="ml-64 pt-16 min-h-screen">
        <main className="p-6 bg-slate-50">{children}</main>
      </div>
    </div>
  )
}