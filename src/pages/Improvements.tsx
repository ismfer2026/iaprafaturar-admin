import { Rocket, CheckCircle2, Zap, Shield, Lock } from 'lucide-react'

const improvements = [
  {
    date: '30 de Abril, 2026',
    title: 'Nexus Admin Sphere & Multi-AI Orchestrator',
    description: 'Lançamento oficial da camada de inteligência administrativa do iaprafaturar.',
    icon: Shield,
    color: '#0D6E6E',
    items: [
      'Orquestrador Nexus: Cérebro central para comandos administrativos e métricas reais.',
      'Fallback Multi-IA: Claude 3.5 Sonnet (Primário) + GPT-4o + Gemini 1.5 Pro.',
      'Agente de Vendas (Sales Agent): Prospecção automatizada integrada ao Heyform.',
      'Agente de Suporte (Support Agent): Atendimento técnico aos profissionais via RAG.',
      'Métricas Avançadas: Cálculo em tempo real de MRR, Churn e Uso de IA.',
      'Relatórios Semanais: Automação de envio de KPIs via WhatsApp toda segunda-feira.'
    ]
  },
  {
    date: '28 de Abril, 2026',
    title: 'Infraestrutura de Notificações "Jarvis"',
    description: 'Sistema proativo de engajamento e alertas críticos.',
    icon: Zap,
    color: '#F4A623',
    items: [
      'Notificações Push Ricas: Suporte a imagens grandes e botões de ação.',
      'Morning Briefing: Resumo diário de agenda e financeiro gerado por IA.',
      'Personalização por Canal: Escolha entre WhatsApp ou Push para cada alerta.',
      'Sons Exclusivos: Identidade sonora para diferentes tipos de eventos.'
    ]
  },
  {
    date: '25 de Abril, 2026',
    title: 'Governança e Compliance (LGPD)',
    description: 'Segurança de nível bancário e proteção de dados PHI.',
    icon: Lock,
    color: '#3B82F6',
    items: [
      'Audit Log Completo: Registro de todas as alterações críticas no banco de dados.',
      'Blindagem RLS: Row Level Security em 100% das tabelas de negócio.',
      'Isolamento Multi-tenant: Garantia técnica de que um profissional nunca acessa dados de outro.'
    ]
  }
]

export default function Improvements() {
  return (
    <div style={{ padding: '32px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ marginBottom: '48px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#1a202c', marginBottom: '8px' }}>
          Histórico de Evolução <span style={{ color: '#0D6E6E' }}>Nexus</span>
        </h1>
        <p style={{ color: '#718096', fontSize: '18px' }}>
          Acompanhe as melhorias e novas funcionalidades implementadas no ecossistema iaprafaturar.
        </p>
      </div>

      <ol style={{ position: 'relative', listStyle: 'none', padding: 0, margin: 0 }}>
        {/* Vertical Line */}
        <div style={{
          position: 'absolute', left: '20px', top: '0', bottom: '0',
          width: '2px', background: '#e2e8f0'
        }} />

        {improvements.map((group, idx) => (
          <li key={idx} style={{ position: 'relative', paddingLeft: '56px', marginBottom: '48px' }}>
            {/* Dot */}
            <div style={{
              position: 'absolute', left: '0', top: '0',
              width: '42px', height: '42px', borderRadius: '12px',
              background: group.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', boxShadow: `0 4px 12px ${group.color}44`, zIndex: 1
            }}>
              <group.icon size={20} aria-hidden={true} />
            </div>

            <div style={{
              background: '#fff', padding: '24px', borderRadius: '16px',
              border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: group.color, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>
                    {group.date}
                  </div>
                  <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#2d3748', marginTop: '4px' }}>
                    {group.title}
                  </h2>
                </div>
                <div style={{ background: '#f7fafc', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, color: '#4a5568' }}>
                  v8.0 Phase {5 - idx}
                </div>
              </div>

              <p style={{ color: '#4a5568', marginBottom: '20px', lineHeight: '1.6' }}>
                {group.description}
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px' }}>
                {group.items.map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <CheckCircle2 size={16} style={{ color: '#10b981', marginTop: '3px', flexShrink: 0 }} aria-hidden={true} />
                    <span style={{ fontSize: '14px', color: '#4a5568' }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </li>
        ))}
      </ol>

      <div style={{
        marginTop: '64px', padding: '32px', borderRadius: '24px',
        background: 'linear-gradient(135deg, #0D6E6E 0%, #1a4d4d 100%)',
        color: '#fff', textAlign: 'center'
      }}>
        <Rocket size={40} style={{ marginBottom: '16px' }} aria-hidden={true} />
        <h3 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>O Futuro é Nexus</h3>
        <p style={{ opacity: 0.9, maxWidth: '600px', margin: '0 auto' }}>
          Continuamos evoluindo a inteligência da plataforma para que você foque no que importa: a estratégia do seu negócio.
        </p>
      </div>
    </div>
  )
}
