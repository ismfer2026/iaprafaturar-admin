-- ============================================================
-- Habilitar RLS em professional_notifications e criar policies
-- para permitir broadcasts do admin
--
-- Executar no Supabase SQL Editor se as policies ainda não
-- estiverem aplicadas (migration 20260429000004 do CRM)
-- ============================================================

-- Habilitar RLS (safe: idem se já está habilitado)
ALTER TABLE public.professional_notifications ENABLE ROW LEVEL SECURITY;

-- Policy de SELECT: profissional vê suas próprias notificações
DROP POLICY IF EXISTS "prof_notifications_select" ON public.professional_notifications;
CREATE POLICY "prof_notifications_select" ON public.professional_notifications
  FOR SELECT
  USING (professional_id = auth_professional_id());

-- Policy de UPDATE: profissional marca suas notificações como lidas
DROP POLICY IF EXISTS "prof_notifications_update" ON public.professional_notifications;
CREATE POLICY "prof_notifications_update" ON public.professional_notifications
  FOR UPDATE
  USING (professional_id = auth_professional_id());

-- Policy de INSERT: profissional insere sua própria OR service_role (backend)
-- Isso é o que resolve o 403 do admin — service_role ignora RLS completamente
DROP POLICY IF EXISTS "prof_notifications_insert_service" ON public.professional_notifications;
CREATE POLICY "prof_notifications_insert_service" ON public.professional_notifications
  FOR INSERT
  WITH CHECK (
    professional_id = auth_professional_id()
    OR auth.role() = 'service_role'
  );

-- Verificação: listar todas as policies da tabela
-- SELECT * FROM pg_policies WHERE tablename = 'professional_notifications';
