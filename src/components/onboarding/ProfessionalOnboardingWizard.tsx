import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, Check, ChevronLeft, Building, Stethoscope, Clock, DollarSign, MapPin, Sparkles, Users, UserCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useI18n } from '@/i18n';

export interface OnboardingData {
  name: string;
  business_name: string;
  business_model: 'solo' | 'clinica' | '';
  team_size: string;
  owner_is_provider: boolean;
  specialty: string;
  whatsapp: string;
  work_days: number[];
  work_start: string;
  work_end: string;
  service_name: string;
  service_price: string;
  service_duration: string;
  location_type: string;
  address: string;
  require_deposit: boolean;
  pix_key: string;
  ai_tone: string;
  enable_reminders: boolean;
}

interface Props {
  onComplete: (data: OnboardingData) => void;
  isSubmitting: boolean;
}

export function ProfessionalOnboardingWizard({ onComplete, isSubmitting }: Props) {
  const { t } = useI18n()
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [data, setData] = useState<OnboardingData>({
    name: '', business_name: '', business_model: '', team_size: '', owner_is_provider: true,
    specialty: '', whatsapp: '', work_days: [1, 2, 3, 4, 5], work_start: '08:00', work_end: '18:00',
    service_name: '', service_price: '', service_duration: '60',
    location_type: 'presencial', address: '', require_deposit: false, pix_key: '',
    ai_tone: 'amigavel', enable_reminders: true
  });

  const allSteps = [
    {
      id: 'intro',
      title: "Boas-vindas ao iaprafaturar! 👋",
      subtitle: "Para a nossa IA configurar seu sistema, como você se chama e qual o nome do seu negócio?",
      icon: Building,
      validate: () => (!data.name || !data.business_name ? 'Preencha seu nome e o da clínica.' : ''),
      content: (
        <div className="space-y-6 w-full max-w-md">
          <div>
            <label className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Seu Nome / Responsável</label>
            <Input ref={inputRef} value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })} className="text-2xl h-14 bg-transparent border-0 border-b-2 border-slate-300 rounded-none focus:ring-0 focus:border-[#0D6E6E] px-0 mt-2" placeholder={t('onboarding.professional_name_placeholder')} />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Nome da Clínica / Consultório</label>
            <Input value={data.business_name} onChange={(e) => setData({ ...data, business_name: e.target.value })} className="text-2xl h-14 bg-transparent border-0 border-b-2 border-slate-300 rounded-none focus:ring-0 focus:border-[#0D6E6E] px-0 mt-2" placeholder={t('onboarding.business_name_placeholder')} />
          </div>
        </div>
      )
    },
    {
      id: 'model',
      title: "Como é a sua estrutura hoje? 🏢",
      subtitle: "Precisamos saber se a agenda será individual ou multi-profissionais.",
      icon: Users,
      validate: () => (!data.business_model ? 'Selecione o modelo do seu negócio.' : ''),
      content: (
        <div className="grid grid-cols-1 gap-4 w-full max-w-md">
          <button onClick={() => setData({ ...data, business_model: 'solo' })} className={`p-5 rounded-2xl text-left border-2 transition-all ${data.business_model === 'solo' ? 'border-[#0D6E6E] bg-[#E8F5F5]' : 'border-slate-200 hover:border-[#0D6E6E]/50'}`}>
            <UserCircle className="w-8 h-8 text-[#0D6E6E] mb-3" />
            <div className="text-xl font-bold text-slate-800">Atendo Sozinho(a)</div>
            <div className="text-sm text-slate-500 mt-1">Sou um profissional independente.</div>
          </button>
          <button onClick={() => setData({ ...data, business_model: 'clinica' })} className={`p-5 rounded-2xl text-left border-2 transition-all ${data.business_model === 'clinica' ? 'border-[#0D6E6E] bg-[#E8F5F5]' : 'border-slate-200 hover:border-[#0D6E6E]/50'}`}>
            <Users className="w-8 h-8 text-[#0D6E6E] mb-3" />
            <div className="text-xl font-bold text-slate-800">Clínica com Equipe</div>
            <div className="text-sm text-slate-500 mt-1">Possuo outros profissionais atendendo comigo.</div>
          </button>
        </div>
      )
    },
    {
      id: 'clinic_details',
      shouldShow: (d: OnboardingData) => d.business_model === 'clinica',
      title: "Detalhes da sua Equipe 🤝",
      subtitle: "Você poderá convidar sua equipe para o app depois. Por enquanto, conte-nos sobre você.",
      icon: Users,
      validate: () => (!data.team_size ? 'Selecione o tamanho da equipe.' : ''),
      content: (
        <div className="space-y-8 w-full max-w-md">
          <div>
            <label className="text-sm font-semibold text-slate-500 uppercase tracking-wider block mb-3">Tamanho da Equipe</label>
            <div className="grid grid-cols-3 gap-2">
              {['2 a 5', '6 a 10', '11+'].map(size => (
                <button key={size} onClick={() => setData({ ...data, team_size: size })} className={`py-3 rounded-xl border-2 font-bold ${data.team_size === size ? 'border-[#0D6E6E] bg-[#E8F5F5] text-[#0D6E6E]' : 'border-slate-200 text-slate-500'}`}>{size}</button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between bg-white p-5 rounded-xl border-2 border-slate-100">
            <div className="pr-4">
              <p className="font-bold text-slate-800">Você também atende?</p>
              <p className="text-xs text-slate-500 mt-1">Desative se você for apenas gestor(a) e não tiver uma agenda própria para pacientes.</p>
            </div>
            <Switch checked={data.owner_is_provider} onCheckedChange={(c) => setData({ ...data, owner_is_provider: c })} />
          </div>
        </div>
      )
    },
    {
      id: 'specialty',
      title: "Qual a especialidade e contato?",
      subtitle: data.business_model === 'clinica' ? "Qual o foco principal da clínica e o WhatsApp geral de atendimento?" : "Isso ajuda a IA a entender o contexto dos seus pacientes.",
      icon: Stethoscope,
      validate: () => (!data.specialty || !data.whatsapp ? 'Preencha especialidade e WhatsApp.' : ''),
      content: (
        <div className="space-y-6 w-full max-w-md">
          <div>
            <label className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Especialidade Principal</label>
            <select value={data.specialty} onChange={(e) => setData({ ...data, specialty: e.target.value })} className="w-full text-2xl h-14 bg-transparent border-0 border-b-2 border-slate-300 rounded-none focus:ring-0 focus:border-[#0D6E6E] px-0 mt-2 outline-none">
              <option value="" disabled>Selecione...</option>
              <option value="odontologia">Odontologia</option>
              <option value="estetica">Estética / Harmonização</option>
              <option value="salao">Salão de Beleza / Barbearia</option>
              <option value="fisioterapia">Fisioterapia</option>
              <option value="psicologia">Psicologia / Terapia</option>
              <option value="medicina">Medicina Especializada</option>
              <option value="outro">Outro</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-500 uppercase tracking-wider">WhatsApp de Atendimento</label>
            <Input value={data.whatsapp} onChange={(e) => setData({ ...data, whatsapp: e.target.value })} className="text-2xl h-14 bg-transparent border-0 border-b-2 border-slate-300 rounded-none focus:ring-0 focus:border-[#0D6E6E] px-0 mt-2" placeholder="(11) 99999-9999" type="tel" />
          </div>
        </div>
      )
    },
    {
      id: 'hours',
      title: data.business_model === 'clinica' ? "Horário de funcionamento da Clínica ⏰" : "Seus horários de atendimento ⏰",
      subtitle: "Para a agenda e a Inteligência Artificial respeitarem seu horário de folga.",
      icon: Clock,
      content: (
        <div className="space-y-8 w-full max-w-md">
          <div>
            <label className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 block">Dias de Trabalho</label>
            <div className="flex flex-wrap gap-2">
              {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((d, i) => (
                <button key={i} onClick={() => setData(p => ({ ...p, work_days: p.work_days.includes(i + 1) ? p.work_days.filter(day => day !== i + 1) : [...p.work_days, i + 1].sort() }))}
                  className={`w-14 h-14 rounded-xl text-lg font-bold transition-all ${data.work_days.includes(i + 1) ? 'bg-[#0D6E6E] text-white shadow-md' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>{d}</button>
              ))}
            </div>
          </div>
          <div className="flex gap-6">
            <div className="flex-1">
              <label className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Abre às</label>
              <Input type="time" value={data.work_start} onChange={(e) => setData({ ...data, work_start: e.target.value })} className="text-2xl h-14 mt-2" />
            </div>
            <div className="flex-1">
              <label className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Fecha às</label>
              <Input type="time" value={data.work_end} onChange={(e) => setData({ ...data, work_end: e.target.value })} className="text-2xl h-14 mt-2" />
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'service',
      title: "Vamos cadastrar seu primeiro serviço 💰",
      subtitle: "Qual é o serviço principal ou consulta inicial que vamos usar para testar o sistema?",
      icon: DollarSign,
      validate: () => (!data.service_name || !data.service_price ? 'Cadastre o nome e valor do serviço.' : ''),
      content: (
        <div className="space-y-6 w-full max-w-md">
          <div>
            <label className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Nome do Serviço</label>
            <Input ref={inputRef} value={data.service_name} onChange={(e) => setData({ ...data, service_name: e.target.value })} className="text-2xl h-14 bg-transparent border-0 border-b-2 border-slate-300 rounded-none focus:ring-0 focus:border-[#0D6E6E] px-0 mt-2" placeholder={t('onboarding.service_name_placeholder')} />
          </div>
          <div className="flex gap-6">
            <div className="flex-1">
              <label className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Valor (R$)</label>
              <Input type="number" value={data.service_price} onChange={(e) => setData({ ...data, service_price: e.target.value })} className="text-2xl h-14 bg-transparent border-0 border-b-2 border-slate-300 rounded-none focus:ring-0 focus:border-[#0D6E6E] px-0 mt-2" placeholder="150.00" />
            </div>
            <div className="flex-1">
              <label className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Duração (Min)</label>
              <Input type="number" value={data.service_duration} onChange={(e) => setData({ ...data, service_duration: e.target.value })} className="text-2xl h-14 bg-transparent border-0 border-b-2 border-slate-300 rounded-none focus:ring-0 focus:border-[#0D6E6E] px-0 mt-2" placeholder="60" />
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'location_type',
      title: "Como são feitos os atendimentos? 📍",
      subtitle: "Isso orienta a IA na hora de enviar confirmações aos pacientes.",
      icon: MapPin,
      content: (
        <div className="grid grid-cols-1 gap-4 w-full max-w-md">
          {[
            { id: 'presencial', label: 'Presencial (Na Clínica)' },
            { id: 'online', label: 'Online (Telemedicina / Call)' },
            { id: 'domiciliar', label: 'Domiciliar (Vou até o cliente)' }
          ].map(opt => (
            <button key={opt.id} onClick={() => setData({ ...data, location_type: opt.id })} className={`p-5 rounded-2xl text-left border-2 transition-all ${data.location_type === opt.id ? 'border-[#0D6E6E] bg-[#E8F5F5] shadow-md' : 'border-slate-200 hover:border-slate-300'}`}>
              <div className="text-xl font-bold text-slate-800">{opt.label}</div>
            </button>
          ))}
        </div>
      )
    },
    {
      id: 'address',
      shouldShow: (d: OnboardingData) => d.location_type === 'presencial',
      title: "Qual o endereço do local?",
      subtitle: "A IA enviará este endereço automaticamente via WhatsApp quando agendar um paciente.",
      icon: MapPin,
      content: (
        <div className="w-full max-w-lg">
          <Textarea value={data.address} onChange={(e) => setData({ ...data, address: e.target.value })} placeholder={t('onboarding.address_placeholder')} className="text-xl min-h-[120px] bg-transparent border-2 border-slate-200 rounded-xl focus:ring-0 focus:border-[#0D6E6E] p-4 resize-none" />
        </div>
      )
    },
    {
      id: 'deposit',
      title: "Prevenção de Faltas (No-show) 🛡️",
      subtitle: "Muitos pacientes faltam e dão prejuízo. Você exige um sinal antecipado para reservar o horário?",
      icon: DollarSign,
      content: (
        <div className="space-y-6 w-full max-w-md bg-white p-6 rounded-2xl border-2 border-slate-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="pr-4">
              <p className="text-lg font-bold text-slate-800">Cobrar sinal antecipado?</p>
              <p className="text-sm text-slate-500 mt-1">A IA só confirmará a vaga após o comprovante.</p>
            </div>
            <Switch checked={data.require_deposit} onCheckedChange={(c) => setData({ ...data, require_deposit: c })} />
          </div>
        </div>
      )
    },
    {
      id: 'pix',
      shouldShow: (d: OnboardingData) => d.require_deposit,
      title: "Sua Chave PIX para o Sinal",
      subtitle: "A IA enviará essa chave na negociação para o paciente garantir a vaga.",
      icon: DollarSign,
      content: (
        <div className="w-full max-w-md space-y-2">
          <Input ref={inputRef} value={data.pix_key} onChange={(e) => setData({ ...data, pix_key: e.target.value })} className="text-2xl h-14 bg-transparent border-0 border-b-2 border-slate-300 rounded-none focus:ring-0 focus:border-[#0D6E6E] px-0" placeholder={t('onboarding.pix_key_placeholder')} />
        </div>
      )
    },
    {
      id: 'ai_config',
      title: "Comportamento da Inteligência Artificial 🤖",
      subtitle: "Quase pronto! Defina como sua nova assistente virtual vai agir.",
      icon: Sparkles,
      content: (
        <div className="space-y-8 w-full max-w-lg">
          <div className="space-y-3">
            <label className="text-sm font-semibold text-slate-500 uppercase tracking-wider block">Tom de Voz da IA</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: 'formal', label: 'Formal / Médica' },
                { id: 'amigavel', label: 'Amigável + Emojis' },
                { id: 'vendedora', label: 'Focada em Venda' }
              ].map(opt => (
                <button key={opt.id} onClick={() => setData({ ...data, ai_tone: opt.id })} className={`p-4 rounded-xl text-center border-2 transition-all ${data.ai_tone === opt.id ? 'border-[#0D6E6E] bg-[#E8F5F5] font-bold text-[#0D6E6E]' : 'border-slate-200 text-slate-600 hover:border-[#0D6E6E]/50'}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border-2 border-slate-100">
            <div>
              <p className="font-bold text-slate-800">Lembrete Automático (24h)</p>
              <p className="text-xs text-slate-500">A IA deve confirmar com o paciente 1 dia antes?</p>
            </div>
            <Switch checked={data.enable_reminders} onCheckedChange={(c) => setData({ ...data, enable_reminders: c })} />
          </div>
        </div>
      )
    }
  ];

  const visibleSteps = allSteps.filter(step => step.shouldShow ? step.shouldShow(data) : true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentStepInfo = visibleSteps[currentIndex];
  const progress = ((currentIndex + 1) / visibleSteps.length) * 100;
  const isLast = currentIndex === visibleSteps.length - 1;

  const nextStep = () => {
    const errorMsg = currentStepInfo.validate ? currentStepInfo.validate() : '';
    if (errorMsg) {
      setError(errorMsg);
      return;
    }
    setError('');
    
    if (isLast) {
      onComplete(data);
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const prevStep = () => {
    setError('');
    if (currentIndex > 0) setCurrentIndex(prev => prev - 1);
  };

  useEffect(() => {
    if (currentIndex >= visibleSteps.length) {
      setCurrentIndex(visibleSteps.length - 1);
    }
  }, [visibleSteps.length, currentIndex]);

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans selection:bg-[#0D6E6E]/20">
      <div className="h-1.5 w-full bg-slate-200 fixed top-0 left-0 z-50">
        <div className="h-full bg-[#0D6E6E] transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
      </div>
      
      <div className="p-6 flex justify-between items-center z-10">
        {currentIndex > 0 ? (
          <Button variant="ghost" size="sm" onClick={prevStep} className="text-slate-500 hover:text-slate-900">
            <ChevronLeft className="w-5 h-5 mr-1" /> Voltar
          </Button>
        ) : <div />}
        <span className="text-sm font-medium text-slate-400">
          Etapa {currentIndex + 1} de {visibleSteps.length}
        </span>
      </div>

      <div className="flex-1 flex flex-col justify-center max-w-4xl mx-auto w-full px-6 sm:px-12 pb-20">
        <div key={currentStepInfo.id} className="animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out">
          
          <div className="mb-10">
            {React.createElement(currentStepInfo.icon, { className: "w-10 h-10 text-[#0D6E6E] mb-6" })}
            <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-800 leading-tight tracking-tight">
              {currentStepInfo.title}
            </h2>
            <p className="text-lg sm:text-xl text-slate-500 mt-4 leading-relaxed max-w-2xl">
              {currentStepInfo.subtitle}
            </p>
          </div>

          <div className="min-h-[160px]">
            {currentStepInfo.content}
          </div>
          
          {error && <p className="text-red-500 text-sm mt-4 font-medium animate-in fade-in">{error}</p>}

          <div className="mt-12 flex items-center gap-4 border-t border-slate-200 pt-8">
            <Button 
              size="lg" onClick={nextStep} disabled={isSubmitting}
              className="bg-[#0D6E6E] hover:bg-[#0a5858] text-white text-lg px-10 h-14 rounded-xl shadow-lg transition-transform active:scale-95"
            >
              {isSubmitting ? 'Configurando...' : isLast ? (
                <><Check className="w-5 h-5 mr-2" /> Concluir e Acessar</>
              ) : (
                <>Continuar <ArrowRight className="w-5 h-5 ml-2" /></>
              )}
            </Button>
            
            {!currentStepInfo.validate && !isLast && (
              <Button variant="ghost" className="text-slate-400 hover:text-slate-600" onClick={() => { setError(''); setCurrentIndex(prev => prev + 1); }}>
                Pular por enquanto
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}