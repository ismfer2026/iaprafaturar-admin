import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Save, Server, Eye, EyeOff, Lock, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import * as Sentry from '@sentry/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth';
import { useI18n } from '@/i18n';

export default function SettingsPage() {
  const { admin } = useAuth();
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configId, setConfigId] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  const [formData, setFormData] = useState({
    evolution_api_url: '',
    evolution_global_key: '',
    master_instance_name: ''
  });

  useEffect(() => {
    fetchSettings();
  },[]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('*')
        .limit(1)
        .single();

      if (error) throw error;
      if (data) {
        setConfigId(data.id);
        setFormData({
          evolution_api_url: data.evolution_api_url || '',
          evolution_global_key: data.evolution_global_key || '',
          master_instance_name: data.master_instance_name || ''
        });
      }
    } catch (error) {
      console.error('Erro ao buscar configurações globais:', error);
      toast.error(t('settings.toast_config_load_error'));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!configId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('platform_settings')
        .update({
          evolution_api_url: formData.evolution_api_url,
          evolution_global_key: formData.evolution_global_key,
          master_instance_name: formData.master_instance_name,
          updated_at: new Date().toISOString()
        })
        .eq('id', configId);

      if (error) throw error;
      toast.success(t('settings.toast_config_updated'));
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error(t('settings.toast_config_error'));
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordForm.newPassword.trim()) {
      toast.error(t('settings.toast_password_empty'));
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error(t('settings.toast_password_short'));
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error(t('settings.toast_password_mismatch'));
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      });

      if (error) throw error;

      toast.success(t('settings.toast_password_updated'));
      setPasswordForm({ newPassword: '', confirmPassword: '' });
    } catch (error) {
      console.error('Erro ao alterar senha:', error);
      toast.error(t('settings.toast_password_error'));
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><div className="text-slate-500">{t('settings.loading')}</div></div>;

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="mb-8 border-b border-slate-200 pb-6">
        <h1 className="text-4xl font-bold text-slate-900 mb-2">{t('settings.platform_title')}</h1>
        <div className="flex items-center gap-2 text-slate-600">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
          <span>Admin conectado: <span className="font-semibold text-slate-900">{admin?.name}</span></span>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="space-y-6 max-w-4xl">

        {/* Evolution API Section */}
        <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50">
          <CardTitle className="flex items-center gap-3 text-slate-900 text-lg">
            <div className="p-2 bg-teal-100 rounded-lg">
              <Server className="w-5 h-5 text-teal-700" />
            </div>
            Evolution API (WhatsApp)
          </CardTitle>
          <p className="text-sm text-slate-600 mt-1">Configurar integração com Evolution API para WhatsApp</p>
        </CardHeader>
        <CardContent className="pt-6 space-y-5">
          <div className="space-y-2.5">
            <label htmlFor="url-api" className="text-sm font-semibold text-slate-700">
              URL da API
            </label>
            <Input
              id="url-api"
              value={formData.evolution_api_url}
              onChange={e => setFormData({...formData, evolution_api_url: e.target.value})}
              placeholder="https://sua-api.evolution.ai"
              className="bg-white border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
            />
            <p className="text-xs text-slate-500">Ex: https://evo.israel-miranda.cloud/manager/</p>
          </div>

          <div className="space-y-2.5">
            <label htmlFor="global-key" className="text-sm font-semibold text-slate-700">
              Chave Global
            </label>
            <div className="flex gap-2">
              <Input
                id="global-key"
                type={showApiKey ? 'text' : 'password'}
                value={formData.evolution_global_key}
                onChange={e => setFormData({...formData, evolution_global_key: e.target.value})}
                placeholder="••••••••••••••••"
                className="bg-white border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 flex-1"
              />
              <button
                onClick={() => setShowApiKey(!showApiKey)}
                aria-label={showApiKey ? 'Ocultar' : 'Mostrar'}
                className="px-3 py-2 border border-slate-300 rounded bg-white hover:bg-slate-50 transition text-slate-600"
              >
                {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="space-y-2.5 pt-5 border-t border-slate-200">
            <label htmlFor="instancia" className="text-sm font-semibold text-slate-700">
              Nome da Instância Master
            </label>
            <Input
              id="instancia"
              value={formData.master_instance_name}
              onChange={e => setFormData({...formData, master_instance_name: e.target.value})}
              placeholder="instancia-master"
              className="bg-white border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
            />
            <p className="text-xs text-slate-500">Nome único da instância no Evolution</p>
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={handleSave} disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white">
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Password Section */}
      <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50">
          <CardTitle className="flex items-center gap-3 text-slate-900 text-lg">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Lock className="w-5 h-5 text-blue-700" />
            </div>
            Alterar Senha
          </CardTitle>
          <p className="text-sm text-slate-600 mt-1">Atualize sua senha de administrador com segurança</p>
        </CardHeader>
        <CardContent className="pt-6 space-y-5">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900">
              Você será desconectado após alterar a senha. A nova senha será usada no próximo acesso.
            </p>
          </div>

          <div className="space-y-5">
            {/* Nova Senha */}
            <div className="space-y-2.5">
              <label htmlFor="new-password" className="text-sm font-semibold text-slate-700">
                Nova Senha
              </label>
              <div className="flex gap-2">
                <Input
                  id="new-password"
                  type={showNewPassword ? 'text' : 'password'}
                  value={passwordForm.newPassword}
                  onChange={e => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                  placeholder="••••••••••••••••"
                  className="bg-white border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 flex-1"
                />
                <button
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  aria-label={showNewPassword ? 'Ocultar' : 'Mostrar'}
                  className="px-3 py-2 border border-slate-300 rounded bg-white hover:bg-slate-50 transition text-slate-600"
                >
                  {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Confirmar Senha */}
            <div className="space-y-2.5">
              <label htmlFor="confirm-password" className="text-sm font-semibold text-slate-700">
                Confirmar Senha
              </label>
              <div className="flex gap-2">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={passwordForm.confirmPassword}
                  onChange={e => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                  placeholder="••••••••••••••••"
                  className="bg-white border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 flex-1"
                  onKeyPress={e => e.key === 'Enter' && handleChangePassword()}
                />
                <button
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? 'Ocultar' : 'Mostrar'}
                  className="px-3 py-2 border border-slate-300 rounded bg-white hover:bg-slate-50 transition text-slate-600"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Validation Feedback */}
            {passwordForm.newPassword || passwordForm.confirmPassword ? (
              <div className="space-y-2">
                {passwordForm.newPassword && passwordForm.newPassword.length >= 6 ? (
                  <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-700">
                    <CheckCircle2 size={18} />
                    Comprimento adequado
                  </div>
                ) : passwordForm.newPassword ? (
                  <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-700">
                    <AlertCircle size={18} />
                    Mínimo 6 caracteres
                  </div>
                ) : null}

                {passwordForm.newPassword && passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword ? (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                    <XCircle size={18} />
                    As senhas não correspondem
                  </div>
                ) : passwordForm.newPassword && passwordForm.confirmPassword && passwordForm.newPassword === passwordForm.confirmPassword && passwordForm.newPassword.length >= 6 ? (
                  <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-700">
                    <CheckCircle2 size={18} />
                    Senhas coincidem
                  </div>
                ) : null}
              </div>
            ) : null}

            {/* Button */}
            <div className="flex justify-end pt-3">
              <Button
                onClick={handleChangePassword}
                disabled={changingPassword || !passwordForm.newPassword || !passwordForm.confirmPassword || passwordForm.newPassword !== passwordForm.confirmPassword || passwordForm.newPassword.length < 6}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {changingPassword ? 'Alterando...' : 'Alterar Senha'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sentry Test Section */}
      <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50">
          <CardTitle className="flex items-center gap-3 text-slate-900 text-lg">
            <div className="p-2 bg-amber-100 rounded-lg">
              <AlertCircle className="w-5 h-5 text-amber-700" />
            </div>
            Teste de Monitoramento
          </CardTitle>
          <p className="text-sm text-slate-600 mt-1">Validar que o Sentry está capturando erros corretamente</p>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg mb-5">
            <p className="text-sm text-amber-900">
              Clique no botão abaixo para disparar um erro de teste. Ele será registrado no dashboard do Sentry para validação.
            </p>
          </div>
          <Button
            onClick={() => {
              Sentry.captureException(new Error('Teste Sentry - erro proposital para validação'));
              toast.success('Erro enviado para Sentry - verifique o dashboard');
            }}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            🧪 Disparar Erro de Teste
          </Button>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}