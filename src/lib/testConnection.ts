import { supabase } from './supabase'

export async function testSupabaseConnection() {
  console.log('🧪 Iniciando testes de conexão com Supabase...\n')

  try {
    // Test 1: Verificar conexão
    console.log('1️⃣ Testando conexão com Supabase...')
    const { data: testData, error: testError } = await supabase
      .from('master_admins')
      .select('count')
      .limit(1)

    if (testError) {
      console.error('❌ Erro ao conectar:', testError)
      return
    }
    console.log('✅ Conexão bem-sucedida\n')

    // Test 2: Verificar se a tabela existe
    console.log('2️⃣ Verificando tabela master_admins...')
    const { data: allAdmins, error: allError } = await supabase
      .from('master_admins')
      .select('*')

    if (allError) {
      console.error('❌ Erro ao acessar tabela:', allError)
      return
    }
    console.log(`✅ Tabela encontrada com ${allAdmins?.length || 0} registros`)
    console.log('Registros:', allAdmins)
    console.log()

    // Test 3: Verificar usuário específico
    console.log('3️⃣ Buscando usuário ism01art@gmail.com...')
    const { data: adminUser, error: userError } = await supabase
      .from('master_admins')
      .select('*')
      .eq('email', 'ism01art@gmail.com')
      .single()

    if (userError) {
      console.error('❌ Erro ao buscar usuário:', userError)
      return
    }

    if (adminUser) {
      console.log('✅ Usuário encontrado:')
      console.log({
        id: adminUser.id,
        name: adminUser.name,
        email: adminUser.email,
        role: adminUser.role,
        is_active: adminUser.is_active,
        user_id: adminUser.user_id,
      })
      console.log()

      // Test 4: Verificar Auth
      console.log('4️⃣ Verificando sessão de Auth...')
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

      if (sessionError) {
        console.error('❌ Erro ao verificar sessão:', sessionError)
      } else if (sessionData.session) {
        console.log('✅ Sessão ativa:')
        console.log({
          user_email: sessionData.session.user.email,
          user_id: sessionData.session.user.id,
        })
      } else {
        console.log('⏸️ Nenhuma sessão ativa (esperado - você não está logado)')
      }
    } else {
      console.log('❌ Usuário não encontrado!')
    }
  } catch (error) {
    console.error('❌ Erro geral:', error)
  }
}
