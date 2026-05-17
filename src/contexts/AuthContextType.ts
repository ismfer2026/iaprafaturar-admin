import { createContext } from 'react'

export interface AuthContextType {
  admin: {
    id: string
    user_id: string
    email: string
    name: string
    role: string
    is_active: boolean
  } | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)
