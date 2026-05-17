import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ProfessionalOnboardingWizard, OnboardingData } from '../components/onboarding/ProfessionalOnboardingWizard'

export default function OnboardingPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()

  const handleComplete = async (data: OnboardingData) => {
    setIsSubmitting(true)
    try {
      await supabase.from('professionals').insert({
        name: data.name,
        business_name: data.business_name,
        email: '',
        phone_whatsapp: data.whatsapp,
        profession_type: data.specialty,
        status: 'ativo',
      })
      navigate('/profissionais')
    } catch (e) {
      console.error('Erro ao cadastrar profissional:', e)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 16px' }}>
      <ProfessionalOnboardingWizard onComplete={handleComplete} isSubmitting={isSubmitting} />
    </div>
  )
}
