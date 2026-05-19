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

const debugLog = (...args: unknown[]) => {
  if (import.meta.env.DEV) console.log('🔐 [Auth]', ...args)
}

const debugError = (...args: unknown[]) => {
  if (import.meta.env.DEV) console.error('❌ [Auth]', ...args)
}

export async function signIn(email: string, password: string): Promise<Admin> {
  debugLog('Tentando login com:', email)

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (authError) {
    debugError('Erro de autenticação:', authError.message)
    throw new Error('Credenciais inválidas ou acesso não autorizado')
  }

  if (!authData.user) {
    debugError('Nenhum usuário retornado')
    throw new Error('Credenciais inválidas ou acesso não autorizado')
  }

  debugLog('Usuário autenticado:', authData.user.id)

  const { data: adminData, error: dbError } = await supabase
    .from('master_admins')
    .select('*')
    .eq('user_id', authData.user.id)
    .single()

  if (dbError) {
    debugError('Erro ao buscar admin no DB:', dbError.message)
    await supabase.auth.signOut()
    throw new Error('Credenciais inválidas ou acesso não autorizado')
  }

  if (!adminData) {
    debugError('Admin não encontrado no banco de dados')
    await supabase.auth.signOut()
    throw new Error('Credenciais inválidas ou acesso não autorizado')
  }

  if (!adminData.is_active) {
    debugError('Admin inativo')
    await supabase.auth.signOut()
    throw new Error('Credenciais inválidas ou acesso não autorizado')
  }

  debugLog('Admin autenticado com sucesso:', adminData.name)

  await supabase
    .from('master_admins')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', adminData.id)

  return adminData as Admin
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
      debugError('Erro ao buscar sessão:', sessionError.message)
      return null
    }

    if (!sessionData.session) {
      debugLog('Nenhuma sessão ativa')
      return null
    }

    debugLog('Sessão encontrada:', sessionData.session.user.id)

    const { data: adminData, error } = await supabase
      .from('master_admins')
      .select('*')
      .eq('user_id', sessionData.session.user.id)
      .single()

    if (error) {
      debugError('Erro ao buscar admin:', error.message)
      return null
    }

    if (!adminData) {
      debugError('Admin não encontrado')
      return null
    }

    if (!adminData.is_active) {
      debugWarn('Admin inativo')
      return null
    }

    debugLog('Admin carregado:', adminData.name)
    return adminData as Admin
  } catch (error) {
    debugError('Erro geral em getCurrentAdmin:', error)
    return null
  }
}

const debugWarn = (...args: unknown[]) => {
  if (import.meta.env.DEV) console.warn('⚠️ [Auth]', ...args)
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
