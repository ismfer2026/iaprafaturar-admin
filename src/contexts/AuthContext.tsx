import React, { useState, useEffect, useRef } from 'react'
import type { Admin } from '../lib/auth'
import { signIn as authSignIn, signOut as authSignOut, getCurrentAdmin } from '../lib/auth'
import { AuthContext } from './AuthContextType'
import { supabase } from '../lib/supabase'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null)
  const [loading, setLoading] = useState(true)
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    // Verifica sessão inicial
    getCurrentAdmin().then((currentAdmin) => {
      setAdmin(currentAdmin)
      setLoading(false)
    }).catch(() => {
      setLoading(false)
    })

    // Escuta mudanças de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_OUT') {
        setAdmin(null)
      } else if (event === 'SIGNED_IN') {
        const currentAdmin = await getCurrentAdmin()
        setAdmin(currentAdmin)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSignIn = async (email: string, password: string) => {
    const result = await authSignIn(email, password)
    setAdmin(result)
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