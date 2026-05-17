# Push Notifications — Guia de Setup e Testes

## ✅ O que foi implementado

### 1. Edge Function `admin-broadcast` (DEPLOYADA)
📍 Local: `supabase/functions/admin-broadcast/index.ts`
✓ Status: Deployada em `cbggntmqnulzdhpmying`

**O que faz:**
- Recebe broadcast params do admin
- Faz batch INSERT em `professional_notifications` usando `service_role` (ignora RLS)
- Busca tokens OneSignal de `professional_push_tokens`
- Envia 1 chamada OneSignal com N subscription IDs
- Retorna stats: `{ inserted, pushed, no_token_count }`

**Resolve o erro 403** porque usa `service_role` ao invés de chave `anon`

### 2. Atualização de `src/pages/Notifications.tsx`
✓ Substituído o insert direto pela chamada à Edge Function
✓ Melhor feedback de status (mostra quantos foram por push vs banco)

### 3. SQL de Referência
📍 Local: `supabase/migrations/fix_rls_prof_notifications.sql`
- Use se as policies RLS não estiverem ativas no banco
- Habilita RLS + cria as 3 policies necessárias

---

## 🔧 Setup necessário

### Já configurado ✓
- ✓ `ONESIGNAL_APP_ID` — secret no Supabase
- ✓ `ONESIGNAL_REST_API_KEY` — secret no Supabase
- ✓ Edge Function `admin-broadcast` — deployada

### No CRM dos profissionais
Adicionar no arquivo `.env` do CRM (iaparalucrar-crm):
```
VITE_ONESIGNAL_APP_ID=<seu-app-id-do-onesignal>
```

Depois fazer deploy da Edge Function `push-notifications` do CRM:
```bash
cd iaparalucrar-crm
supabase functions deploy push-notifications --project-ref cbggntmqnulzdhpmying
```

---

## 🧪 Como testar

### Teste 1: Sem OneSignal (mesmo sem o app configurado)
1. Abrir admin em http://localhost:5173/notificacoes
2. Clicar "Nova Notificação"
3. Preencher título e corpo
4. Selecionar profissionais (ou "Todos")
5. Clicar "Enviar Notificação"
6. **Esperado:** Sucesso com mensagem "Broadcast inserido no banco para X profissionais"
   - O 403 deve desaparecer
   - No CRM, ao abrir, a notificação aparece via Realtime Supabase

### Teste 2: Com OneSignal (app com push habilitado)
**Pré-requisitos:**
1. CRM com `VITE_ONESIGNAL_APP_ID` configurado
2. Profissional abriu o CRM e habilitou notificações push
3. OneSignal vê o token salvo em `professional_push_tokens`

**Teste:**
1. Admin envia broadcast (como acima)
2. **Esperado:** 
   - Mensagem de sucesso: "Broadcast enviado: X via push + Y no banco"
   - Dispositivo do profissional recebe notificação mesmo com app fechado
   - No Supabase Dashboard → Logs → vê a chamada à API do OneSignal

---

## 📊 Fluxo completo (após tudo configurado)

```mermaid
Admin (Notificações)
  ↓ (enviar broadcast)
Edge Function admin-broadcast
  ├→ INSERT em professional_notifications (service_role)
  ├→ Busca onesignal_ids de professional_push_tokens
  └→ POST https://onesignal.com/api/v1/notifications
        ↓ (profissional com app)
Service Worker (sw-custom.js)
  ├→ Recebe push
  ├→ Exibe notificação
  └→ Salva no banco via Realtime Supabase
        ↓ (profissional abre o app)
CRM (NotificationCenter)
  └→ Mostra notificação lida/não-lida
```

---

## 🔍 Monitoramento

### Ver logs da Edge Function
Dashboard Supabase → Functions → admin-broadcast → Invocations

### Ver tokens OneSignal registrados
```sql
SELECT professional_id, onesignal_id, updated_at 
FROM professional_push_tokens 
ORDER BY updated_at DESC 
LIMIT 10;
```

### Ver broadcasts enviados
```sql
SELECT * FROM professional_notifications 
WHERE category = 'admin_broadcast' 
ORDER BY created_at DESC 
LIMIT 20;
```

---

## ⚠️ Troubleshooting

### "Erro ao enviar broadcast"
1. Verificar se a Edge Function foi deployada:
   ```bash
   supabase functions list --project-ref cbggntmqnulzdhpmying
   ```
2. Verificar logs: Dashboard → Functions → admin-broadcast → Invocations
3. Verificar se `professional_ids` está vazio

### "OneSignal error"
1. Verificar se os secrets estão configurados no Supabase
2. Verificar se a chave REST está correta (não é a chave de app)
3. Verificar no dashboard OneSignal se o app está ativo

### Profissional não recebe push mesmo com token
1. Verificar se o CRM tem `VITE_ONESIGNAL_APP_ID` configurado
2. Verificar se OneSignal está logado no CRM: `window.OneSignal?.User?.PushSubscription?.id`
3. Verificar em `professional_push_tokens` se o token foi salvo
4. Verificar logs do OneSignal: https://dashboard.onesignal.com

---

## 📝 Próximos passos

1. Testar broadcast com profissionais
2. Configurar OneSignal App ID no CRM
3. Deploy do push-notifications do CRM
4. Monitorar taxa de entrega de push

---

**Implementado em:** 17 de Maio de 2026
**Versão:** 1.0
