import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useI18n } from '@/i18n'
import { TrendingUp, Users, CreditCard, DollarSign, Activity, Bot, Building, UserPlus, Copy, Link as LinkIcon, ExternalLink } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { toast } from 'react-hot-toast' // Garantindo o import do toast para feedback

interface KPI { label: string; value: string | number; icon: React.ReactNode; variation?: string; isPositive?: boolean }
interface Plan { name: string; count: number }
interface AgentLog { agent_slug: string; conversations: number; credits_consumed: number; last_activity: string }
interface Professional { id: string; name: string; business_name: string; email: string; created_at: string; status: string }

// Link centralizado para facilitar manutenção
const BASE_HEYFORM_URL = "https://form.israelmirandaoficial.cloud/form/nPOtAdol";
const ADMIN_REGISTRATION_LINK = `${BASE_HEYFORM_URL}?ref=admin_direct`;

function KpiCard({ kpi }: { kpi: KPI }) {
  const isPos = kpi.isPositive;
  const isNeg = kpi.isPositive === false;
  const varColor = isPos ? '#16a34a' : isNeg ? '#dc2626' : '#64748b';
  const varBg = isPos ? '#f0fdf4' : isNeg ? '#fef2f2' : '#f1f5f9';
  const varBorder = isPos ? '#bbf7d0' : isNeg ? '#fecaca' : '#e2e8f0';

  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {kpi.icon}
        </div>
        {kpi.variation && (
          <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: varBg, color: varColor, border: `1px solid ${varBorder}` }}>
            {kpi.variation}
          </span>
        )}
      </div>
      <p style={{ marginTop: 16, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>{kpi.label}</p>
      <p style={{ marginTop: 4, fontSize: 28, fontWeight: 900, color: '#0D6E6E' }}>{kpi.value}</p>
    </div>
  )
}

export function Dashboard() {
  const { t } = useI18n()
  const [kpiFinancial, setKpiFinancial] = useState<KPI[]>([])
  const [kpiUsers, setKpiUsers] = useState<KPI[]>([])
  const [planData, setPlanData] = useState<Plan[]>([])
  const [agentLogs, setAgentLogs] = useState<AgentLog[]>([])
  const [recentProfessionals, setRecentProfessionals] = useState<Professional[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    const loadData = async () => {
      if (isMounted) {
        await fetchDashboardData()
      }
    }
    loadData()
    return () => { isMounted = false }
  }, [])

  const fetchDashboardData = async () => {
    try {
      const { data: subs, error: subError } = await supabase
        .from('professional_subscriptions')
        .select('status, plan_id, plans ( monthly_price, slug )');

      if (subError) throw subError;

      const activeSubs = (subs || []).filter(s => s.status === 'active' || s.status === 'trialing');
      
      let mrr = 0;
      const planCounts: Record<string, number> = {};
      
      activeSubs.forEach(sub => {
        const price = (sub.plans as any)?.monthly_price || 0;
        const planName = (sub.plans as any)?.slug || (sub.plans as any)?.name || 'desconhecido';

        if (sub.status === 'active') mrr += price;

        planCounts[planName] = (planCounts[planName] || 0) + 1;
      });

      const activeCount = activeSubs.length;

      setKpiFinancial([
        { label: 'MRR', value: `R$ ${mrr.toFixed(2)}`, icon: <DollarSign size={20} color="#059669" />, isPositive: true },
        { label: 'ARR', value: `R$ ${(mrr * 12).toFixed(2)}`, icon: <TrendingUp size={20} color="#2563eb" />, isPositive: true },
        { label: 'Assinantes Ativos', value: activeCount, icon: <Users size={20} color="#7c3aed" />, isPositive: true },
        { label: 'Ticket Médio', value: `R$ ${(activeCount > 0 ? mrr / activeCount : 0).toFixed(2)}`, icon: <CreditCard size={20} color="#ea580c" /> },
      ])

      setPlanData(Object.entries(planCounts).map(([name, count]) => ({ name, count })));

      const thisMonthStart = new Date(); 
      thisMonthStart.setDate(1);
      
      const [{ count: totalProfs }, { count: novosMes }, { count: inativos }] = await Promise.all([
        supabase.from('professionals').select('id', { count: 'exact', head: true }),
        supabase.from('professionals').select('id', { count: 'exact', head: true }).gte('created_at', thisMonthStart.toISOString()),
        supabase.from('professionals').select('id', { count: 'exact', head: true }).eq('status', 'inativo')
      ]);

      setKpiUsers([
        { label: 'Total de Clínicas', value: totalProfs || 0, icon: <Building size={20} color="#2563eb" /> },
        { label: 'Novos este Mês', value: novosMes || 0, icon: <UserPlus size={20} color="#059669" />, isPositive: true },
        { label: 'Inativos (Churn)', value: inativos || 0, icon: <Activity size={20} color="#dc2626" />, isPositive: false },
        { label: 'Taxa de Ativação', value: `${totalProfs ? (((totalProfs - (inativos || 0)) / totalProfs) * 100).toFixed(1) : 0}%`, icon: <TrendingUp size={20} color="#7c3aed" /> },
      ])

      const thirtyDaysAgo = new Date(); 
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: aiLogs } = await supabase
        .from('agent_logs')
        .select('agent_slug, tokens_used, credits_consumed, created_at')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .limit(1000);

      const stats: Record<string, { conversations: number; credits_consumed: number; last_activity: string }> = {};
      
      (aiLogs || []).forEach(l => {
        if (!stats[l.agent_slug]) stats[l.agent_slug] = { conversations: 0, credits_consumed: 0, last_activity: '' };
        stats[l.agent_slug].conversations++;
        stats[l.agent_slug].credits_consumed += (l.credits_consumed || 0);
        
        if (l.created_at > stats[l.agent_slug].last_activity) {
          stats[l.agent_slug].last_activity = l.created_at;
        }
      });
      
      setAgentLogs(Object.entries(stats).map(([slug, s]) => ({ agent_slug: slug, ...s })));

      const { data: recent } = await supabase
        .from('professionals')
        .select('id, name, business_name, email, status, created_at')
        .order('created_at', { ascending: false })
        .limit(10);
        
      setRecentProfessionals(recent || []);

    } catch (e) {
      console.error('Erro ao carregar dashboard admin:', e);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 32, height: 32, border: '3px solid #e2e8f0', borderTopColor: '#0D6E6E', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ color: '#64748b', fontSize: 14, fontWeight: 500 }}>Sincronizando com o App...</p>
      </div>
    </div>
  )

  const sectionTitle = (text: string) => (
    <div style={{ marginBottom: 16 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1A1A2E', margin: 0 }}>{text}</h2>
      <div style={{ height: 1, background: '#e2e8f0', marginTop: 8 }} />
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 36, paddingBottom: 40 }}>

      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>{t('dashboard.title')}</h1>
        <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>{t('dashboard.subtitle')}</p>
      </div>

      {/* ===================================================================== */}
      {/* 🚀 BANNER DO LINK DE VENDAS DIRETO DO ADMIN (ATUALIZADO PARA HEYFORM) */}
      {/* ===================================================================== */}
      <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 12, padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ background: '#0D6E6E', padding: 12, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LinkIcon size={24} color="#fff" />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>Link Oficial de Onboarding (Venda Direta)</p>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b', maxWidth: 600 }}>
              Use este link para novos cadastros vindos do seu tráfego direto ou Bio. Este link possui rastreio interno (<code style={{color: '#0D6E6E'}}>ref=admin_direct</code>) para garantir o processamento correto via webhook.
            </p>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <code style={{ background: '#fff', border: '1px solid #e2e8f0', padding: '10px 16px', borderRadius: 8, fontSize: 12, color: '#0D6E6E', fontWeight: 700, userSelect: 'all', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '300px' }}>
            {ADMIN_REGISTRATION_LINK}
          </code>
          <button
            onClick={() => {
              navigator.clipboard.writeText(ADMIN_REGISTRATION_LINK);
              toast.success(t('dashboard.toast_link_copied'));
            }} 
            style={{ background: '#fff', border: '1px solid #e2e8f0', padding: '10px', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', transition: 'all 0.2s' }}
            onMouseOver={e => e.currentTarget.style.borderColor = '#0D6E6E'}
            onMouseOut={e => e.currentTarget.style.borderColor = '#e2e8f0'}
            title="Copiar Link"
          >
            <Copy size={20} />
          </button>
          <button 
            onClick={() => window.open(ADMIN_REGISTRATION_LINK, '_blank')} 
            style={{ background: '#fff', border: '1px solid #e2e8f0', padding: '10px', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', transition: 'all 0.2s' }}
            onMouseOver={e => e.currentTarget.style.borderColor = '#0D6E6E'}
            onMouseOut={e => e.currentTarget.style.borderColor = '#e2e8f0'}
            title="Abrir Formulário"
          >
            <ExternalLink size={20} />
          </button>
        </div>
      </div>

      {/* RESTANTE DO DASHBOARD... */}
      <section>
        {sectionTitle('KPIs Financeiros (Assinaturas)')}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          {kpiFinancial.map((kpi, i) => <KpiCard key={i} kpi={kpi} />)}
        </div>
      </section>

      <section>
        {sectionTitle('Tração e Base de Clientes')}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          {kpiUsers.map((kpi, i) => <KpiCard key={i} kpi={kpi} />)}
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {planData.length > 0 && (
          <section>
            {sectionTitle('Distribuição por Plano')}
            <div style={{ background: '#fff', borderRadius: 12, padding: 24, border: '1px solid #e2e8f0' }}>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={planData} layout="vertical" margin={{ top: 0, right: 0, left: 20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12, fontWeight: 500 }} />
                  <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="count" fill="#0D6E6E" radius={[0, 4, 4, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {agentLogs.length > 0 && (
          <section>
            {sectionTitle('Consumo de Inteligência Artificial (30 dias)')}
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    {['Módulo IA', 'Chamadas', 'Créditos Ganhos'].map((h, i) => (
                      <th key={h} style={{ padding: '14px 20px', textAlign: i === 2 ? 'right' : 'left', fontWeight: 600, color: '#475569' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {agentLogs.map((l, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', background: '#fff' }}>
                      <td style={{ padding: '14px 20px', fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Bot size={16} color="#0D6E6E" />
                        <span style={{ textTransform: 'capitalize' }}>{l.agent_slug.replace('_', ' ')}</span>
                      </td>
                      <td style={{ padding: '14px 20px', color: '#475569' }}>{l.conversations}</td>
                      <td style={{ padding: '14px 20px', color: '#059669', fontWeight: 700, textAlign: 'right' }}>
                        + {l.credits_consumed.toFixed(0)} pts
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>

      {recentProfessionals.length > 0 && (
        <section>
          {sectionTitle('Clínicas e Profissionais Recentes')}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  {['Status', 'Profissional / Clínica', 'E-mail', 'Data de Cadastro'].map(h => (
                    <th key={h} style={{ padding: '14px 20px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentProfessionals.map((p) => {
                  const isActive = p.status === 'ativo';
                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9', background: '#fff' }}>
                      <td style={{ padding: '14px 20px' }}>
                        <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: isActive ? '#10b981' : '#f59e0b' }} title={p.status} />
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{p.name}</div>
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{p.business_name || 'Sem nome de negócio'}</div>
                      </td>
                      <td style={{ padding: '14px 20px', color: '#475569' }}>{p.email}</td>
                      <td style={{ padding: '14px 20px', color: '#64748b' }}>{new Date(p.created_at).toLocaleDateString('pt-BR')}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

    </div>
  )
}