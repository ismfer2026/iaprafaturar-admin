# CHANGELOG

## [2026-04-17] — Correções de Schema PT → EN

### Contexto
O banco Supabase compartilhado foi renomeado de português para inglês. Esta sessão corrigiu todas as páginas do admin que ainda referenciavam a tabela `empresas` e colunas antigas.

---

### `src/pages/Plans.tsx`
- `fetchPlans()`: `empresas.select('plano, status_pagamento')` → `professional_subscriptions.select('plan_id').eq('status', 'active')`; contagem por `plan.id` direto
- `fetchSubscribers()`: `empresas.select('*').ilike('plano', ...)` → `professional_subscriptions.select('id, status, billing_cycle, activated_at, professionals(...))`.eq('plan_id', planId)`
- Removidas referências a `e.email_admin`, `e.nome_fantasia`, `e.status_pagamento`, `e.plano`
- Badge de status: `sub.status === 'ativo'` → `=== 'active'`

### `src/pages/Professionals.tsx`
- JOIN de `professional_subscriptions` expandido para incluir `plans(name, slug)`
- `assinatura.plano` agora usa `sub.plans.name` (antes armazenava `sub.plan_id`, um UUID — filtros e labels quebravam silenciosamente)

### `src/pages/Dashboard.tsx`
- `professional_subscriptions.select('status, plan_id')` → adicionado `plans(monthly_price, slug)`
- MRR calculado via `sub.plans.monthly_price` (antes usava string matching em UUID — MRR sempre resultava em 0)
- `planCounts` indexado por `plans.slug` em vez de UUID

### `src/pages/Metrics.tsx`
- `professional_subscriptions.select('monthly_price, ...)` → `plans(monthly_price, slug)` via JOIN (coluna não existe na tabela filha)
- `ambassadorSubs` MRR: `x.monthly_price` → `x.plans.monthly_price`
- `professionals.eq('is_active', true)` → `.eq('status', 'ativo')` (3 ocorrências — coluna `is_active` não existe em `professionals`)

### `src/pages/Campaigns.tsx`
- `professionals.select('...plan')` → `plan_type` (coluna correta no schema atual)

### `src/pages/Ambassadors.tsx`
- `const { profs }` → `const { data: profs }` (destructuring incorreto retornava `undefined` silenciosamente)
