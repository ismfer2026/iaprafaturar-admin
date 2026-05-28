import { supabase } from './supabase'

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function isStrongPassword(password: string): boolean {
  return password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password) && /[!@#$%^&*]/.test(password)
}

export interface Admin {
  id: string
  user_id: string
  email: string
  name: string
  role: string
  is_active: boolean
  last_login_at?: string
  created_at: string
  updated_at: string
}

const UNAUTHORIZED_MESSAGE = 'Credenciais invalidas ou acesso nao autorizado'

const debugLog = (...args: unknown[]) => {
  if (import.meta.env.DEV) console.log('[Auth]', ...args)
}

const debugError = (...args: unknown[]) => {
  if (import.meta.env.DEV) console.error('[Auth]', ...args)
}

const debugWarn = (...args: unknown[]) => {
  if (import.meta.env.DEV) console.warn('[Auth]', ...args)
}

async function fetchCurrentAdmin(updateLastLogin = false): Promise<Admin | null> {
  const { data, error } = await supabase.functions.invoke('get-current-admin', {
    body: { update_last_login: updateLastLogin },
  })

  if (error) {
    debugError('Erro ao validar admin:', error.message)
    return null
  }

  return data?.admin ? data.admin as Admin : null
}

export async function signIn(email: string, password: string): Promise<Admin> {
  debugLog('Tentando login com:', email)

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (authError || !authData.user) {
    debugError('Erro de autenticacao:', authError?.message)
    throw new Error(UNAUTHORIZED_MESSAGE)
  }

  debugLog('Usuario autenticado:', authData.user.id)

  const adminData = await fetchCurrentAdmin(true)

  if (!adminData) {
    debugError('Admin nao encontrado no banco de dados')
    await supabase.auth.signOut()
    throw new Error(UNAUTHORIZED_MESSAGE)
  }

  if (!adminData.is_active) {
    debugError('Admin inativo')
    await supabase.auth.signOut()
    throw new Error(UNAUTHORIZED_MESSAGE)
  }

  debugLog('Admin autenticado com sucesso:', adminData.name)
  return adminData
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) {
    throw new Error(error.message)
  }
}

export async function getCurrentAdmin(): Promise<Admin | null> {
  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

    if (sessionError) {
      debugError('Erro ao buscar sessao:', sessionError.message)
      return null
    }

    if (!sessionData.session) {
      debugLog('Nenhuma sessao ativa')
      return null
    }

    debugLog('Sessao encontrada:', sessionData.session.user.id)

    const adminData = await fetchCurrentAdmin(false)

    if (!adminData) {
      debugError('Admin nao encontrado')
      return null
    }

    if (!adminData.is_active) {
      debugWarn('Admin inativo')
      return null
    }

    debugLog('Admin carregado:', adminData.name)
    return adminData
  } catch (error) {
    debugError('Erro geral em getCurrentAdmin:', error)
    return null
  }
}

export async function onAuthStateChange(callback: (admin: Admin | null) => void) {
  const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
    if (!session) {
      callback(null)
      return
    }

    const admin = await getCurrentAdmin()
    callback(admin)
  })

  return data?.subscription
}
