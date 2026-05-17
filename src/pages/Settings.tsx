import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Save, Server, Smartphone, Key, Eye, EyeOff, Lock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth';

export default function SettingsPage() {
  const { admin } = useAuth();
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
      toast.error('Erro ao carregar configurações.');
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
      toast.success('Configurações da Plataforma atualizadas!');
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar as configurações.');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordForm.newPassword.trim()) {
      toast.error('Digite a nova senha');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('As senhas não conferem');
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      });

      if (error) throw error;

      toast.success('Senha alterada com sucesso!');
      setPasswordForm({ newPassword: '', confirmPassword: '' });
    } catch (error) {
      console.error('Erro ao alterar senha:', error);
      toast.error('Erro ao alterar senha. Tente novamente.');
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) return <div className="p-8 text-slate-500">Carregando configurações...</div>;

  return (
    <div className="space-y-6 pb-20">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Configurações da Plataforma</h1>
        <p className="text-sm text-muted-foreground">Gerencie as integrações globais e instâncias mestres do sistema. {admin && <span className="text-slate-600">Conectado como {admin.name}</span>}</p>
      </div>

      <Card className="border-2 border-[#0D6E6E]/20 bg-gradient-to-br from-[#F8FFFE] to-[#E8F5F5] max-w-3xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#0D6E6E]">
            <Server className="w-5 h-5" />
            Evolution API (Motor do WhatsApp)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="url-api" className="text-sm font-semibold text-slate-600 flex items-center gap-2">
              <Server className="w-4 h-4" aria-hidden={true} /> URL da API
            </label>
            <Input
              id="url-api"
              value={formData.evolution_api_url}
              onChange={e => setFormData({...formData, evolution_api_url: e.target.value})}
              placeholder="Ex: https://api.suaevolution.com"
              className="bg-white"
            />
            <p className="text-xs text-slate-400">A URL base do seu servidor Evolution.</p>
          </div>

          <div className="space-y-2">
            <label htmlFor="global-key" className="text-sm font-semibold text-slate-600 flex items-center gap-2">
              <Key className="w-4 h-4" aria-hidden={true} /> Global API Key
            </label>
            <div className="flex gap-2">
              <Input
                id="global-key"
                type={showApiKey ? 'text' : 'password'}
                value={formData.evolution_global_key}
                onChange={e => setFormData({...formData, evolution_global_key: e.target.value})}
                placeholder="Sua Global API Key"
                className="bg-white flex-1"
              />
              <button
                onClick={() => setShowApiKey(!showApiKey)}
                aria-label={showApiKey ? 'Ocultar API Key' : 'Mostrar API Key'}
                className="px-3 py-2 border border-slate-300 rounded bg-white hover:bg-slate-50 transition"
              >
                {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="space-y-2 pt-4 border-t border-[#0D6E6E]/10">
            <label htmlFor="instancia" className="text-sm font-semibold text-slate-600 flex items-center gap-2">
              <Smartphone className="w-4 h-4" aria-hidden={true} /> Instância Mestre (Master Instance)
            </label>
            <Input
              id="instancia"
              value={formData.master_instance_name}
              onChange={e => setFormData({...formData, master_instance_name: e.target.value})}
              placeholder="Ex: iaprafaturar_master"
              className="bg-white"
            />
            <p className="text-xs text-slate-500 font-medium mt-1">
              Esta é a instância que os Agentes da Plataforma (ex: Onboarding) usarão para enviar mensagens para novos clientes.
            </p>
          </div>

          <div className="pt-4 flex justify-end">
            <Button onClick={handleSave} disabled={saving} className="bg-[#0D6E6E] hover:bg-[#0a5858]">
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Salvando...' : 'Salvar Integração'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-2 border-blue-200/50 bg-gradient-to-br from-blue-50 to-blue-50/50 max-w-3xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-700">
            <Lock className="w-5 h-5" />
            Alterar Senha
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <p className="text-sm text-slate-700 font-semibold">
              Atualize sua Senha de Administrador
            </p>
            <p className="text-xs text-slate-600">
              Altere sua senha com segurança. Você será mantido logado após a mudança.
            </p>
          </div>

          <div className="space-y-4">
            {/* Nova Senha */}
            <div className="space-y-2">
              <label htmlFor="new-password" className="text-sm font-semibold text-slate-600 flex items-center gap-2">
                <Key className="w-4 h-4" aria-hidden={true} /> Nova Senha
              </label>
              <div className="flex gap-2">
                <Input
                  id="new-password"
                  type={showNewPassword ? 'text' : 'password'}
                  value={passwordForm.newPassword}
                  onChange={e => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                  placeholder="Digite a nova senha (mínimo 6 caracteres)"
                  className="bg-white flex-1"
                />
                <button
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  aria-label={showNewPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  className="px-3 py-2 border border-slate-300 rounded bg-white hover:bg-slate-50 transition"
                >
                  {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirmar Senha */}
            <div className="space-y-2">
              <label htmlFor="confirm-password" className="text-sm font-semibold text-slate-600 flex items-center gap-2">
                <Key className="w-4 h-4" aria-hidden={true} /> Confirmar Senha
              </label>
              <div className="flex gap-2">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={passwordForm.confirmPassword}
                  onChange={e => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                  placeholder="Confirme a nova senha"
                  className="bg-white flex-1"
                  onKeyPress={e => e.key === 'Enter' && handleChangePassword()}
                />
                <button
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  className="px-3 py-2 border border-slate-300 rounded bg-white hover:bg-slate-50 transition"
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Feedback de validação */}
            {passwordForm.newPassword && passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword && (
              <div className="p-3 bg-red-100 border border-red-300 rounded text-sm text-red-700">
                ⚠️ As senhas não conferem
              </div>
            )}

            {passwordForm.newPassword && passwordForm.newPassword.length < 6 && (
              <div className="p-3 bg-yellow-100 border border-yellow-300 rounded text-sm text-yellow-700">
                ⚠️ Mínimo de 6 caracteres
              </div>
            )}

            {passwordForm.newPassword && passwordForm.confirmPassword && passwordForm.newPassword === passwordForm.confirmPassword && passwordForm.newPassword.length >= 6 && (
              <div className="p-3 bg-green-100 border border-green-300 rounded text-sm text-green-700">
                ✅ Senhas conferem
              </div>
            )}

            {/* Botão de confirmar */}
            <div className="pt-2 flex justify-end">
              <Button
                onClick={handleChangePassword}
                disabled={changingPassword || !passwordForm.newPassword || !passwordForm.confirmPassword || passwordForm.newPassword !== passwordForm.confirmPassword || passwordForm.newPassword.length < 6}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {changingPassword ? 'Alterando...' : 'Alterar Senha'}
              </Button>
            </div>
          </div>

          <div className="pt-4 border-t border-blue-200/50">
            <p className="text-xs text-slate-600">
              <strong>🔒 Segurança:</strong> Sua nova senha será salva com criptografia. Você permanecerá logado e poderá usar a nova senha no próximo acesso.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}