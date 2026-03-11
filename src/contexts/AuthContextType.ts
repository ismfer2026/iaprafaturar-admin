import { createContext } from 'react'

export interface AuthContextType {
  admin: {
    id: string
    email: string
    name: string
    role: string
  } | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)
