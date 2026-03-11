import React, { useState, useEffect } from 'react'
import type { Admin } from '../lib/auth'
import { signIn as authSignIn, signOut as authSignOut, getCurrentAdmin, onAuthStateChange } from '../lib/auth'
import { AuthContext } from './AuthContextType'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Verifica se há sessão ativa ao montar
    getCurrentAdmin()
      .then((currentAdmin) => {
        setAdmin(currentAdmin)
        setLoading(false)
      })
      .catch((error) => {
        console.error('Erro ao carregar admin:', error)
        setLoading(false)
      })

    // Inscreve-se a mudanças no estado de autenticação
    onAuthStateChange((currentAdmin) => {
      setAdmin(currentAdmin)
    })
  }, [])

  const handleSignIn = async (email: string, password: string) => {
    const admin = await authSignIn(email, password)
    setAdmin(admin)
  }

  const handleSignOut = async () => {
    await authSignOut()
    setAdmin(null)
  }

  return (
    <AuthContext.Provider value={{ admin, loading, signIn: handleSignIn, signOut: handleSignOut }}>
      {children}
    </AuthContext.Provider>
  )
}
