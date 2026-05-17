# 🔧 Guia: Replicação da Lógica Supabase do App Funcional

## O que foi feito

Replicamos a configuração e padrão de queries do **app funcional** (iaparalucrar-crm) no **admin** (iaprafaturar-admin).

### Mudanças implementadas:

#### 1. ✅ `src/lib/supabase.ts`
- Adicionado `persistSession: true` (persiste autenticação)
- Adicionado `autoRefreshToken: true` (renova token automaticamente)
- Adicionado `detectSessionInUrl: true` (detecta sessão em URLs)
- Adicionado `customFetch` com retry automático (reconexão em caso de erro)
- Adicionado `localStorage` para armazenar sessão

**Efeito:** A sessão agora persiste ao recarregar a página, e há reconexão automática em falhas.

---

#### 2. ✅ `src/lib/auth.ts`
- Adicionado `debugLog()` para rastrear autenticação em desenvolvimento
- Melhorado tratamento de erros com mensagens descritivas
- Adicionado logging em cada etapa de `signIn()` e `getCurrentAdmin()`

**Efeito:** No Console do navegador (F12), você verá exatamente onde falhou (auth, DB, ou tabela).

---

#### 3. ✅ `src/lib/supabase-debug.ts` (NOVO)
Utilitário para debug de queries:
```typescript
debugQuery('professionals', 'SELECT', { limit: 100 })
debugQueryError('plans', 'SELECT', error)
debugQuerySuccess('clients', 'INSERT', 5)
```

**Use em seus componentes:**
```typescript
import { debugQuery, debugQueryError, debugQuerySuccess } from '@/lib/supabase-debug'

const { data, error } = await supabase.from('professionals').select('*')
if (error) {
  debugQueryError('professionals', 'SELECT', error)
} else {
  debugQuerySuccess('professionals', 'SELECT', data?.length || 0)
}
```

---

#### 4. ✅ `src/pages/Debug.tsx` (NOVO)
Página de diagnóstico em tempo real.

**Acessar:** http://localhost:5173/debug (apenas em desenvolvimento)

**O que testa:**
- ✅ Conexão Supabase
- ✅ Sessão ativa
- ✅ Acesso à tabela `master_admins`
- ✅ Acesso à tabela `professionals`
- ✅ Acesso à tabela `plans`
- ✅ Acesso à tabela `agent_logs`

---

#### 5. ✅ `src/App.tsx`
Adicionada rota de debug:
```typescript
{import.meta.env.DEV && <Route path="/debug" element={...} />}
```

---

## 🚀 Próximos Passos - TESTAR AGORA

### Passo 1: Limpar cache e testar
```bash
# No terminal, na pasta do admin:
npm run dev
```

### Passo 2: Acessar a página de Debug
1. Faça login em http://localhost:5173/login
2. Acesse http://localhost:5173/debug
3. Clique em **"Executar Testes de Conexão"**

### Passo 3: Verificar Console
Abra o Console do navegador (F12) e procure por:
- 🔐 `[Auth]` — Logs de autenticação
- 📊 `[Supabase]` — Logs de queries
- ❌ Mensagens de erro (se houver)

---

## 📋 Possíveis Erros e Soluções

### ❌ "Error: new row violates row-level security policy"
**Causa:** RLS está bloqueando leitura
**Solução:**
1. Vá para Supabase → Authentication → Policies
2. Para cada tabela sem dados:
   - Se RLS está ON → Configure policy SELECT para usuários autenticados
   - OU desabilite RLS se é admin interno

### ❌ "Error: relation does not exist"
**Causa:** Tabela não existe no banco
**Solução:** Verifique se a migração SQL foi executada no Supabase

### ❌ "Error: Failed to connect"
**Causa:** Sem internet ou Supabase indisponível
**Solução:** Verifique conexão de internet e status do Supabase

### ✅ Tudo verde?
Dados devem aparecer em todas as páginas agora!

---

## 🔄 Aplicando Debug em Suas Páginas

### Exemplo: Atualizar Dashboard.tsx

```typescript
import { debugQuery, debugQueryError, debugQuerySuccess } from '@/lib/supabase-debug'

const fetchDashboardData = async () => {
  try {
    // Exemplo 1: COUNT
    debugQuery('professional_subscriptions', 'COUNT')
    const { count, error: err1 } = await supabase
      .from('professional_subscriptions')
      .select('*', { count: 'exact' })
      .eq('status', 'active')
    
    if (err1) {
      debugQueryError('professional_subscriptions', 'COUNT', err1)
    } else {
      debugQuerySuccess('professional_subscriptions', 'COUNT', count || 0)
    }
    
    // Exemplo 2: SELECT
    debugQuery('agent_logs', 'SELECT', { limit: 1000 })
    const { data, error: err2 } = await supabase
      .from('agent_logs')
      .select('agent_slug, tokens_used, created_at, status')
      .limit(1000)
    
    if (err2) {
      debugQueryError('agent_logs', 'SELECT', err2)
    } else {
      debugQuerySuccess('agent_logs', 'SELECT', data?.length || 0)
    }
  } catch (e) {
    console.error('Erro geral:', e)
  }
}
```

---

## 📊 Checklist de Verificação

- [ ] npm run dev executa sem erros
- [ ] Consegue fazer login
- [ ] Página /debug carrega
- [ ] Testes de conexão passam ✅
- [ ] Console não mostra erros ❌
- [ ] Dashboard carrega dados
- [ ] Professionals mostra lista
- [ ] Plans carrega corretamente
- [ ] Metrics exibe gráficos

---

## 💡 Dica: Monitorar em Tempo Real

Adicione isto no seu navegador Console para monitorar queries:

```javascript
// No Console (F12), execute:
const originalLog = console.log
console.log = function(...args) {
  if (String(args[0]).includes('[Supabase]') || String(args[0]).includes('[Auth]')) {
    console.warn(...args)  // Destaca em amarelo
  }
  originalLog(...args)
}
```

---

## 🆘 Se Nada Funcionar

1. **Limpe o cache:**
   ```bash
   npm run dev -- --force
   ```

2. **Verifique as variáveis de ambiente:**
   ```bash
   cat .env.local | grep SUPABASE
   ```

3. **Teste a conexão manual no Console:**
   ```javascript
   const { supabase } = await import('/src/lib/supabase.ts')
   const { data, error } = await supabase.from('professionals').select('*').limit(1)
   console.log(data, error)
   ```

4. **Verifique o Supabase Dashboard:**
   - Tabelas existem?
   - Há dados nas tabelas?
   - RLS está configurado corretamente?

---

**Sucesso! 🎉**

Quando os testes passarem, replique o padrão de debug em cada página do admin.
