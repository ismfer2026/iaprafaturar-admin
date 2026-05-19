import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Save, Server, Smartphone, Key, Eye, EyeOff, Lock, AlertCircle } from 'lucide-react';
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

  if (loading) return <div className="p-8 text-slate-500">{t('settings.loading')}</div>;

  return (
    <div className="space-y-6 pb-20">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">{t('settings.platform_title')}</h1>
        <p className="text-sm text-muted-foreground">{t('settings.platform_subtitle')} {admin && <span className="text-slate-600">{t('settings.connected_as')} {admin.name}</span>}</p>
      </div>

      <Card className="border-2 border-[#0D6E6E]/20 bg-gradient-to-br from-[#F8FFFE] to-[#E8F5F5] max-w-3xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#0D6E6E]">
            <Server className="w-5 h-5" />
            {t('settings.evolution_card_title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="url-api" className="text-sm font-semibold text-slate-600 flex items-center gap-2">
              <Server className="w-4 h-4" aria-hidden={true} /> {t('settings.evolution_url_label')}
            </label>
            <Input
              id="url-api"
              value={formData.evolution_api_url}
              onChange={e => setFormData({...formData, evolution_api_url: e.target.value})}
              placeholder={t('settings.evolution_url_placeholder')}
              className="bg-white"
            />
            <p className="text-xs text-slate-400">{t('settings.evolution_url_hint')}</p>
          </div>

          <div className="space-y-2">
            <label htmlFor="global-key" className="text-sm font-semibold text-slate-600 flex items-center gap-2">
              <Key className="w-4 h-4" aria-hidden={true} /> {t('settings.evolution_key_label')}
            </label>
            <div className="flex gap-2">
              <Input
                id="global-key"
                type={showApiKey ? 'text' : 'password'}
                value={formData.evolution_global_key}
                onChange={e => setFormData({...formData, evolution_global_key: e.target.value})}
                placeholder={t('settings.evolution_key_placeholder')}
                className="bg-white flex-1"
              />
              <button
                onClick={() => setShowApiKey(!showApiKey)}
                aria-label={showApiKey ? t('settings.evolution_key_hide') : t('settings.evolution_key_show')}
                className="px-3 py-2 border border-slate-300 rounded bg-white hover:bg-slate-50 transition"
              >
                {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="space-y-2 pt-4 border-t border-[#0D6E6E]/10">
            <label htmlFor="instancia" className="text-sm font-semibold text-slate-600 flex items-center gap-2">
              <Smartphone className="w-4 h-4" aria-hidden={true} /> {t('settings.evolution_instance_label')}
            </label>
            <Input
              id="instancia"
              value={formData.master_instance_name}
              onChange={e => setFormData({...formData, master_instance_name: e.target.value})}
              placeholder={t('settings.evolution_instance_placeholder')}
              className="bg-white"
            />
            <p className="text-xs text-slate-500 font-medium mt-1">
              {t('settings.evolution_instance_hint')}
            </p>
          </div>

          <div className="pt-4 flex justify-end">
            <Button onClick={handleSave} disabled={saving} className="bg-[#0D6E6E] hover:bg-[#0a5858]">
              <Save className="w-4 h-4 mr-2" />
              {saving ? t('settings.evolution_saving') : t('settings.evolution_save_button')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-2 border-blue-200/50 bg-gradient-to-br from-blue-50 to-blue-50/50 max-w-3xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-700">
            <Lock className="w-5 h-5" />
            {t('settings.password_card_title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <p className="text-sm text-slate-700 font-semibold">
              {t('settings.password_update_desc')}
            </p>
            <p className="text-xs text-slate-600">
              {t('settings.password_update_hint')}
            </p>
          </div>

          <div className="space-y-4">
            {/* Nova Senha */}
            <div className="space-y-2">
              <label htmlFor="new-password" className="text-sm font-semibold text-slate-600 flex items-center gap-2">
                <Key className="w-4 h-4" aria-hidden={true} /> {t('settings.password_new_label')}
              </label>
              <div className="flex gap-2">
                <Input
                  id="new-password"
                  type={showNewPassword ? 'text' : 'password'}
                  value={passwordForm.newPassword}
                  onChange={e => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                  placeholder={t('settings.password_new_placeholder')}
                  className="bg-white flex-1"
                />
                <button
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  aria-label={showNewPassword ? t('settings.password_new_hide') : t('settings.password_new_show')}
                  className="px-3 py-2 border border-slate-300 rounded bg-white hover:bg-slate-50 transition"
                >
                  {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirmar Senha */}
            <div className="space-y-2">
              <label htmlFor="confirm-password" className="text-sm font-semibold text-slate-600 flex items-center gap-2">
                <Key className="w-4 h-4" aria-hidden={true} /> {t('settings.password_confirm_label')}
              </label>
              <div className="flex gap-2">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={passwordForm.confirmPassword}
                  onChange={e => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                  placeholder={t('settings.password_confirm_placeholder')}
                  className="bg-white flex-1"
                  onKeyPress={e => e.key === 'Enter' && handleChangePassword()}
                />
                <button
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? t('settings.password_confirm_hide') : t('settings.password_confirm_show')}
                  className="px-3 py-2 border border-slate-300 rounded bg-white hover:bg-slate-50 transition"
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Feedback de validação */}
            {passwordForm.newPassword && passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword && (
              <div className="p-3 bg-red-100 border border-red-300 rounded text-sm text-red-700">
                ⚠️ {t('settings.password_validation_mismatch')}
              </div>
            )}

            {passwordForm.newPassword && passwordForm.newPassword.length < 6 && (
              <div className="p-3 bg-yellow-100 border border-yellow-300 rounded text-sm text-yellow-700">
                ⚠️ {t('settings.password_validation_short')}
              </div>
            )}

            {passwordForm.newPassword && passwordForm.confirmPassword && passwordForm.newPassword === passwordForm.confirmPassword && passwordForm.newPassword.length >= 6 && (
              <div className="p-3 bg-green-100 border border-green-300 rounded text-sm text-green-700">
                ✅ {t('settings.password_validation_match')}
              </div>
            )}

            {/* Botão de confirmar */}
            <div className="pt-2 flex justify-end">
              <Button
                onClick={handleChangePassword}
                disabled={changingPassword || !passwordForm.newPassword || !passwordForm.confirmPassword || passwordForm.newPassword !== passwordForm.confirmPassword || passwordForm.newPassword.length < 6}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {changingPassword ? t('settings.password_button_changing') : t('settings.password_button_change')}
              </Button>
            </div>
          </div>

          <div className="pt-4 border-t border-blue-200/50">
            <p className="text-xs text-slate-600">
              {t('settings.password_security_note')}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 max-w-3xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-700">
            <AlertCircle className="w-5 h-5" />
            Testar Sentry (Dev/Testing)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-700 mb-4">
            Clique no botão abaixo para disparar um erro de teste e verificar se o Sentry está capturando corretamente.
          </p>
          <Button
            onClick={() => {
              Sentry.captureException(new Error('Teste Sentry - erro proposital para validação'));
              toast.success('Erro enviado para Sentry');
            }}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            🧪 Disparar Erro de Teste
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}