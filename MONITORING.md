# 📊 Monitoramento com Sentry

Guia rápido para ativar error tracking e monitoring em produção.

---

## 🚀 Setup (5 minutos)

### 1. Criar projeto no Sentry

1. Acesse [sentry.io](https://sentry.io)
2. Sign up / Login
3. "Create Project" → selecione **React**
4. Copie o **DSN** (URL parecida com `https://xxx@yyy.ingest.sentry.io/123`)

### 2. Configurar variáveis de ambiente

**Local:**
```bash
# Edite .env
VITE_SENTRY_DSN=https://seu-dsn@seu-org.ingest.sentry.io/seu-id
VITE_APP_VERSION=0.0.1
```

**Vercel:**
1. Acesse Settings → Environment Variables
2. Adicione `VITE_SENTRY_DSN` com o valor do passo 1
3. Deploy automático é disparado

### 3. Verificar

```bash
npm run dev
# Abra DevTools → Console
# Deve aparecer: ⚠️ Sentry DSN não configurado (se vazio)
# ou nada (se configurado)
```

---

## 📈 O que é Monitorado

| Evento | Capturado | Ação |
|--------|-----------|------|
| **JavaScript Errors** | ✅ Automático | Enviado em tempo real |
| **React Component Crashes** | ✅ Error Boundary | Fallback UI exibida |
| **Performance** | ✅ Tracing | 10% das transações em prod |
| **Network Errors** | ✅ Fetch/XHR | Com retry count |
| **Session Replay** | ❌ Não ativado | (Requer @sentry/browser) |

---

## 🎛️ Dashboard Sentry

Após configurado, acesse `sentry.io → Issues`:

- **Issues** — lista de erros com stack trace
- **Releases** — versões e commits associados
- **Performance** — tempo de carregamento, queries lentas
- **Alerts** — notificações em tempo real

### Configurar Alertas

1. Settings → Alerts
2. "New Alert Rule"
3. Condição: `"An issue is seen X times in Y minutes"`
4. Notificação: Email / Slack

---

## 🔗 Integração GitHub (Opcional)

Para vincular commits a erros:

1. Settings → Integrations → GitHub
2. Conectar repositório
3. Commits aparecem no erro com diff

---

## 🧪 Testar (Local)

```typescript
// Em qualquer componente/função:
import { Sentry } from '@/lib/sentry';

Sentry.captureException(new Error('Teste'));
Sentry.captureMessage('Mensagem de teste', 'info');
```

---

## 📊 Quotas Gratuitas

| Plano | Eventos/Mês | Preço |
|-------|-------------|-------|
| **Free** | 5.000 | Grátis |
| **Pro** | 50.000 | $29/mês |
| **Team** | Ilimitado | $299/mês |

Admin é small project → free é suficiente.

---

## 🔒 Privacidade

Por padrão:
- ✅ Senhas/tokens não são capturados
- ✅ URLs sensíveis mascaradas
- ✅ Dados pessoais não são enviados

Customize em `src/lib/sentry.ts`:
```typescript
Sentry.init({
  beforeSend(event, hint) {
    // Filtrar eventos aqui
    return event;
  },
});
```

---

## 📞 Troubleshooting

| Problema | Solução |
|----------|---------|
| "Sentry DSN não configurado" | Adicionar VITE_SENTRY_DSN em .env |
| Erros não aparecem | Verificar se DSN é válido em sentry.io |
| Performance lento | Reduzir `tracesSampleRate` em sentry.ts |
| Muitos erros | Implementar `beforeSend` para filtrar |

---

**Status:** ✅ Configurado  
**Próximo:** Setup de alertas no Sentry
