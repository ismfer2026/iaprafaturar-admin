import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export function DebugPage() {
  const { admin } = useAuth()
  const [results, setResults] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const addLog = (msg: string) => {
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`])
  }

  const testConnection = async () => {
    setLoading(true)
    setResults([])

    try {
      addLog('1️⃣ Testando conexão básica...')
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError) {
        addLog(`❌ Erro de sessão: ${sessionError.message}`)
        return
      }

      if (!session) {
        addLog('❌ Nenhuma sessão ativa!')
        return
      }

      addLog(`✅ Sessão ativa: ${session.user.id}`)

      // Test 1: Check master_admins table
      addLog('2️⃣ Testando tabela master_admins...')
      const { data: adminData, error: adminError, count: adminCount } = await supabase
        .from('master_admins')
        .select('*', { count: 'exact' })
        .eq('user_id', session.user.id)

      if (adminError) {
        addLog(`❌ Erro ao ler master_admins: ${adminError.message}`)
      } else {
        addLog(`✅ master_admins: ${adminCount} registros encontrados`)
        if (adminData) {
          addLog(`   → Admin: ${adminData[0]?.name || 'N/A'}`)
        }
      }

      // Test 2: Check professionals table
      addLog('3️⃣ Testando tabela professionals...')
      const { error: profError, count: profCount } = await supabase
        .from('professionals')
        .select('*', { count: 'exact' })
        .limit(5)

      if (profError) {
        addLog(`❌ Erro ao ler professionals: ${profError.message}`)
      } else {
        addLog(`✅ professionals: ${profCount} registros no total, 5 primeiros carregados`)
      }

      // Test 3: Check plans table
      addLog('4️⃣ Testando tabela plans...')
      const { error: plansError, count: plansCount } = await supabase
        .from('plans')
        .select('*', { count: 'exact' })

      if (plansError) {
        addLog(`❌ Erro ao ler plans: ${plansError.message}`)
      } else {
        addLog(`✅ plans: ${plansCount} registros encontrados`)
      }

      // Test 4: Check agent_logs table
      addLog('5️⃣ Testando tabela agent_logs...')
      const { error: logsError, count: logsCount } = await supabase
        .from('agent_logs')
        .select('*', { count: 'exact' })
        .limit(5)

      if (logsError) {
        addLog(`❌ Erro ao ler agent_logs: ${logsError.message}`)
      } else {
        addLog(`✅ agent_logs: ${logsCount} registros no total`)
      }

      addLog('✅ Teste completo!')
    } catch (error) {
      addLog(`❌ Erro geral: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '32px', maxWidth: '900px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '16px' }}>🔧 Página de Debug</h1>

      <div style={{ marginBottom: '24px', padding: '16px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
        <p style={{ margin: '0 0 8px', fontWeight: 600 }}>Estado da Autenticação:</p>
        <p style={{ margin: '0', fontSize: '14px' }}>
          {admin ? `✅ Logado como: ${admin.name} (${admin.email})` : '❌ Não autenticado'}
        </p>
      </div>

      <button
        onClick={testConnection}
        disabled={loading}
        style={{
          padding: '12px 24px',
          background: '#0D6E6E',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: 600,
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.6 : 1,
          marginBottom: '24px',
        }}
      >
        {loading ? 'Testando...' : 'Executar Testes de Conexão'}
      </button>

      <div style={{ background: '#1a202c', color: '#e2e8f0', padding: '16px', borderRadius: '8px', fontFamily: 'monospace', fontSize: '12px', height: '400px', overflowY: 'auto' }}>
        {results.length === 0 ? (
          <p style={{ color: '#64748b', margin: 0 }}>Clique no botão acima para executar os testes...</p>
        ) : (
          results.map((result, i) => (
            <div key={i} style={{ marginBottom: '4px', lineHeight: '1.4' }}>
              {result}
            </div>
          ))
        )}
      </div>

      <div style={{ marginTop: '24px', padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <p style={{ margin: '0 0 8px', fontWeight: 600, fontSize: '14px' }}>📝 Instruções:</p>
        <ol style={{ margin: '0', paddingLeft: '20px', fontSize: '13px', lineHeight: '1.6' }}>
          <li>Abra o <strong>Console do Navegador</strong> (F12)</li>
          <li>Clique em "Executar Testes de Conexão"</li>
          <li>Verifique os resultados acima</li>
          <li>Se houver erros de RLS, vá para o Supabase e configure as policies</li>
          <li>Se houver erros de conexão, verifique o .env.local</li>
        </ol>
      </div>
    </div>
  )
}
