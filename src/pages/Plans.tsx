import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, Edit2, Users, ToggleLeft, ToggleRight, X, Check, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'
import { useI18n } from '@/i18n'

// ══════════════════════════════════════════════════════════
// TIPOS
// ══════════════════════════════════════════════════════════
interface Plan {
  id: string; slug: string; name: string; description: string
  price_monthly: number; price_annual: number; is_active: boolean; is_featured: boolean
  trial_days: number; max_professionals: number; max_patients: number
  max_appointments_month: number; ai_credits_month: number; features: string[]
  subscribers_count?: number; mrr_contribution?: number
  created_at: string; updated_at: string
}
interface Subscriber {
  id: string; professional_id: string; status: string
  billing_cycle: string; started_at: string
  professional?: { name: string; email: string }
}
interface Custos {
  supabase: number; netlify: number; dominio: number; github: number; email: number; monitoramento: number
  whatsappPorMsg: number; msgsPorUsuario: number; iaPorMilTokens: number; tokensPorUsuario: number
  storagePorGb: number; storageGbPorUsuario: number
}
interface Planos { solo: number; pro: number; clinica: number }
interface Premissas {
  novosPorMes: number; churnMensal: number; mixSolo: number
  mixPro: number; mixClinica: number; conversaoTrial: number
}

// ══════════════════════════════════════════════════════════
// CONSTANTES
// ══════════════════════════════════════════════════════════
const EMPTY_PLAN = {
  slug: '', name: '', description: '', price_monthly: 0, price_annual: 0,
  is_active: true, is_featured: false, trial_days: 0, max_professionals: 1,
  max_patients: -1, max_appointments_month: -1, ai_credits_month: 0, features:[],
}

// Mapeamento tolerante para aceitar tanto os nomes antigos quanto os novos
const PLAN_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  trial:       { bg: '#f8fafc', color: '#64748b', border: '#e2e8f0' },
  solo:        { bg: '#f0fdfa', color: '#0D6E6E', border: '#99f6e4' },
  essencial:   { bg: '#f0fdfa', color: '#0D6E6E', border: '#99f6e4' },
  pro:         { bg: '#f5f3ff', color: '#7c3aed', border: '#ddd6fe' },
  estrategico: { bg: '#f5f3ff', color: '#7c3aed', border: '#ddd6fe' },
  clinica:     { bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
  performance: { bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
  enterprise:  { bg: '#f0f9ff', color: '#0369a1', border: '#bae6fd' },
}
const MESES =['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const DEFAULT_CUSTOS: Custos = {
  supabase: 119, netlify: 99, dominio: 15, github: 19, email: 49, monitoramento: 29,
  whatsappPorMsg: 0.04, msgsPorUsuario: 80, iaPorMilTokens: 3.50, tokensPorUsuario: 50,
  storagePorGb: 0.021, storageGbPorUsuario: 0.5,
}
const DEFAULT_PREMISSAS: Premissas = {
  novosPorMes: 15, churnMensal: 0.05, mixSolo: 0.50,
  mixPro: 0.35, mixClinica: 0.15, conversaoTrial: 0.40,
}

// ══════════════════════════════════════════════════════════
// HELPERS UI
// ══════════════════════════════════════════════════════════
function getClr(slug: string) {
  return PLAN_COLORS[slug?.toLowerCase()] ?? { bg: '#f8fafc', color: '#0D6E6E', border: '#e2e8f0' }
}
function fmtBRL(v: number, decimals = 0) {
  return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`
}

function InputCalc({ label, value, onChange, prefix = '', suffix = '', step = 1, note = '' }: any) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#475569', textTransform: 'uppercase', marginBottom: 4 }}>{label}</label>
      <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
        {prefix && <span style={{ padding: '7px 10px', background: '#f8fafc', color: '#64748b', fontSize: 13, borderRight: '1px solid #e2e8f0' }}>{prefix}</span>}
        <input type="number" value={value} step={step} min={0}
          onChange={e => onChange(Number(e.target.value))}
          style={{ flex: 1, padding: '7px 10px', border: 'none', outline: 'none', fontSize: 14, fontWeight: 600, color: '#0D6E6E', width: '100%' }} />
        {suffix && <span style={{ padding: '7px 10px', background: '#f8fafc', color: '#64748b', fontSize: 13, borderLeft: '1px solid #e2e8f0' }}>{suffix}</span>}
      </div>
      {note && <p style={{ fontSize: 10, color: '#94a3b8', margin: '3px 0 0' }}>{note}</p>}
    </div>
  )
}

function KpiCard({ label, value, sub, color, bg }: any) {
  return (
    <div style={{ background: bg, borderRadius: 10, padding: '14px 18px', border: `1px solid ${color}33` }}>
      <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', color: '#64748b', margin: '0 0 4px' }}>{label}</p>
      <p style={{ fontSize: 22, fontWeight: 900, color, margin: '0 0 2px' }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{sub}</p>}
    </div>
  )
}

function AccordionSection({ title, id, open, onToggle, children }: any) {
  return (
    <div>
      <button onClick={() => onToggle(id)} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: open ? '10px 10px 0 0' : 10, padding: '12px 16px', cursor: 'pointer' }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#0D6E6E' }}>{title}</span>
        {open ? <ChevronUp size={16} color="#0D6E6E" /> : <ChevronDown size={16} color="#0D6E6E" />}
      </button>
      {open && (
        <div style={{ border: '1px solid #99f6e4', borderTop: 'none', borderRadius: '0 0 10px 10px', padding: 16 }}>
          {children}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// CALCULADORA FINANCEIRA
// ══════════════════════════════════════════════════════════
function FinancialCalculator({ planoPrecos }: { planoPrecos: Planos }) {
  const { t } = useI18n()
  const[custos, setCustos] = useState<Custos>(DEFAULT_CUSTOS)
  const[planos, setPlanos] = useState<Planos>(planoPrecos)
  const[premissas, setPremissas] = useState<Premissas>(DEFAULT_PREMISSAS)
  const[openSection, setOpenSection] = useState<string>('custos')
  const toggle = (s: string) => setOpenSection(p => p === s ? '' : s)

  const calc = useMemo(() => {
    const fixo = custos.supabase + custos.netlify + custos.dominio + custos.github + custos.email + custos.monitoramento
    const cvWhatsapp = custos.whatsappPorMsg * custos.msgsPorUsuario
    const cvIA = (custos.iaPorMilTokens / 1000) * custos.tokensPorUsuario
    const cvStorage = custos.storagePorGb * custos.storageGbPorUsuario
    const cvTotal = cvWhatsapp + cvIA + cvStorage

    const margemSolo    = planos.solo - cvTotal
    const margemPro     = planos.pro - cvTotal * 1.5
    const margemClinica = planos.clinica - cvTotal * 3
    const margemPctSolo    = planos.solo > 0 ? (margemSolo / planos.solo) * 100 : 0
    const margemPctPro     = planos.pro > 0 ? (margemPro / planos.pro) * 100 : 0
    const margemPctClinica = planos.clinica > 0 ? (margemClinica / planos.clinica) * 100 : 0
    const beSolo    = margemSolo > 0 ? Math.ceil(fixo / margemSolo) : Infinity
    const bePro     = margemPro > 0 ? Math.ceil(fixo / margemPro) : Infinity
    const beClinica = margemClinica > 0 ? Math.ceil(fixo / margemClinica) : Infinity

    let usuarios = 0
    const proj = MESES.map((mes, i) => {
      const novos = Math.round(premissas.novosPorMes * Math.pow(1.05, i))
      const pagantes = Math.round(novos * premissas.conversaoTrial)
      const churn = Math.round(usuarios * premissas.churnMensal)
      usuarios = Math.max(0, usuarios + pagantes - churn)
      const uSolo = Math.round(usuarios * premissas.mixSolo)
      const uPro  = Math.round(usuarios * premissas.mixPro)
      const uCli  = usuarios - uSolo - uPro
      const mrr   = uSolo * planos.solo + uPro * planos.pro + uCli * planos.clinica
      const custo = fixo + usuarios * cvTotal
      const lucro = mrr - custo
      const margem = mrr > 0 ? (lucro / mrr) * 100 : 0
      return { mes, usuarios, mrr, custo, lucro, margem }
    })

    const mrrFinal = proj[11]?.mrr || 0
    const lucroFinal = proj[11]?.lucro || 0
    const beIdx = proj.findIndex(p => p.lucro > 0)
    const mesToBreakeven = beIdx === -1 ? 'Não alcançado' : `${MESES[beIdx]} (mês ${beIdx + 1})`
    const precoMinimo = (cvTotal + fixo / 10) / 0.4

    return { fixo, cvTotal, cvWhatsapp, cvIA, margemSolo, margemPro, margemClinica,
      margemPctSolo, margemPctPro, margemPctClinica, beSolo, bePro, beClinica,
      proj, mrrFinal, lucroFinal, mesToBreakeven, precoMinimo, beIdx }
  },[custos, planos, premissas])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Alerta */}
      <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '12px 16px', display: 'flex', gap: 10 }}>
        <AlertTriangle size={16} color="#d97706" style={{ flexShrink: 0, marginTop: 1 }} />
        <p style={{ fontSize: 12, color: '#78350f', margin: 0 }}>
          Ajuste os valores em azul para simular diferentes cenários. Os preços da calculadora refletem o banco.
        </p>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <KpiCard label={t('plans.calc_kpi_fixed_cost')} value={fmtBRL(calc.fixo)} sub={t('plans.calc_kpi_fixed_cost_sub')} color="#dc2626" bg="#fef2f2" />
        <KpiCard label={t('plans.calc_kpi_var_cost')} value={fmtBRL(calc.cvTotal, 2)} sub={t('plans.calc_kpi_var_cost_sub')} color="#d97706" bg="#fffbeb" />
        <KpiCard label={t('plans.calc_kpi_mrr_projected')} value={fmtBRL(calc.mrrFinal)} sub={t('plans.calc_kpi_mrr_projected_sub')} color="#0D6E6E" bg="#f0fdfa" />
        <KpiCard label={t('plans.calc_kpi_breakeven')} value={calc.mesToBreakeven} sub={t('plans.calc_kpi_breakeven_sub')} color="#7c3aed" bg="#f5f3ff" />
      </div>

      {/* Seção Custos */}
      <AccordionSection title={t('plans.calc_section_infra')} id="custos" open={openSection === 'custos'} onToggle={toggle}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', margin: 0 }}>{t('plans.calc_fixed_costs_title')}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <InputCalc label="Supabase" value={custos.supabase} onChange={(v: number) => setCustos(p => ({ ...p, supabase: v }))} prefix="R$" note="Pro: ~R$119/mês" />
            <InputCalc label="Netlify/Vercel" value={custos.netlify} onChange={(v: number) => setCustos(p => ({ ...p, netlify: v }))} prefix="R$" note="Pro: ~R$99/mês" />
            <InputCalc label="Domínio" value={custos.dominio} onChange={(v: number) => setCustos(p => ({ ...p, dominio: v }))} prefix="R$" note="~R$15/mês" />
            <InputCalc label="GitHub" value={custos.github} onChange={(v: number) => setCustos(p => ({ ...p, github: v }))} prefix="R$" note="Team: ~R$19/mês" />
            <InputCalc label="Email transacional" value={custos.email} onChange={(v: number) => setCustos(p => ({ ...p, email: v }))} prefix="R$" note="Resend/SendGrid" />
            <InputCalc label="Monitoramento" value={custos.monitoramento} onChange={(v: number) => setCustos(p => ({ ...p, monitoramento: v }))} prefix="R$" note="Sentry básico" />
          </div>
          <div style={{ background: '#fef2f2', borderRadius: 8, padding: '10px 14px', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#dc2626' }}>Total Fixo/mês</span>
            <span style={{ fontSize: 16, fontWeight: 900, color: '#dc2626' }}>{fmtBRL(calc.fixo)}</span>
          </div>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', margin: '4px 0 0' }}>{t('plans.calc_var_costs_title')}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            <InputCalc label="WhatsApp — custo/mensagem" value={custos.whatsappPorMsg} onChange={(v: number) => setCustos(p => ({ ...p, whatsappPorMsg: v }))} prefix="R$" step={0.001} note="360dialog ~R$0,04/msg" />
            <InputCalc label="WhatsApp — msgs/usuário/mês" value={custos.msgsPorUsuario} onChange={(v: number) => setCustos(p => ({ ...p, msgsPorUsuario: v }))} suffix="msgs" />
            <InputCalc label="IA — custo por 1.000 tokens" value={custos.iaPorMilTokens} onChange={(v: number) => setCustos(p => ({ ...p, iaPorMilTokens: v }))} prefix="R$" step={0.01} note="Claude Haiku ~R$0,35/1k" />
            <InputCalc label="IA — tokens/usuário/mês (k)" value={custos.tokensPorUsuario} onChange={(v: number) => setCustos(p => ({ ...p, tokensPorUsuario: v }))} suffix="k tokens" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {[
              { label: 'WhatsApp/usuário', value: fmtBRL(calc.cvWhatsapp, 2), color: '#d97706' },
              { label: 'IA/usuário', value: fmtBRL(calc.cvIA, 2), color: '#7c3aed' },
              { label: 'Total variável/usuário', value: fmtBRL(calc.cvTotal, 2), color: '#dc2626' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 14px', textAlign: 'center', border: `1px solid ${color}33` }}>
                <p style={{ fontSize: 10, color: '#64748b', margin: '0 0 2px', textTransform: 'uppercase' }}>{label}</p>
                <p style={{ fontSize: 16, fontWeight: 900, color, margin: 0 }}>{value}</p>
              </div>
            ))}
          </div>
        </div>
      </AccordionSection>

      {/* Seção Preços */}
      <AccordionSection title="💰 Simulador de Preços e Margens" id="precos" open={openSection === 'precos'} onToggle={toggle}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: '#fffbeb', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#92400e' }}>
            💡 Preço mínimo sugerido para 40% de margem com 10 usuários: <strong>{fmtBRL(calc.precoMinimo, 2)}/mês</strong>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {([
              { key: 'solo', label: '🥉 Essencial', color: '#0D6E6E', bg: '#f0fdfa', margem: calc.margemSolo, margemPct: calc.margemPctSolo, be: calc.beSolo },
              { key: 'pro', label: '⭐ Estratégico', color: '#7c3aed', bg: '#f5f3ff', margem: calc.margemPro, margemPct: calc.margemPctPro, be: calc.bePro },
              { key: 'clinica', label: '🏥 Performance', color: '#d97706', bg: '#fffbeb', margem: calc.margemClinica, margemPct: calc.margemPctClinica, be: calc.beClinica },
            ] as any[]).map(({ key, label, color, bg, margem, margemPct, be }) => (
              <div key={key} style={{ background: bg, borderRadius: 12, padding: 16, border: `1px solid ${color}33` }}>
                <p style={{ fontSize: 14, fontWeight: 800, color, margin: '0 0 12px' }}>{label}</p>
                <InputCalc label="Preço Mensal (R$)" value={(planos as any)[key]} onChange={(v: number) => setPlanos(p => ({ ...p, [key]: v }))} prefix="R$" />
                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[
                    { l: 'Margem/usuário', v: fmtBRL(margem, 2), c: margem > 0 ? '#16a34a' : '#dc2626' },
                    { l: 'Margem %', v: `${margemPct.toFixed(1)}%`, c: margemPct > 50 ? '#16a34a' : margemPct > 30 ? '#d97706' : '#dc2626' },
                    { l: 'Breakeven', v: be === Infinity ? '∞' : `${be} usuários`, c: color },
                  ].map(({ l, v, c }) => (
                    <div key={l} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 12, color: '#64748b' }}>{l}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: c }}>{v}</span>
                    </div>
                  ))}
                  <div style={{ height: 6, background: '#e2e8f0', borderRadius: 3, marginTop: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.max(0, Math.min(margemPct, 100))}%`, background: margemPct > 50 ? '#16a34a' : margemPct > 30 ? '#d97706' : '#dc2626', borderRadius: 3 }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </AccordionSection>

      {/* Seção Projeção */}
      <AccordionSection title="📈 Projeção de MRR — 12 Meses" id="projecao" open={openSection === 'projecao'} onToggle={toggle}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <InputCalc label="Novos cadastros/mês" value={premissas.novosPorMes} onChange={(v: number) => setPremissas(p => ({ ...p, novosPorMes: v }))} suffix="usuários" note="Cresce 5%/mês automaticamente" />
            <InputCalc label="Churn mensal" value={premissas.churnMensal * 100} onChange={(v: number) => setPremissas(p => ({ ...p, churnMensal: v / 100 }))} suffix="%" step={0.1} />
            <InputCalc label="Conversão trial→pago" value={premissas.conversaoTrial * 100} onChange={(v: number) => setPremissas(p => ({ ...p, conversaoTrial: v / 100 }))} suffix="%" step={1} />
            <InputCalc label="Mix Essencial (%)" value={premissas.mixSolo * 100} onChange={(v: number) => setPremissas(p => ({ ...p, mixSolo: v / 100 }))} suffix="%" step={5} />
            <InputCalc label="Mix Estratégico (%)" value={premissas.mixPro * 100} onChange={(v: number) => setPremissas(p => ({ ...p, mixPro: v / 100 }))} suffix="%" step={5} />
            <InputCalc label="Mix Performance (%)" value={premissas.mixClinica * 100} onChange={(v: number) => setPremissas(p => ({ ...p, mixClinica: v / 100 }))} suffix="%" step={5} />
          </div>

          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#0D6E6E' }}>
                  {['Mês','Usuários','MRR','Custo Total','Lucro','Margem'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', color: '#fff', fontWeight: 600, textAlign: 'center', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {calc.proj.map((row, i) => {
                  const isBE = i === calc.beIdx
                  return (
                    <tr key={i} style={{ background: isBE ? '#f0fdf4' : i % 2 === 0 ? '#f8fafc' : '#fff', borderTop: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: isBE ? 700 : 400, color: isBE ? '#16a34a' : '#0f172a' }}>{row.mes} {isBE && '✓'}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600 }}>{row.usuarios}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'center', color: '#0D6E6E', fontWeight: 700 }}>{fmtBRL(row.mrr)}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'center', color: '#dc2626' }}>{fmtBRL(row.custo)}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: row.lucro > 0 ? '#16a34a' : '#dc2626' }}>{fmtBRL(row.lucro)}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600, color: row.margem > 0 ? '#16a34a' : '#dc2626' }}>{row.margem.toFixed(1)}%</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: '#1A1A2E' }}>
                  <td style={{ padding: '10px 12px', color: '#fff', fontWeight: 700, textAlign: 'center' }}>Mês 12</td>
                  <td style={{ padding: '10px 12px', color: '#fff', textAlign: 'center', fontWeight: 700 }}>{calc.proj[11]?.usuarios || 0}</td>
                  <td style={{ padding: '10px 12px', color: '#4DB6AC', fontWeight: 900, textAlign: 'center' }}>{fmtBRL(calc.mrrFinal)}</td>
                  <td style={{ padding: '10px 12px', color: '#fca5a5', textAlign: 'center' }}>{fmtBRL(calc.proj[11]?.custo || 0)}</td>
                  <td style={{ padding: '10px 12px', fontWeight: 900, textAlign: 'center', color: calc.lucroFinal > 0 ? '#4ade80' : '#f87171' }}>{fmtBRL(calc.lucroFinal)}</td>
                  <td style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'center', color: (calc.proj[11]?.margem || 0) > 0 ? '#4ade80' : '#f87171' }}>{(calc.proj[11]?.margem || 0).toFixed(1)}%</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <KpiCard label="MRR no Mês 12" value={fmtBRL(calc.mrrFinal)} sub="receita recorrente" color="#0D6E6E" bg="#f0fdfa" />
            <KpiCard label="Lucro no Mês 12" value={fmtBRL(calc.lucroFinal)} sub={calc.lucroFinal > 0 ? 'operação lucrativa ✓' : 'ainda no prejuízo ⚠️'} color={calc.lucroFinal > 0 ? '#16a34a' : '#dc2626'} bg={calc.lucroFinal > 0 ? '#f0fdf4' : '#fef2f2'} />
            <KpiCard label="Breakeven" value={calc.mesToBreakeven} sub="primeiro mês com lucro" color="#7c3aed" bg="#f5f3ff" />
          </div>
        </div>
      </AccordionSection>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ══════════════════════════════════════════════════════════
export function PlansPage() {
  const { t } = useI18n()
  const [activeTab, setActiveTab] = useState<'planos' | 'calculadora'>('planos')
  const [plans, setPlans] = useState<Plan[]>([])
  const[loading, setLoading] = useState(true)
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const[subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [loadingSubs, setLoadingSubs] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingPlan, setEditingPlan] = useState<Partial<Plan> | null>(null)
  const [saving, setSaving] = useState(false)
  const[toggling, setToggling] = useState<string | null>(null)
  const [newFeature, setNewFeature] = useState('') 

  useEffect(() => { fetchPlans() },[])

  const fetchPlans = async () => {
    setLoading(true)
    try {
      console.log('📊 [Plans] Carregando planos...')

      // 1. Busca os metadados dos planos (limites, preços configurados no banco)
      const { data: plansData, error: plansError } = await supabase.from('plans').select('*')

      if (plansError) {
        console.error('❌ Erro ao buscar plans:', plansError)
        throw plansError
      }

      console.log('✅ Plans carregado:', plansData?.length || 0, 'registros')
      console.log('📋 Estrutura dos planos:', plansData?.[0])
      if (!plansData) return

      // 2. Conta assinaturas ativas por plan_id via professional_subscriptions
      const { data: activeSubs } = await supabase
        .from('professional_subscriptions')
        .select('plan_id')
        .eq('status', 'active')

      const subsMap: Record<string, { count: number; mrr: number }> = {}

      activeSubs?.forEach(sub => {
        const plan = plansData.find(p => p.id === sub.plan_id)
        if (plan) {
          if (!subsMap[plan.id]) subsMap[plan.id] = { count: 0, mrr: 0 }
          subsMap[plan.id].count++
          subsMap[plan.id].mrr += plan.price_monthly || 0
        }
      })

      setPlans(plansData.map(p => ({ 
        ...p, 
        features: Array.isArray(p.features) ? p.features : [], 
        subscribers_count: subsMap[p.id]?.count || 0, 
        mrr_contribution: subsMap[p.id]?.mrr || 0 
      })))
    } finally { setLoading(false) }
  }

  const fetchSubscribers = async (planId: string) => {
    setLoadingSubs(true)
    try {
      const plan = plans.find(p => p.id === planId)
      if (!plan) return

      // Busca assinaturas ativas deste plano via professional_subscriptions
      const { data: subsData } = await supabase
        .from('professional_subscriptions')
        .select('id, status, billing_cycle, activated_at, professionals(id, name, email, business_name)')
        .eq('plan_id', planId)
        .eq('status', 'active')
        .order('activated_at', { ascending: false })
        .limit(20)

      if (!subsData) { setSubscribers([]); return }

      setSubscribers(subsData.map(s => ({
        id: s.id,
        professional_id: (s.professionals as any)?.id ?? '',
        status: s.status,
        billing_cycle: s.billing_cycle ?? 'mensal',
        started_at: s.activated_at,
        professional: {
          name: (s.professionals as any)?.business_name || (s.professionals as any)?.name || 'Sem Nome',
          email: (s.professionals as any)?.email ?? '',
        }
      })))
    } finally { setLoadingSubs(false) }
  }

  const togglePlan = async (plan: Plan) => {
    setToggling(plan.id)
    const newVal = !plan.is_active
    try {
      const { error } = await supabase.from('plans').update({ is_active: newVal }).eq('id', plan.id)
      if (error) throw error
      setPlans(prev => prev.map(p => p.id === plan.id ? { ...p, is_active: newVal } : p))
      if (selectedPlan?.id === plan.id) setSelectedPlan({ ...selectedPlan, is_active: newVal })
    } catch (e) {
      console.error('Erro ao alterar plano:', e)
    } finally {
      setToggling(null)
    }
  }

  const savePlan = async () => {
    if (!editingPlan) return
    if (!editingPlan.name?.trim() || !editingPlan.slug?.trim()) {
      console.error('Nome e slug são obrigatórios')
      return
    }
    setSaving(true)
    try {
      if (editingPlan.id) {
        const { error } = await supabase.from('plans').update({ ...editingPlan, updated_at: new Date().toISOString() }).eq('id', editingPlan.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('plans').insert({ ...editingPlan })
        if (error) throw error
      }
      setShowModal(false); setEditingPlan(null); await fetchPlans()
    } catch (e) {
      console.error('Erro ao salvar plano:', e)
    } finally { setSaving(false) }
  }

  const selectPlan = (plan: Plan) => {
    if (selectedPlan?.id === plan.id) { setSelectedPlan(null); setSubscribers([]); return }
    setSelectedPlan(plan); fetchSubscribers(plan.id)
  }

  const totalMRR  = plans.reduce((s, p) => s + (p.mrr_contribution || 0), 0)
  const totalSubs = plans.reduce((s, p) => s + (p.subscribers_count || 0), 0)

  // Liga a calculadora aos preços dos planos Essencial, Estratégico e Performance
  const planoPrecos: Planos = {
    solo:    plans.find(p => p.slug === 'essencial' || p.name === 'Essencial')?.price_monthly || 99.9,
    pro:     plans.find(p => p.slug === 'estrategico' || p.name === 'Estratégico')?.price_monthly || 249.9,
    clinica: plans.find(p => p.slug === 'performance' || p.name === 'Performance')?.price_monthly || 449.9,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Abas */}
      <div style={{ display: 'flex', gap: 4, background: '#f1f5f9', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {([
          { id: 'planos', label: '📋 Gerenciar Planos' },
          { id: 'calculadora', label: '🧮 Calculadora Financeira' },
        ] as const).map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{ padding: '8px 20px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700,
              background: activeTab === tab.id ? '#fff' : 'transparent',
              color: activeTab === tab.id ? '#0D6E6E' : '#64748b',
              boxShadow: activeTab === tab.id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── ABA: PLANOS ── */}
      {activeTab === 'planos' && (
        <>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
            {[
              { label: 'Planos Ativos', value: plans.filter(p => p.is_active).length, color: '#0D6E6E', bg: '#f0fdfa' },
              { label: 'Total Assinantes', value: totalSubs, color: '#7c3aed', bg: '#f5f3ff' },
              { label: 'MRR Total', value: fmtBRL(totalMRR), color: '#16a34a', bg: '#f0fdf4' },
              { label: 'Ticket Médio', value: totalSubs > 0 ? fmtBRL(totalMRR / totalSubs) : '—', color: '#d97706', bg: '#fffbeb' },
            ].map(({ label, value, color }) => ( 
              <div key={label} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: '#64748b', margin: '0 0 6px' }}>{label}</p>
                <p style={{ fontSize: 26, fontWeight: 900, color, margin: 0 }}>{value}</p>
              </div>
            ))}
          </div>

          {/* Botão criar */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => { setEditingPlan({ ...EMPTY_PLAN }); setShowModal(true) }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: '#0D6E6E', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              <Plus size={16} /> Novo Plano
            </button>
          </div>

          {/* Cards */}
          {loading ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#94a3b8' }}>Carregando planos...</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
              {plans.map(plan => {
                const clr = getClr(plan.slug)
                const isOpen = selectedPlan?.id === plan.id
                return (
                  <div key={plan.id} style={{ background: '#fff', borderRadius: 14, border: `2px solid ${isOpen ? clr.color : '#e2e8f0'}`, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', transition: 'border-color 0.2s' }}>

                    <div style={{ background: clr.bg, padding: '20px 24px', borderBottom: `1px solid ${clr.border}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: clr.color }}>{plan.name}</h3>
                            {plan.slug === 'enterprise' && <span style={{ background: '#0369a1', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10 }}>ENTERPRISE</span>}
                            {plan.is_featured && <span style={{ background: '#F4A623', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10 }}>DESTAQUE</span>}
                            {!plan.is_active && <span style={{ background: '#fee2e2', color: '#dc2626', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10 }}>INATIVO</span>}
                          </div>
                          <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>{plan.description}</p>
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <button onClick={() => { setEditingPlan({ ...plan }); setShowModal(true) }}
                            style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#475569' }}>
                            <Edit2 size={13} /> Editar
                          </button>
                          <button onClick={() => togglePlan(plan)} disabled={toggling === plan.id}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: toggling === plan.id ? 0.5 : 1 }}>
                            {plan.is_active ? <ToggleRight size={28} color={clr.color} /> : <ToggleLeft size={28} color="#94a3b8" />}
                          </button>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 20, marginTop: 16 }}>
                        {plan.slug === 'enterprise' ? (
                          <div>
                            <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 2px' }}>Preço</p>
                            <p style={{ fontSize: 18, fontWeight: 900, color: clr.color, margin: 0 }}>Sob consulta</p>
                          </div>
                        ) : (
                          <>
                            <div>
                              <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 2px' }}>Mensal</p>
                              <p style={{ fontSize: 22, fontWeight: 900, color: clr.color, margin: 0 }}>
                                {plan.price_monthly === 0 ? 'Grátis' : fmtBRL(plan.price_monthly)}
                              </p>
                            </div>
                            {plan.price_annual > 0 && (
                              <div>
                                <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 2px' }}>Anual</p>
                                <p style={{ fontSize: 22, fontWeight: 900, color: clr.color, margin: 0 }}>{fmtBRL(plan.price_annual)}</p>
                              </div>
                            )}
                            {plan.trial_days > 0 && (
                              <div>
                                <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 2px' }}>Trial</p>
                                <p style={{ fontSize: 22, fontWeight: 900, color: '#d97706', margin: 0 }}>{plan.trial_days}d</p>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    <div style={{ padding: '14px 24px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, borderBottom: '1px solid #f1f5f9' }}>
                      {[
                        { label: 'Assinantes', value: plan.subscribers_count || 0 },
                        { label: 'MRR', value: fmtBRL(plan.mrr_contribution || 0) },
                        { label: 'Créditos IA', value: plan.ai_credits_month === -1 ? '∞' : plan.ai_credits_month },
                        { label: 'Pacientes', value: plan.max_patients === -1 ? '∞' : plan.max_patients },
                      ].map(({ label, value }) => (
                        <div key={label} style={{ textAlign: 'center' }}>
                          <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', color: '#94a3b8', margin: '0 0 2px' }}>{label}</p>
                          <p style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: 0 }}>{value}</p>
                        </div>
                      ))}
                    </div>

                    <div style={{ padding: '14px 24px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                        {(plan.features ||[]).slice(0, 4).map((f, i) => (
                          <span key={i} style={{ background: clr.bg, color: clr.color, fontSize: 11, padding: '3px 10px', borderRadius: 20, border: `1px solid ${clr.border}` }}>✓ {f}</span>
                        ))}
                        {(plan.features ||[]).length > 4 && <span style={{ fontSize: 11, color: '#94a3b8' }}>+{plan.features.length - 4} mais</span>}
                      </div>
                      <button onClick={() => selectPlan(plan)}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: clr.color, fontSize: 13, fontWeight: 600, padding: 0 }}>
                        <Users size={14} /> Ver assinantes {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </div>

                    {isOpen && (
                      <div style={{ borderTop: `1px solid ${clr.border}`, background: clr.bg, padding: '16px 24px' }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: clr.color, textTransform: 'uppercase', margin: '0 0 12px' }}>Assinantes — {plan.name}</p>
                        {loadingSubs ? (
                          <p style={{ fontSize: 13, color: '#94a3b8' }}>Carregando...</p>
                        ) : subscribers.length === 0 ? (
                          <p style={{ fontSize: 13, color: '#94a3b8' }}>Nenhum assinante ativo neste plano no momento.</p>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
                            {subscribers.map(sub => (
                              <div key={sub.id} style={{ background: '#fff', borderRadius: 8, padding: '10px 14px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                  <p style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', margin: 0 }}>{sub.professional?.name ?? '—'}</p>
                                  <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>{sub.professional?.email ?? '—'}</p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 12, background: sub.status === 'active' ? '#f0fdf4' : '#fef2f2', color: sub.status === 'active' ? '#16a34a' : '#dc2626' }}>
                                    {sub.status.toUpperCase()}
                                  </span>
                                  <p style={{ fontSize: 11, color: '#64748b', margin: '3px 0 0' }}>
                                    {sub.billing_cycle === 'annual' ? 'Anual' : 'Mensal'} · desde {new Date(sub.started_at).toLocaleDateString('pt-BR')}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ── ABA: CALCULADORA ── */}
      {activeTab === 'calculadora' && (
        <FinancialCalculator planoPrecos={planoPrecos} />
      )}

      {/* ── MODAL criar/editar ── */}
      {showModal && editingPlan && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 640, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#1A1A2E' }}>{editingPlan.id ? 'Editar Plano' : 'Criar Novo Plano'}</h2>
              <button onClick={() => { setShowModal(false); setEditingPlan(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={20} /></button>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {[
                  { label: 'Nome do plano', key: 'name', type: 'text', placeholder: 'Ex: Essencial' },
                  { label: 'Slug', key: 'slug', type: 'text', placeholder: 'Ex: essencial' },
                  { label: 'Preço Mensal (R$)', key: 'price_monthly', type: 'number', placeholder: '99.90' },
                  { label: 'Preço Anual (R$)', key: 'price_annual', type: 'number', placeholder: '990' },
                  { label: 'Dias de Trial', key: 'trial_days', type: 'number', placeholder: '7' },
                  { label: 'Créditos IA/mês (-1=∞)', key: 'ai_credits_month', type: 'number', placeholder: '100' },
                  { label: 'Máx. Profissionais', key: 'max_professionals', type: 'number', placeholder: '1' },
                  { label: 'Máx. Pacientes (-1=∞)', key: 'max_patients', type: 'number', placeholder: '-1' },
                ].map(({ label, key, type, placeholder }) => (
                  <div key={key}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>{label}</label>
                    <input type={type} value={(editingPlan as any)[key] ?? ''} placeholder={placeholder}
                      onChange={e => setEditingPlan(prev => ({ ...prev!, [key]: type === 'number' ? Number(e.target.value) : e.target.value }))}
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                ))}
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Descrição</label>
                <textarea value={editingPlan.description ?? ''} rows={2} placeholder={t('plans.modal_description_placeholder')}
                  onChange={e => setEditingPlan(prev => ({ ...prev!, description: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box', resize: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 8 }}>Features incluídas</label>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input value={newFeature} onChange={e => setNewFeature(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && newFeature.trim()) { setEditingPlan(prev => ({ ...prev!, features:[...(prev!.features || []), newFeature.trim()] })); (e.target as HTMLInputElement).value = ''; } }}
                    placeholder={t('plans.modal_feature_placeholder')}
                    style={{ flex: 1, padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, outline: 'none' }} />
                  <button onClick={() => { if (newFeature.trim()) setEditingPlan(prev => ({ ...prev!, features: [...(prev!.features || []), newFeature.trim()] })) }}
                    style={{ padding: '8px 14px', background: '#0D6E6E', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
                    <Plus size={16} />
                  </button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {(editingPlan.features ||[]).map((f, i) => (
                    <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#f0fdfa', color: '#0D6E6E', fontSize: 12, padding: '4px 10px', borderRadius: 20, border: '1px solid #99f6e4' }}>
                      {f}
                      <button onClick={() => setEditingPlan(prev => ({ ...prev!, features: prev!.features!.filter((_, j) => j !== i) }))}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0, display: 'flex' }}><X size={12} /></button>
                    </span>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 20 }}>
                {[{ label: 'Plano ativo', key: 'is_active' }, { label: 'Em destaque', key: 'is_featured' }].map(({ label, key }) => (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button onClick={() => setEditingPlan(prev => ({ ...prev!, [key]: !(prev as any)[key] }))} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
                      {(editingPlan as any)[key] ? <ToggleRight size={28} color="#0D6E6E" /> : <ToggleLeft size={28} color="#94a3b8" />}
                    </button>
                    <span style={{ fontSize: 13, color: '#475569' }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: 10, position: 'sticky', bottom: 0, background: '#fff' }}>
              <button onClick={() => { setShowModal(false); setEditingPlan(null) }}
                style={{ padding: '9px 20px', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0' }}>
                Cancelar
              </button>
              <button onClick={savePlan} disabled={saving}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 24px', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', background: saving ? '#94a3b8' : '#0D6E6E', color: '#fff', border: 'none' }}>
                <Check size={16} /> {saving ? 'Salvando...' : editingPlan.id ? 'Salvar' : 'Criar plano'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}