import { supabase } from './supabase'

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

export async function signIn(email: string, password: string): Promise<Admin> {
  console.log('🔐 Tentando login com email:', email)
  
  // Faz login no Supabase Auth
  const { error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (authError) {
    console.error('❌ Erro de autenticação:', authError.message)
    throw new Error(authError.message)
  }

  console.log('✅ Autenticação bem-sucedida no Supabase Auth')

  // Verifica se o email existe na tabela master_admins
  const { data: adminData, error: dbError } = await supabase
    .from('master_admins')
    .select('*')
    .eq('email', email)
    .single()

  console.log('📊 Resposta da tabela master_admins:', { adminData, dbError })

  if (dbError || !adminData) {
    // Se não existir em master_admins, faz logout e rejeita
    console.error('❌ Usuário não encontrado em master_admins:', dbError?.message)
    await supabase.auth.signOut()
    throw new Error('Email não autorizado como administrador - não encontrado em master_admins')
  }

  // Verifica se o admin está ativo
  if (!adminData.is_active) {
    console.error('❌ Usuário existe mas está inativo:', adminData.email)
    await supabase.auth.signOut()
    throw new Error('Sua conta de administrador está inativa. Contate o suporte.')
  }

  // Atualiza o last_login_at
  const { error: updateError } = await supabase
    .from('master_admins')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', adminData.id)

  if (updateError) {
    console.warn('⚠️ Erro ao atualizar last_login_at:', updateError.message)
  }

  console.log('✅ Usuário autorizado:', adminData)
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

    if (sessionError || !sessionData.session) {
      return null
    }

    const { data: adminData, error } = await supabase
      .from('master_admins')
      .select('*')
      .eq('email', sessionData.session.user.email)
      .single()

    if (error || !adminData) {
      return null
    }

    return adminData as Admin
  } catch (error) {
    console.error('Erro ao obter admin atual:', error)
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
